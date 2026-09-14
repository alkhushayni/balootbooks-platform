import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit-log";

// Public, unauthenticated by design - Stripe calls this directly, with no Supabase session
// involved at all. The stripe-signature check below IS the authentication: only a request signed
// with our actual STRIPE_WEBHOOK_SECRET is ever acted on. The raw request body is read via
// request.text() rather than request.json() specifically because signature verification needs the
// exact original byte stream - re-serializing a parsed object would not match the signature.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = createStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (verificationError) {
    const message = verificationError instanceof Error ? verificationError.message : "Signature verification failed.";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const studentId = session.metadata?.studentId;
    const courseId = session.metadata?.courseId;

    if (!studentId || !courseId) {
      return NextResponse.json({ error: "Checkout session is missing studentId/courseId metadata." }, { status: 400 });
    }

    const admin = createAdminClient();
    const amountPaid = (session.amount_total ?? 0) / 100;

    const { error: insertError } = await admin.from("student_purchases").insert({
      student_id: studentId,
      course_id: courseId,
      stripe_session_id: session.id,
      amount_paid: amountPaid,
    });

    // A unique violation on stripe_session_id means Stripe redelivered a webhook we already
    // processed - expected and safe to ignore, not a failure worth rejecting the delivery over.
    if (insertError && insertError.code !== "23505") {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (!insertError) {
      await logAuditEvent({
        actorId: studentId,
        actionType: "course_purchase",
        description: `Completed a $${amountPaid.toFixed(2)} direct purchase for course ${courseId}.`,
        metadata: { courseId, stripeSessionId: session.id, amountPaid },
      });
    }
  }

  return NextResponse.json({ received: true });
}

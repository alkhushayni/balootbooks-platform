import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient, getCoursePriceCents } from "@/lib/stripe";

type CheckoutPayload = {
  courseId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to purchase a course." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts can purchase course access." }, { status: 403 });
  }

  const payload = (await request.json()) as CheckoutPayload;
  const courseId = payload.courseId?.trim();

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required." }, { status: 400 });
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  // Guard against double-charging: already enrolled via a class, or already purchased directly.
  const [enrollmentCheck, purchaseCheck] = await Promise.all([
    supabase.from("enrollments").select("id, classes!inner(course_id)").eq("student_id", user.id).eq("classes.course_id", courseId),
    supabase.from("student_purchases").select("id").eq("student_id", user.id).eq("course_id", courseId).limit(1),
  ]);

  if ((enrollmentCheck.data?.length ?? 0) > 0 || (purchaseCheck.data?.length ?? 0) > 0) {
    return NextResponse.json({ error: "You already have access to this course." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const stripe = createStripeClient();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${course.title} — Digital Textbook Access` },
            unit_amount: getCoursePriceCents(),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/student/course/${courseId}?checkout=success`,
      cancel_url: `${origin}/student/course/${courseId}?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: { studentId: user.id, courseId },
    });
  } catch (stripeError) {
    const message = stripeError instanceof Error ? stripeError.message : "Stripe checkout session creation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

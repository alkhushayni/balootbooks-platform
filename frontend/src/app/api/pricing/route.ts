import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoursePriceCents } from "@/lib/stripe";

// Minimal authenticated read of the flat digital-textbook price (Step 31) - pricing is server-only
// today (STRIPE_COURSE_PRICE_CENTS), so any client component that needs the real configured value
// rather than a guessed/hardcoded one has to fetch it from somewhere like this.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  return NextResponse.json({ priceCents: getCoursePriceCents() });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OnboardPayload = {
  name?: string;
  domainString?: string;
  maxSeats?: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to onboard an institution." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can onboard institution tenants." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as OnboardPayload;
  const name = payload.name?.trim();
  const domainString = payload.domainString?.trim().toLowerCase();
  const maxSeats = payload.maxSeats;

  if (!name || !domainString) {
    return NextResponse.json({ error: "University name and domain string are required." }, { status: 400 });
  }

  const { data: institutionId, error } = await supabase.rpc("onboard_institution", {
    p_name: name,
    p_domain: domainString,
    p_max_seats: typeof maxSeats === "number" && maxSeats > 0 ? maxSeats : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ institutionId });
}

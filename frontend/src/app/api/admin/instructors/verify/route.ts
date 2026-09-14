import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type VerifyPayload = {
  profileId?: string;
  isVerified?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to manage instructor accounts." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can verify or revoke instructor accounts." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as VerifyPayload;
  const { profileId, isVerified } = payload;

  if (!profileId || typeof isVerified !== "boolean") {
    return NextResponse.json({ error: "profileId and isVerified are required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("set_instructor_verification", {
    p_profile_id: profileId,
    p_is_verified: isVerified,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

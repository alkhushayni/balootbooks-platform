import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/notifications/email-service";

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

  // profiles has no email column - resolve it via the auth admin API, same as every other
  // server-side email lookup in this app.
  const admin = createAdminClient();
  const { data: targetAuth } = await admin.auth.admin.getUserById(profileId);

  if (targetAuth?.user?.email) {
    await sendTransactionalEmail({
      to: targetAuth.user.email,
      subject: isVerified ? "Your instructor account has been approved" : "Your instructor account access has changed",
      body: isVerified
        ? "Good news - your BalootBooks instructor account has been verified. You can now adopt courses and manage classes."
        : "Your BalootBooks instructor account verification has been revoked. Contact your platform administrator with any questions.",
    });
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-log";

type UpdatePayload = {
  adminId?: string;
  canPromptAiFactory?: boolean;
  canVerifyFaculty?: boolean;
  canManageBilling?: boolean;
  canViewAuditLogs?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to modify privileges." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super admins can modify the privilege matrix." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as UpdatePayload;
  const adminId = payload.adminId?.trim();

  if (
    !adminId ||
    typeof payload.canPromptAiFactory !== "boolean" ||
    typeof payload.canVerifyFaculty !== "boolean" ||
    typeof payload.canManageBilling !== "boolean" ||
    typeof payload.canViewAuditLogs !== "boolean"
  ) {
    return NextResponse.json(
      { error: "adminId and all four capability flags are required." },
      { status: 400 }
    );
  }

  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", adminId)
    .single();

  if (targetError || !targetProfile || !["platform_admin", "super_admin"].includes(targetProfile.role)) {
    return NextResponse.json({ error: "Target admin account not found." }, { status: 404 });
  }

  // Admin's own RLS-permitted session, not the service-role client - "Super admins manage
  // capability matrix" already grants this directly, matching the "total data sovereignty"
  // requirement (a super_admin genuinely controls this table themselves).
  const { error: upsertError } = await supabase.from("admin_capabilities").upsert(
    {
      admin_id: adminId,
      can_prompt_ai_factory: payload.canPromptAiFactory,
      can_verify_faculty: payload.canVerifyFaculty,
      can_manage_billing: payload.canManageBilling,
      can_view_audit_logs: payload.canViewAuditLogs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "admin_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await logAuditEvent({
    actorId: user.id,
    actionType: "privilege_modification",
    description: `Updated capability flags for admin ${adminId}.`,
    metadata: {
      adminId,
      canPromptAiFactory: payload.canPromptAiFactory,
      canVerifyFaculty: payload.canVerifyFaculty,
      canManageBilling: payload.canManageBilling,
      canViewAuditLogs: payload.canViewAuditLogs,
    },
  });

  return NextResponse.json({ success: true });
}

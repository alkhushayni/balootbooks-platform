import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CapabilitiesRow = {
  can_prompt_ai_factory: boolean;
  can_verify_faculty: boolean;
  can_manage_billing: boolean;
  can_view_audit_logs: boolean;
} | null;

type ProfileRow = {
  id: string;
  full_name: string;
  role: "platform_admin" | "super_admin";
  admin_capabilities: CapabilitiesRow | CapabilitiesRow[] | null;
};

export type PrivilegeEntry = {
  adminId: string;
  fullName: string;
  email: string | null;
  role: "platform_admin" | "super_admin";
  canPromptAiFactory: boolean;
  canVerifyFaculty: boolean;
  canManageBilling: boolean;
  canViewAuditLogs: boolean;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view the privilege matrix." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super admins can view the privilege matrix." },
      { status: 403 }
    );
  }

  const { data: rows, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, admin_capabilities(can_prompt_ai_factory, can_verify_faculty, can_manage_billing, can_view_audit_logs)"
    )
    .in("role", ["platform_admin", "super_admin"])
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileRows = (rows ?? []) as ProfileRow[];

  // profiles has no email column (it lives only in auth.users) - resolved per distinct admin via
  // the service-role admin client, same reasoning as the Step 30 audit log route.
  const admin = createAdminClient();
  const emailById = new Map<string, string | null>();
  await Promise.all(
    profileRows.map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.id);
      emailById.set(row.id, data.user?.email ?? null);
    })
  );

  const entries: PrivilegeEntry[] = profileRows.map((row) => {
    const capabilities = Array.isArray(row.admin_capabilities) ? row.admin_capabilities[0] : row.admin_capabilities;

    return {
      adminId: row.id,
      fullName: row.full_name,
      email: emailById.get(row.id) ?? null,
      role: row.role,
      canPromptAiFactory: capabilities?.can_prompt_ai_factory ?? false,
      canVerifyFaculty: capabilities?.can_verify_faculty ?? false,
      canManageBilling: capabilities?.can_manage_billing ?? false,
      canViewAuditLogs: capabilities?.can_view_audit_logs ?? false,
    };
  });

  return NextResponse.json({ entries });
}

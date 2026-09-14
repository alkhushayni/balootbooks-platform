import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  actionType: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view audit logs." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only platform admins can view the audit log." }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action_type, description, metadata, created_at, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logRows = (rows ?? []) as AuditLogRow[];

  // profiles has no email column (it lives only in auth.users) - resolved here per distinct
  // actor via the service-role admin client, the same reasoning list_instructor_accounts() (Step
  // 24) was built around, just via getUserById() since these ids span every role, not only
  // instructors.
  const admin = createAdminClient();
  const distinctActorIds = [...new Set(logRows.map((row) => row.actor_id).filter((id): id is string => id !== null))];

  const emailById = new Map<string, string | null>();
  await Promise.all(
    distinctActorIds.map(async (actorId) => {
      const { data } = await admin.auth.admin.getUserById(actorId);
      emailById.set(actorId, data.user?.email ?? null);
    })
  );

  const entries: AuditLogEntry[] = logRows.map((row) => {
    const actorProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      id: row.id,
      actorId: row.actor_id,
      actorName: actorProfile?.full_name ?? "Unknown actor",
      actorEmail: row.actor_id ? (emailById.get(row.actor_id) ?? null) : null,
      actionType: row.action_type,
      description: row.description,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ entries });
}

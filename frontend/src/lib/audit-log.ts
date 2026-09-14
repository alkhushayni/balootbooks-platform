import { createAdminClient } from "@/lib/supabase/admin";

// Writes go through the service-role client only, per the migration's design - no authenticated
// role (admin included) has an INSERT policy on audit_logs, so this is the only path capable of
// creating an entry. Never awaited by the caller for its own success/failure: a logging failure
// should never block or fail the admin action it's describing.
export async function logAuditEvent(entry: {
  actorId: string;
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      action_type: entry.actionType,
      description: entry.description,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // Swallowed intentionally - see comment above.
  }
}

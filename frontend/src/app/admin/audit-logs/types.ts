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

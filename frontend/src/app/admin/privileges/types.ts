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

export type CapabilityKey = "canPromptAiFactory" | "canVerifyFaculty" | "canManageBilling" | "canViewAuditLogs";

export type ToastState = { tone: "success" | "error"; message: string } | null;

"use client";

import type { CapabilityKey, PrivilegeEntry } from "./types";

const CAPABILITY_COLUMNS: { key: CapabilityKey; label: string }[] = [
  { key: "canPromptAiFactory", label: "AI Factory" },
  { key: "canVerifyFaculty", label: "Verify Faculty" },
  { key: "canManageBilling", label: "Manage Billing" },
  { key: "canViewAuditLogs", label: "View Audit Logs" },
];

export default function PrivilegeMatrixTable({
  entries,
  savingAdminId,
  onToggle,
}: {
  entries: PrivilegeEntry[];
  savingAdminId: string | null;
  onToggle: (adminId: string, key: CapabilityKey, nextValue: boolean) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No platform admin or super admin accounts found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administrator
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </th>
            {CAPABILITY_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const isSaving = savingAdminId === entry.adminId;

            return (
              <tr key={entry.adminId} className={isSaving ? "opacity-60" : undefined}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{entry.fullName}</p>
                    {isSaving && (
                      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                    )}
                  </div>
                  {entry.email && <p className="text-xs text-slate-400">{entry.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {entry.role}
                  </span>
                </td>
                {CAPABILITY_COLUMNS.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={entry[column.key]}
                      disabled={isSaving}
                      onChange={(event) => onToggle(entry.adminId, column.key, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

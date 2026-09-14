import type { AuditLogEntry } from "./types";

export default function LogTable({
  entries,
  onSelect,
}: {
  entries: AuditLogEntry[];
  onSelect: (entry: AuditLogEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No audit events recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Timestamp
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administrator
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="cursor-pointer transition hover:bg-slate-50"
            >
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{entry.actorName}</p>
                {entry.actorEmail && <p className="text-xs text-slate-400">{entry.actorEmail}</p>}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                  {entry.actionType}
                </span>
              </td>
              <td className="max-w-md truncate px-4 py-3 text-sm text-slate-600">{entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

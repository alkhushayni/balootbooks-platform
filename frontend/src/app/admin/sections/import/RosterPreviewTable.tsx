import type { RosterEntry } from "./types";

export default function RosterPreviewTable({ rows }: { rows: RosterEntry[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Upload a .csv file above to preview the roster before importing.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-500">
          {rows.length} student{rows.length === 1 ? "" : "s"} parsed
        </p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.email}-${index}`}>
                <td className="px-4 py-2 text-sm text-slate-900">{row.fullName}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{row.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

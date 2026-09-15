import type { RosterEntry } from "./types";

function MetricRow({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-slate-500">{label}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-700">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

export default function RosterTable({
  roster,
  flaggedStudentIds,
}: {
  roster: RosterEntry[];
  flaggedStudentIds: Set<string>;
}) {
  if (roster.length === 0) {
    return <p className="px-6 py-8 text-sm text-slate-500">No students have joined this class yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3 font-semibold">Student</th>
            <th className="px-6 py-3 font-semibold">Institutional ID</th>
            <th className="px-6 py-3 font-semibold">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {roster.map((student) => (
            <tr key={student.student_id}>
              <td className="px-6 py-4 align-top">
                <p className="font-medium text-slate-900">{student.full_name}</p>
                <p className="text-xs text-slate-500">{student.email}</p>
                {flaggedStudentIds.has(student.student_id) && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                    ⚠️ Suspected Duplicate
                  </span>
                )}
              </td>
              <td className="px-6 py-4 align-top text-slate-600">{student.institutional_id ?? "—"}</td>
              <td className="px-6 py-4 align-top">
                <div className="space-y-1.5">
                  <MetricRow label="Participation" value={student.avg_participation} colorClass="bg-brand-500" />
                  <MetricRow label="Challenge" value={student.avg_challenge} colorClass="bg-violet-500" />
                  <MetricRow label="Lab" value={student.avg_lab} colorClass="bg-emerald-500" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

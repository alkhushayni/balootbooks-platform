import type { ComplianceClassEntry } from "./types";

function ComplianceBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        —
      </span>
    );
  }

  // Green: master curriculum is intact or only lightly trimmed. Amber: the instructor's sandbox
  // has diverged enough from the master catalog to warrant a chair's attention.
  const toneClasses = value >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>{value}%</span>;
}

export default function CourseCohortTable({ classes }: { classes: ComplianceClassEntry[] }) {
  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No running classes found under your institution yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Class
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Instructor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enrolled
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Syllabus Alignment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {classes.map((entry) => (
            <tr key={entry.classId}>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{entry.courseIdentifier}</p>
                <p className="text-xs text-slate-500">
                  {entry.sectionTitle} · {entry.termToken}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{entry.instructorName}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{entry.enrolledCount}</td>
              <td className="px-4 py-3">
                <ComplianceBadge value={entry.complianceIndex} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

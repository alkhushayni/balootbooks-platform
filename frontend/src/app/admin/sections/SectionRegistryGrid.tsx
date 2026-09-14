import type { AllocatedClass, VerifiedInstructor } from "./types";

export default function SectionRegistryGrid({
  classes,
  instructors,
}: {
  classes: AllocatedClass[];
  instructors: VerifiedInstructor[];
}) {
  const instructorNameById = new Map(instructors.map((instructor) => [instructor.id, instructor.full_name]));

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No classroom sections provisioned yet. Use the form above to bulk-create your first batch.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Section
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Instructor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Term
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Access Code
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {classes.map((classRow) => (
            <tr key={classRow.id}>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{classRow.course_identifier}</p>
                <p className="text-xs text-slate-500">{classRow.section_title}</p>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {instructorNameById.get(classRow.instructor_id) ?? "Unknown instructor"}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{classRow.term_token}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                  {classRow.join_code}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

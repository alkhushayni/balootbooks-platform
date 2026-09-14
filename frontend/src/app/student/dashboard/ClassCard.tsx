import Link from "next/link";

export type EnrolledClass = {
  id: string;
  course_id: string;
  course_identifier: string;
  section_title: string;
  term_token: string;
};

export default function ClassCard({ classInfo }: { classInfo: EnrolledClass }) {
  return (
    <Link
      href={`/student/course/${classInfo.course_id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-20 items-end bg-gradient-to-br from-brand-400 to-brand-700 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Active</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-slate-900">{classInfo.course_identifier}</h3>
        <p className="mt-1 text-sm text-slate-600">{classInfo.section_title}</p>
        <p className="mt-1 text-xs text-slate-400">{classInfo.term_token}</p>
        <span className="mt-4 text-sm font-medium text-brand-600">View course sections &rarr;</span>
      </div>
    </Link>
  );
}

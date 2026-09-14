"use client";

export type CatalogCourse = {
  id: string;
  title: string;
  description: string | null;
};

const COVER_GRADIENTS = [
  "from-brand-400 to-brand-700",
  "from-indigo-400 to-brand-800",
  "from-sky-400 to-brand-700",
  "from-violet-400 to-brand-800",
  "from-blue-400 to-brand-700",
  "from-cyan-400 to-brand-800",
];

export default function CourseCard({
  course,
  index,
  onAdopt,
}: {
  course: CatalogCourse;
  index: number;
  onAdopt: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div
        className={`flex h-20 items-end bg-gradient-to-br p-4 ${
          COVER_GRADIENTS[index % COVER_GRADIENTS.length]
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Published</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-slate-500">
          {course.description || "No description provided yet."}
        </p>
        <button
          type="button"
          onClick={onAdopt}
          className="mt-4 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Begin Adoption
        </button>
      </div>
    </div>
  );
}

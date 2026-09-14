"use client";

import { useState } from "react";
import type { CourseItem } from "./types";
import ChapterRow from "./ChapterRow";
import ChapterFormModal from "./ChapterFormModal";

export default function CourseCard({
  course,
  onChanged,
}: {
  course: CourseItem;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showChapterForm, setShowChapterForm] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex flex-1 items-start gap-2 text-left"
        >
          <span className="mt-0.5 text-slate-400">{expanded ? "▾" : "▸"}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  course.is_published
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {course.is_published ? "Published" : "Draft"}
              </span>
            </div>
            {course.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{course.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {course.chapters.length} chapter{course.chapters.length === 1 ? "" : "s"}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setShowChapterForm(true)}
          className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + Add chapter
        </button>
      </div>

      {expanded && course.chapters.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 px-5 py-4">
          {course.chapters.map((chapter) => (
            <ChapterRow key={chapter.id} chapter={chapter} onChanged={onChanged} />
          ))}
        </div>
      )}

      {showChapterForm && (
        <ChapterFormModal
          courseId={course.id}
          courseTitle={course.title}
          nextDisplayOrder={course.chapters.length + 1}
          onClose={() => setShowChapterForm(false)}
          onCreated={() => {
            setShowChapterForm(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

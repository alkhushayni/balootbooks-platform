"use client";

import { useState } from "react";
import type { DisplayChapter } from "./types";

export default function CurriculumTree({
  chapters,
  onMove,
  onToggleHidden,
}: {
  chapters: DisplayChapter[];
  onMove: (index: number, direction: "up" | "down") => void;
  onToggleHidden: (index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  }

  if (chapters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        This course doesn&apos;t have any chapters yet. Use the panel on the right to add one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => {
        const key = chapter.override_id ?? chapter.master_chapter_id ?? String(index);
        const isCollapsed = collapsed[key] ?? false;

        return (
          <div
            key={key}
            className={`rounded-xl border bg-white shadow-sm ${
              chapter.is_hidden ? "border-slate-200 opacity-60" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Expand chapter" : "Collapse chapter"}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <span className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>▾</span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{chapter.title}</p>
                  {!chapter.master_chapter_id && (
                    <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      Custom
                    </span>
                  )}
                  {chapter.is_hidden && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Hidden from your class
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {chapter.sections.length} section{chapter.sections.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(index, "up")}
                  disabled={index === 0}
                  aria-label={`Move "${chapter.title}" up`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, "down")}
                  disabled={index === chapters.length - 1}
                  aria-label={`Move "${chapter.title}" down`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onToggleHidden(index)}
                  aria-label={chapter.is_hidden ? `Show "${chapter.title}" in your class` : `Hide "${chapter.title}" from your class`}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  {chapter.is_hidden ? "◎" : "⊘"}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                {chapter.sections.length === 0 ? (
                  <span className="text-xs text-slate-400">No sections yet.</span>
                ) : (
                  chapter.sections.map((section) => (
                    <span
                      key={section.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        section.content_type === "LAB"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {section.title}
                      {section.is_custom && <span className="text-violet-600">•</span>}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

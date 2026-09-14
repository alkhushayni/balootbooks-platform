"use client";

import { useState } from "react";
import type { ChapterNode, SectionNode } from "./types";

const CONTENT_TYPE_ICON: Record<SectionNode["content_type"], string> = {
  READING: "📖",
  LAB: "🧪",
};

export default function TextbookMap({
  chapters,
  activeSectionId,
  onSelectSection,
}: {
  chapters: ChapterNode[];
  activeSectionId: string | null;
  onSelectSection: (section: SectionNode) => void;
}) {
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  function toggleChapter(chapterId: string) {
    setCollapsedChapters((previous) => {
      const next = new Set(previous);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  return (
    <nav className="h-full overflow-y-auto p-4">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Table of contents
      </h2>
      <div className="mt-2 space-y-1">
        {chapters.map((chapter) => {
          const isCollapsed = collapsedChapters.has(chapter.id);
          return (
            <div key={chapter.id}>
              <button
                type="button"
                onClick={() => toggleChapter(chapter.id)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <span className="text-slate-400">{isCollapsed ? "▸" : "▾"}</span>
                {chapter.title}
              </button>

              {!isCollapsed && (
                <div className="ml-4 space-y-0.5 border-l border-slate-200 pl-3">
                  {chapter.sections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => onSelectSection(section)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                          isActive
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs">{CONTENT_TYPE_ICON[section.content_type]}</span>
                        <span className="truncate">{section.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

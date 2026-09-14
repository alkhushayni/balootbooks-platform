"use client";

import { useState } from "react";
import type { ChapterItem } from "./types";
import SectionRow from "./SectionRow";
import SectionFormModal from "./SectionFormModal";

export default function ChapterRow({
  chapter,
  onChanged,
}: {
  chapter: ChapterItem;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSectionForm, setShowSectionForm] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-slate-400">{expanded ? "▾" : "▸"}</span>
          <span className="text-sm font-semibold text-slate-800">{chapter.title}</span>
          <span className="text-xs text-slate-400">
            {chapter.sections.length} section{chapter.sections.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowSectionForm(true)}
          className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + Add section
        </button>
      </div>

      {expanded && chapter.sections.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          {chapter.sections.map((section) => (
            <SectionRow key={section.id} section={section} />
          ))}
        </div>
      )}

      {showSectionForm && (
        <SectionFormModal
          chapterId={chapter.id}
          chapterTitle={chapter.title}
          nextDisplayOrder={chapter.sections.length + 1}
          onClose={() => setShowSectionForm(false)}
          onCreated={() => {
            setShowSectionForm(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

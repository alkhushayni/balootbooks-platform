"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DisplayChapter } from "./types";

export default function ActionPanel({
  classId,
  chapters,
  nextChapterOrder,
  onChapterCreated,
  onSectionCreated,
  onError,
}: {
  classId: string;
  chapters: DisplayChapter[];
  nextChapterOrder: number;
  onChapterCreated: () => void;
  onSectionCreated: () => void;
  onError: (message: string) => void;
}) {
  const [chapterTitle, setChapterTitle] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);

  const [sectionChapterIndex, setSectionChapterIndex] = useState(0);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContentType, setSectionContentType] = useState<"READING" | "LAB">("READING");
  const [creatingSection, setCreatingSection] = useState(false);

  async function handleCreateChapter(event: React.FormEvent) {
    event.preventDefault();
    if (!chapterTitle.trim()) return;

    setCreatingChapter(true);
    const supabase = createClient();
    const { error } = await supabase.from("class_chapter_overrides").insert({
      class_id: classId,
      chapter_id: null,
      title: chapterTitle.trim(),
      display_order: nextChapterOrder,
      is_hidden: false,
    });
    setCreatingChapter(false);

    if (error) {
      onError(error.message);
      return;
    }

    setChapterTitle("");
    onChapterCreated();
  }

  async function handleCreateSection(event: React.FormEvent) {
    event.preventDefault();
    const targetChapter = chapters[sectionChapterIndex];
    if (!targetChapter || !sectionTitle.trim()) return;

    setCreatingSection(true);
    const supabase = createClient();

    // A master chapter the instructor hasn't touched yet has no override row to anchor a
    // class-private section against - create a bare one (no title, so the master title still
    // wins) before inserting the section.
    let overrideId = targetChapter.override_id;
    if (!overrideId) {
      const { data: newOverride, error: overrideError } = await supabase
        .from("class_chapter_overrides")
        .insert({ class_id: classId, chapter_id: targetChapter.master_chapter_id, is_hidden: false })
        .select("id")
        .single();

      if (overrideError || !newOverride) {
        setCreatingSection(false);
        onError(overrideError?.message ?? "Couldn't prepare this chapter for a custom section.");
        return;
      }

      overrideId = newOverride.id;
    }

    const nextSectionOrder = targetChapter.sections.length + 1;
    const { error: sectionError } = await supabase.from("class_custom_sections").insert({
      chapter_override_id: overrideId,
      title: sectionTitle.trim(),
      content_type: sectionContentType,
      display_order: nextSectionOrder,
    });
    setCreatingSection(false);

    if (sectionError) {
      onError(sectionError.message);
      return;
    }

    setSectionTitle("");
    onSectionCreated();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateChapter} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Insert new custom chapter</h2>
        <p className="mt-1 text-xs text-slate-500">
          Private to your class - never appears in the shared course catalog or other classes.
        </p>

        <input
          type="text"
          required
          value={chapterTitle}
          onChange={(event) => setChapterTitle(event.target.value)}
          placeholder="e.g. Chapter 5: Advanced Topics"
          className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <button
          type="submit"
          disabled={creatingChapter}
          className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingChapter ? "Adding..." : "Insert New Custom Chapter"}
        </button>
      </form>

      <form onSubmit={handleCreateSection} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Add empty section link</h2>
        <p className="mt-1 text-xs text-slate-500">
          Creates a blank, class-private section under the chosen chapter.
        </p>

        <label htmlFor="section_target_chapter" className="mt-3 block text-xs font-medium text-slate-600">
          Chapter
        </label>
        <select
          id="section_target_chapter"
          required
          value={sectionChapterIndex}
          onChange={(event) => setSectionChapterIndex(Number(event.target.value))}
          disabled={chapters.length === 0}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {chapters.length === 0 && <option value="">Add a chapter first</option>}
          {chapters.map((chapter, index) => (
            <option key={chapter.override_id ?? chapter.master_chapter_id} value={index}>
              {chapter.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          required
          value={sectionTitle}
          onChange={(event) => setSectionTitle(event.target.value)}
          placeholder="e.g. 5.1 New Section Title"
          className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <div className="mt-3 flex gap-2">
          {(["READING", "LAB"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSectionContentType(option)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                sectionContentType === option
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={creatingSection || chapters.length === 0}
          className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingSection ? "Adding..." : "Add Empty Section Link"}
        </button>
      </form>
    </div>
  );
}

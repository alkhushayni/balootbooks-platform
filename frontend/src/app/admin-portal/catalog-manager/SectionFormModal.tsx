"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SectionFormModal({
  chapterId,
  chapterTitle,
  nextDisplayOrder,
  onClose,
  onCreated,
}: {
  chapterId: string;
  chapterTitle: string;
  nextDisplayOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<"READING" | "LAB">("READING");
  const [markdownContent, setMarkdownContent] = useState("");
  const [displayOrder, setDisplayOrder] = useState(String(nextDisplayOrder));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedOrder = Number.parseInt(displayOrder, 10);
    if (!title.trim() || Number.isNaN(parsedOrder)) {
      setError("Fill in a title and a valid display order.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("sections").insert({
      chapter_id: chapterId,
      title: title.trim(),
      content_type: contentType,
      markdown_content: markdownContent.trim() || null,
      display_order: parsedOrder,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Add section</h2>
        <p className="mt-1 text-sm text-slate-500">{chapterTitle}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label htmlFor="section_title" className="block text-sm font-medium text-slate-700">
              Section title
            </label>
            <input
              id="section_title"
              type="text"
              required
              placeholder="1.1 Memory Layout Fundamentals"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Layout</span>
            <div className="mt-1.5 flex gap-2">
              {(["READING", "LAB"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setContentType(option)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    contentType === option
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="markdown_content" className="block text-sm font-medium text-slate-700">
              Markdown content
            </label>
            <textarea
              id="markdown_content"
              rows={5}
              placeholder="## Learning objectives&#10;..."
              value={markdownContent}
              onChange={(event) => setMarkdownContent(event.target.value)}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="section_display_order" className="block text-sm font-medium text-slate-700">
              Display order
            </label>
            <input
              id="section_display_order"
              type="number"
              required
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="mt-1.5 block w-28 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

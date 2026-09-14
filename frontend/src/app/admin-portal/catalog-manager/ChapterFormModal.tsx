"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChapterFormModal({
  courseId,
  courseTitle,
  nextDisplayOrder,
  onClose,
  onCreated,
}: {
  courseId: string;
  courseTitle: string;
  nextDisplayOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
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
    const { error: insertError } = await supabase.from("chapters").insert({
      course_id: courseId,
      title: title.trim(),
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Add chapter</h2>
        <p className="mt-1 text-sm text-slate-500">{courseTitle}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label htmlFor="chapter_title" className="block text-sm font-medium text-slate-700">
              Chapter title
            </label>
            <input
              id="chapter_title"
              type="text"
              required
              placeholder="Chapter 1: Memory Safety"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="chapter_display_order" className="block text-sm font-medium text-slate-700">
              Display order
            </label>
            <input
              id="chapter_display_order"
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
              {submitting ? "Adding..." : "Add chapter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

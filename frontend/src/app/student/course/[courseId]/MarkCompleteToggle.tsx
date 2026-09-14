"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MetricField = "participation_percentage" | "lab_percentage";

export default function MarkCompleteToggle({
  sectionId,
  metric,
  label,
  initiallyComplete,
  onComplete,
}: {
  sectionId: string;
  metric: MetricField;
  label: string;
  initiallyComplete: boolean;
  onComplete: () => void;
}) {
  const [completed, setCompleted] = useState(initiallyComplete);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (completed || saving) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to save progress.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("student_progress").upsert(
      {
        student_id: user.id,
        section_id: sectionId,
        [metric]: 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,section_id" }
    );

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setCompleted(true);
    onComplete();
  }

  return (
    <div className="mt-10 border-t border-slate-100 pt-6">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={completed || saving}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition sm:w-auto ${
          completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
            completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 text-transparent"
          }`}
        >
          ✓
        </span>
        {completed ? `${label} complete` : saving ? "Saving..." : `Mark ${label.toLowerCase()} as complete`}
      </button>
    </div>
  );
}

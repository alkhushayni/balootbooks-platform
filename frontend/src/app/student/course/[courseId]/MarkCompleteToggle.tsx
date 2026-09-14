"use client";

import { useState } from "react";

type MetricField = "participation_percentage" | "lab_percentage";

export default function MarkCompleteToggle({
  sectionId,
  isCustom,
  metric,
  label,
  initiallyComplete,
  onComplete,
}: {
  sectionId: string;
  isCustom: boolean;
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

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [isCustom ? "customSectionId" : "sectionId"]: sectionId,
          metric,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Couldn't save progress.");
        return;
      }

      setCompleted(true);
      onComplete();
    } catch {
      setError("Couldn't reach the progress service. Try again.");
    } finally {
      setSaving(false);
    }
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

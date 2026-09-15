"use client";

import { useState } from "react";

type SubmitState = "idle" | "submitting" | "clean" | "flagged" | "error";

export default function CodeSubmissionPanel({ sectionId }: { sectionId: string }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!code.trim() || state === "submitting") return;

    setState("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/lab/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, code }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body.error ?? "Couldn't submit this code for analysis.");
        setState("error");
        return;
      }

      setState(body.isFlaggedDuplicate ? "flagged" : "clean");
    } catch {
      setErrorMessage("Couldn't reach the analysis service. Try again.");
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Submit Code for Structural Analysis
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Paste your solution below. It&apos;s compared against other submissions for this lab to
        check for structural similarity.
      </p>

      <textarea
        value={code}
        onChange={(event) => setCode(event.target.value)}
        rows={10}
        spellCheck={false}
        placeholder="Paste your code here..."
        className="mt-4 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="mt-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!code.trim() || state === "submitting"}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "submitting" ? "Analyzing..." : "Submit for Analysis"}
        </button>

        {state === "clean" && (
          <p className="text-sm font-medium text-emerald-700">Submission recorded — no structural matches found.</p>
        )}
        {state === "flagged" && (
          <p className="text-sm font-bold text-red-700">
            ⚠️ This submission&apos;s structure matches another student&apos;s — flagged for instructor review.
          </p>
        )}
        {state === "error" && errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      </div>
    </div>
  );
}

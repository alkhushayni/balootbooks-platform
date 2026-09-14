"use client";

import { useState } from "react";

export default function AIAssistantPanel({
  context,
  onInject,
}: {
  context: string;
  onInject: (markdown: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInject() {
    if (!prompt.trim()) return;

    setError(null);
    setGenerating(true);

    try {
      const response = await fetch("/api/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Generation failed.");
        return;
      }

      onInject(body.markdown as string);
      setPrompt("");
    } catch {
      setError("Couldn't reach the generation service. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Ask AI Assistant</h2>
      <p className="mt-1 text-xs text-slate-500">
        Describe a block to add - a table, an explanation, a code sample - and it's inserted at
        your cursor.
      </p>

      <textarea
        rows={3}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="e.g. Add a table comparing TCP and UDP"
        className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleInject}
        disabled={generating || !prompt.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {generating ? "Generating..." : "Inject AI Block"}
      </button>
    </div>
  );
}

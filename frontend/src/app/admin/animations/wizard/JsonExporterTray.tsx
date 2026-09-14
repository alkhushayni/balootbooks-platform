"use client";

import { useState } from "react";
import type { FrameState } from "./types";

export default function JsonExporterTray({
  frames,
  onExportResult,
}: {
  frames: FrameState[];
  onExportResult: (message: string, tone: "success" | "error") => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const payload = JSON.stringify(frames, null, 2);

  async function handleExport() {
    try {
      await navigator.clipboard.writeText(payload);
      onExportResult("Animation payload copied to clipboard.", "success");
    } catch {
      onExportResult("Couldn't access the clipboard - select and copy the JSON manually.", "error");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">JSON Content Exporter</span>
        <span className="text-xs text-slate-400">{expanded ? "Collapse ▲" : "Expand ▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4">
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-300">
            {payload}
          </pre>

          <button
            type="button"
            onClick={handleExport}
            className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            📋 Export Animation Payload Package
          </button>
        </div>
      )}
    </div>
  );
}

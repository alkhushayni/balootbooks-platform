"use client";

import type { AuditLogEntry } from "./types";
import { highlightJson } from "./json-highlight";

export default function MetadataInspector({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{entry.actionType}</h2>
            <p className="mt-1 text-sm text-slate-500">{entry.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">Administrator</dt>
            <dd className="mt-0.5 text-slate-700">
              {entry.actorName}
              {entry.actorEmail && ` (${entry.actorEmail})`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">Timestamp</dt>
            <dd className="mt-0.5 text-slate-700">{new Date(entry.createdAt).toLocaleString()}</dd>
          </div>
        </dl>

        <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Metadata Inspector
        </p>
        <pre
          className="max-h-96 overflow-auto rounded-md bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200"
          dangerouslySetInnerHTML={{ __html: highlightJson(entry.metadata) }}
        />
      </div>
    </div>
  );
}

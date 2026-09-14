export type TallyEntry = {
  key: string;
  classLabel: string;
  importedCount: number;
  skippedCount: number;
  completedAt: string;
};

export default function TallyLedger({ entries }: { entries: TallyEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No import runs yet this session.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {entries.map((entry) => {
          const total = entry.importedCount + entry.skippedCount;
          const importedPct = total === 0 ? 0 : Math.round((entry.importedCount / total) * 100);

          return (
            <li key={entry.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-900">{entry.classLabel}</p>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(entry.completedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${importedPct}%` }} />
                </div>
                <p className="shrink-0 text-xs text-slate-500">
                  {entry.importedCount} imported{entry.skippedCount > 0 && ` · ${entry.skippedCount} skipped`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

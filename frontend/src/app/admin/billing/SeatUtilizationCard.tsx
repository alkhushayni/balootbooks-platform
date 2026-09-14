import type { SeatLedgerEntry } from "./types";
import { accountStatusToken, utilizationRate } from "./invoice";

export default function SeatUtilizationCard({
  entry,
  onExportInvoice,
}: {
  entry: SeatLedgerEntry;
  onExportInvoice: (entry: SeatLedgerEntry) => void;
}) {
  const rate = utilizationRate(entry);
  const status = accountStatusToken(entry);
  const isOverCap = status.startsWith("OVER LICENSE CAP");
  const isNearCapacity = status.startsWith("NEAR CAPACITY");

  const barColor = isOverCap ? "bg-red-500" : isNearCapacity ? "bg-amber-500" : "bg-emerald-500";
  const statusClasses = isOverCap
    ? "bg-red-100 text-red-800"
    : isNearCapacity
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{entry.institutionName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {entry.consumedSeats.toLocaleString()} / {entry.maxSeats === null ? "Uncapped" : entry.maxSeats.toLocaleString()}{" "}
            seats consumed
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses}`}>
          {status}
        </span>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${rate === null ? 0 : Math.min(100, rate)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{rate === null ? "No seat cap set" : `${rate}% utilization`}</p>

      <button
        type="button"
        onClick={() => onExportInvoice(entry)}
        className="mt-5 w-full rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Export Invoice Ledger
      </button>
    </div>
  );
}

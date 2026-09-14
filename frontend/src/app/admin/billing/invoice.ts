import type { SeatLedgerEntry } from "./types";

export function utilizationRate(entry: SeatLedgerEntry): number | null {
  if (!entry.maxSeats || entry.maxSeats <= 0) return null;
  return Math.round((entry.consumedSeats / entry.maxSeats) * 1000) / 10;
}

export function accountStatusToken(entry: SeatLedgerEntry): string {
  if (!entry.maxSeats || entry.maxSeats <= 0) return "UNCAPPED — NO SEAT TIER SET";
  if (entry.consumedSeats > entry.maxSeats) return "OVER LICENSE CAP — REMEDIATION REQUIRED";
  const rate = utilizationRate(entry);
  if (rate !== null && rate >= 90) return "NEAR CAPACITY — RENEWAL REVIEW RECOMMENDED";
  return "ACTIVE — WITHIN LICENSE BOUNDS";
}

export function compileInvoiceLedger(entry: SeatLedgerEntry): string {
  const rate = utilizationRate(entry);
  const generatedAt = new Date().toISOString();
  const divider = "=".repeat(46);

  const lines = [
    "BALOOTBOOKS INSTITUTIONAL LICENSE INVOICE",
    divider,
    `Institution:      ${entry.institutionName}`,
    `Institution ID:   ${entry.institutionId}`,
    `Generated:        ${generatedAt}`,
    "",
    "CONTRACT SEAT TIER",
    `  Max Licensed Seats:   ${entry.maxSeats === null ? "Uncapped" : entry.maxSeats.toLocaleString()}`,
    "",
    "ACTIVE CONSUMPTION METRICS",
    `  Consumed Seats:       ${entry.consumedSeats.toLocaleString()}`,
    `  Available Seats:      ${entry.availableSeats === null ? "N/A" : entry.availableSeats.toLocaleString()}`,
    `  Utilization Rate:     ${rate === null ? "N/A" : `${rate}%`}`,
    "",
    `ACCOUNT STATUS: ${accountStatusToken(entry)}`,
    divider,
  ];

  return lines.join("\n");
}

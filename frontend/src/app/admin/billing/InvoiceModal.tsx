"use client";

import { useState } from "react";
import type { SeatLedgerEntry } from "./types";
import { compileInvoiceLedger } from "./invoice";

export default function InvoiceModal({ entry, onClose }: { entry: SeatLedgerEntry; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const invoiceText = compileInvoiceLedger(entry);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(invoiceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied - the text is still visible on screen to copy by hand.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Invoice Ledger — {entry.institutionName}</h2>
        <p className="mt-1 text-sm text-slate-500">Structured audit summary for university licensing records.</p>

        <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800">
          {invoiceText}
        </pre>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

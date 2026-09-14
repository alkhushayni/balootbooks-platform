"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SeatLedgerEntry } from "./types";
import SeatUtilizationCard from "./SeatUtilizationCard";
import InvoiceModal from "./InvoiceModal";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function LicenseSeatManagerPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ledger, setLedger] = useState<SeatLedgerEntry[]>([]);
  const [invoiceEntry, setInvoiceEntry] = useState<SeatLedgerEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setView("signed-out");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || !["platform_admin", "super_admin"].includes(profile.role)) {
        if (!cancelled) setView("forbidden");
        return;
      }

      if (cancelled) return;
      setView("loading");

      const response = await fetch("/api/admin/billing/seats");
      const body = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(body.error ?? "Couldn't load the license seat ledger.");
        setView("error");
        return;
      }

      setLedger(body.ledger as SeatLedgerEntry[]);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalConsumed = ledger.reduce((sum, entry) => sum + entry.consumedSeats, 0);
  const totalCapacity = ledger.reduce((sum, entry) => sum + (entry.maxSeats ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {invoiceEntry && <InvoiceModal entry={invoiceEntry} onClose={() => setInvoiceEntry(null)} />}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">B2B License Seat Manager</h1>
          </div>
          <Link href="/admin/institutions" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Institutions →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your admin access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as a platform admin to view this page.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              Only super admin and platform admin accounts can view institutional billing data.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the license seat ledger...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the license ledger: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Onboarded Institutions</p>
                <p className="mt-2 text-4xl font-bold text-brand-600">{ledger.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Seats Consumed</p>
                <p className="mt-2 text-4xl font-bold text-violet-600">{totalConsumed.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Licensed Capacity</p>
                <p className="mt-2 text-4xl font-bold text-amber-600">{totalCapacity.toLocaleString()}</p>
              </div>
            </div>

            {ledger.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No onboarded institutions yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ledger.map((entry) => (
                  <SeatUtilizationCard key={entry.institutionId} entry={entry} onExportInvoice={setInvoiceEntry} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusPanel({
  tone,
  children,
}: {
  tone: "neutral" | "warning" | "error";
  children: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "border-slate-200 bg-white text-slate-600",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return <div className={`rounded-lg border px-4 py-3 text-sm ${toneClasses}`}>{children}</div>;
}

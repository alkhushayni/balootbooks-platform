"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuditLogEntry } from "./types";
import LogTable from "./LogTable";
import MetadataInspector from "./MetadataInspector";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function AuditLogLedgerPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

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

      const response = await fetch("/api/admin/audit-logs");
      const body = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(body.error ?? "Couldn't load the audit log.");
        setView("error");
        return;
      }

      setEntries(body.entries as AuditLogEntry[]);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {selectedEntry && <MetadataInspector entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Real-Time Audit Log Ledger</h1>
          </div>
          <Link href="/admin/billing" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Billing →
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
              Only super admin and platform admin accounts can view the compliance ledger.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the audit log ledger...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the audit log: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div>
            <p className="mb-4 text-xs text-slate-400">
              {entries.length} event{entries.length === 1 ? "" : "s"} recorded · click a row to inspect its metadata
            </p>
            <LogTable entries={entries} onSelect={setSelectedEntry} />
          </div>
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

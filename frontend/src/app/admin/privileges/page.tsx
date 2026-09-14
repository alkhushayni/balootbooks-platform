"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CapabilityKey, PrivilegeEntry, ToastState } from "./types";
import PrivilegeMatrixTable from "./PrivilegeMatrixTable";
import Toast from "./Toast";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function SuperAdminPrivilegeMatrixPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<PrivilegeEntry[]>([]);
  const [savingAdminId, setSavingAdminId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadEntries = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setView("signed-out");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      setView("forbidden");
      return;
    }

    setView("loading");

    const response = await fetch("/api/admin/privileges");
    const body = await response.json();

    if (!response.ok) {
      setErrorMessage(body.error ?? "Couldn't load the privilege matrix.");
      setView("error");
      return;
    }

    setEntries(body.entries as PrivilegeEntry[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleToggle(adminId: string, key: CapabilityKey, nextValue: boolean) {
    const target = entries.find((entry) => entry.adminId === adminId);
    if (!target) return;

    const nextEntry: PrivilegeEntry = { ...target, [key]: nextValue };

    setSavingAdminId(adminId);
    setEntries((current) => current.map((entry) => (entry.adminId === adminId ? nextEntry : entry)));

    try {
      const response = await fetch("/api/admin/privileges/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          canPromptAiFactory: nextEntry.canPromptAiFactory,
          canVerifyFaculty: nextEntry.canVerifyFaculty,
          canManageBilling: nextEntry.canManageBilling,
          canViewAuditLogs: nextEntry.canViewAuditLogs,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        // Roll back the optimistic toggle on failure.
        setEntries((current) => current.map((entry) => (entry.adminId === adminId ? target : entry)));
        setToast({ tone: "error", message: body.error ?? "Couldn't update this privilege." });
        return;
      }

      setToast({ tone: "success", message: `Updated privileges for ${target.fullName}.` });
    } catch {
      setEntries((current) => current.map((entry) => (entry.adminId === adminId ? target : entry)));
      setToast({ tone: "error", message: "Couldn't reach the privilege service. Try again." });
    } finally {
      setSavingAdminId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Super Admin Privilege Matrix</h1>
          </div>
          <Link href="/admin/audit-logs" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Audit Logs →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your admin access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as a super admin to view this page.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              Only super admin accounts can view the privilege matrix. Platform admins are not
              permitted here.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the privilege matrix...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the privilege matrix: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-lg">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-400">Master Key Active</p>
              <p className="mt-1 text-sm text-slate-200">
                Administrative Capabilities Sovereignty Board — changes here take effect immediately
                and are permanently logged.
              </p>
            </div>

            <PrivilegeMatrixTable entries={entries} savingAdminId={savingAdminId} onToggle={handleToggle} />
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

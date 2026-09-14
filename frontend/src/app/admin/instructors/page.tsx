"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { InstructorAccount, ToastState } from "./types";
import FacultyRegistryTable from "./FacultyRegistryTable";
import Toast from "./Toast";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function GlobalFacultyVerificationPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<InstructorAccount[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadAccounts = useCallback(async () => {
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

    if (profileError || !profile || !["platform_admin", "super_admin"].includes(profile.role)) {
      setView("forbidden");
      return;
    }

    setView("loading");

    const { data, error } = await supabase.rpc("list_instructor_accounts");

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    setAccounts((data ?? []) as InstructorAccount[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const pendingCount = accounts.filter((account) => account.role === "unverified_instructor").length;

  function handleUpdated(message: string) {
    setToast({ tone: "success", message });
    loadAccounts();
  }

  function handleError(message: string) {
    setToast({ tone: "error", message });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Global Faculty Verification</h1>
          </div>
          <Link
            href="/admin-portal/catalog-manager"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Catalog Manager →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
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
              Only super admin and platform admin accounts can manage faculty verification.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the faculty registry...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load faculty accounts: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total Pending Applications
                </p>
                <p className="mt-2 text-4xl font-bold text-amber-600">{pendingCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {accounts.length} total instructor-track account{accounts.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <FacultyRegistryTable accounts={accounts} onUpdated={handleUpdated} onError={handleError} />
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

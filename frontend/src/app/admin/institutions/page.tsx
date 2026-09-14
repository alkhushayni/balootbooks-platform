"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { InstitutionRow, ToastState } from "./types";
import OnboardForm from "./OnboardForm";
import InstitutionsTable from "./InstitutionsTable";
import Toast from "./Toast";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function MultiTenantInstitutionsPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadInstitutions = useCallback(async () => {
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

    const { data, error } = await supabase
      .from("institutions")
      .select("id, name, max_license_seats, tenant_domains(domain_string)")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    setInstitutions((data ?? []) as unknown as InstitutionRow[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  function handleOnboarded(message: string) {
    setToast({ tone: "success", message });
    loadInstitutions();
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
            <h1 className="mt-1 text-xl font-bold text-slate-900">Institution Onboarding &amp; Domain Router</h1>
          </div>
          <Link href="/admin/instructors" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Faculty Verification →
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
              Only super admin and platform admin accounts can manage institution tenants.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading onboarded institutions...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load institutions: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div className="space-y-6">
            <OnboardForm onOnboarded={handleOnboarded} onError={handleError} />
            <InstitutionsTable institutions={institutions} />
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

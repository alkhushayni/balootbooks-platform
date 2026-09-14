"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PendingInstructor } from "./types";
import PendingInstructorsTable from "./PendingInstructorsTable";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function InstructorVerificationPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingInstructor[]>([]);

  const loadPending = useCallback(async () => {
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

    if (profileError || !profile || !["super_admin", "platform_admin"].includes(profile.role)) {
      setView("forbidden");
      return;
    }

    setView("loading");

    const { data, error } = await supabase.rpc("list_unverified_instructors");

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    setPending((data ?? []) as PendingInstructor[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Instructor Verification</h1>
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
        {view === "checking-access" && (
          <StatusPanel tone="neutral">Checking your admin access...</StatusPanel>
        )}

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
              Only super admin and platform admin accounts can review instructor applications.
            </p>
          </div>
        )}

        {view === "loading" && (
          <StatusPanel tone="neutral">Loading pending applications...</StatusPanel>
        )}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load applications: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Pending instructor applications</h2>
              <p className="text-sm text-slate-500">
                {pending.length} account{pending.length === 1 ? "" : "s"} awaiting review.
              </p>
            </div>
            <PendingInstructorsTable pending={pending} onVerified={loadPending} />
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

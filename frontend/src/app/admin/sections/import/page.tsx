"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ClassOption, ImportResult, InstitutionOption, RosterEntry, ToastState } from "./types";
import CsvDropzone from "./CsvDropzone";
import RosterPreviewTable from "./RosterPreviewTable";
import TallyLedger, { type TallyEntry } from "./TallyLedger";
import Toast from "./Toast";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

type ClassRow = { id: string; course_identifier: string; section_title: string; term_token: string };

export default function StudentRosterImportPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [classId, setClassId] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [rosterRows, setRosterRows] = useState<RosterEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tally, setTally] = useState<TallyEntry[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadDashboard = useCallback(async () => {
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

    const [classesResult, institutionsResult] = await Promise.all([
      supabase
        .from("classes")
        .select("id, course_identifier, section_title, term_token")
        .order("created_at", { ascending: false }),
      supabase.from("institutions").select("id, name").order("name", { ascending: true }),
    ]);

    if (classesResult.error) {
      setErrorMessage(classesResult.error.message);
      setView("error");
      return;
    }
    if (institutionsResult.error) {
      setErrorMessage(institutionsResult.error.message);
      setView("error");
      return;
    }

    setClasses(
      ((classesResult.data ?? []) as ClassRow[]).map((row) => ({
        id: row.id,
        label: `${row.course_identifier} — ${row.section_title} (${row.term_token})`,
      }))
    );
    setInstitutions((institutionsResult.data ?? []) as InstitutionOption[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleImport() {
    if (!classId || !institutionId) {
      setToast({ tone: "error", message: "Select a class section and an institutional tenant first." });
      return;
    }
    if (rosterRows.length === 0) {
      setToast({ tone: "error", message: "Upload a roster .csv file first." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/sections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, institutionId, roster: rosterRows }),
      });

      const body = await response.json();

      if (!response.ok) {
        setToast({ tone: "error", message: body.error ?? "Couldn't import this roster." });
        return;
      }

      const result = body as ImportResult;
      const classLabel = classes.find((option) => option.id === classId)?.label ?? "Class section";

      setTally((current) => [
        {
          key: crypto.randomUUID(),
          classLabel,
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          completedAt: new Date().toISOString(),
        },
        ...current,
      ]);

      setToast({
        tone: result.skippedCount > 0 ? "error" : "success",
        message:
          result.skippedCount > 0
            ? `Imported ${result.importedCount}, skipped ${result.skippedCount} row(s).`
            : `Imported ${result.importedCount} student${result.importedCount === 1 ? "" : "s"} successfully.`,
      });

      setRosterRows([]);
    } catch {
      setToast({ tone: "error", message: "Couldn't reach the import service. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Student Enrollment CSV Import Matrix</h1>
          </div>
          <Link href="/admin/sections" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Section Allocation →
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
              Only super admin and platform admin accounts can bulk-import student rosters.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the import console...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the import console: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div className="space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Roster Target</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="target_class" className="block text-xs font-medium text-slate-600">
                    Class Section
                  </label>
                  <select
                    id="target_class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select a class section...</option>
                    {classes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="target_institution" className="block text-xs font-medium text-slate-600">
                    Institutional Tenant
                  </label>
                  <select
                    id="target_institution"
                    value={institutionId}
                    onChange={(event) => setInstitutionId(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select an institution...</option>
                    {institutions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Roster CSV Upload</h2>
              <p className="mt-1 text-xs text-slate-500">
                Only rows whose email domain is whitelisted for the selected institution will import.
              </p>
              <div className="mt-4">
                <CsvDropzone onParsed={setRosterRows} />
              </div>
            </div>

            <RosterPreviewTable rows={rosterRows} />

            <button
              type="button"
              onClick={handleImport}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {submitting ? "Importing..." : "Execute Mass Roster Import"}
            </button>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Import Tally Ledger</h2>
              <TallyLedger entries={tally} />
            </div>
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

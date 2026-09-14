"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ComplianceResponse } from "./types";
import MetricCard from "./MetricCard";
import CourseCohortTable from "./CourseCohortTable";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function DepartmentChairDashboardPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<ComplianceResponse | null>(null);

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

      if (profileError || !profile || profile.role !== "department_chair") {
        if (!cancelled) setView("forbidden");
        return;
      }

      if (cancelled) return;
      setView("loading");

      const response = await fetch("/api/chair/compliance");
      const body = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(body.error ?? "Couldn't load compliance data.");
        setView("error");
        return;
      }

      setData(body as ComplianceResponse);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Department Chair Compliance View</h1>
          </div>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Switch account →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your governance access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as a department chair to view this dashboard.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              This control room is only available to department chair accounts.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading department compliance data...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load your compliance dashboard: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && data && !data.institutionId && (
          <StatusPanel tone="warning">
            Your chair account isn&apos;t linked to an institution yet. Ask a platform admin to set your
            institution before this dashboard can show any classes.
          </StatusPanel>
        )}

        {view === "ready" && data && data.institutionId && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <MetricCard
                label="Total Department Enrolled Students"
                value={String(data.totalEnrolledStudents)}
                caption={`Across ${data.classes.length} running class${data.classes.length === 1 ? "" : "es"}`}
                accent="brand"
              />
              <MetricCard
                label="Active Sandbox Classrooms"
                value={String(data.activeSandboxClassrooms)}
                caption="Classes with instructor curriculum customizations"
                accent="violet"
              />
              <MetricCard
                label="Global Curriculum Compliance Average"
                value={
                  data.curriculumComplianceAverage === null ? "—" : `${data.curriculumComplianceAverage}%`
                }
                caption="Average master chapter visibility across classes"
                accent="amber"
              />
            </div>

            <div className="mt-10">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Course Cohort Registry</h2>
              <CourseCohortTable classes={data.classes} />
            </div>
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

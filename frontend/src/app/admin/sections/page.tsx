"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AllocatedClass, CatalogCourse, ToastState, VerifiedInstructor } from "./types";
import ProvisioningForm from "./ProvisioningForm";
import SectionRegistryGrid from "./SectionRegistryGrid";
import Toast from "./Toast";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

type InstructorAccountRow = { id: string; full_name: string; role: string };

export default function SectionAllocationManagerPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [instructors, setInstructors] = useState<VerifiedInstructor[]>([]);
  const [classes, setClasses] = useState<AllocatedClass[]>([]);
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

    const [coursesResult, instructorsResult, classesResult] = await Promise.all([
      supabase.from("courses").select("id, title").order("title", { ascending: true }),
      supabase.rpc("list_instructor_accounts"),
      supabase
        .from("classes")
        .select("id, course_identifier, section_title, term_token, join_code, instructor_id")
        .order("created_at", { ascending: false }),
    ]);

    if (coursesResult.error) {
      setErrorMessage(coursesResult.error.message);
      setView("error");
      return;
    }
    if (instructorsResult.error) {
      setErrorMessage(instructorsResult.error.message);
      setView("error");
      return;
    }
    if (classesResult.error) {
      setErrorMessage(classesResult.error.message);
      setView("error");
      return;
    }

    const verifiedInstructors = ((instructorsResult.data ?? []) as InstructorAccountRow[])
      .filter((account) => account.role === "instructor")
      .map((account) => ({ id: account.id, full_name: account.full_name }));

    setCourses((coursesResult.data ?? []) as CatalogCourse[]);
    setInstructors(verifiedInstructors);
    setClasses((classesResult.data ?? []) as AllocatedClass[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleProvisioned(created: AllocatedClass[]) {
    setClasses((current) => [...created, ...current]);
    setToast({
      tone: "success",
      message: `Provisioned ${created.length} section${created.length === 1 ? "" : "s"} successfully.`,
    });
  }

  function handleError(message: string) {
    setToast({ tone: "error", message });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Master Section Allocation Manager</h1>
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
              Only super admin and platform admin accounts can provision classroom sections.
            </p>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the allocation console...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the allocation console: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div className="space-y-8">
            <ProvisioningForm
              courses={courses}
              instructors={instructors}
              onProvisioned={handleProvisioned}
              onError={handleError}
            />

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Section Registry</h2>
              <SectionRegistryGrid classes={classes} instructors={instructors} />
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

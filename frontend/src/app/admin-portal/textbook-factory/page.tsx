"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CourseOption, GenerationResult } from "./types";
import GenerationForm from "./GenerationForm";
import GenerationPreview from "./GenerationPreview";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function TextbookFactoryPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const loadCourses = useCallback(async () => {
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

    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .eq("is_published", true)
      .order("title");

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    setCourses((data ?? []) as CourseOption[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">AI Textbook Factory</h1>
          </div>
          <Link
            href="/admin-portal/settings"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            System Settings →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
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
              Only super admin and platform admin accounts can use the AI Textbook Factory.
            </p>
          </div>
        )}

        {view === "loading" && (
          <StatusPanel tone="neutral">Loading published courses...</StatusPanel>
        )}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load courses: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <GenerationForm courses={courses} onResult={setResult} />
            <GenerationPreview result={result} />
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

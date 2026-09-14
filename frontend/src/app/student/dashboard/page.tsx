"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ClassCard, { type EnrolledClass } from "./ClassCard";
import JoinClassForm from "./JoinClassForm";

type ViewState = "checking-access" | "signed-out" | "loading" | "error" | "ready";

export default function StudentDashboardPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const loadEnrollments = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setView("signed-out");
      return;
    }

    setView("loading");

    const { data, error } = await supabase
      .from("enrollments")
      .select("class_id, classes(id, course_id, course_identifier, section_title, term_token)")
      .eq("student_id", user.id);

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    // PostgREST embeds a belongs-to relation as a single object in most configurations, but
    // without generated Database types the client can't guarantee that shape — normalize both.
    const enrolledClasses = (data ?? [])
      .flatMap((row) => (Array.isArray(row.classes) ? row.classes : row.classes ? [row.classes] : []))
      .filter((classInfo): classInfo is EnrolledClass => Boolean(classInfo));

    setClasses(enrolledClasses);
    setView("ready");
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">My Library</h1>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            Your active classes and interactive course sections, all in one place.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Loading your library...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in to view your classes.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading your classes...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load your classes: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            {classes.length === 0 ? (
              <JoinClassForm onEnrolled={loadEnrollments} />
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Your classes</h2>
                    <p className="text-sm text-slate-500">
                      {classes.length} active class{classes.length === 1 ? "" : "es"}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJoinForm((value) => !value)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {showJoinForm ? "Cancel" : "+ Join another class"}
                  </button>
                </div>

                {showJoinForm && (
                  <div className="mb-8">
                    <JoinClassForm
                      onEnrolled={() => {
                        setShowJoinForm(false);
                        loadEnrollments();
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {classes.map((classInfo) => (
                    <ClassCard key={classInfo.id} classInfo={classInfo} />
                  ))}
                </div>
              </>
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

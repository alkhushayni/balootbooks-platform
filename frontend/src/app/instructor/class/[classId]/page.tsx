"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ClassMeta, RosterEntry } from "./types";
import RosterTable from "./RosterTable";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function InstructorClassPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classMeta, setClassMeta] = useState<ClassMeta | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [flaggedStudentIds, setFlaggedStudentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

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

      // classes RLS already scopes SELECT to instructor_id = auth.uid(), so a row for a class
      // this instructor doesn't own simply won't come back — no separate check needed here.
      const { data: classRow, error: classError } = await supabase
        .from("classes")
        .select("id, course_identifier, section_title, term_token, join_code, courses(title)")
        .eq("id", classId)
        .single();

      if (cancelled) return;

      if (classError || !classRow) {
        setView("forbidden");
        return;
      }

      const relatedCourse = Array.isArray(classRow.courses) ? classRow.courses[0] : classRow.courses;

      setClassMeta({
        id: classRow.id,
        course_identifier: classRow.course_identifier,
        section_title: classRow.section_title,
        term_token: classRow.term_token,
        join_code: classRow.join_code,
        course_title: relatedCourse?.title ?? classRow.section_title,
      });

      setView("loading");

      // The ownership check is enforced again, authoritatively, inside this function itself —
      // the classes fetch above is a UX shortcut, not the real security boundary.
      const { data: rosterData, error: rosterError } = await supabase.rpc("get_class_roster", {
        p_class_id: classId,
      });

      if (cancelled) return;

      if (rosterError) {
        setErrorMessage(rosterError.message);
        setView("error");
        return;
      }

      setRoster((rosterData ?? []) as RosterEntry[]);

      // lab_submissions RLS already scopes visibility to this instructor's/co-instructor's own
      // course sections, so an unfiltered flagged-rows query is safe here - no separate ownership
      // check needed, same pattern as the classes fetch above.
      const { data: flaggedRows } = await supabase
        .from("lab_submissions")
        .select("student_id")
        .eq("is_flagged_duplicate", true);

      if (!cancelled && flaggedRows) {
        setFlaggedStudentIds(new Set(flaggedRows.map((row) => row.student_id)));
      }

      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  async function handleCopyJoinCode() {
    if (!classMeta) return;
    try {
      await navigator.clipboard.writeText(classMeta.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — the code is still visible on screen to copy by hand.
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link
            href="/instructor/course-manager"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Course Manager
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as the class instructor to view this roster.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <StatusPanel tone="warning">
            This class doesn&apos;t exist, or you&apos;re not its instructor.
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the class roster...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the roster: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && classMeta && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-brand-600">{classMeta.course_identifier}</p>
                  <h1 className="mt-1 text-xl font-bold text-slate-900">{classMeta.course_title}</h1>
                  <p className="mt-1 text-sm text-slate-500">{classMeta.section_title}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {classMeta.term_token}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm font-semibold tracking-widest text-slate-700 transition hover:bg-slate-50"
                  >
                    {classMeta.join_code}
                    <span className="font-sans text-xs font-normal text-brand-600">
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Roster</h2>
                <p className="text-sm text-slate-500">
                  {roster.length} student{roster.length === 1 ? "" : "s"} enrolled.
                </p>
              </div>
              <RosterTable roster={roster} flaggedStudentIds={flaggedStudentIds} />
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

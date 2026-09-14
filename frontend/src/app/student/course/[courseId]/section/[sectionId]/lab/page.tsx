"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { SectionPayload } from "./types";
import Terminal from "./Terminal";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "not-enrolled"
  | "loading"
  | "error"
  | "ready";

export default function LabTerminalPage() {
  const params = useParams<{ courseId: string; sectionId: string }>();
  const { courseId, sectionId } = params;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [section, setSection] = useState<SectionPayload | null>(null);

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

      if (profileError || !profile || profile.role !== "student") {
        if (!cancelled) setView("forbidden");
        return;
      }

      // Enrollment is keyed on classes.course_id, same pattern as the reading view -
      // a match here proves this student has an active class for this course.
      const { data: enrollmentRows, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id, classes!inner(course_id)")
        .eq("student_id", user.id)
        .eq("classes.course_id", courseId);

      if (cancelled) return;

      if (enrollmentError) {
        setErrorMessage(enrollmentError.message);
        setView("error");
        return;
      }

      if (!enrollmentRows || enrollmentRows.length === 0) {
        setView("not-enrolled");
        return;
      }

      setView("loading");

      // sectionId may point at either a master public.sections row or a class-private
      // class_custom_sections row (Step 16) - try both, whichever resolves wins.
      const [courseResult, masterResult, customResult] = await Promise.all([
        supabase.from("courses").select("title").eq("id", courseId).single(),
        supabase.from("sections").select("id, title, markdown_content").eq("id", sectionId).maybeSingle(),
        supabase
          .from("class_custom_sections")
          .select("id, title, markdown_content")
          .eq("id", sectionId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (courseResult.error || !courseResult.data) {
        setErrorMessage(courseResult.error?.message ?? "Course not found.");
        setView("error");
        return;
      }

      const resolvedSection = masterResult.data ?? customResult.data;

      if (!resolvedSection) {
        setErrorMessage("Section not found.");
        setView("error");
        return;
      }

      setCourseTitle(courseResult.data.title);
      setSection(resolvedSection);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, sectionId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Virtual Lab Workspace{section ? ` — ${section.title}` : ""}
            </h1>
          </div>
          <Link href={`/student/course/${courseId}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to course
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in to open this lab.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">This lab workspace is only available to student accounts.</p>
          </div>
        )}

        {view === "not-enrolled" && (
          <StatusPanel tone="warning">
            You&apos;re not enrolled in a class for this course yet.{" "}
            <Link href="/student/dashboard" className="font-medium text-brand-600 hover:text-brand-700">
              Join with a class code
            </Link>
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the lab workspace...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load this lab: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && section && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Lab
              </span>
              <div className="prose prose-slate mt-6 max-w-none prose-headings:font-semibold prose-a:text-brand-600">
                {section.markdown_content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown_content}</ReactMarkdown>
                ) : (
                  <p className="text-slate-400">This lab doesn&apos;t have any instructions yet.</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Interactive Virtual Terminal
              </p>
              <Terminal courseTitle={courseTitle} />
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

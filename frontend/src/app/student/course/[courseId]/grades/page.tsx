"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ExamResult, VisibleSection } from "./types";
import MetricCard from "./MetricCard";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "not-enrolled"
  | "loading"
  | "error"
  | "ready";

type MasterChapterRow = {
  id: string;
  title: string;
  sections: { id: string; title: string; content_type: "READING" | "LAB" }[];
};

type ChapterOverrideRow = {
  id: string;
  chapter_id: string | null;
  title: string | null;
  is_hidden: boolean;
  class_custom_sections: { id: string; title: string; content_type: "READING" | "LAB" }[] | null;
};

// Same reorder/hide-aware merge as the course reader (Step 18) and completion tracker
// (Step 19) - a student's grades should reflect exactly the sections they can actually see,
// never a chapter their instructor hid.
function buildVisibleSections(masterChapters: MasterChapterRow[], overrides: ChapterOverrideRow[]): VisibleSection[] {
  const overrideByChapterId = new Map<string, ChapterOverrideRow>();
  const customChapterOverrides: ChapterOverrideRow[] = [];

  for (const override of overrides) {
    if (override.chapter_id) {
      overrideByChapterId.set(override.chapter_id, override);
    } else {
      customChapterOverrides.push(override);
    }
  }

  const sections: VisibleSection[] = [];

  for (const chapter of masterChapters) {
    const override = overrideByChapterId.get(chapter.id);
    if (override?.is_hidden) continue;

    for (const section of chapter.sections) {
      sections.push({
        id: section.id,
        title: section.title,
        chapterTitle: chapter.title,
        contentType: section.content_type,
        isCustom: false,
      });
    }

    for (const custom of override?.class_custom_sections ?? []) {
      sections.push({
        id: custom.id,
        title: custom.title,
        chapterTitle: chapter.title,
        contentType: custom.content_type,
        isCustom: true,
      });
    }
  }

  for (const override of customChapterOverrides) {
    if (override.is_hidden) continue;
    for (const custom of override.class_custom_sections ?? []) {
      sections.push({
        id: custom.id,
        title: custom.title,
        chapterTitle: override.title ?? "Untitled chapter",
        contentType: custom.content_type,
        isCustom: true,
      });
    }
  }

  return sections;
}

export default function GradesPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [sections, setSections] = useState<VisibleSection[]>([]);
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<string>>(new Set());
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0 });
  const [examResults, setExamResults] = useState<ExamResult[]>([]);

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

      const { data: enrollmentRows, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id, classes!inner(id, course_id)")
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

      const relatedClass = Array.isArray(enrollmentRows[0].classes)
        ? enrollmentRows[0].classes[0]
        : enrollmentRows[0].classes;
      const classId = relatedClass?.id;

      if (!classId) {
        setErrorMessage("Couldn't resolve your class for this course.");
        setView("error");
        return;
      }

      setView("loading");

      const [courseResult, overridesResult, progressResult, examsResult] = await Promise.all([
        supabase
          .from("courses")
          .select("title, chapters(id, title, sections(id, title, content_type))")
          .eq("id", courseId)
          .single(),
        supabase
          .from("class_chapter_overrides")
          .select("id, chapter_id, title, is_hidden, class_custom_sections(id, title, content_type)")
          .eq("class_id", classId),
        supabase
          .from("student_progress")
          .select("section_id, class_custom_section_id, participation_percentage, lab_percentage")
          .eq("student_id", user.id),
        supabase.from("exams").select("id, title").eq("class_id", classId),
      ]);

      if (cancelled) return;

      if (courseResult.error || !courseResult.data) {
        setErrorMessage(courseResult.error?.message ?? "Course not found.");
        setView("error");
        return;
      }

      const visibleSections = buildVisibleSections(
        (courseResult.data.chapters ?? []) as MasterChapterRow[],
        (overridesResult.data ?? []) as ChapterOverrideRow[]
      );

      const completed = new Set<string>();
      for (const row of progressResult.data ?? []) {
        if (row.participation_percentage >= 100 || row.lab_percentage >= 100) {
          const id = row.section_id ?? row.class_custom_section_id;
          if (id) completed.add(id);
        }
      }

      const masterSectionIds = visibleSections.filter((s) => !s.isCustom).map((s) => s.id);
      const customSectionIds = visibleSections.filter((s) => s.isCustom).map((s) => s.id);

      const [masterQuestions, customQuestions] = await Promise.all([
        masterSectionIds.length > 0
          ? supabase.from("quiz_questions").select("id").in("section_id", masterSectionIds)
          : Promise.resolve({ data: [] as { id: string }[] }),
        customSectionIds.length > 0
          ? supabase.from("quiz_questions").select("id").in("class_custom_section_id", customSectionIds)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ]);

      const questionIds = [
        ...(masterQuestions.data ?? []).map((q) => q.id),
        ...(customQuestions.data ?? []).map((q) => q.id),
      ];

      const exams = examsResult.data ?? [];
      const examIds = exams.map((exam) => exam.id);
      const examTitleById = new Map(exams.map((exam) => [exam.id, exam.title]));

      const [quizSubmissionsResult, examAttemptsResult] = await Promise.all([
        questionIds.length > 0
          ? supabase.from("quiz_submissions").select("is_correct").eq("student_id", user.id).in("question_id", questionIds)
          : Promise.resolve({ data: [] as { is_correct: boolean }[] }),
        examIds.length > 0
          ? supabase
              .from("exam_attempts")
              .select("exam_id, score_percentage, completed_at")
              .eq("student_id", user.id)
              .in("exam_id", examIds)
          : Promise.resolve({ data: [] as { exam_id: string; score_percentage: number; completed_at: string }[] }),
      ]);

      if (cancelled) return;

      const submissions = quizSubmissionsResult.data ?? [];
      const quizCorrect = submissions.filter((row) => row.is_correct).length;

      const attempts: ExamResult[] = (examAttemptsResult.data ?? []).map((row) => ({
        examId: row.exam_id,
        examTitle: examTitleById.get(row.exam_id) ?? "Untitled exam",
        scorePercentage: row.score_percentage,
        completedAt: row.completed_at,
      }));

      setCourseTitle(courseResult.data.title);
      setSections(visibleSections);
      setCompletedSectionIds(completed);
      setQuizStats({ total: submissions.length, correct: quizCorrect });
      setExamResults(attempts);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const readingProgressPct =
    sections.length > 0 ? Math.round((completedSectionIds.size / sections.length) * 100) : null;
  const quizAccuracyPct =
    quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : null;
  const examAveragePct =
    examResults.length > 0
      ? Math.round(
          (examResults.reduce((sum, result) => sum + result.scorePercentage, 0) / examResults.length) * 100
        ) / 100
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              My Grades{courseTitle ? ` — ${courseTitle}` : ""}
            </h1>
          </div>
          <Link href={`/student/course/${courseId}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to course
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in to view your grades.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">This dashboard is only available to student accounts.</p>
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

        {view === "loading" && <StatusPanel tone="neutral">Loading your performance data...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load your grades: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <MetricCard
                label="Reading Completion"
                value={readingProgressPct === null ? "—" : `${readingProgressPct}%`}
                caption={
                  sections.length === 0
                    ? "No sections available yet."
                    : `${completedSectionIds.size} of ${sections.length} sections complete`
                }
                accent="brand"
              />
              <MetricCard
                label="Chapter Quiz Accuracy"
                value={quizAccuracyPct === null ? "—" : `${quizAccuracyPct}%`}
                caption={
                  quizStats.total === 0
                    ? "No practice questions attempted yet."
                    : `${quizStats.correct} of ${quizStats.total} correct`
                }
                accent="violet"
              />
              <MetricCard
                label="Exam Average Grade"
                value={examAveragePct === null ? "—" : `${examAveragePct}%`}
                caption={
                  examResults.length === 0
                    ? "No exams completed yet."
                    : `Across ${examResults.length} exam${examResults.length === 1 ? "" : "s"}`
                }
                accent="amber"
              />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Reading &amp; Lab Checklist</h2>
                </div>
                {sections.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-400">No sections available yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {sections.map((section) => {
                      const isComplete = completedSectionIds.has(section.id);
                      return (
                        <li key={section.id} className="flex items-center gap-3 px-5 py-3">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isComplete ? "bg-emerald-500 text-white" : "border border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{section.title}</p>
                            <p className="text-xs text-slate-400">
                              {section.chapterTitle} · {section.contentType}
                              {section.isCustom && " · Custom"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Exam Attempts</h2>
                </div>
                {examResults.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-400">No exams completed yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {examResults.map((result) => (
                      <li key={result.examId} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{result.examTitle}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(result.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            result.scorePercentage >= 70
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {result.scorePercentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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

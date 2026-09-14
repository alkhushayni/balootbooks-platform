"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ExamMeta, ExamQuestion } from "./types";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "not-enrolled"
  | "loading"
  | "error"
  | "ready";

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function ExamWorkspacePage() {
  const params = useParams<{ courseId: string; examId: string }>();
  const { courseId, examId } = params;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scorePercentage: number } | null>(null);
  const submittingRef = useRef(false);

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

      const { data: examRow, error: examError } = await supabase
        .from("exams")
        .select("id, title, time_limit_mins, class_id")
        .eq("id", examId)
        .single();

      if (cancelled) return;

      if (examError || !examRow) {
        setErrorMessage(examError?.message ?? "Exam not found.");
        setView("error");
        return;
      }

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("class_id", examRow.class_id)
        .maybeSingle();

      if (cancelled) return;

      if (!enrollment) {
        setView("not-enrolled");
        return;
      }

      setView("loading");

      const { data: questionRows, error: questionsError } = await supabase
        .from("exam_questions")
        .select("id, question_text, options, display_order")
        .eq("exam_id", examId)
        .order("display_order");

      if (cancelled) return;

      if (questionsError) {
        setErrorMessage(questionsError.message);
        setView("error");
        return;
      }

      setExam(examRow);
      setQuestions((questionRows ?? []) as ExamQuestion[]);
      setRemainingSeconds(examRow.time_limit_mins * 60);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, examId]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || result) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const answers = Object.entries(selected).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
    }));

    try {
      const response = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, answers }),
      });

      const body = await response.json();

      if (!response.ok) {
        setSubmitError(body.error ?? "Couldn't submit the exam.");
        submittingRef.current = false;
        return;
      }

      setResult({ scorePercentage: body.scorePercentage });
    } catch {
      setSubmitError("Couldn't reach the exam service. Try again.");
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [examId, result, selected]);

  // Recursive setTimeout rather than setInterval - each tick reschedules off the freshly read
  // state, so there's no drift and no stale-closure risk. Fires the auto-submit exactly once
  // when the countdown reaches zero, guarded by `result` so it can't re-trigger after grading.
  useEffect(() => {
    if (view !== "ready" || result || remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      void handleSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((current) => (current !== null ? current - 1 : current));
    }, 1000);

    return () => clearTimeout(timer);
  }, [view, result, remainingSeconds, handleSubmit]);

  function selectOption(questionId: string, index: number) {
    if (submitting || result) return;
    setSelected((current) => ({ ...current, [questionId]: index }));
  }

  const allAnswered = questions.length > 0 && questions.every((question) => selected[question.id] !== undefined);
  const isLowTime = remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <div className="min-h-screen bg-slate-50">
      {view === "ready" && exam && !result && (
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <h1 className="text-lg font-bold text-slate-900">{exam.title}</h1>
            <span
              className={`rounded-md px-3 py-1.5 font-mono text-sm font-semibold ${
                isLowTime ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {formatCountdown(remainingSeconds ?? 0)}
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in to take this exam.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">This exam is only available to student accounts.</p>
          </div>
        )}

        {view === "not-enrolled" && (
          <StatusPanel tone="warning">
            You&apos;re not enrolled in the class this exam belongs to.{" "}
            <Link href="/student/dashboard" className="font-medium text-brand-600 hover:text-brand-700">
              Join with a class code
            </Link>
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the exam...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load this exam: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-emerald-800">Exam submitted</h2>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{result.scorePercentage}%</p>
            <Link
              href={`/student/course/${courseId}`}
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              ← Back to course
            </Link>
          </div>
        )}

        {view === "ready" && !result && (
          <>
            <p className="mb-6 text-sm text-slate-500">
              {questions.length} question{questions.length === 1 ? "" : "s"} - answer everything before time runs
              out, then submit for grading.
            </p>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">
                    {index + 1}. {question.question_text}
                  </p>
                  <div className="mt-3 space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isChecked = selected[question.id] === optionIndex;
                      return (
                        <label
                          key={optionIndex}
                          className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition ${
                            isChecked ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`exam-${question.id}`}
                            checked={isChecked}
                            disabled={submitting}
                            onChange={() => selectOption(question.id, optionIndex)}
                            className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !allAnswered}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {submitting ? "Submitting..." : "Submit Exam for Grading"}
            </button>
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

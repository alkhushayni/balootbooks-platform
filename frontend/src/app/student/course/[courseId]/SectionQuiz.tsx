"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SectionNode } from "./types";

type QuizQuestion = {
  id: string;
  question_text: string;
  options: string[];
};

type GradeResult = { isCorrect: boolean; correctIndex: number };

export default function SectionQuiz({ section }: { section: SectionNode }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, GradeResult>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected({});
    setResults({});
    setError(null);

    (async () => {
      const supabase = createClient();
      const column = section.is_custom ? "class_custom_section_id" : "section_id";

      // Deliberately never select correct_index here - that column is only ever read
      // server-side, inside /api/quiz/submit, after the student has answered.
      const { data, error: fetchError } = await supabase
        .from("quiz_questions")
        .select("id, question_text, options")
        .eq(column, section.id);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setQuestions((data ?? []) as QuizQuestion[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [section.id, section.is_custom]);

  function selectOption(questionId: string, index: number) {
    if (results[questionId]) return;
    setSelected((current) => ({ ...current, [questionId]: index }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const graded: Record<string, GradeResult> = {};

      for (const question of questions) {
        if (results[question.id] || selected[question.id] === undefined) continue;

        const response = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, selectedIndex: selected[question.id] }),
        });

        const body = await response.json();

        if (!response.ok) {
          setError(body.error ?? "Couldn't submit quiz answers.");
          return;
        }

        graded[question.id] = body as GradeResult;
      }

      setResults((current) => ({ ...current, ...graded }));
    } catch {
      setError("Couldn't reach the quiz service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || questions.length === 0) return null;

  const allAnswered = questions.every((question) => selected[question.id] !== undefined || results[question.id]);
  const allGraded = questions.every((question) => results[question.id]);

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-bold text-slate-900">Check your understanding</h2>

      <div className="mt-4 space-y-6">
        {questions.map((question) => {
          const result = results[question.id];

          return (
            <div key={question.id} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{question.question_text}</p>

              <div className="mt-3 space-y-2">
                {question.options.map((option, index) => {
                  const isChecked = selected[question.id] === index;
                  const isCorrectOption = Boolean(result) && index === result.correctIndex;
                  const isSelectedWrong = Boolean(result) && isChecked && !result.isCorrect;

                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition ${
                        result
                          ? isCorrectOption
                            ? "border-emerald-300 bg-emerald-50"
                            : isSelectedWrong
                              ? "border-red-300 bg-red-50"
                              : "border-slate-200"
                          : isChecked
                            ? "border-brand-400 bg-brand-50"
                            : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${question.id}`}
                        checked={isChecked}
                        disabled={Boolean(result)}
                        onChange={() => selectOption(question.id, index)}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>

              {result && (
                <div
                  className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${
                    result.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {result.isCorrect
                    ? "Correct!"
                    : `Incorrect — the correct answer was "${question.options[result.correctIndex]}"`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!allGraded && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !allAnswered}
          className="mt-4 flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {submitting ? "Submitting..." : "Submit Quiz Answers"}
        </button>
      )}
    </div>
  );
}

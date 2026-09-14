"use client";

import { useState } from "react";
import type { CourseOption, GenerationResult } from "./types";

export default function GenerationForm({
  courses,
  onResult,
}: {
  courses: CourseOption[];
  onResult: (result: GenerationResult) => void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [chapterName, setChapterName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);

    if (!courseId || !chapterName.trim() || !prompt.trim()) {
      setError("Select a course and fill in the chapter name and prompt.");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, chapterName, prompt }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Generation failed.");
        return;
      }

      onResult(body as GenerationResult);
    } catch {
      setError("Couldn't reach the generation service. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Generation controls</h2>
      <p className="mt-1 text-sm text-slate-500">
        Configure the target course and chapter, then describe what the AI should produce.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="course_select" className="block text-sm font-medium text-slate-700">
            Course
          </label>
          <select
            id="course_select"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {courses.length === 0 && <option value="">No published courses available</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="chapter_name" className="block text-sm font-medium text-slate-700">
            Chapter Name
          </label>
          <input
            id="chapter_name"
            type="text"
            value={chapterName}
            onChange={(event) => setChapterName(event.target.value)}
            placeholder="e.g. Chapter 3: Data Structures"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-slate-700">
            AI Generator Instructions Prompt
          </label>
          <textarea
            id="prompt"
            rows={8}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the learning objectives, tone, and depth you want the generated chapter to cover..."
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || courses.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {generating ? "Generating..." : "Initialize AI Generation Loop"}
        </button>
      </div>
    </div>
  );
}

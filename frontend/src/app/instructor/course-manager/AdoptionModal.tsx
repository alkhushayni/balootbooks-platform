"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateJoinCode } from "@/lib/join-code";
import type { CatalogCourse } from "./CourseCard";

const MAX_JOIN_CODE_ATTEMPTS = 5;

export default function AdoptionModal({
  course,
  instructorId,
  onClose,
}: {
  course: CatalogCourse;
  instructorId: string;
  onClose: () => void;
}) {
  const [courseIdentifier, setCourseIdentifier] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [termToken, setTermToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!courseIdentifier.trim() || !sectionTitle.trim() || !termToken.trim()) {
      setError("Fill in the course identifier, section title, and term token.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
      const joinCode = generateJoinCode();

      const { error: insertError } = await supabase.from("classes").insert({
        instructor_id: instructorId,
        course_id: course.id,
        course_identifier: courseIdentifier.trim(),
        section_title: sectionTitle.trim(),
        term_token: termToken.trim(),
        join_code: joinCode,
      });

      if (!insertError) {
        setCreatedJoinCode(joinCode);
        setSubmitting(false);
        return;
      }

      const isJoinCodeCollision = insertError.code === "23505" && insertError.message.includes("join_code");
      if (!isJoinCodeCollision) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }
      // Unique constraint hit on join_code specifically — loop around and mint a fresh one.
    }

    setError("Couldn't generate a unique join code after several attempts. Please try again.");
    setSubmitting(false);
  }

  async function handleCopy() {
    if (!createdJoinCode) return;
    try {
      await navigator.clipboard.writeText(createdJoinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — the code is still visible on screen to copy by hand.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {createdJoinCode ? (
          <div>
            <h2 className="text-lg font-bold text-slate-900">Class created</h2>
            <p className="mt-1 text-sm text-slate-500">
              Share this join code with students so they can enroll in {course.title}.
            </p>

            <div className="mt-5 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="font-mono text-lg font-semibold tracking-widest text-brand-700">
                {createdJoinCode}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-slate-900">Begin adoption</h2>
            <p className="mt-1 text-sm text-slate-500">{course.title}</p>

            <div className="mt-5 space-y-4">
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div>
                <label htmlFor="course_identifier" className="block text-sm font-medium text-slate-700">
                  Course identifier
                </label>
                <input
                  id="course_identifier"
                  type="text"
                  required
                  placeholder="CIS 462"
                  value={courseIdentifier}
                  onChange={(event) => setCourseIdentifier(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label htmlFor="section_title" className="block text-sm font-medium text-slate-700">
                  Section title
                </label>
                <input
                  id="section_title"
                  type="text"
                  required
                  placeholder="Web Application Development"
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label htmlFor="term_token" className="block text-sm font-medium text-slate-700">
                  Term token
                </label>
                <input
                  id="term_token"
                  type="text"
                  required
                  placeholder="Fall 2026"
                  value={termToken}
                  onChange={(event) => setTermToken(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create class"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

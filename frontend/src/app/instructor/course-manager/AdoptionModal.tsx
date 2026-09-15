"use client";

import { useState } from "react";
import type { CatalogCourse } from "./CourseCard";

type CoInstructorRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

function createCoInstructorRow(): CoInstructorRow {
  return { id: crypto.randomUUID(), firstName: "", lastName: "", email: "" };
}

export default function AdoptionModal({
  course,
  onClose,
}: {
  course: CatalogCourse;
  onClose: () => void;
}) {
  const [courseIdentifier, setCourseIdentifier] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [termToken, setTermToken] = useState("");
  const [coInstructors, setCoInstructors] = useState<CoInstructorRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleAddCoInstructor() {
    setCoInstructors((current) => [...current, createCoInstructorRow()]);
  }

  function handleRemoveCoInstructor(id: string) {
    setCoInstructors((current) => current.filter((row) => row.id !== id));
  }

  function handleCoInstructorChange(id: string, field: keyof Omit<CoInstructorRow, "id">, value: string) {
    setCoInstructors((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!courseIdentifier.trim() || !sectionTitle.trim() || !termToken.trim()) {
      setError("Fill in the course identifier, section title, and term token.");
      return;
    }

    for (const row of coInstructors) {
      if (!row.firstName.trim() || !row.lastName.trim() || !row.email.trim()) {
        setError("Fill in every co-instructor's name and email, or remove the empty row.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/classes/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          courseIdentifier: courseIdentifier.trim(),
          sectionTitle: sectionTitle.trim(),
          termToken: termToken.trim(),
          coInstructors: coInstructors.map((row) => ({
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            email: row.email.trim(),
          })),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Couldn't create this class.");
        return;
      }

      setCreatedJoinCode(body.joinCode);
    } catch {
      setError("Couldn't reach the adoption service. Try again.");
    } finally {
      setSubmitting(false);
    }
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

            <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
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

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-slate-700">Co-instructors (optional)</span>
                  <button
                    type="button"
                    onClick={handleAddCoInstructor}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    + Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Co-instructors get identical read access to this class&apos;s roster and progress data.
                </p>

                {coInstructors.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {coInstructors.map((row) => (
                      <div key={row.id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-start gap-2">
                          <div className="grid flex-1 grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="First name"
                              value={row.firstName}
                              onChange={(event) =>
                                handleCoInstructorChange(row.id, "firstName", event.target.value)
                              }
                              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <input
                              type="text"
                              placeholder="Last name"
                              value={row.lastName}
                              onChange={(event) =>
                                handleCoInstructorChange(row.id, "lastName", event.target.value)
                              }
                              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={row.email}
                              onChange={(event) =>
                                handleCoInstructorChange(row.id, "email", event.target.value)
                              }
                              className="col-span-2 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCoInstructor(row.id)}
                            className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

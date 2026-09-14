"use client";

import { useState } from "react";
import type { AllocatedClass, CatalogCourse, SectionRow, VerifiedInstructor } from "./types";

function makeRowKey() {
  return crypto.randomUUID();
}

function makeEmptyRow(): SectionRow {
  return { key: makeRowKey(), sectionName: "", instructorId: "" };
}

export default function ProvisioningForm({
  courses,
  instructors,
  onProvisioned,
  onError,
}: {
  courses: CatalogCourse[];
  instructors: VerifiedInstructor[];
  onProvisioned: (created: AllocatedClass[]) => void;
  onError: (message: string) => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [courseIdentifier, setCourseIdentifier] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<SectionRow[]>([makeEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(key: string, patch: Partial<SectionRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, makeEmptyRow()]);
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!courseId || !courseIdentifier.trim() || !term.trim()) {
      onError("Select a course and fill in the course identifier and term.");
      return;
    }

    if (rows.some((row) => !row.sectionName.trim() || !row.instructorId)) {
      onError("Every row needs a section name and an assigned instructor.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/sections/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          courseIdentifier: courseIdentifier.trim(),
          sections: rows.map((row) => ({
            sectionName: row.sectionName.trim(),
            instructorId: row.instructorId,
            term: term.trim(),
          })),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        onError(body.error ?? "Couldn't provision these sections.");
        return;
      }

      onProvisioned(body.classes as AllocatedClass[]);
      setRows([makeEmptyRow()]);
    } catch {
      onError("Couldn't reach the allocation service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Bulk Section Provisioning</h2>
      <p className="mt-1 text-xs text-slate-500">
        Assign multiple sections of one course to different instructors in a single atomic batch.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="target_course" className="block text-xs font-medium text-slate-600">
            Target Course
          </label>
          <select
            id="target_course"
            required
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select a course...</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="course_identifier" className="block text-xs font-medium text-slate-600">
            Course Identifier
          </label>
          <input
            id="course_identifier"
            type="text"
            required
            placeholder="CIS 350"
            value={courseIdentifier}
            onChange={(event) => setCourseIdentifier(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="term_value" className="block text-xs font-medium text-slate-600">
            Term
          </label>
          <input
            id="term_value"
            type="text"
            required
            placeholder="Fall 2026"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600">Section {index + 1} Name</label>
              <input
                type="text"
                required
                placeholder="Section A"
                value={row.sectionName}
                onChange={(event) => updateRow(row.key, { sectionName: event.target.value })}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600">Assigned Instructor</label>
              <select
                required
                value={row.instructorId}
                onChange={(event) => updateRow(row.key, { instructorId: event.target.value })}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select instructor...</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => removeRow(row.key)}
              disabled={rows.length === 1}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 rounded-md border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        + Add another section row
      </button>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {submitting ? "Provisioning..." : "Bulk Provision Classroom Sections"}
      </button>
    </form>
  );
}

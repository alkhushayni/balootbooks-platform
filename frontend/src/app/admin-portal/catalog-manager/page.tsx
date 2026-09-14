"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ChapterItem, CourseItem, SectionItem } from "./types";
import CourseCard from "./CourseCard";
import CourseFormModal from "./CourseFormModal";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

function sortCatalog(courses: CourseItem[]): CourseItem[] {
  return [...courses]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((course) => ({
      ...course,
      chapters: [...course.chapters]
        .sort((a, b) => a.display_order - b.display_order)
        .map((chapter) => ({
          ...chapter,
          sections: [...chapter.sections].sort((a, b) => a.display_order - b.display_order),
        })),
    }));
}

export default function CatalogManagerPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const loadCatalog = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setView("signed-out");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["super_admin", "platform_admin"].includes(profile.role)) {
      setView("forbidden");
      return;
    }

    setView("loading");

    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, title, description, is_published, chapters(id, title, display_order, sections(id, title, content_type, display_order, markdown_content))"
      );

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    // Normalize embedded relations defensively — cardinality-based typing isn't guaranteed
    // without generated Database types, so coerce anything unexpected to an empty list.
    const normalized: CourseItem[] = (data ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      is_published: course.is_published,
      chapters: (Array.isArray(course.chapters) ? course.chapters : []).map(
        (chapter): ChapterItem => ({
          id: chapter.id,
          title: chapter.title,
          display_order: chapter.display_order,
          sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map(
            (section): SectionItem => ({
              id: section.id,
              title: section.title,
              content_type: section.content_type,
              display_order: section.display_order,
              markdown_content: section.markdown_content,
            })
          ),
        })
      ),
    }));

    setCourses(sortCatalog(normalized));
    setView("ready");
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Catalog Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin-portal/instructors"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Instructor Verification →
            </Link>
            {view === "ready" && (
              <button
                type="button"
                onClick={() => setShowCourseForm(true)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                + New course
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your admin access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as a platform admin to manage the catalog.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <StatusPanel tone="warning">
            Only super admin and platform admin accounts can manage the global catalog.
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the catalog...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the catalog: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Master catalog</h2>
              <p className="text-sm text-slate-500">
                {courses.length} course{courses.length === 1 ? "" : "s"} across the platform.
              </p>
            </div>

            {courses.length === 0 ? (
              <StatusPanel tone="neutral">No courses yet — create the first one to get started.</StatusPanel>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} onChanged={loadCatalog} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCourseForm && (
        <CourseFormModal
          onClose={() => setShowCourseForm(false)}
          onCreated={() => {
            setShowCourseForm(false);
            loadCatalog();
          }}
        />
      )}
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

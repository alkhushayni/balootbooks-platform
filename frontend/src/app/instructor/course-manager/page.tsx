"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CourseCard, { type CatalogCourse } from "./CourseCard";
import AdoptionModal from "./AdoptionModal";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

type MyClass = {
  id: string;
  course_identifier: string;
  section_title: string;
  term_token: string;
};

export default function CourseManagerPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [myClasses, setMyClasses] = useState<MyClass[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CatalogCourse | null>(null);

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

      if (profileError || !profile || profile.role !== "instructor") {
        if (!cancelled) setView("forbidden");
        return;
      }

      if (cancelled) return;
      setInstructorId(user.id);
      setView("loading");

      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description")
        .eq("is_published", true)
        .order("title");

      if (cancelled) return;

      if (error) {
        setErrorMessage(error.message);
        setView("error");
        return;
      }

      setCourses(data ?? []);

      const { data: classRows } = await supabase
        .from("classes")
        .select("id, course_identifier, section_title, term_token")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      setMyClasses(classRows ?? []);
      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Course Manager</h1>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            Adopt a catalog title to spin up a new class workspace with its own join code.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && (
          <StatusPanel tone="neutral">Checking your instructor access...</StatusPanel>
        )}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as an instructor to manage courses.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <StatusPanel tone="warning">
            Only verified instructor accounts can adopt courses. If you recently applied, your access is
            still pending admin review.
          </StatusPanel>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the course catalog...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load the catalog: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            {myClasses.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900">Your classes</h2>
                <p className="text-sm text-slate-500">
                  {myClasses.length} active class{myClasses.length === 1 ? "" : "es"}.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myClasses.map((classItem) => (
                    <Link
                      key={classItem.id}
                      href={`/instructor/class/${classItem.id}`}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-sm font-medium text-brand-600">{classItem.course_identifier}</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {classItem.section_title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">{classItem.term_token}</p>
                      <span className="mt-3 inline-block text-sm font-medium text-brand-600">
                        View roster &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Catalog</h2>
              <p className="text-sm text-slate-500">
                {courses.length} published title{courses.length === 1 ? "" : "s"} available for adoption.
              </p>
            </div>

            {courses.length === 0 ? (
              <StatusPanel tone="neutral">No published courses in the catalog yet.</StatusPanel>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={index}
                    onAdopt={() => setActiveCourse(course)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {activeCourse && instructorId && (
        <AdoptionModal
          course={activeCourse}
          instructorId={instructorId}
          onClose={() => setActiveCourse(null)}
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

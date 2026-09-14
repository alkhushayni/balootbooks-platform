"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ChapterNode, CourseDetail, SectionNode } from "./types";
import TextbookMap from "./TextbookMap";
import ReadingPane from "./ReadingPane";
import LabWorkspace from "./LabWorkspace";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "not-enrolled"
  | "loading"
  | "error"
  | "ready";

export default function StudentCoursePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeSection, setActiveSection] = useState<SectionNode | null>(null);
  const [progressBySection, setProgressBySection] = useState<
    Record<string, { participation_percentage: number; lab_percentage: number }>
  >({});

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

      // Enrollment is keyed on classes.course_id, not classes.id directly, since content
      // (chapters/sections) belongs to the shared course, not to any one instructor's class.
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

      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, description, chapters(id, title, display_order, sections(id, title, content_type, display_order, markdown_content))"
        )
        .eq("id", courseId)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setErrorMessage(error?.message ?? "Course not found.");
        setView("error");
        return;
      }

      // Normalize embedded relations defensively, same as the admin catalog manager — cardinality-
      // based typing isn't guaranteed without generated Database types.
      const chapters: ChapterNode[] = (Array.isArray(data.chapters) ? data.chapters : [])
        .map(
          (chapter): ChapterNode => ({
            id: chapter.id,
            title: chapter.title,
            display_order: chapter.display_order,
            sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map(
              (section): SectionNode => ({
                id: section.id,
                title: section.title,
                content_type: section.content_type,
                display_order: section.display_order,
                markdown_content: section.markdown_content,
              })
            ),
          })
        )
        .sort((a, b) => a.display_order - b.display_order)
        .map((chapter) => ({
          ...chapter,
          sections: [...chapter.sections].sort((a, b) => a.display_order - b.display_order),
        }));

      setCourse({ id: data.id, title: data.title, description: data.description, chapters });
      setActiveSection(chapters[0]?.sections[0] ?? null);

      const sectionIds = chapters.flatMap((chapter) => chapter.sections.map((section) => section.id));

      if (sectionIds.length > 0) {
        const { data: progressRows } = await supabase
          .from("student_progress")
          .select("section_id, participation_percentage, lab_percentage")
          .eq("student_id", user.id)
          .in("section_id", sectionIds);

        if (!cancelled && progressRows) {
          const map: Record<string, { participation_percentage: number; lab_percentage: number }> = {};
          for (const row of progressRows) {
            map[row.section_id] = {
              participation_percentage: row.participation_percentage,
              lab_percentage: row.lab_percentage,
            };
          }
          setProgressBySection(map);
        }
      }

      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  function markSectionComplete(sectionId: string, metric: "participation_percentage" | "lab_percentage") {
    setProgressBySection((previous) => ({
      ...previous,
      [sectionId]: {
        participation_percentage: previous[sectionId]?.participation_percentage ?? 0,
        lab_percentage: previous[sectionId]?.lab_percentage ?? 0,
        [metric]: 100,
      },
    }));
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <Link
            href="/student/dashboard"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← My Library
          </Link>
          <h1 className="mt-1 text-lg font-bold text-slate-900">{course?.title ?? "Course"}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {view === "checking-access" && (
          <CenteredStatus tone="neutral">Checking your access...</CenteredStatus>
        )}

        {view === "signed-out" && (
          <CenteredStatus tone="warning">
            You need to sign in to view this course.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </CenteredStatus>
        )}

        {view === "forbidden" && (
          <CenteredStatus tone="warning">
            This learning view is only available to student accounts.
          </CenteredStatus>
        )}

        {view === "not-enrolled" && (
          <CenteredStatus tone="warning">
            You&apos;re not enrolled in a class for this course yet.{" "}
            <Link href="/student/dashboard" className="font-medium text-brand-600 hover:text-brand-700">
              Join with a class code
            </Link>
          </CenteredStatus>
        )}

        {view === "loading" && <CenteredStatus tone="neutral">Loading the course...</CenteredStatus>}

        {view === "error" && (
          <CenteredStatus tone="error">Couldn&apos;t load this course: {errorMessage}</CenteredStatus>
        )}

        {view === "ready" && course && (
          <div className="flex h-full">
            <div className="w-72 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50">
              <TextbookMap
                chapters={course.chapters}
                activeSectionId={activeSection?.id ?? null}
                onSelectSection={setActiveSection}
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              {activeSection ? (
                activeSection.content_type === "LAB" ? (
                  <LabWorkspace
                    section={activeSection}
                    initiallyComplete={(progressBySection[activeSection.id]?.lab_percentage ?? 0) >= 100}
                    onComplete={() => markSectionComplete(activeSection.id, "lab_percentage")}
                  />
                ) : (
                  <ReadingPane
                    section={activeSection}
                    initiallyComplete={
                      (progressBySection[activeSection.id]?.participation_percentage ?? 0) >= 100
                    }
                    onComplete={() => markSectionComplete(activeSection.id, "participation_percentage")}
                  />
                )
              ) : (
                <CenteredStatus tone="neutral">This course doesn&apos;t have any sections yet.</CenteredStatus>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CenteredStatus({
  tone,
  children,
}: {
  tone: "neutral" | "warning" | "error";
  children: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "text-slate-500",
    warning: "text-amber-700",
    error: "text-red-700",
  }[tone];

  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className={`max-w-sm text-center text-sm ${toneClasses}`}>{children}</p>
    </div>
  );
}

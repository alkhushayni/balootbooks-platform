"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ChapterNode, CourseDetail, SectionNode } from "./types";
import TextbookMap from "./TextbookMap";
import ReadingPane from "./ReadingPane";
import LabWorkspace from "./LabWorkspace";
import UnlockCourseAccess from "./UnlockCourseAccess";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "not-enrolled"
  | "loading"
  | "error"
  | "ready";

type ChapterOverrideRow = {
  id: string;
  chapter_id: string | null;
  title: string | null;
  display_order: number | null;
  is_hidden: boolean;
  class_custom_sections:
    | { id: string; title: string; content_type: "READING" | "LAB"; display_order: number; markdown_content: string | null }[]
    | null;
};

type SectionContentOverrideRow = {
  section_id: string;
  markdown_content: string | null;
};

// Shape returned by the cached /api/courses/[courseId] route (Step 32) - the master catalog only,
// no personalization.
type CourseApiResponse = {
  id: string;
  title: string;
  description: string | null;
  chapters: {
    id: string;
    title: string;
    display_order: number;
    sections: {
      id: string;
      title: string;
      content_type: "READING" | "LAB";
      display_order: number;
      markdown_content: string | null;
    }[];
  }[];
};

// Merges the master chapters/sections catalog with this student's class-scoped sandbox: chapter
// reorder/hide, class-private custom chapters/sections (Step 16), and per-section content
// overrides (Step 17). Hidden chapters are dropped entirely here, unlike the instructor's editor
// which shows them dimmed - a student should never see a chapter their instructor hid.
function buildStudentChapters(
  masterChapters: ChapterNode[],
  chapterOverrides: ChapterOverrideRow[],
  contentOverrides: SectionContentOverrideRow[]
): ChapterNode[] {
  const overrideByChapterId = new Map<string, ChapterOverrideRow>();
  const customChapterOverrides: ChapterOverrideRow[] = [];

  for (const override of chapterOverrides) {
    if (override.chapter_id) {
      overrideByChapterId.set(override.chapter_id, override);
    } else {
      customChapterOverrides.push(override);
    }
  }

  const contentBySectionId = new Map(contentOverrides.map((row) => [row.section_id, row.markdown_content]));

  const toCustomSections = (
    rows: ChapterOverrideRow["class_custom_sections"]
  ): SectionNode[] =>
    (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      content_type: row.content_type,
      display_order: row.display_order,
      markdown_content: row.markdown_content,
      is_custom: true,
    }));

  const fromMaster: ChapterNode[] = masterChapters
    .map((chapter) => {
      const override = overrideByChapterId.get(chapter.id);
      if (override?.is_hidden) return null;

      const masterSections: SectionNode[] = chapter.sections.map((section) => ({
        ...section,
        markdown_content: contentBySectionId.get(section.id) ?? section.markdown_content,
        is_custom: false,
      }));

      return {
        id: chapter.id,
        title: chapter.title,
        display_order: override?.display_order ?? chapter.display_order,
        sections: [...masterSections, ...toCustomSections(override?.class_custom_sections ?? null)].sort(
          (a, b) => a.display_order - b.display_order
        ),
      };
    })
    .filter((chapter): chapter is ChapterNode => chapter !== null);

  const fromCustom: ChapterNode[] = customChapterOverrides
    .filter((override) => !override.is_hidden)
    .map((override) => ({
      id: override.id,
      title: override.title ?? "Untitled chapter",
      display_order: override.display_order ?? 0,
      sections: toCustomSections(override.class_custom_sections).sort(
        (a, b) => a.display_order - b.display_order
      ),
    }));

  return [...fromMaster, ...fromCustom].sort((a, b) => a.display_order - b.display_order);
}

export default function StudentCoursePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

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
        .select("id, classes!inner(id, course_id)")
        .eq("student_id", user.id)
        .eq("classes.course_id", courseId);

      if (cancelled) return;

      if (enrollmentError) {
        setErrorMessage(enrollmentError.message);
        setView("error");
        return;
      }

      let classId: string | null = null;

      if (enrollmentRows && enrollmentRows.length > 0) {
        const relatedClass = Array.isArray(enrollmentRows[0].classes)
          ? enrollmentRows[0].classes[0]
          : enrollmentRows[0].classes;
        classId = relatedClass?.id ?? null;
      }

      // No classroom enrollment - check whether this course was unlocked via a direct Stripe
      // purchase (Step 31) instead. A purchaser has no class context at all, so they only ever
      // see the unmodified master catalog (no instructor sandbox overrides apply, below).
      if (!classId) {
        const { data: purchaseRows, error: purchaseError } = await supabase
          .from("student_purchases")
          .select("id")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .limit(1);

        if (cancelled) return;

        if (purchaseError) {
          setErrorMessage(purchaseError.message);
          setView("error");
          return;
        }

        if (!purchaseRows || purchaseRows.length === 0) {
          // No enrollment, no purchase - check for an admin-granted hardship access window
          // (Step 32) before falling back to the paywall. A grant is scoped to a specific class,
          // so it's treated exactly like a real enrollment once found: the reader resolves
          // instructor overrides from that class, same as any enrolled student would see.
          const { data: grantRows, error: grantError } = await supabase
            .from("temporary_access_grants")
            .select("class_id, expires_at, classes!inner(course_id)")
            .eq("student_id", user.id)
            .eq("classes.course_id", courseId)
            .gt("expires_at", new Date().toISOString())
            .limit(1);

          if (cancelled) return;

          if (grantError) {
            setErrorMessage(grantError.message);
            setView("error");
            return;
          }

          if (grantRows && grantRows.length > 0) {
            classId = grantRows[0].class_id;
          } else {
            // Still nothing - last automatic check: does the student's own institution have an
            // available seat under its purchased license cap? No voucher code to enter; this is
            // a silent yes/no against institutions.max_license_seats.
            const { data: hasSeat, error: seatError } = await supabase.rpc("has_institutional_seat_available");

            if (cancelled) return;

            if (seatError) {
              setErrorMessage(seatError.message);
              setView("error");
              return;
            }

            if (!hasSeat) {
              setView("not-enrolled");
              return;
            }
          }
        }
      }

      setView("loading");

      // The master course structure (title/description/chapters/sections) is identical for every
      // caller, so it's fetched from the cached /api/courses/[courseId] route (Step 32) instead of
      // a live client-side query - everything genuinely personal to this student (enrollment/
      // purchase access, class-scoped overrides, progress) stays on its own live path below.
      const fetchCourse = async (): Promise<{ data: CourseApiResponse | null; error: string | null }> => {
        const response = await fetch(`/api/courses/${courseId}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return { data: null, error: body.error ?? "Course not found." };
        return { data: body.course as CourseApiResponse, error: null };
      };

      const [
        { data: courseData, error: courseError },
        { data: chapterOverrides, error: chapterOverridesError },
        { data: contentOverrides, error: contentOverridesError },
      ] = await Promise.all([
        fetchCourse(),
        classId
          ? supabase
              .from("class_chapter_overrides")
              .select(
                "id, chapter_id, title, display_order, is_hidden, class_custom_sections(id, title, content_type, display_order, markdown_content)"
              )
              .eq("class_id", classId)
          : Promise.resolve({ data: [] as ChapterOverrideRow[], error: null }),
        classId
          ? supabase
              .from("class_section_content_overrides")
              .select("section_id, markdown_content")
              .eq("class_id", classId)
          : Promise.resolve({ data: [] as SectionContentOverrideRow[], error: null }),
      ]);

      if (cancelled) return;

      if (courseError || !courseData) {
        setErrorMessage(courseError ?? "Course not found.");
        setView("error");
        return;
      }

      if (chapterOverridesError || contentOverridesError) {
        setErrorMessage((chapterOverridesError ?? contentOverridesError)!.message);
        setView("error");
        return;
      }

      // Normalize embedded relations defensively, same as the admin catalog manager — cardinality-
      // based typing isn't guaranteed without generated Database types.
      const masterChapters: ChapterNode[] = (Array.isArray(courseData.chapters) ? courseData.chapters : [])
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
                is_custom: false,
              })
            ),
          })
        )
        .sort((a, b) => a.display_order - b.display_order)
        .map((chapter) => ({
          ...chapter,
          sections: [...chapter.sections].sort((a, b) => a.display_order - b.display_order),
        }));

      const chapters = buildStudentChapters(
        masterChapters,
        (chapterOverrides ?? []) as ChapterOverrideRow[],
        (contentOverrides ?? []) as SectionContentOverrideRow[]
      );

      setCourse({ id: courseData.id, title: courseData.title, description: courseData.description, chapters });
      setActiveSection(chapters[0]?.sections[0] ?? null);

      const allSections = chapters.flatMap((chapter) => chapter.sections);
      const masterSectionIds = allSections.filter((section) => !section.is_custom).map((section) => section.id);
      const customSectionIds = allSections.filter((section) => section.is_custom).map((section) => section.id);

      const [masterProgress, customProgress] = await Promise.all([
        masterSectionIds.length > 0
          ? supabase
              .from("student_progress")
              .select("section_id, participation_percentage, lab_percentage")
              .eq("student_id", user.id)
              .in("section_id", masterSectionIds)
          : Promise.resolve({ data: [] as { section_id: string; participation_percentage: number; lab_percentage: number }[] }),
        customSectionIds.length > 0
          ? supabase
              .from("student_progress")
              .select("class_custom_section_id, participation_percentage, lab_percentage")
              .eq("student_id", user.id)
              .in("class_custom_section_id", customSectionIds)
          : Promise.resolve({ data: [] as { class_custom_section_id: string; participation_percentage: number; lab_percentage: number }[] }),
      ]);

      if (!cancelled) {
        const map: Record<string, { participation_percentage: number; lab_percentage: number }> = {};
        for (const row of masterProgress.data ?? []) {
          map[row.section_id] = {
            participation_percentage: row.participation_percentage,
            lab_percentage: row.lab_percentage,
          };
        }
        for (const row of customProgress.data ?? []) {
          map[row.class_custom_section_id] = {
            participation_percentage: row.participation_percentage,
            lab_percentage: row.lab_percentage,
          };
        }
        setProgressBySection(map);
      }

      setView("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const completedSectionIds = new Set(
    Object.entries(progressBySection)
      .filter(([, metrics]) => metrics.participation_percentage >= 100 || metrics.lab_percentage >= 100)
      .map(([sectionId]) => sectionId)
  );

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
        <Link
          href={`/student/course/${courseId}/grades`}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          📊 My Grades
        </Link>
      </header>

      {checkoutStatus === "success" && view !== "checking-access" && view !== "loading" && (
        <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-6 py-2 text-center text-xs font-medium text-emerald-800">
          {view === "not-enrolled"
            ? "Payment received — finishing setup. This usually takes just a moment; refresh if access doesn't appear shortly."
            : "Payment received — you now have full access to this course."}
        </div>
      )}

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

        {view === "not-enrolled" && <UnlockCourseAccess courseId={courseId} />}

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
                completedSectionIds={completedSectionIds}
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              {activeSection ? (
                activeSection.content_type === "LAB" ? (
                  <LabWorkspace
                    courseId={courseId}
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

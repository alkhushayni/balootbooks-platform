"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ClassOption, DisplayChapter, DisplaySection, MasterChapter, ToastState } from "./types";
import CurriculumTree from "./CurriculumTree";
import ActionPanel from "./ActionPanel";
import Toast from "./Toast";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "choosing-class"
  | "loading"
  | "error"
  | "ready";

type CustomSectionRow = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
};

type OverrideRow = {
  id: string;
  chapter_id: string | null;
  title: string | null;
  display_order: number | null;
  is_hidden: boolean;
  class_custom_sections: CustomSectionRow[] | null;
};

function buildDisplayChapters(masterChapters: MasterChapter[], overrides: OverrideRow[]): DisplayChapter[] {
  const overrideByChapterId = new Map<string, OverrideRow>();
  const customOverrides: OverrideRow[] = [];

  for (const override of overrides) {
    if (override.chapter_id) {
      overrideByChapterId.set(override.chapter_id, override);
    } else {
      customOverrides.push(override);
    }
  }

  const toCustomSections = (rows: CustomSectionRow[] | null): DisplaySection[] =>
    (rows ?? []).map((row) => ({ ...row, is_custom: true }));

  const fromMaster: DisplayChapter[] = masterChapters.map((chapter) => {
    const override = overrideByChapterId.get(chapter.id);
    const masterSections: DisplaySection[] = chapter.sections.map((section) => ({
      ...section,
      is_custom: false,
    }));
    const sections = [...masterSections, ...toCustomSections(override?.class_custom_sections ?? null)].sort(
      (a, b) => a.display_order - b.display_order
    );

    return {
      override_id: override?.id ?? null,
      master_chapter_id: chapter.id,
      title: chapter.title,
      effective_order: override?.display_order ?? chapter.display_order,
      is_hidden: override?.is_hidden ?? false,
      sections,
    };
  });

  const fromCustom: DisplayChapter[] = customOverrides.map((override) => ({
    override_id: override.id,
    master_chapter_id: null,
    title: override.title ?? "Untitled chapter",
    effective_order: override.display_order ?? 0,
    is_hidden: override.is_hidden,
    sections: toCustomSections(override.class_custom_sections).sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));

  return [...fromMaster, ...fromCustom].sort((a, b) => a.effective_order - b.effective_order);
}

export default function SyllabusEditorPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [ownedClasses, setOwnedClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<DisplayChapter[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadCurriculum = useCallback(
    async (activeClassId: string) => {
      const supabase = createClient();

      const [{ data: course, error: courseError }, { data: overrides, error: overridesError }] =
        await Promise.all([
          supabase
            .from("courses")
            .select("id, title, chapters(id, title, display_order, sections(id, title, content_type, display_order))")
            .eq("id", courseId)
            .single(),
          supabase
            .from("class_chapter_overrides")
            .select("id, chapter_id, title, display_order, is_hidden, class_custom_sections(id, title, content_type, display_order)")
            .eq("class_id", activeClassId),
        ]);

      if (courseError || !course) {
        setErrorMessage(courseError?.message ?? "Course not found.");
        setView("error");
        return;
      }

      if (overridesError) {
        setErrorMessage(overridesError.message);
        setView("error");
        return;
      }

      setCourseTitle(course.title);
      setChapters(
        buildDisplayChapters((course.chapters ?? []) as MasterChapter[], (overrides ?? []) as OverrideRow[])
      );
      setView("ready");
    },
    [courseId]
  );

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

      // classes RLS already scopes rows to instructor_id = auth.uid(), so whatever comes back
      // here is guaranteed to belong to this instructor - no separate ownership check needed.
      const { data: classRows } = await supabase
        .from("classes")
        .select("id, section_title, term_token")
        .eq("course_id", courseId);

      if (cancelled) return;

      if (!classRows || classRows.length === 0) {
        setView("forbidden");
        return;
      }

      if (classRows.length > 1) {
        setOwnedClasses(classRows);
        setView("choosing-class");
        return;
      }

      setClassId(classRows[0].id);
      setView("loading");
      await loadCurriculum(classRows[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, loadCurriculum]);

  async function handleChooseClass(chosenClassId: string) {
    setClassId(chosenClassId);
    setView("loading");
    await loadCurriculum(chosenClassId);
  }

  // Updates an existing override row by its own id, or creates one on the fly for a master
  // chapter that hasn't been touched by this class yet.
  async function persistChapterPatch(
    chapter: DisplayChapter,
    patch: { display_order?: number; is_hidden?: boolean }
  ): Promise<string | null> {
    const supabase = createClient();

    if (chapter.override_id) {
      const { error } = await supabase
        .from("class_chapter_overrides")
        .update(patch)
        .eq("id", chapter.override_id);
      return error?.message ?? null;
    }

    if (!classId || !chapter.master_chapter_id) {
      return "Missing class or chapter reference.";
    }

    const { error } = await supabase.from("class_chapter_overrides").insert({
      class_id: classId,
      chapter_id: chapter.master_chapter_id,
      is_hidden: false,
      // display_order always has a concrete value on insert - a hide/show-only patch shouldn't
      // depend on this column being nullable.
      display_order: chapter.effective_order,
      ...patch,
    });
    return error?.message ?? null;
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= chapters.length) return;

    const current = chapters[index];
    const swapWith = chapters[swapIndex];

    const [errorA, errorB] = await Promise.all([
      persistChapterPatch(current, { display_order: swapWith.effective_order }),
      persistChapterPatch(swapWith, { display_order: current.effective_order }),
    ]);

    if (errorA || errorB) {
      setToast({ tone: "error", message: errorA ?? errorB ?? "Reorder failed." });
      return;
    }

    await loadCurriculum(classId!);
    setToast({ tone: "success", message: "Chapter order updated for your class." });
  }

  async function handleToggleHidden(index: number) {
    const chapter = chapters[index];
    const nextHidden = !chapter.is_hidden;
    const error = await persistChapterPatch(chapter, { is_hidden: nextHidden });

    if (error) {
      setToast({ tone: "error", message: error });
      return;
    }

    await loadCurriculum(classId!);
    setToast({
      tone: "success",
      message: nextHidden ? "Chapter hidden from your class." : "Chapter restored for your class.",
    });
  }

  async function handleChapterCreated() {
    await loadCurriculum(classId!);
    setToast({ tone: "success", message: "Custom chapter added." });
  }

  async function handleSectionCreated() {
    await loadCurriculum(classId!);
    setToast({ tone: "success", message: "Section added." });
  }

  function handleActionError(message: string) {
    setToast({ tone: "error", message });
  }

  const nextChapterOrder =
    chapters.length === 0 ? 1 : Math.max(...chapters.map((chapter) => chapter.effective_order)) + 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Syllabus Builder{courseTitle ? ` — ${courseTitle}` : ""}
            </h1>
          </div>
          <Link href="/instructor/course-manager" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Course Manager →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your instructor access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as an instructor to edit this syllabus.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              Only instructors with an adopted class for this course can edit its syllabus.
            </p>
          </div>
        )}

        {view === "choosing-class" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Which class are you editing?</h2>
            <p className="mt-1 text-sm text-slate-500">
              You have more than one class for this course. Sandbox overrides are per-class.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ownedClasses.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChooseClass(option.id)}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50"
                >
                  <p className="text-sm font-semibold text-slate-900">{option.section_title}</p>
                  <p className="text-xs text-slate-500">{option.term_token}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "loading" && <StatusPanel tone="neutral">Loading the curriculum outline...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load this course: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && classId && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Your class outline</h2>
                <p className="text-sm text-slate-500">
                  Changes here only affect this class - the shared course catalog is unchanged for
                  every other class of this course.
                </p>
              </div>
              <CurriculumTree chapters={chapters} onMove={handleMove} onToggleHidden={handleToggleHidden} />
            </div>
            <ActionPanel
              classId={classId}
              chapters={chapters}
              nextChapterOrder={nextChapterOrder}
              onChapterCreated={handleChapterCreated}
              onSectionCreated={handleSectionCreated}
              onError={handleActionError}
            />
          </div>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { ClassOption, SectionRecord, ToastState } from "./types";
import AIAssistantPanel from "./AIAssistantPanel";
import Toast from "./Toast";

type ViewState =
  | "checking-access"
  | "signed-out"
  | "forbidden"
  | "choosing-class"
  | "loading"
  | "error"
  | "ready";

export default function SectionEditorPage() {
  const params = useParams<{ courseId: string; sectionId: string }>();
  const { courseId, sectionId } = params;

  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownedClasses, setOwnedClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionRecord | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadSection = useCallback(
    async (activeClassId: string) => {
      const supabase = createClient();

      // Master catalog sections and class-private custom sections (Step 16) live in different
      // tables with different id spaces - try the shared master table first, since that's the
      // common case, and fall back to class_custom_sections rather than erroring outright when a
      // custom section's id doesn't match anything there.
      const { data: sectionRow, error: sectionError } = await supabase
        .from("sections")
        .select("id, title, content_type, markdown_content, chapter_id, chapters(course_id)")
        .eq("id", sectionId)
        .maybeSingle();

      if (sectionError) {
        setErrorMessage(sectionError.message);
        setView("error");
        return;
      }

      if (sectionRow) {
        const relatedChapter = Array.isArray(sectionRow.chapters) ? sectionRow.chapters[0] : sectionRow.chapters;
        if (relatedChapter?.course_id !== courseId) {
          setView("forbidden");
          return;
        }

        const { data: override, error: overrideError } = await supabase
          .from("class_section_content_overrides")
          .select("markdown_content")
          .eq("class_id", activeClassId)
          .eq("section_id", sectionId)
          .maybeSingle();

        if (overrideError) {
          setErrorMessage(overrideError.message);
          setView("error");
          return;
        }

        setSection({
          id: sectionRow.id,
          title: sectionRow.title,
          content_type: sectionRow.content_type,
          markdown_content: sectionRow.markdown_content,
          chapter_id: sectionRow.chapter_id,
          is_custom: false,
        });
        setContent(override?.markdown_content ?? sectionRow.markdown_content ?? "");
        setView("ready");
        return;
      }

      // Not a master section - try a class-private custom section instead, scoped to a chapter
      // override that belongs to this instructor's own class for this course.
      const { data: customRow, error: customError } = await supabase
        .from("class_custom_sections")
        .select("id, title, content_type, markdown_content, chapter_override_id, class_chapter_overrides!inner(class_id)")
        .eq("id", sectionId)
        .eq("class_chapter_overrides.class_id", activeClassId)
        .maybeSingle();

      if (customError || !customRow) {
        setErrorMessage(customError?.message ?? "Section not found.");
        setView("error");
        return;
      }

      setSection({
        id: customRow.id,
        title: customRow.title,
        content_type: customRow.content_type,
        markdown_content: customRow.markdown_content,
        chapter_id: customRow.chapter_override_id,
        is_custom: true,
      });
      setContent(customRow.markdown_content ?? "");
      setView("ready");
    },
    [courseId, sectionId]
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
      await loadSection(classRows[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, loadSection]);

  async function handleChooseClass(chosenClassId: string) {
    setClassId(chosenClassId);
    setView("loading");
    await loadSection(chosenClassId);
  }

  function handleInjectBlock(markdown: string) {
    const textarea = textareaRef.current;
    const block = markdown.trim();

    if (!textarea) {
      setContent((current) => (current ? `${current}\n\n${block}` : block));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}\n\n${block}\n\n${content.slice(end)}`;
    setContent(next);

    requestAnimationFrame(() => {
      const cursor = start + block.length + 4;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSave() {
    if (!classId || !section) return;

    setSaving(true);
    const supabase = createClient();

    // A custom section has no shared master default to override - its own markdown_content IS
    // the content, so it's updated directly rather than upserted into class_section_content_overrides.
    const { error } = section.is_custom
      ? await supabase.from("class_custom_sections").update({ markdown_content: content }).eq("id", section.id)
      : await supabase
          .from("class_section_content_overrides")
          .upsert(
            { class_id: classId, section_id: section.id, markdown_content: content, updated_at: new Date().toISOString() },
            { onConflict: "class_id,section_id" }
          );
    setSaving(false);

    if (error) {
      setToast({ tone: "error", message: error.message });
      return;
    }

    setToast({ tone: "success", message: "Saved to your class." });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Inline Editor{section ? ` — ${section.title}` : ""}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/instructor/course/${courseId}/editor`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              ← Syllabus Builder
            </Link>
            {view === "ready" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save to My Class"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "checking-access" && <StatusPanel tone="neutral">Checking your instructor access...</StatusPanel>}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as an instructor to edit this section.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              Only instructors with an adopted class for this course can edit this section.
            </p>
          </div>
        )}

        {view === "choosing-class" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Which class are you editing for?</h2>
            <p className="mt-1 text-sm text-slate-500">
              You have more than one class for this course. Content overrides are per-class.
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

        {view === "loading" && <StatusPanel tone="neutral">Loading the section...</StatusPanel>}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load this section: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && section && (
          <>
            <p className="mb-4 text-sm text-slate-500">
              Editing your class&apos;s private copy of this content - the shared course catalog is
              unchanged for every other class.
            </p>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Workspace canvas
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={20}
                    className="block w-full resize-y rounded-b-xl px-4 py-3 font-mono text-sm text-slate-800 focus:outline-none"
                  />
                </div>
                <AIAssistantPanel
                  context={`Section: ${section.title} (${section.content_type})`}
                  onInject={handleInjectBlock}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Live preview
                </div>
                <div className="prose prose-slate max-w-none px-6 py-6 prose-headings:font-semibold prose-a:text-brand-600">
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-400">Nothing to preview yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
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

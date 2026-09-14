"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { FrameState, ToastState } from "./types";
import TimelineControlPanel from "./TimelineControlPanel";
import FrameCanvas from "./FrameCanvas";
import JsonExporterTray from "./JsonExporterTray";
import Toast from "./Toast";

const ALLOWED_ROLES = ["super_admin", "platform_admin", "instructor"];

function createFrame(): FrameState {
  return { id: crypto.randomUUID(), caption: "" };
}

export default function AnimationWizardFrameBuilderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [frames, setFrames] = useState<FrameState[]>([createFrame()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // "Redirect them safely" is this step's explicit guard requirement - unlike every other admin
  // page in this app (which renders a static "Access Denied" panel in place), an unauthorized
  // visitor here is navigated away entirely rather than shown the tool's shell at all.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
        router.replace("/");
        return;
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleAddFrame() {
    const nextFrames = [...frames];
    nextFrames.splice(activeIndex + 1, 0, createFrame());
    setFrames(nextFrames);
    setActiveIndex(activeIndex + 1);
  }

  function handleRemoveFrame() {
    if (frames.length <= 1) return;
    const nextFrames = frames.filter((_, index) => index !== activeIndex);
    setFrames(nextFrames);
    setActiveIndex(Math.min(activeIndex, nextFrames.length - 1));
  }

  function handlePreviewNext() {
    setActiveIndex((current) => Math.min(current + 1, frames.length - 1));
  }

  function handlePreviewBack() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function handleCaptionChange(value: string) {
    setFrames((current) =>
      current.map((frame, index) => (index === activeIndex ? { ...frame, caption: value } : frame))
    );
  }

  function handleExportResult(message: string, tone: "success" | "error") {
    setToast({ tone, message });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Checking your access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Animation Wizard — Frame Builder</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <TimelineControlPanel
          activeIndex={activeIndex}
          frameCount={frames.length}
          onAddFrame={handleAddFrame}
          onRemoveFrame={handleRemoveFrame}
          onPreviewNext={handlePreviewNext}
          onPreviewBack={handlePreviewBack}
        />

        <FrameCanvas
          activeIndex={activeIndex}
          caption={frames[activeIndex].caption}
          onCaptionChange={handleCaptionChange}
        />

        <JsonExporterTray frames={frames} onExportResult={handleExportResult} />
      </main>
    </div>
  );
}

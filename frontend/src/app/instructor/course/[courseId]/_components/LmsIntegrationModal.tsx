"use client";

import { useEffect, useState } from "react";

type LmsPlatform = "Canvas" | "Blackboard" | "Moodle";

type ModalStep = "choice" | "generating" | "rendered";

const LMS_LAUNCH_STEPS: Record<LmsPlatform, string> = {
  Canvas: "In Canvas, go to Admin → Developer Keys → + Developer Key → + LTI Key, then paste the Launch URL and Consumer Key/Secret below.",
  Blackboard: "In Blackboard, go to System Admin → REST API Integrations → LTI Tool Providers, register a new provider, and paste the values below.",
  Moodle: "In Moodle, add an activity → External Tool → \"configure a tool manually\", then paste the values below into the LTI 1.1 fields.",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

export default function LmsIntegrationModal({
  courseTitle,
  sectionTitle,
  termToken,
  classId,
  onClose,
  onCopySuccess,
}: {
  courseTitle: string;
  sectionTitle: string;
  termToken: string;
  classId: string;
  onClose: () => void;
  onCopySuccess: (message: string) => void;
}) {
  const [step, setStep] = useState<ModalStep>("choice");
  const [platform, setPlatform] = useState<LmsPlatform | null>(null);
  const [declinedIntegration, setDeclinedIntegration] = useState(false);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pricing")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body) setPriceCents(body.priceCents as number);
      })
      .catch(() => {
        // Price is purely informational text in the generated guide - silently fall back to
        // "not available" below rather than blocking the rest of the modal on this one field.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectPlatform(selected: LmsPlatform) {
    setDeclinedIntegration(false);
    setPlatform(selected);
    setStep("generating");
  }

  function handleGenerate() {
    if (!platform) return;

    const priceLabel = priceCents === null ? "Not available" : `$${(priceCents / 100).toFixed(2)}`;
    const consumerKey = `baloot-${slugify(courseTitle)}-${classId.slice(0, 8)}`;
    const divider = "=".repeat(50);

    const lines = [
      "BALOOTBOOKS LTI INTEGRATION GUIDE",
      divider,
      `Course:                     ${courseTitle}`,
      `Section:                    ${sectionTitle} (${termToken})`,
      `LMS Platform:               ${platform}`,
      `Digital Textbook Price:     ${priceLabel}`,
      `Student Registration Deadline: Not configured - BalootBooks does not track a registration`,
      "                                deadline yet. Set one in your LMS course settings instead.",
      "",
      "STEP 1: Locate the LTI tool registration screen",
      `  ${LMS_LAUNCH_STEPS[platform]}`,
      "",
      "STEP 2: LTI Consumer Key & Shared Secret",
      `  Consumer Key:     ${consumerKey}`,
      "  Shared Secret:    [Generate a secure secret in your admin console - do not reuse it elsewhere]",
      "  Launch URL:       https://your-production-domain.example/lti/launch",
      "",
      "STEP 3: Verify the connection",
      "  Launch the tool from a test student account and confirm it lands on the correct course",
      "  reader page without requiring a separate BalootBooks login.",
      "",
      "This is an example configuration template with placeholder values - replace every bracketed",
      "field with the real credentials from your institution's LMS admin console before using it in",
      "a live course.",
      divider,
    ];

    setInstructions(lines.join("\n"));
    setStep("rendered");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      onCopySuccess("Instructions copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopySuccess("Couldn't access the clipboard - select and copy the text manually.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">LMS Integration Instructions</h2>
            <p className="mt-1 text-sm text-slate-500">{courseTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {step === "choice" && (
          <div className="mt-6">
            <p className="text-sm font-medium text-slate-700">
              Are you linking this class to a school Learning Management System?
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["Canvas", "Blackboard", "Moodle"] as LmsPlatform[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectPlatform(option)}
                  className="rounded-lg border-2 border-slate-200 px-4 py-5 text-center font-semibold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50"
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDeclinedIntegration(true)}
              className="mt-4 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              No, I&apos;m not sure yet
            </button>

            {declinedIntegration && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No problem - BalootBooks works fully standalone with class join codes. You can come
                back and set up an LMS integration any time.
              </p>
            )}
          </div>
        )}

        {step === "generating" && platform && (
          <div className="mt-6">
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-sm font-semibold text-brand-800">{platform} selected</p>
              <p className="mt-1 text-xs text-brand-700">
                We&apos;ll compile a starter integration guide for {sectionTitle} ({termToken}) using {platform}
                &apos;s LTI tool registration flow.
              </p>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← Change platform
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Generate My Integration Guide
              </button>
            </div>
          </div>
        )}

        {step === "rendered" && (
          <div className="mt-6">
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {instructions}
            </pre>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← Start over
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {copied ? "Copied!" : "📋 Copy Instructions to Clipboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

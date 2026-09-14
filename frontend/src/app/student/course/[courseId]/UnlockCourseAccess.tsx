"use client";

import { useState } from "react";

export default function UnlockCourseAccess({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      const body = await response.json();

      if (!response.ok || !body.url) {
        setError(body.error ?? "Couldn't start checkout. Try again.");
        setLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Couldn't reach the checkout service. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
          🔒
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Unlock Premium Course Access</h2>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;re not enrolled in a class for this course. Get instant, permanent access to the
          full digital textbook with a one-time purchase.
        </p>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleUnlock}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {loading ? "Redirecting to secure checkout..." : "Unlock Premium Course Access"}
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Have a class join code instead?{" "}
          <a href="/student/dashboard" className="font-medium text-brand-600 hover:text-brand-700">
            Redeem it here
          </a>
        </p>

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Experiencing financial difficulty? Contact{" "}
          <a href="mailto:support@balootbooks.com" className="font-medium text-brand-600 hover:text-brand-700">
            support@balootbooks.com
          </a>{" "}
          to request temporary access extensions.
        </p>
      </div>
    </div>
  );
}

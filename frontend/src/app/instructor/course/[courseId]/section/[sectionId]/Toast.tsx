"use client";

import type { ToastState } from "./types";

export default function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed right-6 top-6 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
        toast.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {toast.message}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SystemSetting } from "./types";
import SettingsForm from "./SettingsForm";

type ViewState = "checking-access" | "signed-out" | "forbidden" | "loading" | "error" | "ready";

export default function SystemSettingsPage() {
  const [view, setView] = useState<ViewState>("checking-access");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const loadSettings = useCallback(async () => {
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
      .from("system_settings")
      .select("key, value, description, updated_at")
      .order("key");

    if (error) {
      setErrorMessage(error.message);
      setView("error");
      return;
    }

    setSettings((data ?? []) as SystemSetting[]);
    setView("ready");
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">System Settings</h1>
          </div>
          <Link
            href="/admin-portal/catalog-manager"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Catalog Manager →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {view === "checking-access" && (
          <StatusPanel tone="neutral">Checking your admin access...</StatusPanel>
        )}

        {view === "signed-out" && (
          <StatusPanel tone="warning">
            You need to sign in as a platform admin to view this page.{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </StatusPanel>
        )}

        {view === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-700">
              Only super admin and platform admin accounts can view or modify system configurations.
            </p>
          </div>
        )}

        {view === "loading" && (
          <StatusPanel tone="neutral">Loading system configurations...</StatusPanel>
        )}

        {view === "error" && (
          <StatusPanel tone="error">Couldn&apos;t load system settings: {errorMessage}</StatusPanel>
        )}

        {view === "ready" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Global configuration</h2>
              <p className="text-sm text-slate-500">
                Changes apply platform-wide immediately after saving.
              </p>
            </div>
            <SettingsForm settings={settings} />
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

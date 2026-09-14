"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SystemSetting } from "./types";

type DraftValue = boolean | string;

export default function SettingsForm({ settings }: { settings: SystemSetting[] }) {
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value as DraftValue]))
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  function updateDraft(key: string, value: DraftValue) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const supabase = createClient();
    const updates = settings.map((setting) => ({
      key: setting.key,
      value: drafts[setting.key],
      description: setting.description,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("system_settings").upsert(updates, { onConflict: "key" });

    setSaving(false);

    if (error) {
      setStatus({ tone: "error", message: error.message });
      return;
    }

    setStatus({ tone: "success", message: "System configurations saved." });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {status && (
        <div
          role="status"
          className={`fixed right-6 top-6 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
            status.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {settings.map((setting) => {
          const draft = drafts[setting.key];

          return (
            <div key={setting.key} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="font-mono text-sm font-semibold text-slate-900">{setting.key}</p>
                {setting.description && (
                  <p className="mt-1 text-sm text-slate-500">{setting.description}</p>
                )}
              </div>

              <div className="shrink-0 sm:w-64">
                {typeof draft === "boolean" ? (
                  <ToggleSwitch
                    checked={draft}
                    onChange={(checked) => updateDraft(setting.key, checked)}
                  />
                ) : (
                  <input
                    type="text"
                    value={draft as string}
                    onChange={(event) => updateDraft(setting.key, event.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save System Configurations"}
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

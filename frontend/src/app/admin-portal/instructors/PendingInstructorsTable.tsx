"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PendingInstructor } from "./types";

export default function PendingInstructorsTable({
  pending,
  onVerified,
}: {
  pending: PendingInstructor[];
  onVerified: () => void;
}) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  async function handleVerify(profileId: string) {
    setVerifyingId(profileId);
    setRowError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("verify_instructor_profile", { p_profile_id: profileId });

    setVerifyingId(null);

    if (error) {
      setRowError({ id: profileId, message: error.message });
      return;
    }

    onVerified();
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        No instructor applications are waiting for review.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3 font-semibold">Full name</th>
            <th className="px-6 py-3 font-semibold">Email</th>
            <th className="px-6 py-3 font-semibold">Institution</th>
            <th className="px-6 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pending.map((instructor) => (
            <tr key={instructor.id}>
              <td className="px-6 py-4 align-top font-medium text-slate-900">{instructor.full_name}</td>
              <td className="px-6 py-4 align-top text-slate-600">{instructor.email}</td>
              <td className="px-6 py-4 align-top text-slate-600">
                {instructor.institution_name ?? "—"}
              </td>
              <td className="px-6 py-4 align-top text-right">
                {rowError?.id === instructor.id && (
                  <p className="mb-1.5 text-xs text-red-600">{rowError.message}</p>
                )}
                <button
                  type="button"
                  onClick={() => handleVerify(instructor.id)}
                  disabled={verifyingId === instructor.id}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyingId === instructor.id ? "Verifying..." : "Verify Instructor"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

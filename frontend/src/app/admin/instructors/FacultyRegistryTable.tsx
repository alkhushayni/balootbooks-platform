"use client";

import { useState } from "react";
import type { InstructorAccount } from "./types";

export default function FacultyRegistryTable({
  accounts,
  onUpdated,
  onError,
}: {
  accounts: InstructorAccount[];
  onUpdated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggle(account: InstructorAccount) {
    const nextVerified = account.role !== "instructor";

    setPendingId(account.id);

    try {
      const response = await fetch("/api/admin/instructors/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: account.id, isVerified: nextVerified }),
      });

      const body = await response.json();

      if (!response.ok) {
        onError(body.error ?? "Couldn't update this instructor's status.");
        return;
      }

      onUpdated(
        nextVerified
          ? `${account.full_name} is now a verified instructor.`
          : `${account.full_name}'s instructor access has been revoked.`
      );
    } catch {
      onError("Couldn't reach the verification service. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        No instructor-track accounts yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-6 py-3 font-semibold">Full name</th>
            <th className="px-6 py-3 font-semibold">Email</th>
            <th className="px-6 py-3 font-semibold">Institution</th>
            <th className="px-6 py-3 font-semibold">Status</th>
            <th className="px-6 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => {
            const isVerified = account.role === "instructor";
            const isPending = pendingId === account.id;

            return (
              <tr key={account.id}>
                <td className="px-6 py-4 align-top font-medium text-slate-900">{account.full_name}</td>
                <td className="px-6 py-4 align-top text-slate-600">{account.email}</td>
                <td className="px-6 py-4 align-top text-slate-600">{account.institution_name ?? "—"}</td>
                <td className="px-6 py-4 align-top">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isVerified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td className="px-6 py-4 align-top text-right">
                  <button
                    type="button"
                    onClick={() => handleToggle(account)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isVerified ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isPending && (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      />
                    )}
                    {isPending
                      ? "Saving..."
                      : isVerified
                        ? "Revoke Access"
                        : "Verify Faculty Credentials"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

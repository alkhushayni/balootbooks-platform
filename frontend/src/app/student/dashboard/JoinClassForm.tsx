"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const JOIN_CODE_LENGTH = 8;

export default function JoinClassForm({ onEnrolled }: { onEnrolled: () => void }) {
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const normalized = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      setError("Enter the 8-character join code your instructor gave you.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_class_join_code", {
      p_join_code: normalized,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setJoinCode("");
    onEnrolled();
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Join your first class</h2>
      <p className="mt-1 text-sm text-slate-500">Enter the join code your instructor shared with you.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="join_code" className="block text-sm font-medium text-slate-700">
            Class join code
          </label>
          <input
            id="join_code"
            type="text"
            required
            maxLength={JOIN_CODE_LENGTH}
            placeholder="FDAJ2PGL"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-widest shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Joining..." : "Join class"}
        </button>
      </form>
    </div>
  );
}

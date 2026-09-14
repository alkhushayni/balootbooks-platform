"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = { role: "user" | "assistant"; text: string };

const MONTHLY_QUERY_LIMIT = 50;

export default function AiStudyBuddy({ sectionId, sectionTitle }: { sectionId: string; sectionTitle: string }) {
  const [open, setOpen] = useState(false);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = queryCount !== null && queryCount >= MONTHLY_QUERY_LIMIT;

  async function handleOpen() {
    setOpen(true);

    if (queryCount !== null) return;

    setCheckingQuota(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCheckingQuota(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_ai_queries")
      .eq("id", user.id)
      .single();

    setQueryCount(profile?.monthly_ai_queries ?? 0);
    setCheckingQuota(false);
  }

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || isLocked || sending) return;

    setSending(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, sectionId }),
      });

      const body = await response.json();

      if (!response.ok) {
        if (response.status === 403) setQueryCount(MONTHLY_QUERY_LIMIT);
        setError(body.error ?? "The study buddy couldn't respond.");
        return;
      }

      setMessages((current) => [...current, { role: "assistant", text: body.answer }]);
      setQueryCount((current) => (current ?? 0) + 1);
    } catch {
      setError("Couldn't reach the study buddy service. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700"
      >
        🤖 Study Buddy
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">AI Study Buddy</p>
              <p className="truncate text-xs text-slate-400">{sectionTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {checkingQuota ? (
            <div className="flex flex-1 items-center justify-center px-6">
              <p className="text-sm text-slate-400">Checking your quota...</p>
            </div>
          ) : isLocked ? (
            <div className="flex flex-1 items-center justify-center px-6">
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 text-center shadow-sm">
                <p className="text-sm font-bold text-red-800">
                  ⚠️ Monthly AI Quota Exhausted ({MONTHLY_QUERY_LIMIT} / {MONTHLY_QUERY_LIMIT})
                </p>
                <p className="mt-2 text-xs text-red-700">
                  Outbound assistant capabilities are locked until your next term cycle.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Ask a question about this section - the study buddy only knows what&apos;s written
                    here.
                  </p>
                )}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "ml-6 bg-brand-50 text-brand-900"
                        : "mr-6 bg-slate-100 text-slate-800"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>

              <div className="border-t border-slate-200 p-3">
                {queryCount !== null && (
                  <p className="mb-2 text-right text-[11px] text-slate-400">
                    {queryCount} / {MONTHLY_QUERY_LIMIT} monthly queries used
                  </p>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    disabled={isLocked || sending}
                    rows={2}
                    placeholder="Ask about this lesson..."
                    className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isLocked || sending || !question.trim()}
                    className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

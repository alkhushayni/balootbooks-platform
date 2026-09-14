"use client";

import { useState } from "react";

type ConnectionState = "idle" | "connecting" | "connected";

const MOCK_BOOT_LINES = [
  "Provisioning network-restricted sandbox container...",
  "Mounting read-only evaluation fixtures...",
  "Starting shell session...",
  "Ready.",
];

export default function BalootLabsPane() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [lines, setLines] = useState<string[]>([]);

  function handleConnect() {
    if (state !== "idle") return;
    setState("connecting");
    setLines([]);

    MOCK_BOOT_LINES.forEach((line, index) => {
      setTimeout(() => {
        setLines((previous) => [...previous, line]);
        if (index === MOCK_BOOT_LINES.length - 1) {
          setState("connected");
        }
      }, (index + 1) * 400);
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-xs font-medium text-slate-400">BalootLabs sandbox</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            state === "connected"
              ? "bg-emerald-500/15 text-emerald-400"
              : state === "connecting"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-slate-800 text-slate-400"
          }`}
        >
          {state === "connected" ? "Connected" : state === "connecting" ? "Connecting..." : "Disconnected"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-slate-300">
        {lines.length === 0 && state === "idle" ? (
          <p className="text-slate-500">
            Click <span className="text-slate-300">Connect to VMs</span> to start a temporary sandbox
            session.
          </p>
        ) : (
          <div className="space-y-1">
            {lines.map((line, index) => (
              <p key={index}>
                <span className="text-emerald-500">$</span> {line}
              </p>
            ))}
            {state === "connected" && (
              <p>
                <span className="text-emerald-500">$</span>{" "}
                <span className="animate-pulse text-slate-400">_</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={state !== "idle"}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "idle" ? "Connect to VMs" : state === "connecting" ? "Connecting..." : "Session active"}
        </button>
      </div>
    </div>
  );
}

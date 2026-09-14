"use client";

import { useState } from "react";

export default function OnboardForm({
  onOnboarded,
  onError,
}: {
  onOnboarded: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [domainString, setDomainString] = useState("");
  const [maxSeats, setMaxSeats] = useState("1000");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !domainString.trim()) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/institutions/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domainString: domainString.trim(),
          maxSeats: Number.parseInt(maxSeats, 10) || undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        onError(body.error ?? "Couldn't onboard this institution.");
        return;
      }

      onOnboarded(`${name.trim()} has been onboarded.`);
      setName("");
      setDomainString("");
      setMaxSeats("1000");
    } catch {
      onError("Couldn't reach the onboarding service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Onboard New Institution Tenant</h2>
      <p className="mt-1 text-xs text-slate-500">
        Adds a partner university and whitelists its email domain for self-registration.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="institution_name" className="block text-xs font-medium text-slate-600">
            University Name
          </label>
          <input
            id="institution_name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Minnesota State University"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="domain_string" className="block text-xs font-medium text-slate-600">
            Domain String
          </label>
          <input
            id="domain_string"
            type="text"
            required
            value={domainString}
            onChange={(event) => setDomainString(event.target.value)}
            placeholder="campus.mnsu.edu"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="max_seats" className="block text-xs font-medium text-slate-600">
            Max Seats
          </label>
          <input
            id="max_seats"
            type="number"
            min={1}
            value={maxSeats}
            onChange={(event) => setMaxSeats(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Onboarding..." : "Onboard New Institution Tenant"}
      </button>
    </form>
  );
}

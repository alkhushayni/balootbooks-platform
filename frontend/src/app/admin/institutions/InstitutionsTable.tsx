import type { InstitutionRow } from "./types";

export default function InstitutionsTable({ institutions }: { institutions: InstitutionRow[] }) {
  if (institutions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No institutions onboarded yet. Use the form above to whitelist your first partner university.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              University
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Allowlisted Domains
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Max Seats
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {institutions.map((institution) => (
            <tr key={institution.id}>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{institution.name}</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                <div className="flex flex-wrap gap-1.5">
                  {institution.tenant_domains.length > 0 ? (
                    institution.tenant_domains.map((domain) => (
                      <span
                        key={domain.domain_string}
                        className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
                      >
                        {domain.domain_string}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No domains</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{institution.max_license_seats ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

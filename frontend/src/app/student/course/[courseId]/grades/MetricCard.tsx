export default function MetricCard({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string;
  caption: string;
  accent: "brand" | "violet" | "amber";
}) {
  const accentClasses = {
    brand: "text-brand-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
  }[accent];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-4xl font-bold ${accentClasses}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

import type { SectionItem } from "./types";

const CONTENT_TYPE_STYLES: Record<SectionItem["content_type"], string> = {
  READING: "bg-brand-50 text-brand-700",
  LAB: "bg-amber-50 text-amber-700",
};

export default function SectionRow({ section }: { section: SectionItem }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">{section.title}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
          CONTENT_TYPE_STYLES[section.content_type]
        }`}
      >
        {section.content_type}
      </span>
    </div>
  );
}

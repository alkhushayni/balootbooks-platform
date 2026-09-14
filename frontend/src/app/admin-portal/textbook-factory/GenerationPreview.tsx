import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GenerationResult } from "./types";

export default function GenerationPreview({ result }: { result: GenerationResult | null }) {
  if (!result) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-400">Awaiting generation instructions...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{result.chapter_name}</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          Saved to catalog
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {result.sections.length} section{result.sections.length === 1 ? "" : "s"} written to public.chapters / public.sections
      </p>

      <div className="mt-6 space-y-8">
        {result.sections.map((section, index) => (
          <div key={`${section.title}-${index}`} className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  section.content_type === "LAB"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-brand-100 text-brand-700"
                }`}
              >
                {section.content_type}
              </span>
            </div>
            <div className="prose prose-slate max-w-none prose-sm prose-headings:font-semibold prose-a:text-brand-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown_content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

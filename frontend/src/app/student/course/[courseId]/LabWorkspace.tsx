import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BalootLabsPane from "@/components/learning-loop/balootlabs-pane";
import type { SectionNode } from "./types";
import MarkCompleteToggle from "./MarkCompleteToggle";

export default function LabWorkspace({
  section,
  initiallyComplete,
  onComplete,
}: {
  section: SectionNode;
  initiallyComplete: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto border-b border-slate-200 px-8 py-8 lg:w-1/2 lg:flex-none lg:border-b-0 lg:border-r">
        <h1 className="text-2xl font-bold text-slate-900">{section.title}</h1>
        <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
          Lab
        </span>
        <div className="prose prose-slate mt-6 max-w-none prose-headings:font-semibold prose-a:text-brand-600">
          {section.markdown_content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown_content}</ReactMarkdown>
          ) : (
            <p className="text-slate-400">This lab doesn&apos;t have any instructions yet.</p>
          )}
        </div>

        <MarkCompleteToggle
          key={section.id}
          sectionId={section.id}
          metric="lab_percentage"
          label="Lab"
          initiallyComplete={initiallyComplete}
          onComplete={onComplete}
        />
      </div>

      <div className="min-h-[24rem] flex-1 bg-slate-100 p-4 lg:w-1/2 lg:flex-none">
        <BalootLabsPane />
      </div>
    </div>
  );
}

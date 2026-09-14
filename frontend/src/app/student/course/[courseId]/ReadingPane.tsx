import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SectionNode } from "./types";
import MarkCompleteToggle from "./MarkCompleteToggle";

export default function ReadingPane({
  section,
  initiallyComplete,
  onComplete,
}: {
  section: SectionNode;
  initiallyComplete: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">{section.title}</h1>
        <div className="prose prose-slate mt-6 max-w-none prose-headings:font-semibold prose-a:text-brand-600">
          {section.markdown_content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown_content}</ReactMarkdown>
          ) : (
            <p className="text-slate-400">This section doesn&apos;t have any content yet.</p>
          )}
        </div>

        <MarkCompleteToggle
          key={section.id}
          sectionId={section.id}
          isCustom={section.is_custom}
          metric="participation_percentage"
          label="Reading"
          initiallyComplete={initiallyComplete}
          onComplete={onComplete}
        />
      </div>
    </div>
  );
}

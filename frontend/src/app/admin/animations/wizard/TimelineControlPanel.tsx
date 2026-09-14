export default function TimelineControlPanel({
  activeIndex,
  frameCount,
  onAddFrame,
  onRemoveFrame,
  onPreviewNext,
  onPreviewBack,
}: {
  activeIndex: number;
  frameCount: number;
  onAddFrame: () => void;
  onRemoveFrame: () => void;
  onPreviewNext: () => void;
  onPreviewBack: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timeline Position</p>
          <p className="text-lg font-bold">
            Frame {activeIndex + 1} / {frameCount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviewBack}
            disabled={activeIndex === 0}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Preview Back
          </button>
          <button
            type="button"
            onClick={onPreviewNext}
            disabled={activeIndex >= frameCount - 1}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Preview Next →
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onAddFrame}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          + Add Frame State
        </button>
        <button
          type="button"
          onClick={onRemoveFrame}
          disabled={frameCount <= 1}
          className="flex-1 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove Frame
        </button>
      </div>
    </div>
  );
}

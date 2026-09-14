export default function FrameCanvas({
  activeIndex,
  caption,
  onCaptionChange,
}: {
  activeIndex: number;
  caption: string;
  onCaptionChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Vector viewport placeholder - no real rendering engine exists yet, this is a mock canvas
          the caption and frame index bind against, matching this project's established pattern for
          authoring tools ahead of their real rendering backend (Step 14's textbook factory, Step
          21's terminal). */}
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-300">#{activeIndex + 1}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Vector Viewport Placeholder</p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="frame_caption" className="block text-xs font-medium text-slate-600">
          Frame State Caption Description
        </label>
        <input
          id="frame_caption"
          type="text"
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Describe what happens in this frame..."
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}

export type FrameState = {
  id: string;
  caption: string;
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

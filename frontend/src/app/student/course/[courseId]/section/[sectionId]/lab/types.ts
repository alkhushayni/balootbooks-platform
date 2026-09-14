export type TerminalLine = {
  id: string;
  type: "input" | "output" | "error";
  text: string;
};

export type SectionPayload = {
  id: string;
  title: string;
  markdown_content: string | null;
};

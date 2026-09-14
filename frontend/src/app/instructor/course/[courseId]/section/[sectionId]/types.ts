export type SectionRecord = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  markdown_content: string | null;
  chapter_id: string;
};

export type ClassOption = {
  id: string;
  section_title: string;
  term_token: string;
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

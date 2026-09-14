export type MasterSection = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
};

export type MasterChapter = {
  id: string;
  title: string;
  display_order: number;
  sections: MasterSection[];
};

export type ClassCustomSection = {
  id: string;
  chapter_override_id: string;
  title: string;
  content_type: "READING" | "LAB";
  markdown_content: string | null;
  display_order: number;
};

export type ClassChapterOverride = {
  id: string;
  chapter_id: string | null;
  title: string | null;
  display_order: number | null;
  is_hidden: boolean;
};

// One row in a class's outline, unified across two possible origins: a master chapter (possibly
// customized by an override row) or a wholly class-private custom chapter. Exactly one of
// override_id/master_chapter_id can be null, never both.
export type DisplaySection = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
  is_custom: boolean;
};

export type DisplayChapter = {
  override_id: string | null;
  master_chapter_id: string | null;
  title: string;
  effective_order: number;
  is_hidden: boolean;
  sections: DisplaySection[];
};

export type ClassOption = {
  id: string;
  section_title: string;
  term_token: string;
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

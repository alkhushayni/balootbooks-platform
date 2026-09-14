export type SectionNode = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
  markdown_content: string | null;
};

export type ChapterNode = {
  id: string;
  title: string;
  display_order: number;
  sections: SectionNode[];
};

export type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  chapters: ChapterNode[];
};

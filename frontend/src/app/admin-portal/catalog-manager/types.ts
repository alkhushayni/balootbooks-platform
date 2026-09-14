export type SectionItem = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
  markdown_content: string | null;
};

export type ChapterItem = {
  id: string;
  title: string;
  display_order: number;
  sections: SectionItem[];
};

export type CourseItem = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  chapters: ChapterItem[];
};

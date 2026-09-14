export type SectionNode = {
  id: string;
  title: string;
  content_type: "READING" | "LAB";
  display_order: number;
  markdown_content: string | null;
  // true when id is a class_custom_sections.id (no backing public.sections row) rather than a
  // master section - determines which student_progress reference column to write to.
  is_custom: boolean;
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

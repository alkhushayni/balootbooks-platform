export type CourseOption = {
  id: string;
  title: string;
};

export type GeneratedSection = {
  title: string;
  content_type: "READING" | "LAB";
  markdown_content: string;
};

export type GenerationResult = {
  chapter_id: string;
  chapter_name: string;
  sections: GeneratedSection[];
};

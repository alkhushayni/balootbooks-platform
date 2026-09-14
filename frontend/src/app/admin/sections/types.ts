export type CatalogCourse = {
  id: string;
  title: string;
};

export type VerifiedInstructor = {
  id: string;
  full_name: string;
};

export type AllocatedClass = {
  id: string;
  course_identifier: string;
  section_title: string;
  term_token: string;
  join_code: string;
  instructor_id: string;
};

export type SectionRow = {
  key: string;
  sectionName: string;
  instructorId: string;
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

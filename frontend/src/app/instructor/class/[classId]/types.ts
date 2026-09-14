export type ClassMeta = {
  id: string;
  course_identifier: string;
  section_title: string;
  term_token: string;
  join_code: string;
  course_title: string;
};

export type RosterEntry = {
  student_id: string;
  full_name: string;
  email: string;
  institutional_id: string | null;
  avg_participation: number;
  avg_challenge: number;
  avg_lab: number;
};

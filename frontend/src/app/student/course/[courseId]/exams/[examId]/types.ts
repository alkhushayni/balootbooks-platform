export type ExamMeta = {
  id: string;
  title: string;
  time_limit_mins: number;
  class_id: string;
};

export type ExamQuestion = {
  id: string;
  question_text: string;
  options: string[];
  display_order: number;
};

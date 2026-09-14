export type VisibleSection = {
  id: string;
  title: string;
  chapterTitle: string;
  contentType: "READING" | "LAB";
  isCustom: boolean;
};

export type ExamResult = {
  examId: string;
  examTitle: string;
  scorePercentage: number;
  completedAt: string;
};

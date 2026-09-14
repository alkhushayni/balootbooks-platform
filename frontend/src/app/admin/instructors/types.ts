export type InstructorAccount = {
  id: string;
  full_name: string;
  email: string;
  institution_name: string | null;
  role: "instructor" | "unverified_instructor";
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

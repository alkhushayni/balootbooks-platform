export type RosterEntry = {
  fullName: string;
  email: string;
};

export type ClassOption = {
  id: string;
  label: string;
};

export type InstitutionOption = {
  id: string;
  name: string;
};

export type ImportFailure = { email: string; reason: string };

export type ImportResult = {
  importedCount: number;
  skippedCount: number;
  failures: ImportFailure[];
};

export type ToastState = { tone: "success" | "error"; message: string } | null;

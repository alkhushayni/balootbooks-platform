export type ComplianceClassEntry = {
  classId: string;
  courseIdentifier: string;
  sectionTitle: string;
  termToken: string;
  instructorName: string;
  enrolledCount: number;
  complianceIndex: number | null;
  hasSandboxActivity: boolean;
};

export type ComplianceResponse = {
  institutionId: string | null;
  totalEnrolledStudents: number;
  activeSandboxClassrooms: number;
  curriculumComplianceAverage: number | null;
  classes: ComplianceClassEntry[];
};

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  id: string;
  course_id: string;
  course_identifier: string;
  section_title: string;
  term_token: string;
  instructor_id: string;
};

type ChapterRow = { id: string; course_id: string };
type OverrideRow = { class_id: string; chapter_id: string | null; is_hidden: boolean };
type EnrollmentRow = { class_id: string; student_id: string };
type InstructorRow = { id: string; full_name: string };

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

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view compliance data." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "department_chair") {
    return NextResponse.json(
      { error: "Only department chair accounts can view this dashboard." },
      { status: 403 }
    );
  }

  if (!profile.institution_id) {
    const empty: ComplianceResponse = {
      institutionId: null,
      totalEnrolledStudents: 0,
      activeSandboxClassrooms: 0,
      curriculumComplianceAverage: null,
      classes: [],
    };
    return NextResponse.json(empty);
  }

  // RLS (is_chair_over_profile) already scopes every one of these reads to classes whose
  // instructor shares this chair's institution_id - no explicit institution filter is needed or
  // possible here, since classes/enrollments/class_chapter_overrides carry no institution_id of
  // their own.
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, course_id, course_identifier, section_title, term_token, instructor_id");

  if (classesError) {
    return NextResponse.json({ error: classesError.message }, { status: 500 });
  }

  const visibleClasses = (classes ?? []) as ClassRow[];

  if (visibleClasses.length === 0) {
    const empty: ComplianceResponse = {
      institutionId: profile.institution_id,
      totalEnrolledStudents: 0,
      activeSandboxClassrooms: 0,
      curriculumComplianceAverage: null,
      classes: [],
    };
    return NextResponse.json(empty);
  }

  const classIds = visibleClasses.map((row) => row.id);
  const instructorIds = [...new Set(visibleClasses.map((row) => row.instructor_id))];
  const courseIds = [...new Set(visibleClasses.map((row) => row.course_id))];

  const [instructorsResult, chaptersResult, overridesResult, enrollmentsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", instructorIds),
    supabase.from("chapters").select("id, course_id").in("course_id", courseIds),
    supabase.from("class_chapter_overrides").select("class_id, chapter_id, is_hidden").in("class_id", classIds),
    supabase.from("enrollments").select("class_id, student_id").in("class_id", classIds),
  ]);

  if (instructorsResult.error) {
    return NextResponse.json({ error: instructorsResult.error.message }, { status: 500 });
  }
  if (chaptersResult.error) {
    return NextResponse.json({ error: chaptersResult.error.message }, { status: 500 });
  }
  if (overridesResult.error) {
    return NextResponse.json({ error: overridesResult.error.message }, { status: 500 });
  }
  if (enrollmentsResult.error) {
    return NextResponse.json({ error: enrollmentsResult.error.message }, { status: 500 });
  }

  const instructorNameById = new Map(
    ((instructorsResult.data ?? []) as InstructorRow[]).map((row) => [row.id, row.full_name])
  );

  const chapterCountByCourseId = new Map<string, number>();
  for (const chapter of (chaptersResult.data ?? []) as ChapterRow[]) {
    chapterCountByCourseId.set(chapter.course_id, (chapterCountByCourseId.get(chapter.course_id) ?? 0) + 1);
  }

  const overridesByClassId = new Map<string, OverrideRow[]>();
  for (const override of (overridesResult.data ?? []) as OverrideRow[]) {
    const list = overridesByClassId.get(override.class_id) ?? [];
    list.push(override);
    overridesByClassId.set(override.class_id, list);
  }

  const studentsByClassId = new Map<string, Set<string>>();
  const allStudentIds = new Set<string>();
  for (const enrollment of (enrollmentsResult.data ?? []) as EnrollmentRow[]) {
    const set = studentsByClassId.get(enrollment.class_id) ?? new Set<string>();
    set.add(enrollment.student_id);
    studentsByClassId.set(enrollment.class_id, set);
    allStudentIds.add(enrollment.student_id);
  }

  const entries: ComplianceClassEntry[] = visibleClasses.map((classRow) => {
    const totalChapters = chapterCountByCourseId.get(classRow.course_id) ?? 0;
    const classOverrides = overridesByClassId.get(classRow.id) ?? [];

    // Compliance is measured strictly against master chapters remaining visible - a hidden
    // custom chapter (chapter_id IS NULL) doesn't count against the master catalog, since it was
    // never part of it.
    const hiddenMasterChapters = classOverrides.filter(
      (override) => override.chapter_id !== null && override.is_hidden
    ).length;

    const complianceIndex =
      totalChapters === 0 ? null : Math.round(((totalChapters - hiddenMasterChapters) / totalChapters) * 100);

    return {
      classId: classRow.id,
      courseIdentifier: classRow.course_identifier,
      sectionTitle: classRow.section_title,
      termToken: classRow.term_token,
      instructorName: instructorNameById.get(classRow.instructor_id) ?? "Unknown instructor",
      enrolledCount: studentsByClassId.get(classRow.id)?.size ?? 0,
      complianceIndex,
      hasSandboxActivity: classOverrides.length > 0,
    };
  });

  const complianceValues = entries.map((entry) => entry.complianceIndex).filter((value): value is number => value !== null);

  const curriculumComplianceAverage =
    complianceValues.length === 0
      ? null
      : Math.round((complianceValues.reduce((sum, value) => sum + value, 0) / complianceValues.length) * 100) / 100;

  const response: ComplianceResponse = {
    institutionId: profile.institution_id,
    totalEnrolledStudents: allStudentIds.size,
    activeSandboxClassrooms: entries.filter((entry) => entry.hasSandboxActivity).length,
    curriculumComplianceAverage,
    classes: entries,
  };

  return NextResponse.json(response);
}

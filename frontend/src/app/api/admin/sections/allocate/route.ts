import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSectionAccessCode } from "@/lib/join-code";

type SectionDefinition = {
  sectionName?: string;
  instructorId?: string;
  term?: string;
};

type AllocatePayload = {
  courseId?: string;
  courseIdentifier?: string;
  sections?: SectionDefinition[];
};

const MAX_BATCH_INSERT_ATTEMPTS = 5;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to provision sections." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can bulk-provision classroom sections." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as AllocatePayload;
  const courseId = payload.courseId?.trim();
  const courseIdentifier = payload.courseIdentifier?.trim();
  const sections = payload.sections;

  if (!courseId || !courseIdentifier) {
    return NextResponse.json({ error: "courseId and courseIdentifier are required." }, { status: 400 });
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "At least one section definition is required." }, { status: 400 });
  }

  for (const [index, section] of sections.entries()) {
    if (!section.sectionName?.trim() || !section.instructorId?.trim() || !section.term?.trim()) {
      return NextResponse.json(
        { error: `Row ${index + 1}: sectionName, instructorId, and term are all required.` },
        { status: 400 }
      );
    }
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  // list_instructor_accounts() is SECURITY DEFINER and already admin-gated (Step 24) - it's the
  // established path for an admin session to read instructor profiles, since profiles RLS itself
  // only ever permits reading your own row. Reused here to confirm every submitted instructorId
  // is real and currently verified, rather than trusting client-supplied uuids blindly.
  const { data: instructorAccounts, error: instructorsError } = await supabase.rpc("list_instructor_accounts");

  if (instructorsError) {
    return NextResponse.json({ error: instructorsError.message }, { status: 500 });
  }

  const verifiedInstructorIds = new Set(
    (instructorAccounts ?? [])
      .filter((account: { role: string }) => account.role === "instructor")
      .map((account: { id: string }) => account.id)
  );

  for (const [index, section] of sections.entries()) {
    if (!verifiedInstructorIds.has(section.instructorId)) {
      return NextResponse.json(
        { error: `Row ${index + 1}: instructor is not a verified instructor account.` },
        { status: 400 }
      );
    }
  }

  for (let attempt = 0; attempt < MAX_BATCH_INSERT_ATTEMPTS; attempt++) {
    const usedCodes = new Set<string>();
    const rows = sections.map((section) => {
      let code = generateSectionAccessCode();
      while (usedCodes.has(code)) {
        code = generateSectionAccessCode();
      }
      usedCodes.add(code);

      return {
        instructor_id: section.instructorId,
        course_id: courseId,
        course_identifier: courseIdentifier,
        section_title: section.sectionName!.trim(),
        term_token: section.term!.trim(),
        join_code: code,
      };
    });

    // A single multi-row INSERT is one statement - Postgres either commits every row or, on any
    // constraint violation, rolls the whole statement back. That atomicity is exactly what's
    // needed here: a partially-provisioned batch (some sections created, others silently
    // skipped) would be far worse than a clean failure.
    const { data: created, error: insertError } = await supabase
      .from("classes")
      .insert(rows)
      .select("id, course_identifier, section_title, term_token, join_code, instructor_id");

    if (!insertError) {
      return NextResponse.json({ classes: created });
    }

    const isJoinCodeCollision = insertError.code === "23505" && insertError.message.includes("join_code");
    if (!isJoinCodeCollision) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    // Unique constraint hit on join_code - astronomically unlikely across a batch, but loop
    // around and mint an entirely fresh set rather than partially retrying.
  }

  return NextResponse.json(
    { error: "Couldn't generate unique access codes for this batch after several attempts. Please try again." },
    { status: 500 }
  );
}

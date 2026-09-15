import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/join-code";

const MAX_JOIN_CODE_ATTEMPTS = 5;

type CoInstructorInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type AdoptPayload = {
  courseId?: string;
  courseIdentifier?: string;
  sectionTitle?: string;
  termToken?: string;
  coInstructors?: CoInstructorInput[];
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to adopt a course." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "instructor") {
    return NextResponse.json({ error: "Only verified instructor accounts can adopt courses." }, { status: 403 });
  }

  const payload = (await request.json()) as AdoptPayload;
  const courseId = payload.courseId?.trim();
  const courseIdentifier = payload.courseIdentifier?.trim();
  const sectionTitle = payload.sectionTitle?.trim();
  const termToken = payload.termToken?.trim();

  if (!courseId || !courseIdentifier || !sectionTitle || !termToken) {
    return NextResponse.json(
      { error: "courseId, courseIdentifier, sectionTitle, and termToken are required." },
      { status: 400 }
    );
  }

  const coInstructors = (payload.coInstructors ?? [])
    .map((entry) => ({
      firstName: entry.firstName?.trim() ?? "",
      lastName: entry.lastName?.trim() ?? "",
      email: entry.email?.trim() ?? "",
    }))
    .filter((entry) => entry.firstName || entry.lastName || entry.email);

  for (const entry of coInstructors) {
    if (!entry.firstName || !entry.lastName || !entry.email) {
      return NextResponse.json(
        { error: "Each co-instructor needs a first name, last name, and email." },
        { status: 400 }
      );
    }
  }

  const uniqueEmails = new Set(coInstructors.map((entry) => entry.email.toLowerCase()));
  if (uniqueEmails.size !== coInstructors.length) {
    return NextResponse.json({ error: "Co-instructor emails must be unique." }, { status: 400 });
  }

  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
    const joinCode = generateJoinCode();

    const { data: classId, error: rpcError } = await supabase.rpc("create_class_with_co_instructors", {
      p_course_id: courseId,
      p_course_identifier: courseIdentifier,
      p_section_title: sectionTitle,
      p_term_token: termToken,
      p_join_code: joinCode,
      p_co_instructors: coInstructors.map((entry) => ({
        first_name: entry.firstName,
        last_name: entry.lastName,
        email: entry.email,
      })),
    });

    if (!rpcError) {
      return NextResponse.json({ classId, joinCode });
    }

    const isJoinCodeCollision = rpcError.code === "23505" && rpcError.message.includes("join_code");
    if (!isJoinCodeCollision) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }
    // Unique constraint hit on join_code specifically - loop around and mint a fresh one.
  }

  return NextResponse.json(
    { error: "Couldn't generate a unique join code after several attempts. Please try again." },
    { status: 500 }
  );
}

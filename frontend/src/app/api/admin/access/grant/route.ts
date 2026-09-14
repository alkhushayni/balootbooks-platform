import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-log";

type GrantPayload = {
  studentId?: string;
  classId?: string;
  durationDays?: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to grant temporary access." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can grant temporary hardship access." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as GrantPayload;
  const studentId = payload.studentId?.trim();
  const classId = payload.classId?.trim();
  const durationDays = payload.durationDays;

  if (!studentId || !classId || !Number.isFinite(durationDays) || (durationDays as number) <= 0) {
    return NextResponse.json(
      { error: "studentId, classId, and a positive durationDays are required." },
      { status: 400 }
    );
  }

  const { data: studentProfile, error: studentError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", studentId)
    .single();

  if (studentError || !studentProfile || studentProfile.role !== "student") {
    return NextResponse.json({ error: "Student account not found." }, { status: 404 });
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, course_identifier, section_title")
    .eq("id", classId)
    .single();

  if (classError || !classRow) {
    return NextResponse.json({ error: "Class section not found." }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + (durationDays as number) * 24 * 60 * 60 * 1000).toISOString();

  const { data: grant, error: insertError } = await supabase
    .from("temporary_access_grants")
    .insert({ student_id: studentId, class_id: classId, expires_at: expiresAt })
    .select("id, expires_at")
    .single();

  if (insertError || !grant) {
    return NextResponse.json({ error: insertError?.message ?? "Couldn't create the access grant." }, { status: 500 });
  }

  console.log(
    `[GRANT SUCCESS] ${durationDays}-day hardship access granted to ${studentProfile.full_name} (${studentId}) for ${classRow.course_identifier} - ${classRow.section_title}. Expires ${expiresAt}.`
  );
  console.log("[EMAIL SIMULATION] Sent access confirmation notice to student profile.");

  await logAuditEvent({
    actorId: user.id,
    actionType: "temporary_access_grant",
    description: `Granted ${studentProfile.full_name} ${durationDays} day(s) of temporary access to ${classRow.course_identifier} - ${classRow.section_title}.`,
    metadata: { studentId, classId, durationDays, expiresAt },
  });

  return NextResponse.json({ success: true, grant });
}

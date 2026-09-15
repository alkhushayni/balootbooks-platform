import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashCodeStructure } from "@/lib/testing/aigrade-parser";

type SubmitPayload = {
  sectionId?: string;
  code?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to submit lab code." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts can submit lab code." }, { status: 403 });
  }

  const payload = (await request.json()) as SubmitPayload;
  const sectionId = payload.sectionId?.trim();
  const code = payload.code ?? "";

  if (!sectionId || !code.trim()) {
    return NextResponse.json({ error: "sectionId and non-empty code are required." }, { status: 400 });
  }

  // lab_submissions.section_id only references the master public.sections catalog (not
  // class_custom_sections) - confirm this is a real catalog section before hashing/inserting.
  const { data: section } = await supabase.from("sections").select("id").eq("id", sectionId).maybeSingle();

  if (!section) {
    return NextResponse.json(
      { error: "Structural analysis is only available for catalog lab sections." },
      { status: 404 }
    );
  }

  const codeStructureHash = hashCodeStructure(code);

  // is_flagged_duplicate is intentionally omitted here - a BEFORE INSERT trigger computes it
  // authoritatively server-side regardless of what's supplied, so the value returned below is
  // always trustworthy.
  const { data: inserted, error: insertError } = await supabase
    .from("lab_submissions")
    .insert({
      student_id: user.id,
      section_id: sectionId,
      raw_code_content: code,
      code_structure_hash: codeStructureHash,
    })
    .select("id, is_flagged_duplicate, created_at")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Couldn't record this submission." }, { status: 400 });
  }

  return NextResponse.json({
    submissionId: inserted.id,
    isFlaggedDuplicate: inserted.is_flagged_duplicate,
    createdAt: inserted.created_at,
  });
}

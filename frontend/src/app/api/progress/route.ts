import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProgressPayload = {
  sectionId?: string;
  customSectionId?: string;
  metric?: "participation_percentage" | "lab_percentage";
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to save progress." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts track reading progress." }, { status: 403 });
  }

  const payload = (await request.json()) as ProgressPayload;
  const { sectionId, customSectionId, metric } = payload;

  if (metric !== "participation_percentage" && metric !== "lab_percentage") {
    return NextResponse.json({ error: "A valid metric is required." }, { status: 400 });
  }

  if ((!sectionId && !customSectionId) || (sectionId && customSectionId)) {
    return NextResponse.json(
      { error: "Provide exactly one of sectionId or customSectionId." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("student_progress").upsert(
    {
      student_id: user.id,
      section_id: sectionId ?? null,
      class_custom_section_id: customSectionId ?? null,
      [metric]: 100,
      updated_at: new Date().toISOString(),
    },
    { onConflict: sectionId ? "student_id,section_id" : "student_id,class_custom_section_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

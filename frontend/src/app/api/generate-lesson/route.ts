import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOutline } from "@/lib/llm/generateOutline";

type GenerateLessonPayload = {
  courseId?: string;
  chapterName?: string;
  prompt?: string;
};

type GeneratedChapterRow = {
  out_chapter_id: string;
  out_chapter_title: string;
  out_section_id: string;
  out_section_title: string;
  out_content_type: "READING" | "LAB";
  out_markdown_content: string;
  out_display_order: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to use the AI Textbook Factory." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "platform_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can run AI generation." },
      { status: 403 }
    );
  }

  const { data: setting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "allow_ai_generation")
    .single();

  if (setting?.value !== true) {
    return NextResponse.json(
      { error: "AI generation is currently disabled system-wide. Enable it from System Settings first." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as GenerateLessonPayload;
  const courseId = payload.courseId?.trim();
  const chapterName = payload.chapterName?.trim();
  const prompt = payload.prompt?.trim();

  if (!courseId || !chapterName || !prompt) {
    return NextResponse.json(
      { error: "courseId, chapterName, and prompt are all required." },
      { status: 400 }
    );
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "The selected course could not be found." }, { status: 404 });
  }

  let outline;
  try {
    outline = await generateOutline(course.title, chapterName, prompt);
  } catch (error) {
    console.error("[generate-lesson] Both providers failed:", error);
    return NextResponse.json(
      { error: "AI generation failed on every configured provider. Check server logs for details." },
      { status: 502 }
    );
  }

  const { data: writtenRows, error: writeError } = await supabase.rpc("create_generated_chapter", {
    p_course_id: courseId,
    p_chapter_title: outline.chapter_name,
    p_sections: outline.sections,
  });

  if (writeError || !writtenRows || writtenRows.length === 0) {
    return NextResponse.json(
      { error: writeError?.message ?? "Generated content could not be saved to the catalog." },
      { status: 500 }
    );
  }

  const rows = writtenRows as GeneratedChapterRow[];

  return NextResponse.json({
    chapter_id: rows[0].out_chapter_id,
    chapter_name: rows[0].out_chapter_title,
    sections: rows
      .sort((a, b) => a.out_display_order - b.out_display_order)
      .map((row) => ({
        title: row.out_section_title,
        content_type: row.out_content_type,
        markdown_content: row.out_markdown_content,
      })),
  });
}

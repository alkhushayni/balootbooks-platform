import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GenerateLessonPayload = {
  courseId?: string;
  chapterName?: string;
  prompt?: string;
};

type GeneratedSection = {
  title: string;
  content_type: "READING" | "LAB";
  markdown_content: string;
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

  const sections = buildMockOutline(course.title, chapterName, prompt);

  return NextResponse.json({ chapter_name: chapterName, sections });
}

function buildMockOutline(
  courseTitle: string,
  chapterName: string,
  prompt: string
): GeneratedSection[] {
  return [
    {
      title: `${chapterName}: Foundational Concepts`,
      content_type: "READING",
      markdown_content: [
        `## Overview`,
        ``,
        `This section introduces the foundational concepts of **${chapterName}** within the context of *${courseTitle}*.`,
        ``,
        `> Generation focus: ${prompt}`,
        ``,
        `### Learning Objectives`,
        `- Define the core terminology introduced in this chapter.`,
        `- Explain how these concepts connect to earlier material in ${courseTitle}.`,
        `- Identify the real-world scenarios where this knowledge applies.`,
        ``,
        `### Key Terms`,
        `| Term | Definition |`,
        `| --- | --- |`,
        `| Concept A | Placeholder definition tailored to "${prompt}". |`,
        `| Concept B | Placeholder definition tailored to "${prompt}". |`,
      ].join("\n"),
    },
    {
      title: `${chapterName}: Applied Practice`,
      content_type: "LAB",
      markdown_content: [
        `## Introduction`,
        ``,
        `Apply the concepts from the previous reading in a hands-on exercise centered on: ${prompt}.`,
        ``,
        `### Devices`,
        `- Workstation with the ${courseTitle} lab environment`,
        ``,
        `### Tasks`,
        `1. Review the scenario described in the generation prompt.`,
        `2. Complete the guided exercise steps (populated by the LLM pipeline once connected).`,
        `3. Submit your results for automatic progress tracking.`,
      ].join("\n"),
    },
    {
      title: `${chapterName}: Synthesis & Assessment`,
      content_type: "READING",
      markdown_content: [
        `## Wrapping Up`,
        ``,
        `Synthesize what was covered in **${chapterName}** and connect it back to ${courseTitle}.`,
        ``,
        `### Discussion Prompt`,
        `${prompt}`,
        ``,
        `### Self-Check`,
        `- Can you summarize the chapter's core idea in two sentences?`,
        `- What follow-up question would you bring to your instructor?`,
      ].join("\n"),
    },
  ];
}

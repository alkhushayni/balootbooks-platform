import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const CLAUDE_MODEL = "claude-sonnet-5";
const MONTHLY_QUERY_LIMIT = 50;

type ChatPayload = {
  question?: string;
  sectionId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to use the study buddy." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, monthly_ai_queries")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts can use the study buddy." }, { status: 403 });
  }

  // Pre-flight quota check, before the AI is ever touched.
  if (profile.monthly_ai_queries >= MONTHLY_QUERY_LIMIT) {
    return NextResponse.json(
      {
        error: `Monthly AI Quota Exhausted (${MONTHLY_QUERY_LIMIT} / ${MONTHLY_QUERY_LIMIT}). Outbound assistant capabilities are locked until your next term cycle.`,
      },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as ChatPayload;
  const question = payload.question?.trim();
  const sectionId = payload.sectionId?.trim();

  if (!question || !sectionId) {
    return NextResponse.json({ error: "question and sectionId are required." }, { status: 400 });
  }

  // Resolves the lesson's real content server-side - the client's supplied question is trusted,
  // but never client-supplied lesson text, or a student could manipulate what the model is told to
  // treat as ground truth. Tries the master catalog first, then falls back to a class-private
  // custom section. No separate enrollment check is layered on top of either lookup: RLS already
  // enforces the correct boundary on both tables (courses/chapters/sections are globally readable
  // to any authenticated user per the existing catalog policy - the same trust boundary
  // /api/courses/[courseId] already relies on - while class_custom_sections requires genuine
  // enrollment in that specific class).
  const { data: masterSection } = await supabase
    .from("sections")
    .select("title, markdown_content")
    .eq("id", sectionId)
    .maybeSingle();

  let lessonTitle = masterSection?.title;
  let lessonContent = masterSection?.markdown_content;

  if (!masterSection) {
    const { data: customSection } = await supabase
      .from("class_custom_sections")
      .select("title, markdown_content")
      .eq("id", sectionId)
      .maybeSingle();
    lessonTitle = customSection?.title;
    lessonContent = customSection?.markdown_content;
  }

  if (!lessonTitle) {
    return NextResponse.json({ error: "This lesson section could not be found." }, { status: 404 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let answer: string;
  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: [
        "You are a study buddy for a single lesson section in an online course.",
        `The lesson is titled "${lessonTitle}". Its full content is provided below inside <lesson> tags.`,
        "Answer the student's question using ONLY the information inside <lesson>. Never use outside knowledge, even if you know the answer.",
        "If the question cannot be answered from <lesson> alone, say so clearly and politely decline rather than guessing or answering from general knowledge.",
        `<lesson>\n${lessonContent ?? "(This lesson has no content yet.)"}\n</lesson>`,
      ].join("\n\n"),
      messages: [{ role: "user", content: question }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    answer = textBlock?.type === "text" ? textBlock.text : "";
  } catch (aiError) {
    const message = aiError instanceof Error ? aiError.message : "The study buddy couldn't respond right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: incrementError } = await supabase.rpc("increment_user_ai_query_count");

  if (incrementError) {
    // The answer was already generated - a quota-tracking write failure shouldn't fail the whole
    // request, but it also shouldn't be silently invisible.
    console.error("Failed to increment monthly_ai_queries:", incrementError.message);
  }

  return NextResponse.json({ answer });
}

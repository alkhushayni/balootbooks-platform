import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMarkdownBlock } from "@/lib/llm/block";

type GenerateBlockPayload = {
  prompt?: string;
  context?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to use the AI Block Assistant." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["super_admin", "platform_admin", "instructor"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only instructors and admins can use the AI Block Assistant." },
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

  const payload = (await request.json()) as GenerateBlockPayload;
  const prompt = payload.prompt?.trim();
  const context = payload.context?.trim() ?? "";

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  try {
    const markdown = await generateMarkdownBlock(prompt, context);
    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("[generate-block] Both providers failed:", error);
    return NextResponse.json(
      { error: "AI generation failed on every configured provider. Check server logs for details." },
      { status: 502 }
    );
  }
}

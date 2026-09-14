import { generateWithClaude } from "./claude";
import { generateWithGemini } from "./gemini";
import type { GeneratedChapter } from "./schema";

export async function generateOutline(
  courseTitle: string,
  chapterName: string,
  prompt: string
): Promise<GeneratedChapter> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await generateWithClaude(courseTitle, chapterName, prompt);
    } catch (error) {
      console.warn(
        "[generate-lesson] Primary provider (Claude) failed, falling back to Gemini:",
        error
      );
    }
  } else {
    console.warn("[generate-lesson] ANTHROPIC_API_KEY is not set, skipping primary provider.");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "AI generation is unavailable: no working provider. Set ANTHROPIC_API_KEY and/or GEMINI_API_KEY in .env.local."
    );
  }

  return await generateWithGemini(courseTitle, chapterName, prompt);
}

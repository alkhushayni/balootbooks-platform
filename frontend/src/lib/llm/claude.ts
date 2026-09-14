import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  GeneratedChapterSchema,
  buildSystemInstruction,
  buildUserPrompt,
  type GeneratedChapter,
} from "./schema";

// Requested model "claude-3-5-sonnet" is retired. claude-sonnet-5 is the current
// Sonnet-tier model - the closest match to what was asked for.
const CLAUDE_MODEL = "claude-sonnet-5";

export async function generateWithClaude(
  courseTitle: string,
  chapterName: string,
  prompt: string
): Promise<GeneratedChapter> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: buildSystemInstruction(courseTitle),
    messages: [{ role: "user", content: buildUserPrompt(chapterName, prompt) }],
    output_config: {
      format: zodOutputFormat(GeneratedChapterSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude response did not parse into the expected chapter schema.");
  }

  return response.parsed_output;
}

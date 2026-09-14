import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Same models as lib/llm/{claude,gemini}.ts - see those files for why these specific IDs.
const CLAUDE_MODEL = "claude-sonnet-5";
const GEMINI_MODEL = "gemini-3.1-pro-preview";

function buildBlockSystemInstruction(): string {
  return [
    "You are a content-authoring assistant embedded in a textbook editor.",
    "Given surrounding context and an instructor's request, output ONLY a single, high-fidelity snippet of raw Markdown content - a structured table, an explanation block, a targeted code block, or similar.",
    "Do not include any conversational filler, preamble, or postamble (no \"Here is...\", no \"I've created...\", no closing remarks).",
    "Do not wrap your entire response in a fenced code block unless the content itself is literally a code sample.",
    "Respond with the markdown snippet and nothing else.",
  ].join("\n");
}

function buildBlockUserPrompt(prompt: string, context: string): string {
  return context ? `Surrounding context:\n${context}\n\nRequest: ${prompt}` : `Request: ${prompt}`;
}

async function generateBlockWithClaude(prompt: string, context: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: buildBlockSystemInstruction(),
    messages: [{ role: "user", content: buildBlockUserPrompt(prompt, context) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response did not contain a text block.");
  }

  return textBlock.text.trim();
}

async function generateBlockWithGemini(prompt: string, context: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildBlockSystemInstruction(),
  });

  const result = await model.generateContent(buildBlockUserPrompt(prompt, context));
  return result.response.text().trim();
}

export async function generateMarkdownBlock(prompt: string, context: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await generateBlockWithClaude(prompt, context);
    } catch (error) {
      console.warn("[generate-block] Primary provider (Claude) failed, falling back to Gemini:", error);
    }
  } else {
    console.warn("[generate-block] ANTHROPIC_API_KEY is not set, skipping primary provider.");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "AI generation is unavailable: no working provider. Set ANTHROPIC_API_KEY and/or GEMINI_API_KEY in .env.local."
    );
  }

  return await generateBlockWithGemini(prompt, context);
}

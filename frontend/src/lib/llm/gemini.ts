import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import {
  GeneratedChapterSchema,
  buildSystemInstruction,
  buildUserPrompt,
  type GeneratedChapter,
} from "./schema";

// Requested model "gemini-1.5-pro" and this file's prior fallback "gemini-2.5-pro" are both
// retired - confirmed live by the Gemini API itself, which pointed to this replacement.
const GEMINI_MODEL = "gemini-3.1-pro-preview";

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    chapter_name: { type: SchemaType.STRING },
    sections: {
      type: SchemaType.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          content_type: { type: SchemaType.STRING, format: "enum", enum: ["READING", "LAB"] },
          markdown_content: { type: SchemaType.STRING },
        },
        required: ["title", "content_type", "markdown_content"],
      },
    },
  },
  required: ["chapter_name", "sections"],
};

export async function generateWithGemini(
  courseTitle: string,
  chapterName: string,
  prompt: string
): Promise<GeneratedChapter> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemInstruction(courseTitle),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result = await model.generateContent(buildUserPrompt(chapterName, prompt));
  const parsed = JSON.parse(result.response.text());

  return GeneratedChapterSchema.parse(parsed);
}

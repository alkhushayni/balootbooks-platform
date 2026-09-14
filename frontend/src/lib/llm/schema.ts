import { z } from "zod";

export const GeneratedSectionSchema = z.object({
  title: z.string(),
  content_type: z.enum(["READING", "LAB"]),
  markdown_content: z.string(),
});

export const GeneratedChapterSchema = z.object({
  chapter_name: z.string(),
  sections: z.array(GeneratedSectionSchema).length(3),
});

export type GeneratedChapter = z.infer<typeof GeneratedChapterSchema>;

export function buildSystemInstruction(courseTitle: string): string {
  return [
    `You are the curriculum engine for "${courseTitle}", part of the BalootBooks interactive courseware platform.`,
    `Given a chapter name and an instructor's generation prompt, produce exactly three sequential textbook sections for that chapter.`,
    ``,
    `Requirements for every section:`,
    `- "title": a specific, descriptive section heading (not just "Section 1").`,
    `- "content_type": either "READING" (conceptual/explanatory content) or "LAB" (hands-on exercise with numbered tasks). Use at least one of each across the three sections.`,
    `- "markdown_content": a deep, multi-paragraph Markdown block with realistic textbook structure - headers, learning objectives, and either explanatory prose (READING) or numbered lab tasks and terminal instructions (LAB). This must be substantive, original content themed precisely to the course and chapter - not a placeholder or outline.`,
    ``,
    `Respond with only the structured data - no commentary outside the schema.`,
  ].join("\n");
}

export function buildUserPrompt(chapterName: string, prompt: string): string {
  return `Chapter name: ${chapterName}\n\nInstructor's generation instructions: ${prompt}`;
}

import { createHash } from "crypto";

// Deliberately lightweight, not a real parser: strips comments and collapses all whitespace so
// two submissions that differ only in formatting, indentation, or variable-name-adjacent comments
// hash identically, approximating a basic AST-reduction pass without building a real one.
export function normalizeCodeStructure(rawCode: string): string {
  let normalized = rawCode;

  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, ""); // block comments
  normalized = normalized.replace(/\/\/.*$/gm, ""); // line comments (// style)
  normalized = normalized.replace(/#.*$/gm, ""); // line comments (# style)
  normalized = normalized.replace(/\s+/g, ""); // collapse all remaining whitespace

  return normalized;
}

export function hashCodeStructure(rawCode: string): string {
  const normalized = normalizeCodeStructure(rawCode);
  return createHash("sha256").update(normalized).digest("hex");
}

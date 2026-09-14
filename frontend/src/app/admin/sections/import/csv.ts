import type { RosterEntry } from "./types";

// Basic comma-separated parsing (name, email) - no quoted-field or embedded-comma handling, per
// spec. A first row is treated as a header and skipped only when its second column doesn't look
// like an email address, so a headerless CSV still parses correctly.
export function parseRosterCsv(text: string): RosterEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const rows = lines.map((line) => line.split(",").map((token) => token.trim()));

  const [firstFullName, firstEmail] = rows[0];
  const looksLikeHeader = Boolean(firstFullName) && !firstEmail?.includes("@");
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  const entries: RosterEntry[] = [];
  for (const [fullName, email] of dataRows) {
    if (!fullName || !email) continue;
    entries.push({ fullName, email });
  }

  return entries;
}

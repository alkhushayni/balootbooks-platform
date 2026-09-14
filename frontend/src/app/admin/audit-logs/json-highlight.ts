function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Regex-based syntax highlighting over an already HTML-escaped string - the match groups below
// only ever wrap substrings of that escaped text in <span> tags, so no raw, unescaped JSON value
// (which can contain admin-uploaded CSV content) ever reaches the DOM unescaped.
export function highlightJson(value: unknown): string {
  const escaped = escapeHtml(JSON.stringify(value, null, 2) ?? "null");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let colorClass = "text-amber-300";
      if (/^"/.test(match)) {
        colorClass = /:$/.test(match) ? "text-sky-300" : "text-emerald-300";
      } else if (match === "true" || match === "false") {
        colorClass = "text-violet-300";
      } else if (match === "null") {
        colorClass = "text-slate-400";
      }
      return `<span class="${colorClass}">${match}</span>`;
    }
  );
}

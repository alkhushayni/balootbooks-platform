"use client";

import { useRef, useState } from "react";
import { parseRosterCsv } from "./csv";
import type { RosterEntry } from "./types";

export default function CsvDropzone({ onParsed }: { onParsed: (rows: RosterEntry[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function readFile(file: File) {
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const rows = parseRosterCsv(text);

      if (rows.length === 0) {
        setParseError("No name/email rows could be parsed from this file.");
        onParsed([]);
        return;
      }

      onParsed(rows);
    };
    reader.onerror = () => setParseError("Couldn't read this file.");
    reader.readAsText(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
          dragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <p className="text-sm font-medium text-slate-700">
          {fileName ?? "Drop a roster .csv file here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-400">Format: Full Name, Email (one student per line)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      {parseError && <p className="mt-2 text-xs text-red-600">{parseError}</p>}
    </div>
  );
}

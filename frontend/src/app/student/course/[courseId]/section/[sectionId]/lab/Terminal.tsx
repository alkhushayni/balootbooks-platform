"use client";

import { useEffect, useRef, useState } from "react";
import type { TerminalLine } from "./types";

type MockFile = { name: string; content: string };

const PROMPT_USER = "student@balootbooks";
const PROMPT_PATH = "~";

// Themed by course so the exercise files feel grounded in what the student is actually
// studying, rather than generic placeholder text.
function buildMockFileSystem(courseTitle: string): MockFile[] {
  const title = courseTitle.toLowerCase();

  if (title.includes("security")) {
    return [
      {
        name: "README.md",
        content:
          "# Lab Environment\n\nYou are connected to a sandboxed analysis host.\nInspect `cipher_text.txt` and see if you can recover the plaintext.\nThe flag is hidden somewhere on this filesystem.",
      },
      {
        name: "cipher_text.txt",
        content: "4a 6f 68 6e 20 69 73 20 74 68 65 20 61 64 6d 69 6e 20 70 61 73 73 77 6f 72 64",
      },
      { name: "flag.txt", content: "BALOOT{s3cur1ty_1s_h4rd_bu7_w0r7h_17}" },
      {
        name: "server.log",
        content:
          "[INFO] Connection from 10.0.0.14 accepted\n[WARN] 5 failed login attempts for user 'admin'\n[INFO] Session established",
      },
    ];
  }

  if (title.includes("machine learning")) {
    return [
      { name: "README.md", content: "# ML Lab Environment\n\nA starter dataset and training script are provided below." },
      {
        name: "dataset.csv",
        content: "id,feature_1,feature_2,label\n1,0.42,1.87,0\n2,1.15,0.33,1\n3,0.98,2.04,1",
      },
      { name: "model_weights.bin", content: "<binary data: 2.4MB - use `python load_model.py` to inspect>" },
      { name: "train.py", content: "import pandas as pd\n\ndf = pd.read_csv('dataset.csv')\nprint(df.head())" },
    ];
  }

  if (title.includes("web")) {
    return [
      { name: "README.md", content: "# Web App Lab Environment\n\nA demo server is configured below - inspect it before running anything." },
      { name: "server.js", content: "const express = require('express');\nconst app = express();\napp.listen(3000);" },
      { name: ".env", content: "DATABASE_URL=postgres://labuser:labpass@localhost:5432/labdb\nSESSION_SECRET=change_me" },
      { name: "index.html", content: "<!DOCTYPE html>\n<html>\n<body><h1>Demo App</h1></body>\n</html>" },
    ];
  }

  return [
    { name: "README.md", content: "# Lab Environment\n\nWelcome to your sandboxed workspace. Type `help` to see available commands." },
    { name: "notes.txt", content: "Jot down your findings here as you work through the exercise." },
  ];
}

let lineCounter = 0;
function nextId() {
  lineCounter += 1;
  return `line-${lineCounter}`;
}

export default function Terminal({ courseTitle }: { courseTitle: string }) {
  const [files] = useState<MockFile[]>(() => buildMockFileSystem(courseTitle));
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { id: nextId(), type: "output", text: "Connected to sandboxed lab environment. Type `help` to get started." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  function appendLine(type: TerminalLine["type"], text: string) {
    setLines((current) => [...current, { id: nextId(), type, text }]);
  }

  function runCommand(raw: string) {
    const trimmed = raw.trim();
    appendLine("input", `${PROMPT_USER}:${PROMPT_PATH}$ ${raw}`);

    if (!trimmed) return;

    const [command, ...args] = trimmed.split(/\s+/);

    switch (command) {
      case "help":
        appendLine(
          "output",
          [
            "Available commands:",
            "  ls          list files in the current directory",
            "  pwd         print the working directory",
            "  cat <file>  print a file's contents",
            "  cd <dir>    change directory",
            "  clear       clear the terminal",
          ].join("\n")
        );
        break;

      case "pwd":
        appendLine("output", "/home/student");
        break;

      case "ls":
        appendLine("output", files.map((file) => file.name).join("  "));
        break;

      case "cat": {
        const targetName = args[0];
        if (!targetName) {
          appendLine("error", "cat: missing file operand");
          break;
        }
        const file = files.find((entry) => entry.name === targetName);
        if (!file) {
          appendLine("error", `cat: ${targetName}: No such file or directory`);
        } else {
          appendLine("output", file.content);
        }
        break;
      }

      case "cd": {
        const target = args[0];
        if (!target || target === "~" || target === ".") break;
        appendLine("error", `bash: cd: ${target}: No such file or directory`);
        break;
      }

      case "clear":
        setLines([]);
        return;

      default:
        appendLine("error", `bash: ${command}: command not found`);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    runCommand(input);
    setInput("");
  }

  return (
    <div
      ref={scrollRef}
      onClick={() => inputRef.current?.focus()}
      className="h-[500px] overflow-y-auto rounded-lg bg-black p-4 font-mono text-green-400"
    >
      {lines.map((line) => (
        <pre
          key={line.id}
          className={`whitespace-pre-wrap break-words text-sm ${
            line.type === "error" ? "text-red-400" : line.type === "input" ? "text-green-300" : "text-green-400"
          }`}
        >
          {line.text}
        </pre>
      ))}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-green-300">
          {PROMPT_USER}:{PROMPT_PATH}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm text-green-400 outline-none"
        />
      </form>
    </div>
  );
}

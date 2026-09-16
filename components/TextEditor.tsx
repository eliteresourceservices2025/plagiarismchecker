"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import toast from "react-hot-toast";
import { UploadCloud } from "lucide-react";
import { extractTextFromFile, SUPPORTED_EXTENSIONS } from "@/lib/fileExtract";
import type { SentenceMatch } from "@/lib/types";

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  sentences?: SentenceMatch[];
  selfMatchIndices?: Set<number>;
  onSentenceClick?: (sentence: SentenceMatch) => void;
  readOnly?: boolean;
}

const HIGHLIGHT_CLASSES: Record<SentenceMatch["classification"], string> = {
  original: "",
  paraphrased:
    "bg-amber-100 dark:bg-amber-900/40 rounded px-0.5 cursor-pointer transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/50",
  matched: "bg-red-100 dark:bg-red-900/40 rounded px-0.5 cursor-pointer transition-colors hover:bg-red-200 dark:hover:bg-red-900/50",
};

const SELF_MATCH_CLASS =
  "bg-purple-100 dark:bg-purple-900/40 rounded px-0.5 cursor-pointer transition-colors hover:bg-purple-200 dark:hover:bg-purple-900/50";

export default function TextEditor({
  text,
  onChange,
  sentences,
  selfMatchIndices,
  onSentenceClick,
  readOnly,
}: TextEditorProps) {
  const [dragging, setDragging] = useState(false);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Reading ${file.name}...`);
    try {
      const extracted = await extractTextFromFile(file);
      if (!extracted.trim()) {
        toast.error("No readable text found in that file.", { id: toastId });
        return;
      }
      onChange(extracted);
      toast.success(`Loaded ${file.name}`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.", {
        id: toastId,
      });
    }
  }

  if (sentences && sentences.length > 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap shadow-sm animate-fade-in">
          {renderHighlightedText(text, sentences, selfMatchIndices, onSentenceClick)}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative flex-1"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          className="h-full w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-slate-100 leading-relaxed shadow-sm outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand-light"
          placeholder="Paste or type your article here, or drop a file (.txt, .pdf, .docx, .md, .html)…"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand bg-brand-light/90 text-brand">
            <UploadCloud size={28} />
            <p className="text-sm font-medium">Drop to upload</p>
            <p className="text-xs text-brand/70">
              {SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(" · ")}
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
}

function renderHighlightedText(
  text: string,
  sentences: SentenceMatch[],
  selfMatchIndices: Set<number> | undefined,
  onSentenceClick?: (sentence: SentenceMatch) => void
) {
  // Walk the original text, wrapping each known sentence in a highlight span
  // where it's found, and leaving everything else (whitespace, sentences
  // filtered out for being too short) untouched.
  const nodes: ReactNode[] = [];
  let cursor = 0;

  const sorted = [...sentences].sort(
    (a, b) => text.indexOf(a.original, cursor) - text.indexOf(b.original, cursor)
  );

  for (const sentence of sorted) {
    const idx = text.indexOf(sentence.original, cursor);
    if (idx === -1) continue;

    if (idx > cursor) {
      nodes.push(text.slice(cursor, idx));
    }

    const isSelfMatch = selfMatchIndices?.has(sentence.index) ?? false;
    const className = isSelfMatch ? SELF_MATCH_CLASS : HIGHLIGHT_CLASSES[sentence.classification];
    const isInteractive = sentence.classification !== "original" || isSelfMatch;

    const titleParts: string[] = [];
    if (sentence.classification !== "original") {
      titleParts.push(`${sentence.score}% similar${sentence.sourceUrl ? ` — ${sentence.sourceUrl}` : ""}`);
    }
    if (sentence.missingQuotes) titleParts.push("Missing quotation marks");
    if (isSelfMatch) titleParts.push("Matches your own past check");

    nodes.push(
      <span
        key={sentence.index}
        className={className}
        title={titleParts.length > 0 ? titleParts.join(" · ") : undefined}
        onClick={() => isInteractive && onSentenceClick?.(sentence)}
      >
        {sentence.original}
      </span>
    );

    cursor = idx + sentence.original.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

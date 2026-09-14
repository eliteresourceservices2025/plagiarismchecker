"use client";

import type { ReactNode } from "react";
import type { SentenceMatch } from "@/lib/types";

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  sentences?: SentenceMatch[];
  onSentenceClick?: (sentence: SentenceMatch) => void;
  readOnly?: boolean;
}

const HIGHLIGHT_CLASSES: Record<SentenceMatch["classification"], string> = {
  original: "",
  paraphrased: "bg-amber-100 rounded px-0.5 cursor-pointer hover:bg-amber-200",
  matched: "bg-red-100 rounded px-0.5 cursor-pointer hover:bg-red-200",
};

export default function TextEditor({
  text,
  onChange,
  sentences,
  onSentenceClick,
  readOnly,
}: TextEditorProps) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  if (sentences && sentences.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-slate-900 leading-relaxed whitespace-pre-wrap">
          {renderHighlightedText(text, sentences, onSentenceClick)}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <textarea
        className="flex-1 resize-none rounded-lg border border-slate-200 bg-white p-4 text-slate-900 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Paste or type your article here..."
        value={text}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
      />
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
}

function renderHighlightedText(
  text: string,
  sentences: SentenceMatch[],
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

    const className = HIGHLIGHT_CLASSES[sentence.classification];
    nodes.push(
      <span
        key={sentence.index}
        className={className}
        title={
          sentence.classification !== "original"
            ? `${sentence.score}% similar${sentence.sourceUrl ? ` — ${sentence.sourceUrl}` : ""}`
            : undefined
        }
        onClick={() => sentence.classification !== "original" && onSentenceClick?.(sentence)}
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

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, Quote } from "lucide-react";
import { generateCitation, type CitationStyle } from "@/lib/citations";
import type { SourceBreakdown } from "@/lib/types";

interface SourceListProps {
  sources: SourceBreakdown[];
  citationStyle: CitationStyle;
}

export default function SourceList({ sources, citationStyle }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        No matching sources found — looks original!
      </p>
    );
  }

  async function copyCitation(source: SourceBreakdown) {
    const citation = generateCitation(source, citationStyle);
    try {
      await navigator.clipboard.writeText(citation);
      toast.success(`${citationStyle.toUpperCase()} citation copied`, { icon: "📋" });
    } catch {
      toast.error("Couldn't copy — try selecting the text manually.");
    }
  }

  return (
    <ul className="flex flex-col gap-1">
      {sources.map((source, i) => (
        <SourceRow key={source.url} source={source} index={i} onCite={() => copyCitation(source)} />
      ))}
    </ul>
  );
}

function SourceRow({
  source,
  index,
  onCite,
}: {
  source: SourceBreakdown;
  index: number;
  onCite: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 flex-1 items-center gap-2.5"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[10px] font-semibold text-red-500">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-slate-700 group-hover:text-brand" title={source.title || source.url}>
          {formatHostname(source.url)}
        </span>
        <span className="shrink-0 font-medium text-slate-500">{source.matchPercent.toFixed(1)}%</span>
        <ExternalLink
          size={13}
          className={`shrink-0 text-slate-300 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}
        />
      </a>
      <button
        onClick={onCite}
        title="Copy citation"
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-brand-light hover:text-brand"
      >
        <Quote size={13} />
      </button>
    </li>
  );
}

function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

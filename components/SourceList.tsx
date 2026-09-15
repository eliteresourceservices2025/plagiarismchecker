"use client";

import { ExternalLink } from "lucide-react";
import type { SourceBreakdown } from "@/lib/types";

interface SourceListProps {
  sources: SourceBreakdown[];
}

export default function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        No matching sources found — looks original!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {sources.map((source, i) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[10px] font-semibold text-red-500">
              {i + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-slate-700 group-hover:text-brand"
              title={source.title || source.url}
            >
              {formatHostname(source.url)}
            </span>
            <span className="shrink-0 font-medium text-slate-500">
              {source.matchPercent.toFixed(1)}%
            </span>
            <ExternalLink
              size={13}
              className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

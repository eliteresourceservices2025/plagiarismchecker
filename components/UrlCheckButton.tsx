"use client";

import { useState, type KeyboardEvent } from "react";
import toast from "react-hot-toast";
import { Link2, Loader2 } from "lucide-react";

interface UrlCheckButtonProps {
  onExtracted: (text: string) => void;
}

/** Lets the user check a published blog/article by URL instead of pasting
 * text — fetches and extracts the article body server-side (reusing the
 * same extraction the app already does for candidate source pages) and
 * drops the result into the text editor, ready to check like normal. */
export default function UrlCheckButton({ onExtracted }: UrlCheckButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setUrl("");
  }

  async function handleFetch() {
    if (!url.trim() || loading) return;
    setLoading(true);
    const toastId = toast.loading("Fetching article...");
    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't fetch that URL.");
      onExtracted(data.text);
      toast.success(data.title ? `Loaded "${data.title}"` : "Loaded article text", { id: toastId });
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't fetch that URL.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFetch();
    if (e.key === "Escape") close();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
        title="Check a published blog URL instead of pasting text"
      >
        <Link2 size={12} />
        Check URL
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="url"
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://example.com/blog-post"
        disabled={loading}
        className="w-44 min-w-0 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand-light disabled:opacity-50 sm:w-56"
      />
      <button
        onClick={handleFetch}
        disabled={loading || !url.trim()}
        className="flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : "Fetch"}
      </button>
      <button
        onClick={close}
        disabled={loading}
        className="text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}

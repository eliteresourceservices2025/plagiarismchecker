"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Upload } from "lucide-react";
import { ACCEPT_ATTR, extractTextFromFile } from "@/lib/fileExtract";

interface UploadButtonProps {
  onExtracted: (text: string) => void;
}

export default function UploadButton({ onExtracted }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    const toastId = toast.loading(`Reading ${file.name}...`);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        toast.error("No readable text found in that file.", { id: toastId });
        return;
      }
      onExtracted(text);
      toast.success(`Loaded ${file.name}`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file.", {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
        title="Upload a .txt, .pdf, .docx, .md, or .html file"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        Upload file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // allow re-selecting the same file later
        }}
      />
    </>
  );
}

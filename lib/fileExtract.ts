export const SUPPORTED_EXTENSIONS = ["txt", "md", "html", "htm", "pdf", "docx"] as const;
export const ACCEPT_ATTR = ".txt,.md,.html,.htm,.pdf,.docx";

/**
 * Extracts plain text from an uploaded file. .txt/.md are read directly;
 * .html/.htm are parsed in-browser with DOMParser (no upload needed);
 * .pdf/.docx are sent to /api/extract-text, which uses pdf-parse/mammoth
 * server-side since there's no good lightweight in-browser parser for
 * either format.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "txt" || ext === "md") {
    return (await file.text()).trim();
  }

  if (ext === "html" || ext === "htm") {
    const raw = await file.text();
    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style, nav, header, footer").forEach((el) => el.remove());
    const text = doc.body?.textContent ?? "";
    return text.replace(/\s+/g, " ").trim();
  }

  if (ext === "pdf" || ext === "docx") {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-text", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Couldn't extract text from this file.");
    }

    return (data.text as string).trim();
  }

  throw new Error(
    `Unsupported file type: .${ext}. Supported: ${SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(", ")}`
  );
}

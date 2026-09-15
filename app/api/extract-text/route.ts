import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Extracts plain text from uploaded PDF/DOCX files server-side (the only
 * formats that need a real parser — .txt/.md/.html are handled entirely
 * client-side in lib/fileExtract.ts, no upload needed for those).
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return NextResponse.json({ text: result.text });
    }

    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: value });
    }

    return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Couldn't read this file — it may be corrupted, password-protected, or scanned images without text." },
      { status: 400 }
    );
  }
}

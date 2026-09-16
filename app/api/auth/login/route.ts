import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME, createAuthToken, isApprovedEmail, normalizeEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!isApprovedEmail(email)) {
    return NextResponse.json(
      {
        error: "This tool is for authorized ERS team members only. Contact your admin if you need access.",
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, createAuthToken(email), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

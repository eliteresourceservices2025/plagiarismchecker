import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAdminEmail, isApprovedEmail, verifyAuthToken } from "@/lib/auth";

// Renamed from `middleware.ts` in Next.js 16 — see node_modules/next/dist/docs/
// .../file-conventions/proxy.md. Same behavior, new file/export name.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = verifyAuthToken(token);

  if (!payload || !isApprovedEmail(payload.email)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  // Reserved for a future admin panel — no admin-only routes in the MVP.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-is-admin", String(isAdminEmail(payload.email)));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!login|denied|api/auth/login|_next/static|_next/image|favicon.ico).*)"],
};

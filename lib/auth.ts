/**
 * Email-allowlist auth: a signed, HTTP-only cookie carries { email, exp },
 * verified with HMAC-SHA256 against AUTH_SECRET (Node runtime — proxy.ts
 * defaults to Node in Next 16, so `crypto` is available there too).
 */
import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "plagcheck_auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface AuthPayload {
  email: string;
  exp: number;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getApprovedEmails(): string[] {
  return (process.env.APPROVED_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

export function isApprovedEmail(email: string): boolean {
  return getApprovedEmails().includes(normalizeEmail(email));
}

export function isAdminEmail(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return false;
  return normalizeEmail(email) === normalizeEmail(admin);
}

/** Builds the signed `payload.signature` cookie value for an approved email. */
export function createAuthToken(email: string): string {
  const payload: AuthPayload = {
    email: normalizeEmail(email),
    exp: Date.now() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verifies signature + expiry and returns the payload, or null if invalid/expired/tampered. */
export function verifyAuthToken(token: string | undefined | null): AuthPayload | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expectedSignature = sign(payloadB64);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  let payload: AuthPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}

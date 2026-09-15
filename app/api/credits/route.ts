import { NextResponse } from "next/server";
import { getSharedCreditState } from "@/lib/creditStore";
import { getServerSerperKeys, getServerWinstonKey } from "@/lib/serverKeys";

// Cheap Redis reads only — no network calls to external APIs, so this is
// fast regardless of maxDuration.
export const dynamic = "force-dynamic"; // never cache — this must reflect live shared state

export async function GET() {
  const state = await getSharedCreditState(getServerSerperKeys().length, Boolean(getServerWinstonKey()));
  return NextResponse.json(state);
}

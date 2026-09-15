import { NextRequest, NextResponse } from "next/server";
import { resetSharedAll, resetSharedMonthly, syncSharedUsage } from "@/lib/creditStore";

interface SyncBody {
  action?: "resetMonthly" | "resetAll";
  serperUsed?: number;
  serpapiUsedThisMonth?: number;
  winstonUsed?: number;
  winstonRemaining?: number;
}

/**
 * Admin correction for the shared credit counters — for the rare case
 * usage happened outside the app (e.g. testing a key directly against
 * Serper's own console) and the shared numbers need to be trued up to
 * match the provider's real dashboard.
 */
export async function POST(req: NextRequest) {
  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.action === "resetMonthly") {
      await resetSharedMonthly();
    } else if (body.action === "resetAll") {
      await resetSharedAll();
    } else {
      await syncSharedUsage({
        serperUsed: body.serperUsed,
        serpapiUsedThisMonth: body.serpapiUsedThisMonth,
        winstonUsed: body.winstonUsed,
        winstonRemaining: body.winstonRemaining,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 400 }
    );
  }
}

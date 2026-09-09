import { NextResponse } from "next/server";
import { loadAlertState } from "@/lib/alerts/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = loadAlertState();
  return NextResponse.json({
    recentAlerts: state.recentAlerts,
    lastScanAt: state.lastScanAt,
    lastError: state.lastError,
    subscriptionCount: state.subscriptions.length,
    cursorMs: state.cursorMs,
  });
}

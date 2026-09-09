import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/alerts/push";
import { loadAlertState, saveAlertState } from "@/lib/alerts/store";
import type { PushSubscriptionJSON } from "@/lib/alerts/types";

export const dynamic = "force-dynamic";

function isPushSubscriptionJSON(
  body: unknown
): body is PushSubscriptionJSON {
  if (!body || typeof body !== "object") return false;
  const sub = body as Partial<PushSubscriptionJSON>;
  return (
    typeof sub.endpoint === "string" &&
    !!sub.keys &&
    typeof sub.keys.p256dh === "string" &&
    typeof sub.keys.auth === "string"
  );
}

export async function GET() {
  try {
    return NextResponse.json({ publicKey: getVapidPublicKey() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isPushSubscriptionJSON(body)) {
      return NextResponse.json(
        { error: "invalid PushSubscriptionJSON" },
        { status: 400 }
      );
    }

    const state = loadAlertState();
    const idx = state.subscriptions.findIndex(
      (s) => s.endpoint === body.endpoint
    );
    if (idx >= 0) {
      state.subscriptions[idx] = body;
    } else {
      state.subscriptions.push(body);
    }
    saveAlertState(state);

    return NextResponse.json({
      ok: true,
      subscriptionCount: state.subscriptions.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const endpoint =
      body && typeof body === "object" && typeof body.endpoint === "string"
        ? body.endpoint
        : null;
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }

    const state = loadAlertState();
    const before = state.subscriptions.length;
    state.subscriptions = state.subscriptions.filter(
      (s) => s.endpoint !== endpoint
    );
    if (state.subscriptions.length !== before) {
      saveAlertState(state);
    }

    return NextResponse.json({
      ok: true,
      subscriptionCount: state.subscriptions.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

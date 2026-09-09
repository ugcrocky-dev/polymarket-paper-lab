import webpush from "web-push";
import type { PushSubscriptionJSON, WhaleAlertEvent } from "./types";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID keys not configured");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error("VAPID_PUBLIC_KEY not configured");
  }
  return key;
}

export type WhalePushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function buildWhalePushPayload(event: WhaleAlertEvent): WhalePushPayload {
  const label =
    event.botNames.length > 0 ? event.botNames[0] : event.wallet.slice(0, 8);
  const title = `${event.side} · ${label}`;
  const body = `${event.title} · ${event.price.toFixed(2)} · $${Math.round(event.sizeUsd)}`;
  return {
    title,
    body,
    url: event.polymarketUrl,
    tag: event.dedupKey,
  };
}

export type SendWhalePushResult =
  | { ok: true }
  | { gone: true }
  | { error: string };

export async function sendWhalePush(
  subscription: PushSubscriptionJSON,
  event: WhaleAlertEvent
): Promise<SendWhalePushResult> {
  ensureVapid();
  const payload = buildWhalePushPayload(event);
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime ?? undefined,
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      return { gone: true };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}

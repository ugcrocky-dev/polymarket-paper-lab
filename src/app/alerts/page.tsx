"use client";

import { useCallback, useEffect, useState } from "react";
import type { WhaleAlertEvent } from "@/lib/alerts/types";

type RecentResponse = {
  recentAlerts: WhaleAlertEvent[];
  lastScanAt: string | null;
  lastError: string | null;
  subscriptionCount: number;
  cursorMs: number;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export default function AlertsPage() {
  const [status, setStatus] = useState("Loading…");
  const [recent, setRecent] = useState<RecentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/alerts/recent");
    const data = (await res.json()) as RecentResponse;
    setRecent(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadRecent();
        if (cancelled) return;
        if (!("serviceWorker" in navigator) || typeof Notification === "undefined") {
          setStatus("Service workers not supported in this browser");
          setPermission("unsupported");
          return;
        }
        await navigator.serviceWorker.register("/sw.js");
        const perm = Notification.permission;
        setPermission(perm);
        if (perm === "granted") {
          setStatus("Notifications enabled");
        } else if (perm === "denied") {
          setStatus("Notifications blocked — enable in browser settings");
        } else {
          setStatus("Ready — tap below to enable notifications");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRecent]);

  async function enableNotifications() {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications not supported");
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setStatus("Permission denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/alerts/subscribe");
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Failed to fetch VAPID key");
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const subRes = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const subData = await subRes.json();
      if (!subRes.ok) {
        throw new Error(subData.error || "Subscribe failed");
      }

      setStatus(`Subscribed · ${subData.subscriptionCount} device(s)`);
      await loadRecent();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="panel p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
          PWA
        </p>
        <h2 className="text-2xl font-semibold">Whale Alert</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Push alerts when watched wallets make large Polymarket trades.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy || permission === "denied"}
            onClick={enableNotifications}
          >
            Enable notifications
          </button>
          <span className="font-mono text-xs text-[var(--muted)]">{status}</span>
        </div>
        {recent && (
          <p className="mt-3 font-mono text-xs text-[var(--muted)]">
            Subscribers: {recent.subscriptionCount}
            {recent.lastScanAt && ` · Last scan ${new Date(recent.lastScanAt).toLocaleString()}`}
            {recent.lastError && (
              <span className="text-[var(--danger)]"> · Error: {recent.lastError}</span>
            )}
          </p>
        )}
      </section>

      <section className="panel p-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
          Recent alerts
        </h3>
        {!recent || recent.recentAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No whale alerts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.recentAlerts.map((alert) => (
              <li key={alert.id} className="border-b border-[var(--line)] pb-2 last:border-0">
                <a
                  href={alert.polymarketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-[var(--accent)] transition-colors"
                >
                  <span className="font-mono text-xs text-[var(--accent)]">
                    {alert.side}
                  </span>
                  <span className="ml-2 font-medium">{alert.title}</span>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    ${Math.round(alert.sizeUsd)} @ {alert.price.toFixed(2)}
                    {alert.botNames.length > 0 && ` · ${alert.botNames[0]}`}
                    <span className="ml-2 font-mono text-[10px]">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

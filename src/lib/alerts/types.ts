export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type WhaleAlertEvent = {
  id: string;
  wallet: string;
  side: "BUY" | "SELL";
  title: string;
  slug: string;
  outcome: string;
  price: number;
  sizeUsd: number;
  timestamp: number;
  botIds: string[];
  botNames: string[];
  polymarketUrl: string;
  dedupKey: string;
  createdAt: string;
};

export type AlertState = {
  subscriptions: PushSubscriptionJSON[];
  cursorMs: number;
  recentKeys: string[];
  recentAlerts: WhaleAlertEvent[];
  lastScanAt: string | null;
  lastError: string | null;
};

export function emptyAlertState(): AlertState {
  return {
    subscriptions: [],
    cursorMs: 0,
    recentKeys: [],
    recentAlerts: [],
    lastScanAt: null,
    lastError: null,
  };
}

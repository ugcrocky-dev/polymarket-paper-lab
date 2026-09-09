import { readStateAsync } from "@/lib/store";
import { fetchWatchedWalletTrades, type TradeRow } from "@/lib/polymarket/client";
import { getStrategy } from "@/lib/strategies/catalog";
import type { BotState } from "@/lib/types";
import {
  filterAlertTrades,
  hotBoardBots,
  polymarketEventUrl,
  tradeDedupKey,
  unionWatchedWallets,
} from "./filter";
import { sendWhalePush } from "./push";
import { loadAlertState, saveAlertState } from "./store";
import type { WhaleAlertEvent } from "./types";

const RECENT_ALERTS_MAX = 50;
const RECENT_KEYS_MAX = 500;

function botsWatchingWallet(hotBots: BotState[], wallet: string): BotState[] {
  const w = wallet.toLowerCase();
  return hotBots.filter((b) =>
    (b.watchedWallets || []).some((x) => x.toLowerCase() === w)
  );
}

function botDisplayName(bot: BotState): string {
  const strategy = getStrategy(bot.strategyId);
  return strategy?.name || bot.strategyId;
}

function tradeToEvent(trade: TradeRow, hotBots: BotState[]): WhaleAlertEvent {
  const watchers = botsWatchingWallet(hotBots, trade.proxyWallet);
  const dedupKey = tradeDedupKey(trade);
  const createdAt = new Date().toISOString();
  return {
    id: dedupKey,
    wallet: trade.proxyWallet.toLowerCase(),
    side: trade.side,
    title: trade.title,
    slug: trade.slug,
    outcome: trade.outcome,
    price: trade.price,
    sizeUsd: trade.size,
    timestamp: trade.timestamp,
    botIds: watchers.map((b) => b.id),
    botNames: watchers.map(botDisplayName),
    polymarketUrl: polymarketEventUrl(trade.slug),
    dedupKey,
    createdAt,
  };
}

export type WhaleAlertScanResult = {
  wallets: number;
  tradesFetched: number;
  newAlerts: number;
  pushesSent: number;
  pushErrors: number;
  prunedSubscriptions: number;
  cursorMs: number;
  lastScanAt: string;
};

export async function runWhaleAlertScan(): Promise<WhaleAlertScanResult> {
  const state = loadAlertState();
  const lastScanAt = new Date().toISOString();

  try {
    let cursorMs = state.cursorMs;
    if (cursorMs === 0) {
      cursorMs = Date.now() - 60_000;
    }

    const lab = await readStateAsync();
    const hotBots = hotBoardBots(lab.bots);
    const wallets = unionWatchedWallets(hotBots);

    let trades: TradeRow[] = [];
    if (wallets.length > 0) {
      trades = await fetchWatchedWalletTrades(wallets);
    }

    const seenKeys = new Set(state.recentKeys);
    const newTrades = filterAlertTrades(trades, { cursorMs, seenKeys });

    let maxTsMs = cursorMs;
    for (const t of trades) {
      const tsMs = (t.timestamp || 0) * 1000;
      if (tsMs > maxTsMs) maxTsMs = tsMs;
    }

    const sorted = [...newTrades].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    const newEvents: WhaleAlertEvent[] = [];
    let pushesSent = 0;
    let pushErrors = 0;
    const prunedEndpoints = new Set<string>();

    for (const trade of sorted) {
      const event = tradeToEvent(trade, hotBots);
      newEvents.push(event);
      seenKeys.add(event.dedupKey);

      for (const sub of state.subscriptions) {
        try {
          const pushResult = await sendWhalePush(sub, event);
          if ("ok" in pushResult) {
            pushesSent++;
          } else if ("gone" in pushResult) {
            prunedEndpoints.add(sub.endpoint);
          } else {
            pushErrors++;
          }
        } catch {
          pushErrors++;
        }
      }
    }

    if (prunedEndpoints.size > 0) {
      state.subscriptions = state.subscriptions.filter(
        (s) => !prunedEndpoints.has(s.endpoint)
      );
    }

    state.cursorMs = maxTsMs;
    state.recentKeys = [...seenKeys].slice(-RECENT_KEYS_MAX);
    state.recentAlerts = [...newEvents]
      .reverse()
      .concat(state.recentAlerts)
      .slice(0, RECENT_ALERTS_MAX);
    state.lastScanAt = lastScanAt;
    state.lastError = null;
    saveAlertState(state);

    return {
      wallets: wallets.length,
      tradesFetched: trades.length,
      newAlerts: newEvents.length,
      pushesSent,
      pushErrors,
      prunedSubscriptions: prunedEndpoints.size,
      cursorMs: maxTsMs,
      lastScanAt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    state.lastError = message;
    state.lastScanAt = lastScanAt;
    saveAlertState(state);
    throw e;
  }
}

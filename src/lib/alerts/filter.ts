import type { TradeRow } from "@/lib/polymarket/client";
import type { BotState } from "@/lib/types";

export const HOT_BOARD_N = 12;
export const MIN_ALERT_SIZE_USD = 500;

export function hotBoardBots(bots: BotState[]): BotState[] {
  return [...bots]
    .sort(
      (a, b) =>
        b.equity - b.startingBankroll - (a.equity - a.startingBankroll)
    )
    .slice(0, HOT_BOARD_N);
}

export function unionWatchedWallets(bots: BotState[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bot of bots) {
    for (const w of bot.watchedWallets || []) {
      const key = w.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

export function tradeDedupKey(trade: TradeRow): string {
  return `${trade.proxyWallet}|${trade.timestamp}|${trade.slug}|${trade.side}|${trade.price}|${trade.size}`;
}

export function polymarketEventUrl(slug: string): string {
  return `https://polymarket.com/event/${slug}`;
}

export function filterAlertTrades(
  trades: TradeRow[],
  opts: { cursorMs: number; seenKeys?: Set<string> }
): TradeRow[] {
  const { cursorMs, seenKeys } = opts;
  const out: TradeRow[] = [];
  for (const t of trades) {
    if (t.side !== "BUY" && t.side !== "SELL") continue;
    if (t.size < MIN_ALERT_SIZE_USD) continue;
    const tsMs = (t.timestamp || 0) * 1000;
    if (tsMs <= cursorMs) continue;
    const key = tradeDedupKey(t);
    if (seenKeys?.has(key)) continue;
    out.push(t);
  }
  return out;
}

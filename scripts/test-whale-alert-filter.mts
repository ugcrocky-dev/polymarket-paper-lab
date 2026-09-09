import assert from "node:assert/strict";
import type { BotState } from "../src/lib/types.ts";
import type { TradeRow } from "../src/lib/polymarket/client.ts";
import {
  HOT_BOARD_N,
  MIN_ALERT_SIZE_USD,
  hotBoardBots,
  unionWatchedWallets,
  tradeDedupKey,
  filterAlertTrades,
  polymarketEventUrl,
} from "../src/lib/alerts/filter.ts";
import { emptyAlertState } from "../src/lib/alerts/types.ts";

function bot(
  over: Partial<BotState> & Pick<BotState, "id">
): BotState {
  return {
    strategyId: "s",
    status: "running",
    cash: 500,
    equity: 1000,
    startingBankroll: 1000,
    realizedPnl: 0,
    unrealizedPnl: 0,
    feesPaid: 0,
    maxEquity: 1000,
    maxDrawdown: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    runningSince: null,
    stoppedAt: null,
    lastTickAt: null,
    lastError: null,
    positions: [],
    fills: [],
    watchedWallets: [],
    copyCursorMs: 0,
    ...over,
  };
}

function trade(over: Partial<TradeRow> & Pick<TradeRow, "side" | "size">): TradeRow {
  return {
    proxyWallet: "0xabc",
    price: 0.5,
    timestamp: 1_700_000_000,
    title: "Test market",
    slug: "test-market",
    outcome: "YES",
    ...over,
  };
}

// Constants
assert.equal(HOT_BOARD_N, 12);
assert.equal(MIN_ALERT_SIZE_USD, 500);

// hotBoardBots: top 12 by net PnL (equity - startingBankroll), highest first
{
  const bots = Array.from({ length: 15 }, (_, i) =>
    bot({
      id: `b${i}`,
      equity: 1000 + i * 10,
      startingBankroll: 1000,
    })
  );
  const hot = hotBoardBots(bots);
  assert.equal(hot.length, 12);
  assert.deepEqual(
    hot.map((b) => b.id),
    ["b14", "b13", "b12", "b11", "b10", "b9", "b8", "b7", "b6", "b5", "b4", "b3"]
  );
}

// unionWatchedWallets: union + dedupe (case-insensitive)
{
  const wallets = unionWatchedWallets([
    bot({ id: "a", watchedWallets: ["0xAAA", "0xbbb"] }),
    bot({ id: "b", watchedWallets: ["0xbbb", "0xCCC"] }),
  ]);
  assert.equal(wallets.length, 3);
  assert.ok(wallets.includes("0xaaa"));
  assert.ok(wallets.includes("0xbbb"));
  assert.ok(wallets.includes("0xccc"));
}

// tradeDedupKey format matches lab copy cursor key
{
  const t = trade({ side: "BUY", size: 600, price: 0.42, slug: "btc-up" });
  assert.equal(
    tradeDedupKey(t),
    `${t.proxyWallet}|${t.timestamp}|${t.slug}|${t.side}|${t.price}|${t.size}`
  );
}

// polymarketEventUrl
assert.equal(polymarketEventUrl("btc-up"), "https://polymarket.com/event/btc-up");

// filterAlertTrades: keep BUY/SELL >= 500 newer than cursor; drop small/old/seen
{
  const cursorMs = 1_700_000_000_000; // 2023-11-14-ish in ms
  const seen = new Set<string>([
    tradeDedupKey(
      trade({
        side: "BUY",
        size: 800,
        timestamp: cursorMs / 1000 + 10,
        slug: "seen",
      })
    ),
  ]);

  const kept = filterAlertTrades(
    [
      trade({ side: "BUY", size: 600, timestamp: cursorMs / 1000 + 5 }),
      trade({ side: "SELL", size: 500, timestamp: cursorMs / 1000 + 20 }),
      trade({ side: "BUY", size: 499, timestamp: cursorMs / 1000 + 30 }),
      trade({ side: "BUY", size: 700, timestamp: cursorMs / 1000 - 1 }),
      trade({ side: "BUY", size: 800, timestamp: cursorMs / 1000 + 10, slug: "seen" }),
    ],
    { cursorMs, seenKeys: seen }
  );

  assert.equal(kept.length, 2);
  assert.deepEqual(
    kept.map((t) => ({ side: t.side, size: t.size })),
    [
      { side: "BUY", size: 600 },
      { side: "SELL", size: 500 },
    ]
  );
}

// emptyAlertState baseline
{
  const s = emptyAlertState();
  assert.equal(s.subscriptions.length, 0);
  assert.equal(s.cursorMs, 0);
  assert.equal(s.recentKeys.length, 0);
  assert.equal(s.recentAlerts.length, 0);
  assert.equal(s.lastScanAt, null);
  assert.equal(s.lastError, null);
}

console.log("ok whale-alert-filter");

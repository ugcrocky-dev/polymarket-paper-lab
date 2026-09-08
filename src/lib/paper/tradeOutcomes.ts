import type { BotState, PaperFill } from "@/lib/types";

/** Closed-trade outcomes: buys usually have realizedPnl 0 and are excluded. */
export type TradeOutcomes = {
  positiveTrades: number;
  negativeTrades: number;
  flatTrades: number;
  /** Positive / (positive + negative); 0 when no settled PnL trades. */
  profitPct: number;
};

export function countTradeOutcomes(
  fills: Array<Pick<PaperFill, "realizedPnl">> | undefined | null
): TradeOutcomes {
  let positiveTrades = 0;
  let negativeTrades = 0;
  let flatTrades = 0;
  for (const f of fills || []) {
    const pnl = f.realizedPnl || 0;
    if (pnl > 0) positiveTrades += 1;
    else if (pnl < 0) negativeTrades += 1;
    else flatTrades += 1;
  }
  const settled = positiveTrades + negativeTrades;
  return {
    positiveTrades,
    negativeTrades,
    flatTrades,
    profitPct: settled > 0 ? positiveTrades / settled : 0,
  };
}

/** Prefer lifetime win/loss counters; fall back to kept fills. */
export function botTradeOutcomes(
  bot: Pick<BotState, "winCount" | "lossCount" | "fills">
): TradeOutcomes {
  const fromFills = countTradeOutcomes(bot.fills);
  const positiveTrades =
    typeof bot.winCount === "number" ? bot.winCount : fromFills.positiveTrades;
  const negativeTrades =
    typeof bot.lossCount === "number" ? bot.lossCount : fromFills.negativeTrades;
  const settled = positiveTrades + negativeTrades;
  return {
    positiveTrades,
    negativeTrades,
    flatTrades: fromFills.flatTrades,
    profitPct: settled > 0 ? positiveTrades / settled : 0,
  };
}

export function sumTradeOutcomes(parts: TradeOutcomes[]): TradeOutcomes {
  const positiveTrades = parts.reduce((s, p) => s + p.positiveTrades, 0);
  const negativeTrades = parts.reduce((s, p) => s + p.negativeTrades, 0);
  const flatTrades = parts.reduce((s, p) => s + p.flatTrades, 0);
  const settled = positiveTrades + negativeTrades;
  return {
    positiveTrades,
    negativeTrades,
    flatTrades,
    profitPct: settled > 0 ? positiveTrades / settled : 0,
  };
}

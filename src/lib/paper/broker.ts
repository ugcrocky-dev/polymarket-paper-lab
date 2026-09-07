import { randomUUID } from "node:crypto";
import { BotState, PaperFill, RiskRules } from "../types";
import { appendTradeJournal } from "../store/journal";

/** Keep a deep in-memory trade book per bot for dashboard review. */
const FILL_HISTORY_LIMIT = 500;

/** Polymarket taker fee rates by category (docs.polymarket.com/trading/fees). */
export function feeRateForTitle(title: string, fallback: number): number {
  const t = title.toLowerCase();
  if (/geopolit|war|ceasefire|israel|ukraine|taiwan|nato/.test(t)) return 0;
  if (/bitcoin|btc|eth|ethereum|solana|crypto|up or down/.test(t)) return 0.07;
  if (/nba|nfl|mlb|nhl|ufc|soccer|football|tennis|match|vs\.|championship|premier league/.test(t))
    return 0.05;
  if (/fed|inflation|gdp|unemployment|cpi|interest rate|economy/.test(t)) return 0.05;
  if (/election|president|senate|congress|trump|biden|vote|governor|politics/.test(t))
    return 0.04;
  if (/stock|nasdaq|s&p|earnings|ipo|finance|treasury/.test(t)) return 0.04;
  if (/openai|apple|google|microsoft|tech|ai model/.test(t)) return 0.04;
  if (/mention|tweet|says/.test(t)) return 0.04;
  if (/weather|temperature|hurricane/.test(t)) return 0.05;
  return fallback;
}

/** fee = C × feeRate × p × (1 − p), rounded to 5 decimals (Polymarket). */
export function calcTakerFee(shares: number, price: number, feeRate: number): number {
  if (feeRate <= 0 || shares <= 0) return 0;
  const raw = shares * feeRate * price * (1 - price);
  const rounded = Math.round(raw * 1e5) / 1e5;
  return rounded < 0.00001 ? 0 : rounded;
}

function mark(bot: BotState) {
  let unreal = 0;
  for (const p of bot.positions) unreal += (p.markPrice - p.avgPrice) * p.shares;
  bot.unrealizedPnl = unreal;
  bot.equity =
    bot.cash + bot.positions.reduce((s, p) => s + p.markPrice * p.shares, 0);
  bot.maxEquity = Math.max(bot.maxEquity, bot.equity);
  const dd =
    bot.maxEquity > 0 ? ((bot.maxEquity - bot.equity) / bot.maxEquity) * 100 : 0;
  bot.maxDrawdown = Math.max(bot.maxDrawdown, dd);
}

export type Intent = {
  marketSlug: string;
  title: string;
  outcome: string;
  side: "BUY" | "SELL";
  price: number;
  reason: string;
  sourceWallet?: string;
  /** When true, sell the entire position (certainty recycle). Ignores size caps. */
  flatten?: boolean;
};

export function executeIntent(
  bot: BotState,
  rules: RiskRules,
  intent: Intent
): PaperFill | null {
  // Extreme price bands are entry filters only — never block exits.
  if (
    intent.side === "BUY" &&
    (intent.price > rules.skipPriceAbove || intent.price < rules.skipPriceBelow)
  ) {
    return null;
  }

  const slip = (rules.slippageBps / 10000) * (intent.side === "BUY" ? 1 : -1);
  const px = Math.min(0.99, Math.max(0.01, intent.price + slip));

  const feeRate = rules.chargeTakerFees
    ? feeRateForTitle(intent.title, rules.defaultTakerFeeRate)
    : 0;

  if (intent.side === "BUY") {
    const budget = Math.min(
      rules.maxUsdPerTrade,
      (bot.startingBankroll * rules.maxPctBankroll) / 100,
      Math.max(0, bot.cash * 0.95)
    );
    if (budget < 1) return null;

    // Reserve room for fee so we don't overdraw cash.
    const estShares = budget / px;
    const estFee = calcTakerFee(estShares, px, feeRate);
    const spend = Math.min(budget, Math.max(0, bot.cash - estFee));
    if (spend < 1) return null;
    const shares = spend / px;
    const feeUsd = calcTakerFee(shares, px, feeRate);
    if (bot.cash < spend + feeUsd) return null;

    bot.cash -= spend + feeUsd;
    bot.feesPaid = (bot.feesPaid || 0) + feeUsd;

    const existing = bot.positions.find(
      (p) => p.marketSlug === intent.marketSlug && p.outcome === intent.outcome
    );
    if (existing) {
      const cost = existing.avgPrice * existing.shares + spend;
      existing.shares += shares;
      existing.avgPrice = cost / existing.shares;
      existing.markPrice = px;
    } else {
      bot.positions.push({
        marketSlug: intent.marketSlug,
        title: intent.title,
        outcome: intent.outcome,
        shares,
        avgPrice: px,
        markPrice: px,
      });
    }

    const fill: PaperFill = {
      id: randomUUID(),
      botId: bot.id,
      ts: new Date().toISOString(),
      marketSlug: intent.marketSlug,
      title: intent.title,
      side: "BUY",
      outcome: intent.outcome,
      price: px,
      sizeUsd: spend,
      shares,
      feeUsd: feeUsd,
      realizedPnl: 0,
      reason: intent.reason,
      sourceWallet: intent.sourceWallet,
    };
    recordFill(bot, fill);
    mark(bot);
    return fill;
  }

  const pos = bot.positions.find(
    (p) => p.marketSlug === intent.marketSlug && p.outcome === intent.outcome
  );
  if (!pos || pos.shares <= 0) return null;

  // Sells size from inventory. Cash must not gate exits.
  const sizeCapUsd = Math.min(
    rules.maxUsdPerTrade,
    (bot.startingBankroll * rules.maxPctBankroll) / 100
  );
  const shares = intent.flatten
    ? pos.shares
    : Math.min(pos.shares, sizeCapUsd / px);
  if (shares <= 0) return null;

  const proceeds = shares * px;
  const feeUsd = calcTakerFee(shares, px, feeRate);
  const netProceeds = proceeds - feeUsd;
  const pnl = netProceeds - shares * pos.avgPrice;

  bot.cash += netProceeds;
  bot.feesPaid = (bot.feesPaid || 0) + feeUsd;
  bot.realizedPnl += pnl;
  if (pnl > 0) bot.winCount += 1;

  pos.shares -= shares;
  if (pos.shares < 1e-8) bot.positions = bot.positions.filter((p) => p !== pos);
  else pos.markPrice = px;

  const fill: PaperFill = {
    id: randomUUID(),
    botId: bot.id,
    ts: new Date().toISOString(),
    marketSlug: intent.marketSlug,
    title: intent.title,
    side: "SELL",
    outcome: intent.outcome,
    price: px,
    sizeUsd: proceeds,
    shares,
    feeUsd: feeUsd,
    realizedPnl: pnl,
    reason: intent.reason,
    sourceWallet: intent.sourceWallet,
  };
  recordFill(bot, fill);
  mark(bot);
  return fill;
}

function recordFill(bot: BotState, fill: PaperFill) {
  bot.fills.unshift(fill);
  bot.fills = bot.fills.slice(0, FILL_HISTORY_LIMIT);
  bot.tradeCount += 1;
  appendTradeJournal(fill);
}


function flattenPosition(
  bot: BotState,
  rules: RiskRules,
  pos: BotState["positions"][number],
  reason: string
): PaperFill | null {
  return executeIntent(bot, rules, {
    marketSlug: pos.marketSlug,
    title: pos.title,
    outcome: pos.outcome,
    side: "SELL",
    price: pos.markPrice,
    reason,
    flatten: true,
  });
}

/** Flatten positions whose marks are outside the entry price band to free cash. */
export function certaintyRecycle(
  bot: BotState,
  rules: RiskRules
): PaperFill[] {
  const fills: PaperFill[] = [];
  // Recycle band is slightly wider than entry skips so dying sports/event
  // books (≈0.06–0.12) still free cash before they go to zero.
  const exitLow = Math.min(rules.skipPriceBelow, 0.12);
  const exitHigh = Math.max(rules.skipPriceAbove, 0.88);
  for (const pos of [...bot.positions]) {
    if (pos.shares <= 0) continue;
    const extreme = pos.markPrice >= exitHigh || pos.markPrice <= exitLow;
    if (!extreme) continue;
    const fill = flattenPosition(bot, rules, pos, "certainty recycle");
    if (fill) fills.push(fill);
  }
  return fills;
}

/**
 * When a bot is cash-starved, flatten the worst open books so it can trade again.
 * Sells deepest unrealized losses first (then largest mark value).
 */
export function capitalRecycle(
  bot: BotState,
  rules: RiskRules,
  opts?: { cashFloor?: number; cashTarget?: number; maxPerTick?: number }
): PaperFill[] {
  const cashFloor = opts?.cashFloor ?? 25;
  const cashTarget = opts?.cashTarget ?? 120;
  const maxPerTick = opts?.maxPerTick ?? 5;
  if (bot.cash >= cashFloor) return [];
  if (!bot.positions.some((p) => p.shares > 0)) return [];

  const ranked = [...bot.positions]
    .filter((p) => p.shares > 0)
    .map((p) => ({
      pos: p,
      unreal: (p.markPrice - p.avgPrice) * p.shares,
      value: p.markPrice * p.shares,
    }))
    .sort((a, b) => a.unreal - b.unreal || b.value - a.value);

  const fills: PaperFill[] = [];
  for (const { pos } of ranked) {
    if (fills.length >= maxPerTick) break;
    if (bot.cash >= cashTarget) break;
    const fill = flattenPosition(bot, rules, pos, "capital recycle");
    if (fill) fills.push(fill);
  }
  return fills;
}

export function revalue(
  bot: BotState,
  marks: { marketSlug: string; outcome: string; price: number }[]
) {
  for (const m of marks) {
    const pos = bot.positions.find(
      (p) => p.marketSlug === m.marketSlug && p.outcome === m.outcome
    );
    if (pos) pos.markPrice = m.price;
  }
  mark(bot);
}

import { NextResponse } from "next/server";
import { readStateAsync } from "@/lib/store";
import { getStrategy, ALL_STRATEGIES } from "@/lib/strategies/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readStateAsync();
  const top = state.bots
    .map((b) => {
      const strategy = getStrategy(b.strategyId);
      const netPnl = b.equity - b.startingBankroll;
      return {
        id: b.id,
        status: b.status,
        tradeCount: b.tradeCount,
        equity: b.equity,
        cash: b.cash,
        realizedPnl: b.realizedPnl || 0,
        unrealizedPnl: b.unrealizedPnl || 0,
        feesPaid: b.feesPaid || 0,
        netPnl,
        strategy: strategy
          ? {
              id: strategy.id,
              name: strategy.name,
              family: strategy.family,
              description: strategy.description,
            }
          : undefined,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);

  const totalEquity = top.reduce((s, b) => s + b.equity, 0);
  const totalRealized = top.reduce((s, b) => s + b.realizedPnl, 0);
  const totalUnrealized = top.reduce((s, b) => s + b.unrealizedPnl, 0);
  const totalFees = top.reduce((s, b) => s + b.feesPaid, 0);
  const totalPnl = top.reduce((s, b) => s + b.netPnl, 0);
  const totalTrades = top.reduce((s, b) => s + b.tradeCount, 0);
  const runningCount = top.filter(
    (b) => b.status === "running" || b.status === "eligible_for_live"
  ).length;
  const eligibleCount = top.filter(
    (b) => b.status === "eligible_for_live"
  ).length;

  const familyIds = ["wallet_discovery", "proprietary"] as const;
  const families = familyIds.map((family) => {
    const bots = top.filter((b) => b.strategy?.family === family);
    const n = bots.length || 1;
    const netPnl = bots.reduce((s, b) => s + b.netPnl, 0);
    const equity = bots.reduce((s, b) => s + b.equity, 0);
    const trades = bots.reduce((s, b) => s + b.tradeCount, 0);
    const winners = bots.filter((b) => b.netPnl > 0).length;
    return {
      family,
      label:
        family === "wallet_discovery" ? "Wallet following" : "Our strategies",
      count: bots.length,
      winners,
      winRate: bots.length ? winners / bots.length : 0,
      netPnl,
      avgNetPnl: netPnl / n,
      equity,
      trades,
    };
  });

  const fomo = {
    families,
    strategies: top.map((b) => ({
      id: b.id,
      name: b.strategy?.name || b.id,
      family: b.strategy?.family || "unknown",
      netPnl: b.netPnl,
      equity: b.equity,
      tradeCount: b.tradeCount,
      profitable: b.netPnl > 0,
    })),
    leaders: top.filter((b) => b.netPnl > 0).slice(0, 8),
    laggards: [...top]
      .filter((b) => b.netPnl <= 0)
      .sort((a, b) => a.netPnl - b.netPnl)
      .slice(0, 8),
  };

  return NextResponse.json({
    updatedAt: state.updatedAt,
    strategyCount: ALL_STRATEGIES.length,
    runningCount,
    eligibleCount,
    totalEquity,
    totalPnl,
    totalFees,
    totalRealized,
    totalUnrealized,
    totalTrades,
    top,
    fomo,
    // Keep legacy keys so older clients still work.
    totals: {
      equity: totalEquity,
      realizedPnl: totalRealized,
      unrealizedPnl: totalUnrealized,
      feesPaid: totalFees,
      netPnl: totalPnl,
      running: runningCount,
    },
    bots: top,
    rules: state.rules,
  });
}

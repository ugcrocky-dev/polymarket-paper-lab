import { fetchBoards, fetchTrades, fetchWatchedWalletTrades, LeaderRow, TradeRow } from "../polymarket/client";
import { executeIntent, Intent, revalue } from "../paper/broker";
import { readStateAsync, writeStateAsync } from "../store";
import { BotState, RiskRules, StrategyDef } from "../types";
import { getStrategy } from "../strategies/catalog";

const w = (e: LeaderRow) => e.proxyWallet.toLowerCase();

/** Only copy leader fills newer than this lookback (avoids replaying old history). */
const WALLET_COPY_LOOKBACK_MS = 15 * 60 * 1000;

function pickBoard(
  boards: Awaited<ReturnType<typeof fetchBoards>>,
  window: string,
  orderBy: string
) {
  if (window === "DAY") return boards.day;
  if (window === "WEEK") return boards.week;
  if (window === "ALL") return boards.all;
  if (orderBy === "VOL") return boards.monthVol;
  return boards.month;
}

function selectWallets(
  strategy: StrategyDef,
  boards: Awaited<ReturnType<typeof fetchBoards>>
): string[] {
  const p = strategy.params;
  const topN = Number(p.topN ?? 5);
  const require = String(p.require ?? "");
  const mode = String(p.mode ?? "");
  const score = String(p.score ?? "");

  // Pin to a single CopyGrade (or other) leader — skip leaderboard discovery.
  if (p.fixedWallet) {
    return [String(p.fixedWallet).toLowerCase()];
  }

  if (require === "week_and_month") {
    const set = new Set(boards.week.map(w));
    return boards.month.filter((e) => set.has(w(e))).slice(0, topN).map(w);
  }
  if (require === "day_week_month") {
    const week = new Set(boards.week.map(w));
    const day = new Set(boards.day.map(w));
    return boards.month
      .filter((e) => week.has(w(e)) && day.has(w(e)))
      .slice(0, topN)
      .map(w);
  }
  if (require === "all_and_month") {
    const all = new Set(boards.all.map(w));
    return boards.month.filter((e) => all.has(w(e))).slice(0, topN).map(w);
  }
  if (require === "day_and_week") {
    const day = new Set(boards.day.map(w));
    return boards.week.filter((e) => day.has(w(e))).slice(0, topN).map(w);
  }
  if (require === "pnl_and_vol_top") {
    const vol = new Set(boards.monthVol.slice(0, 20).map(w));
    return boards.month.filter((e) => vol.has(w(e))).slice(0, topN).map(w);
  }
  if (mode === "month_not_alltime") {
    const all = new Set(boards.all.slice(0, 30).map(w));
    return boards.month.filter((e) => !all.has(w(e))).slice(0, topN).map(w);
  }
  if (mode === "week_not_alltime") {
    const all = new Set(boards.all.slice(0, 30).map(w));
    return boards.week.filter((e) => !all.has(w(e))).slice(0, topN).map(w);
  }
  if (mode === "week_better_than_month") {
    const monthRank = new Map(boards.month.map((e, i) => [w(e), i + 1]));
    return boards.week
      .filter((e) => {
        const mr = monthRank.get(w(e)) ?? 999;
        const wr = boards.week.findIndex((x) => w(x) === w(e)) + 1;
        return wr > 0 && wr + 5 < mr;
      })
      .slice(0, topN)
      .map(w);
  }
  if (mode === "quintiles" || mode === "quintiles".replace("i","i")) {
    // quintiles key in catalog is "quintiles"
  }
  if (mode === "quintiles") {
    const m = boards.month;
    const out: string[] = [];
    for (let q = 0; q < 5; q++) {
      const idx = Math.min(m.length - 1, Math.floor((q + 0.5) * (m.length / 5)));
      if (m[idx]) out.push(w(m[idx]));
    }
    return out;
  }
  if (mode === "blend_week_month") {
    return [...boards.week.slice(0, 3).map(w), ...boards.month.slice(0, 3).map(w)];
  }
  if (score === "persistence") {
    const counts = new Map<string, number>();
    for (const e of [...boards.day, ...boards.week, ...boards.month]) {
      counts.set(w(e), (counts.get(w(e)) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([a]) => a);
  }

  let list = [...pickBoard(boards, String(p.window ?? "MONTH"), String(p.orderBy ?? "PNL"))];
  list = list.filter(
    (e) =>
      (e.pnl ?? 0) >= Number(p.minPnl ?? -1e18) &&
      (e.pnl ?? 0) <= Number(p.maxPnl ?? 1e18) &&
      (e.vol ?? 0) >= Number(p.minVol ?? -1e18) &&
      (e.vol ?? 0) <= Number(p.maxVol ?? 1e18)
  );
  const from = Number(p.rankFrom ?? 1);
  const to = Number(p.rankTo ?? list.length);
  list = list.slice(Math.max(0, from - 1), to);

  if (score === "pnl_over_vol") {
    list.sort(
      (a, b) =>
        (b.pnl || 0) / Math.max(1, b.vol || 1) -
        (a.pnl || 0) / Math.max(1, a.vol || 1)
    );
  } else if (score === "pnl_sqrt_vol") {
    list.sort(
      (a, b) =>
        (b.pnl || 0) / Math.sqrt(Math.max(1, b.vol || 1)) -
        (a.pnl || 0) / Math.sqrt(Math.max(1, a.vol || 1))
    );
  } else if (score === "retail_tier") {
    list.sort(
      (a, b) => Math.abs((a.vol || 0) - 250000) - Math.abs((b.vol || 0) - 250000)
    );
  } else if (score === "balanced") {
    const byPnl = [...list].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    const byVol = [...list].sort((a, b) => (b.vol || 0) - (a.vol || 0));
    const sc = new Map<string, number>();
    byPnl.forEach((e, i) => sc.set(w(e), (sc.get(w(e)) || 0) + i * 0.7));
    byVol.forEach((e, i) => sc.set(w(e), (sc.get(w(e)) || 0) + i * 0.3));
    list.sort((a, b) => (sc.get(w(a)) || 999) - (sc.get(w(b)) || 999));
  }

  return list.slice(0, topN).map(w);
}

function catOk(title: string, hint: string) {
  const t = title.toLowerCase();
  if (hint === "sports")
    return /nfl|nba|mlb|nhl|ufc|soccer|football|tennis|match|vs\.|championship/.test(t);
  if (hint === "crypto") return /bitcoin|btc|eth|crypto|solana|up or down/.test(t);
  if (hint === "politics")
    return /election|president|senate|trump|biden|vote|congress|governor/.test(t);
  return true;
}

function walletIntent(
  strategy: StrategyDef,
  trade: TradeRow,
  watched: Set<string>
): Intent | null {
  if (!watched.has(trade.proxyWallet.toLowerCase())) return null;
  const p = strategy.params;
  const mode = String(p.mode ?? "");
  const hint = String(p.categoryHint ?? "");
  if (hint && !catOk(trade.title, hint)) return null;
  if (mode === "buys_only" && trade.side !== "BUY") return null;
  if (mode === "sells_only" && trade.side !== "SELL") return null;
  if (mode === "mid_price_only" && (trade.price < 0.35 || trade.price > 0.65)) return null;
  if (mode === "fade_high_price" && !(trade.side === "BUY" && trade.price >= 0.9))
    return null;
  let side: "BUY" | "SELL" = trade.side;
  if (mode === "invert_side" || mode === "fade_high_price") {
    side = trade.side === "BUY" ? "SELL" : "BUY";
  }
  return {
    marketSlug: trade.slug,
    title: trade.title,
    outcome: trade.outcome || "YES",
    side,
    price: trade.price,
    reason: strategy.name,
    sourceWallet: trade.proxyWallet,
  };
}

function propIntent(
  strategy: StrategyDef,
  trade: TradeRow,
  bot: BotState,
  batch: TradeRow[]
): Intent | null {
  const p = strategy.params;
  const mode = String(p.mode ?? "");
  const title = trade.title.toLowerCase();
  const isCrypto = /bitcoin|btc|eth|up or down/.test(title);
  const mk = (side: "BUY" | "SELL", reason: string): Intent => ({
    marketSlug: trade.slug,
    title: trade.title,
    outcome: trade.outcome || "YES",
    side,
    price: trade.price,
    reason,
    sourceWallet: trade.proxyWallet,
  });

  switch (mode) {
    case "fade_longshot":
      return trade.side === "BUY" && trade.price <= Number(p.longshot)
        ? mk("SELL", "fade longshot")
        : null;
    case "buy_favorite":
      return trade.price >= Number(p.favorite) ? mk("BUY", "favorite") : null;
    case "fade_longshot_flip":
      return trade.price <= Number(p.longshot)
        ? mk(trade.side === "BUY" ? "SELL" : "BUY", "flip ls")
        : null;
    case "mid_band":
      return trade.price >= Number(p.lo) && trade.price <= Number(p.hi)
        ? mk(trade.side, "mid")
        : null;
    case "skip_extreme":
      return trade.price > Number(p.lo) && trade.price < Number(p.hi)
        ? mk(trade.side, "non-extreme")
        : null;
    case "tape_momentum":
      return trade.side === "BUY" ? mk("BUY", "tape mom") : null;
    case "tape_fade":
      return mk(trade.side === "BUY" ? "SELL" : "BUY", "tape fade");
    case "size_spike":
      return trade.size >= Number(p.minSize) ? mk(trade.side, "size") : null;
    case "size_spike_fade":
      return trade.size >= Number(p.minSize)
        ? mk(trade.side === "BUY" ? "SELL" : "BUY", "size fade")
        : null;
    case "crypto_updown_fade":
      return isCrypto ? mk(trade.side === "BUY" ? "SELL" : "BUY", "crypto fade") : null;
    case "crypto_updown_follow":
      return isCrypto ? mk(trade.side, "crypto follow") : null;
    case "category_follow":
      if (!catOk(trade.title, String(p.categoryHint))) return null;
      if (p.side && trade.side !== p.side) return null;
      return mk(trade.side, "category");
    case "keyword_tape":
      return /election|fed|war|ceo|indictment|debate|rate cut/.test(title)
        ? mk(trade.side, "keyword")
        : null;
    case "round_fade":
      return Math.abs(trade.price - 0.5) < 0.01 || Math.abs(trade.price - 0.75) < 0.01
        ? mk(trade.side === "BUY" ? "SELL" : "BUY", "round")
        : null;
    case "break_50":
      return trade.price >= 0.48 && trade.price <= 0.52 ? mk(trade.side, "break50") : null;
    case "mean_revert": {
      const prev = batch.find((t) => t.slug === trade.slug && t !== trade);
      return prev && Math.abs(trade.price - prev.price) >= Number(p.jump)
        ? mk(trade.side === "BUY" ? "SELL" : "BUY", "mr")
        : null;
    }
    case "momentum_jump": {
      const prev = batch.find((t) => t.slug === trade.slug && t !== trade);
      return prev && Math.abs(trade.price - prev.price) >= Number(p.jump)
        ? mk(trade.side, "mom")
        : null;
    }
    case "min_size":
      return trade.size >= Number(p.minSize) ? mk(trade.side, "min size") : null;
    case "micro_band":
      return trade.price >= Number(p.lo) && trade.price <= Number(p.hi)
        ? mk("BUY", "micro")
        : null;
    case "endgame_favorite":
      return trade.price >= Number(p.favorite) ? mk("BUY", "endgame") : null;
    case "endgame_fade":
      return trade.price >= 0.9 && trade.price <= 0.97 && trade.size < 100
        ? mk("SELL", "endgame fade")
        : null;
    case "sell_strength":
      return trade.side === "BUY" && trade.price >= Number(p.thr)
        ? mk("SELL", "sell str")
        : null;
    case "buy_weakness":
      return trade.price <= Number(p.thr) ? mk("BUY", "buy weak") : null;
    case "inventory_balance":
      return bot.positions.length ? mk("SELL", "flatten") : mk("BUY", "seed");
    case "single_focus":
      if (
        bot.positions.length >= 1 &&
        !bot.positions.some((x) => x.marketSlug === trade.slug)
      )
        return null;
      return mk(trade.side, "single");
    case "max_books":
      if (
        bot.positions.length >= Number(p.maxBooks) &&
        !bot.positions.some((x) => x.marketSlug === trade.slug)
      )
        return null;
      return mk(trade.side, "max books");
    case "newest_trade":
      return mk(trade.side, "newest");
    case "ignore_crypto":
      return isCrypto ? null : mk(trade.side, "no crypto");
    case "only_crypto":
      return isCrypto ? mk(trade.side, "only crypto") : null;
    case "batch_majority": {
      const buys = batch.filter((t) => t.slug === trade.slug && t.side === "BUY").length;
      const sells = batch.filter((t) => t.slug === trade.slug && t.side === "SELL").length;
      if (buys === sells) return null;
      return mk(buys > sells ? "BUY" : "SELL", "maj");
    }
    case "batch_minority": {
      const buys = batch.filter((t) => t.slug === trade.slug && t.side === "BUY").length;
      const sells = batch.filter((t) => t.slug === trade.slug && t.side === "SELL").length;
      if (buys === sells) return null;
      return mk(buys > sells ? "SELL" : "BUY", "min");
    }
    case "min_size_follow":
      return trade.size >= Number(p.minSize) ? mk(trade.side, "whale") : null;
    case "max_size":
      return trade.size <= Number(p.maxSize) ? mk(trade.side, "retail") : null;
    case "outcome_bias": {
      const o = (trade.outcome || "").toLowerCase();
      if (p.prefer === "yes" && !/yes|up/.test(o)) return null;
      if (p.prefer === "no" && !/no|down/.test(o)) return null;
      return mk(trade.side, "bias");
    }
    case "take_profit": {
      const pos = bot.positions.find((x) => x.marketSlug === trade.slug);
      return pos && (pos.markPrice - pos.avgPrice) / pos.avgPrice >= Number(p.tp)
        ? mk("SELL", "tp")
        : null;
    }
    case "stop_loss": {
      const pos = bot.positions.find((x) => x.marketSlug === trade.slug);
      return pos && (pos.avgPrice - pos.markPrice) / pos.avgPrice >= Number(p.sl)
        ? mk("SELL", "sl")
        : null;
    }
    case "hold_winners":
      return trade.side === "BUY" ? mk("BUY", "add") : null;
    case "first_print_follow":
      return batch.find((t) => t.slug === trade.slug) === trade
        ? mk(trade.side, "first")
        : null;
    case "last_print_follow": {
      const same = batch.filter((t) => t.slug === trade.slug);
      return same[same.length - 1] === trade ? mk(trade.side, "last") : null;
    }
    case "range_follow": {
      const same = batch.filter((t) => t.slug === trade.slug);
      if (same.length < 2) return null;
      const prices = same.map((t) => t.price);
      return Math.max(...prices) - Math.min(...prices) >= 0.08
        ? mk(trade.side, "range follow")
        : null;
    }
    case "range_fade": {
      const same = batch.filter((t) => t.slug === trade.slug);
      if (same.length < 2) return null;
      const prices = same.map((t) => t.price);
      return Math.max(...prices) - Math.min(...prices) <= 0.02
        ? mk(trade.side === "BUY" ? "SELL" : "BUY", "range fade")
        : null;
    }
    case "random":
      return Math.random() > 0.75 ? mk(trade.side, "rand") : null;
    case "always_buy":
      return mk("BUY", "buy");
    case "always_sell":
      return mk("SELL", "sell");
    default:
      return mk(trade.side, mode || "default");
  }
}

function maybePromote(bot: BotState, rules: RiskRules) {
  if (!bot.runningSince || bot.status !== "running") return;
  const days =
    (Date.now() - new Date(bot.runningSince).getTime()) / (1000 * 60 * 60 * 24);
  if (
    days >= rules.promotionDays &&
    bot.tradeCount >= rules.minTradesForPromotion &&
    bot.maxDrawdown <= rules.maxDrawdownPctForPromotion &&
    bot.equity > bot.startingBankroll
  ) {
    bot.status = "eligible_for_live";
  }
}

export async function tickRunningBots() {
  const state = await readStateAsync();
  const running = state.bots.filter(
    (b) => b.status === "running" || b.status === "eligible_for_live"
  );
  const errors: string[] = [];
  let fills = 0;
  if (!running.length) return { ticked: 0, fills: 0, errors };

  const [boards, trades] = await Promise.all([fetchBoards(50), fetchTrades(200)]);

  // First pass: assign watched wallets for discovery bots so we can batch-fetch their tapes.
  const discoveryBots = running.filter((b) => {
    const s = getStrategy(b.strategyId);
    return s?.family === "wallet_discovery";
  });
  for (const bot of discoveryBots) {
    const strategy = getStrategy(bot.strategyId);
    if (strategy) bot.watchedWallets = selectWallets(strategy, boards);
  }
  const watchedUnion = [
    ...new Set(discoveryBots.flatMap((b) => b.watchedWallets || [])),
  ];
  const walletTape =
    watchedUnion.length > 0
      ? await fetchWatchedWalletTrades(watchedUnion, 15, 8)
      : [];
  const nowMs = Date.now();

  for (const bot of running) {
    try {
      const strategy = getStrategy(bot.strategyId);
      if (!strategy) continue;
      revalue(
        bot,
        trades.map((t) => ({
          marketSlug: t.slug,
          outcome: t.outcome || "YES",
          price: t.price,
        }))
      );

      let made = 0;
      if (strategy.family === "wallet_discovery") {
        const watched = new Set(
          (bot.watchedWallets || []).map((x) => x.toLowerCase())
        );
        // Prefer per-wallet history; fall back to global tape overlap.
        const byWallet = walletTape.filter((t) =>
          watched.has(t.proxyWallet.toLowerCase())
        );
        const fromGlobal = trades.filter((t) =>
          watched.has(t.proxyWallet.toLowerCase())
        );
        const merged = [...byWallet, ...fromGlobal].sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
        );
        // Deduplicate identical prints and only take fresh / uncopied fills.
        const cursor = bot.copyCursorMs || nowMs - WALLET_COPY_LOOKBACK_MS;
        const floor = Math.min(cursor, nowMs - WALLET_COPY_LOOKBACK_MS);
        const seen = new Set<string>();
        let maxTs = cursor;
        const candidates: TradeRow[] = [];
        for (const t of merged) {
          const tsMs = (t.timestamp || 0) * 1000;
          if (tsMs <= floor) continue;
          const key = `${t.proxyWallet}|${t.timestamp}|${t.slug}|${t.side}|${t.price}|${t.size}`;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(t);
          if (tsMs > maxTs) maxTs = tsMs;
        }

        if (String(strategy.params.mode) === "consensus") {
          const counts = new Map<string, number>();
          for (const t of candidates) {
            const k = `${t.slug}|${t.side}|${t.outcome}`;
            counts.set(k, (counts.get(k) || 0) + 1);
          }
          for (const t of candidates) {
            if (made >= 3) break;
            const k = `${t.slug}|${t.side}|${t.outcome}`;
            if ((counts.get(k) || 0) < 2) continue;
            const intent = walletIntent(strategy, t, watched);
            if (intent && executeIntent(bot, state.rules, intent)) {
              fills += 1;
              made += 1;
            }
          }
        } else {
          for (const t of candidates) {
            if (made >= 3) break;
            const intent = walletIntent(strategy, t, watched);
            if (intent && executeIntent(bot, state.rules, intent)) {
              fills += 1;
              made += 1;
            }
          }
        }
        bot.copyCursorMs = Math.max(bot.copyCursorMs || 0, maxTs, floor);
      } else {
        for (const t of trades) {
          if (made >= 2) break;
          const intent = propIntent(strategy, t, bot, trades);
          if (intent && executeIntent(bot, state.rules, intent)) {
            fills += 1;
            made += 1;
          }
        }
      }
      bot.lastTickAt = new Date().toISOString();
      bot.lastError = null;
      maybePromote(bot, state.rules);
    } catch (e) {
      bot.status = "error";
      bot.lastError = e instanceof Error ? e.message : String(e);
      errors.push(`${bot.id}: ${bot.lastError}`);
    }
  }
  await writeStateAsync(state);
  return { ticked: running.length, fills, errors };
}

export async function setBotStatus(
  botId: string,
  status: "running" | "stopped"
) {
  const state = await readStateAsync();
  const bot = state.bots.find((b) => b.id === botId);
  if (!bot) throw new Error("Bot not found");
  bot.status = status;
  if (status === "running") {
    bot.runningSince = bot.runningSince ?? new Date().toISOString();
    bot.stoppedAt = null;
    bot.lastError = null;
  } else {
    bot.stoppedAt = new Date().toISOString();
  }
  await writeStateAsync(state);
  return bot;
}

export async function startMany(
  family: "wallet_discovery" | "proprietary" | "all"
) {
  const state = await readStateAsync();
  let n = 0;
  for (const bot of state.bots) {
    const s = getStrategy(bot.strategyId);
    if (!s) continue;
    if (family !== "all" && s.family !== family) continue;
    bot.status = "running";
    bot.runningSince = bot.runningSince ?? new Date().toISOString();
    bot.stoppedAt = null;
    n += 1;
  }
  await writeStateAsync(state);
  return n;
}

export async function stopAllBots() {
  const state = await readStateAsync();
  for (const bot of state.bots) {
    if (bot.status === "running" || bot.status === "eligible_for_live") {
      bot.status = "stopped";
      bot.stoppedAt = new Date().toISOString();
    }
  }
  await writeStateAsync(state);
}

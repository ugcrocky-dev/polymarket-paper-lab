import { StrategyDef } from "../types";

const EXIT_SHARED =
  "Exits follow the strategy’s sell rules when they fire. The lab also flattens dying/near-certain marks (certainty recycle) and, when cash is nearly gone, sells the worst open books (capital recycle) so bots can keep racing.";

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function windowLabel(w: string) {
  const key = String(w).toUpperCase();
  if (key === "DAY") return "daily";
  if (key === "WEEK") return "weekly";
  if (key === "MONTH") return "monthly";
  if (key === "ALL") return "all-time";
  return String(w).toLowerCase();
}

function orderLabel(orderBy: string) {
  return String(orderBy).toUpperCase() === "VOL" ? "volume" : "PnL";
}

function watchSentence(s: StrategyDef): string {
  const p = s.params;
  const topN = Number(p.topN ?? 5);
  const mode = String(p.mode ?? "");
  const require = String(p.require ?? "");
  const score = String(p.score ?? "");
  const parts: string[] = [];

  if (require === "week_and_month") {
    parts.push(
      `It watches up to ${topN} wallets that appear on both the weekly and monthly leaderboards`
    );
  } else if (require === "day_week_month") {
    parts.push(
      `It watches up to ${topN} wallets that appear on the day, week, and month boards together`
    );
  } else if (require === "all_and_month") {
    parts.push(
      `It watches up to ${topN} wallets present on both the all-time and monthly boards`
    );
  } else if (require === "day_and_week") {
    parts.push(
      `It watches up to ${topN} wallets that rank on both the daily and weekly boards`
    );
  } else if (require === "pnl_and_vol_top") {
    parts.push(
      `It watches up to ${topN} wallets that rank near the top on both PnL and volume boards`
    );
  } else if (mode === "month_not_alltime") {
    parts.push(
      `It watches up to ${topN} wallets with a strong monthly rank that are not already all-time leaders`
    );
  } else if (mode === "week_better_than_month") {
    parts.push(
      `It watches up to ${topN} wallets whose weekly rank is improving versus their monthly rank`
    );
  } else if (mode === "week_not_alltime") {
    parts.push(
      `It watches up to ${topN} wallets with a strong weekly rank that are not all-time leaders`
    );
  } else if (mode === "blend_week_month") {
    parts.push(
      `It builds a blended watchlist of about ${topN} week and month leaders`
    );
  } else if (mode === "quintiles") {
    parts.push(
      `It spreads risk by picking about ${topN} wallets across leaderboard quintiles`
    );
  } else if (score === "pnl_over_vol") {
    parts.push(
      `It ranks monthly wallets by PnL efficiency (PnL ÷ volume) and watches the top ${topN}`
    );
  } else if (score === "pnl_sqrt_vol") {
    parts.push(
      `It ranks monthly wallets by a risk-adjusted proxy (PnL ÷ √volume) and watches the top ${topN}`
    );
  } else if (score === "balanced") {
    parts.push(
      `It ranks monthly wallets with a balanced PnL + volume score and watches the top ${topN}`
    );
  } else if (score === "persistence") {
    parts.push(
      `It scores wallets by how often they appear across leaderboard windows and watches the top ${topN}`
    );
  } else if (score === "retail_tier") {
    parts.push(
      `It prefers mid-volume “capital tier” wallets on the monthly board and watches about ${topN}`
    );
  } else {
    const window = p.window ? windowLabel(String(p.window)) : "leaderboard";
    const by = p.orderBy ? ` by ${orderLabel(String(p.orderBy))}` : "";
    parts.push(`It watches the top ${topN} ${window} wallets${by}`);
  }

  if (p.rankFrom != null && p.rankTo != null) {
    parts.push(`limited to ranks ${p.rankFrom}–${p.rankTo}`);
  }
  if (p.minVol != null) parts.push(`with volume ≥ ${money(Number(p.minVol))}`);
  if (p.maxVol != null) parts.push(`with volume ≤ ${money(Number(p.maxVol))}`);
  if (p.minPnl != null) parts.push(`with PnL ≥ ${money(Number(p.minPnl))}`);
  if (p.maxPnl != null) parts.push(`with PnL ≤ ${money(Number(p.maxPnl))}`);
  if (p.categoryHint) {
    parts.push(`and only copies ${p.categoryHint}-like market titles`);
  }
  if (p.sizeScale != null && Number(p.sizeScale) < 1) {
    parts.push(
      `using thinner clips (~${Math.round(Number(p.sizeScale) * 100)}% size)`
    );
  }

  let sentence = parts[0];
  if (parts.length > 1) sentence += ", " + parts.slice(1).join(", ");
  return sentence + ".";
}

function walletTradeSentence(s: StrategyDef): string {
  const mode = String(s.params.mode ?? "");
  switch (mode) {
    case "invert_side":
      return "On each watched-wallet print, it takes the opposite side instead of copying.";
    case "fade_high_price":
      return "When a watched wallet buys at a high price, it fades that print instead of following.";
    case "mid_price_only":
      return "It only copies prints priced in the mid band, skipping longshots and near-certain favorites.";
    case "sells_only":
      return "It only copies SELL prints from watched wallets, so it is mainly an exit / reduce-risk follower.";
    case "buys_only":
      return "It only copies BUY prints from watched wallets and ignores their sells on the tape.";
    case "consensus":
      return "It only acts when at least two watched wallets print the same market/side in the same tick batch.";
    case "fresh_only":
      return "It prefers the freshest leader prints and ignores staler tape when choosing what to copy.";
    default:
      return "It mirrors those wallets’ recent BUY/SELL prints on the live tape (paper fills, with lab size and risk caps).";
  }
}

function propTradeSentence(s: StrategyDef): string {
  const p = s.params;
  const mode = String(p.mode ?? "");
  switch (mode) {
    case "fade_longshot":
      return `It fades cheap YES buys at or below ${p.longshot ?? 0.15}, treating them as longshot flow to lean against.`;
    case "buy_favorite":
      return `It buys when the tape price is at or above ${p.favorite ?? 0.75}, leaning into favorites.`;
    case "fade_longshot_flip":
      return `On longshot-priced prints (≤ ${p.longshot ?? 0.12}), it flips the printed side instead of following.`;
    case "mid_band":
      return `It only trades when price sits between ${p.lo ?? "—"} and ${p.hi ?? "—"}, ignoring extremes.`;
    case "micro_band":
      return `It micro-scalps a tight band between ${p.lo ?? "—"} and ${p.hi ?? "—"}.`;
    case "skip_extreme":
      return `It skips near-certain or near-zero prices and only trades between ${p.lo ?? "—"} and ${p.hi ?? "—"}.`;
    case "tape_momentum":
      return "It follows buy-side tape momentum and ignores sells for entries.";
    case "tape_fade":
      return "It fades tape bursts—buying when the tape sells and selling when the tape buys.";
    case "size_spike":
      return `It follows prints at least ${money(Number(p.minSize ?? 500))} in size, treating them as informed flow.`;
    case "size_spike_fade":
      return `It fades large prints (≥ ${money(Number(p.minSize ?? 500))}), taking the opposite side.`;
    case "crypto_updown_fade":
      return "On short-horizon crypto up/down markets, it fades the printed side.";
    case "crypto_updown_follow":
      return "On short-horizon crypto up/down markets, it follows the printed side.";
    case "category_follow":
      return `It only trades ${p.categoryHint || "selected"}-like titles${
        p.side ? ` and only on ${p.side}s` : ""
      }.`;
    case "keyword_tape":
      return "It trades prints whose titles look newsy (election, Fed, war, and similar keywords).";
    case "round_fade":
      return "It fades prints clustered on round magnets like 0.50 and 0.75.";
    case "break_50":
      return "It follows flow when price is fighting around 0.50.";
    case "mean_revert":
      return `It fades abrupt ~${Math.round(Number(p.jump ?? 0.1) * 100)}¢ jumps, expecting mean reversion.`;
    case "momentum_jump":
      return `It follows abrupt ~${Math.round(Number(p.jump ?? 0.1) * 100)}¢ jumps as momentum.`;
    case "min_size":
      return `It ignores tiny noise and only trades size ≥ ${money(Number(p.minSize ?? 50))}.`;
    case "min_size_follow":
      return `It mirrors whale-sized prints (≥ ${money(Number(p.minSize ?? 2000))}).`;
    case "max_size":
      return `It only trades tiny retail-sized prints (≤ ${money(Number(p.maxSize ?? 25))}).`;
    case "endgame_favorite":
      return `Late in the book it buys strong favorites priced ≥ ${p.favorite ?? 0.85}.`;
    case "endgame_fade":
      return "Late in the book it fades very rich 0.90–0.97 prices on tiny size, treating them as overpay.";
    case "sell_strength":
      return `When buys print above ~${p.thr ?? 0.7}, it sells into that strength.`;
    case "buy_weakness":
      return `It buys weakness when price is ≤ ${p.thr ?? 0.3}.`;
    case "inventory_balance":
      return "It trades to flatten inventory skew rather than chase a directional view.";
    case "single_focus":
      return "It keeps focus tight: at most one open market at a time.";
    case "max_books":
      return `It caps open markets at ${p.maxBooks ?? 3} so capital is not scattered.`;
    case "newest_trade":
      return "It prioritizes the newest eligible tape print each tick.";
    case "ignore_crypto":
      return "It trades the open tape but skips short-horizon crypto up/down markets.";
    case "only_crypto":
      return "It only trades short-horizon crypto up/down markets.";
    case "batch_majority":
      return "Within each tick batch it follows the majority side of active markets.";
    case "batch_minority":
      return "Within each tick batch it fades the majority and takes the minority side.";
    case "outcome_bias":
      return `It prefers ${String(p.prefer || "yes").toUpperCase()}-leaning outcomes when choosing prints.`;
    case "take_profit":
      return `It trims winners once mark is roughly +${Math.round(Number(p.tp ?? 0.2) * 100)}% from entry.`;
    case "stop_loss":
      return `It cuts losers once mark is roughly −${Math.round(Number(p.sl ?? 0.2) * 100)}% from entry.`;
    case "hold_winners":
      return "It prefers to add to winners and avoids selling them early.";
    case "first_print_follow":
      return "It follows early/opening prints on a market rather than late churn.";
    case "last_print_follow":
      return "It follows late/closing prints, leaning into end-of-window flow.";
    case "range_follow":
      return "When recent price range is wide, it follows tape direction (vol expansion).";
    case "range_fade":
      return "When recent price range is tight, it fades tape direction (vol contraction).";
    case "random":
      return "Control bot: it picks among eligible tape prints at random.";
    case "always_buy":
      return "Control bot: it buys eligible prints whenever risk rules allow.";
    case "always_sell":
      return "Control bot: it sells open inventory whenever a matching print allows.";
    default:
      return s.description.endsWith(".")
        ? s.description
        : `${s.description}.`;
  }
}

/** 2–3 sentence writeup for bot detail pages. */
export function explainStrategy(s: StrategyDef): string {
  if (s.family === "wallet_discovery") {
    return [watchSentence(s), walletTradeSentence(s), EXIT_SHARED].join(" ");
  }
  return [
    "This is a proprietary tape strategy—it reacts to market prints rather than copying a fixed wallet list.",
    propTradeSentence(s),
    EXIT_SHARED,
  ].join(" ");
}

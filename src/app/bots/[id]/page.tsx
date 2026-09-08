"use client";

import Link from "next/link";
import { use, useCallback, useMemo, useState } from "react";
import {
  money,
  pnlColor,
  SortTh,
  useSortableRows,
} from "@/components/SortableTable";
import { LiveBadge, useLiveRefresh } from "@/hooks/useLiveRefresh";

type Fill = {
  id: string;
  ts: string;
  marketSlug: string;
  title: string;
  side: "BUY" | "SELL";
  outcome: string;
  price: number;
  sizeUsd: number;
  shares: number;
  feeUsd: number;
  realizedPnl: number;
  reason: string;
  sourceWallet?: string;
};

type Position = {
  marketSlug: string;
  title: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  markPrice: number;
};

type BotDetail = {
  id: string;
  status: string;
  cash: number;
  equity: number;
  startingBankroll: number;
  realizedPnl: number;
  unrealizedPnl: number;
  feesPaid: number;
  netPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  positiveTrades: number;
  negativeTrades: number;
  profitPct: number;
  maxDrawdown: number;
  lastTickAt: string | null;
  runningSince: string | null;
  positions: Position[];
  fills: Fill[];
  strategy?: { name: string; family: string; description: string; writeup?: string };
};

type FillRow = Fill & {
  tradePnl: number | null;
  pnlLabel: "open" | "exit" | "closed";
  markPrice: number | null;
};

export default function BotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/bots/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Failed to load bot");
      return;
    }
    setErr("");
    setBot(json.bot);
  }, [id]);

  const { updatedAt, live, setLive, refresh } = useLiveRefresh(load);

  const fillRows: FillRow[] = useMemo(() => {
    if (!bot) return [];
    const marks = new Map(
      (bot.positions || []).map((p) => [
        `${p.marketSlug}::${p.outcome}`,
        p.markPrice,
      ])
    );
    return (bot.fills || []).map((f) => {
      if (f.side === "SELL") {
        return {
          ...f,
          tradePnl: f.realizedPnl,
          pnlLabel: "exit" as const,
          markPrice: null,
        };
      }
      const mark = marks.get(`${f.marketSlug}::${f.outcome}`);
      if (mark == null) {
        return {
          ...f,
          tradePnl: null,
          pnlLabel: "closed" as const,
          markPrice: null,
        };
      }
      // Paper P&L for this fill vs current mark, fees already paid in cash.
      const tradePnl = (mark - f.price) * f.shares - (f.feeUsd || 0);
      return {
        ...f,
        tradePnl,
        pnlLabel: "open" as const,
        markPrice: mark,
      };
    });
  }, [bot]);

  const fillSort = useSortableRows(fillRows, "ts", "desc");
  const posSort = useSortableRows(
    (bot?.positions || []).map((p) => ({
      ...p,
      unreal: (p.markPrice - p.avgPrice) * p.shares,
      value: p.markPrice * p.shares,
    })),
    "value",
    "desc"
  );

  async function toggle() {
    if (!bot) return;
    const start = bot.status !== "running" && bot.status !== "eligible_for_live";
    await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: start ? "start" : "stop",
        botId: bot.id,
      }),
    });
    await refresh();
  }

  if (err) {
    return (
      <div className="space-y-3">
        <Link href="/bots" className="font-mono text-xs text-[var(--accent)]">
          ← Bots
        </Link>
        <p className="font-mono text-sm text-[var(--danger)]">{err}</p>
      </div>
    );
  }

  if (!bot) {
    return <p className="text-[var(--muted)]">Loading trade book…</p>;
  }

  return (
    <div className="space-y-4">
      <section className="panel space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/bots" className="font-mono text-xs text-[var(--accent)]">
              ← Bots
            </Link>
            <h2 className="mt-1 text-2xl font-semibold">
              {bot.strategy?.name || bot.id}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text)]">
              {bot.strategy?.writeup || bot.strategy?.description}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
              {bot.id} · {bot.strategy?.family} · {bot.status}
              {bot.lastTickAt
                ? ` · last tick ${new Date(bot.lastTickAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <LiveBadge
              updatedAt={updatedAt}
              live={live}
              onToggle={() => setLive((v) => !v)}
            />
            <button className="btn" onClick={toggle}>
              {bot.status === "running" || bot.status === "eligible_for_live"
                ? "Stop bot"
                : "Start bot"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ["Equity", money(bot.equity), null as number | null],
            ["Cash", money(bot.cash), null],
            ["Net PnL", money(bot.netPnl), bot.netPnl],
            ["Realized", money(bot.realizedPnl), bot.realizedPnl],
            ["Unrealized", money(bot.unrealizedPnl), bot.unrealizedPnl],
            ["Fees", money(bot.feesPaid), null],
            ["Trades", String(bot.tradeCount), null],
            [
              "Profit %",
              `${((bot.profitPct || 0) * 100).toFixed(0)}% (+${bot.positiveTrades || 0}/−${bot.negativeTrades || 0})`,
              null,
            ],
          ].map(([label, value, colorN]) => (
            <div key={String(label)} className="border border-[var(--line)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {label}
              </p>
              <p
                className="stat mt-1 text-lg font-semibold"
                style={
                  typeof colorN === "number"
                    ? { color: pnlColor(colorN) }
                    : undefined
                }
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-x-auto">
        <div className="border-b border-[var(--line)] px-4 py-3 font-mono text-xs uppercase tracking-[0.16em]">
          Open positions ({bot.positions.length})
        </div>
        <table>
          <thead>
            <tr>
              <SortTh label="Market" column="title" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Outcome" column="outcome" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Shares" column="shares" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Avg" column="avgPrice" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Mark" column="markPrice" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Value" column="value" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
              <SortTh label="Unreal" column="unreal" sortKey={posSort.sortKey} sortDir={posSort.sortDir} onSort={posSort.toggle} />
            </tr>
          </thead>
          <tbody>
            {posSort.sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-[var(--muted)]">
                  No open positions
                </td>
              </tr>
            ) : (
              posSort.sorted.map((p) => (
                <tr key={`${p.marketSlug}-${p.outcome}`}>
                  <td>
                    <div className="max-w-md">{p.title}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)]">
                      {p.marketSlug}
                    </div>
                  </td>
                  <td className="font-mono text-xs">{p.outcome}</td>
                  <td className="stat">{p.shares.toFixed(2)}</td>
                  <td className="stat">{p.avgPrice.toFixed(3)}</td>
                  <td className="stat">{p.markPrice.toFixed(3)}</td>
                  <td className="stat">{money(p.value)}</td>
                  <td className="stat" style={{ color: pnlColor(p.unreal) }}>
                    {money(p.unreal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto">
        <div className="flex flex-col gap-1 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.16em]">
              Trade log ({bot.fills.length} kept · {bot.tradeCount} lifetime)
            </h3>
            <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
              Trade PnL: open buys use current mark − entry; sells use locked
              (realized) exit PnL.
            </p>
          </div>
          <Link
            href={`/trades?botId=${encodeURIComponent(bot.id)}`}
            className="font-mono text-[11px] text-[var(--accent)]"
          >
            Full journal →
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <SortTh label="Time" column="ts" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Side" column="side" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Market" column="title" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Outcome" column="outcome" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Entry" column="price" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Mark" column="markPrice" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Size" column="sizeUsd" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Shares" column="shares" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Fee" column="feeUsd" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Trade PnL" column="tradePnl" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
              <SortTh label="Reason" column="reason" sortKey={fillSort.sortKey} sortDir={fillSort.sortDir} onSort={fillSort.toggle} />
            </tr>
          </thead>
          <tbody>
            {fillSort.sorted.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-[var(--muted)]">
                  No fills yet — start the bot and wait for a tick
                </td>
              </tr>
            ) : (
              fillSort.sorted.map((f) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap font-mono text-[11px]">
                    {new Date(f.ts).toLocaleString()}
                  </td>
                  <td
                    className="font-mono text-xs"
                    style={{
                      color: f.side === "BUY" ? "var(--accent)" : "var(--danger)",
                    }}
                  >
                    {f.side}
                  </td>
                  <td>
                    <div className="max-w-xs truncate" title={f.title}>
                      {f.title}
                    </div>
                    {f.sourceWallet ? (
                      <div
                        className="font-mono text-[10px] text-[var(--muted)]"
                        title={f.sourceWallet}
                      >
                        from {f.sourceWallet.slice(0, 6)}…{f.sourceWallet.slice(-4)}
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] text-[var(--muted)]">
                        from (not logged)
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-xs">{f.outcome}</td>
                  <td className="stat">{f.price.toFixed(3)}</td>
                  <td className="stat text-[var(--muted)]">
                    {f.markPrice != null ? f.markPrice.toFixed(3) : "—"}
                  </td>
                  <td className="stat">{money(f.sizeUsd)}</td>
                  <td className="stat">{f.shares.toFixed(2)}</td>
                  <td className="stat text-[var(--muted)]">{money(f.feeUsd, 4)}</td>
                  <td
                    className="stat"
                    style={{
                      color:
                        f.tradePnl == null
                          ? "var(--muted)"
                          : pnlColor(f.tradePnl),
                    }}
                    title={
                      f.pnlLabel === "open"
                        ? "Unrealized vs current mark"
                        : f.pnlLabel === "exit"
                          ? "Locked on this sell"
                          : "Position closed — PnL is on the sell row"
                    }
                  >
                    {f.tradePnl == null ? "—" : money(f.tradePnl)}
                    <div className="font-mono text-[10px] text-[var(--muted)]">
                      {f.pnlLabel === "open"
                        ? "open"
                        : f.pnlLabel === "exit"
                          ? "realized"
                          : "closed"}
                    </div>
                  </td>
                  <td
                    className="max-w-[10rem] truncate font-mono text-[11px] text-[var(--muted)]"
                    title={f.reason}
                  >
                    {f.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

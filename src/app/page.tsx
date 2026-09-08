"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  money,
  pnlColor,
  SortTh,
  useSortableRows,
} from "@/components/SortableTable";
import { LiveBadge, useLiveRefresh } from "@/hooks/useLiveRefresh";

type TopBot = {
  id: string;
  name: string;
  family: string;
  status: string;
  tradeCount: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  feesPaid: number;
  netPnl: number;
  positiveTrades: number;
  negativeTrades: number;
  profitPct: number;
};

type FamilyStat = {
  family: string;
  label: string;
  count: number;
  winners: number;
  winRate: number;
  netPnl: number;
  avgNetPnl: number;
  equity: number;
  trades: number;
  positiveTrades?: number;
  negativeTrades?: number;
  profitPct?: number;
};

type FomoBar = {
  id: string;
  name: string;
  family: string;
  netPnl: number;
  equity: number;
  tradeCount: number;
  profitable: boolean;
};

type Overview = {
  updatedAt: string;
  strategyCount: number;
  runningCount: number;
  eligibleCount: number;
  totalEquity: number;
  totalPnl: number;
  totalFees: number;
  totalRealized: number;
  totalUnrealized: number;
  totalTrades: number;
  positiveTrades: number;
  negativeTrades: number;
  profitPct: number;
  top: TopBot[];
  fomo: {
    families: FamilyStat[];
    strategies: FomoBar[];
  };
};

function familyLabel(family: string) {
  if (family === "wallet_discovery") return "Wallet";
  if (family === "proprietary") return "Ours";
  return family;
}

function PnlBar({
  value,
  maxAbs,
  label,
  href,
  meta,
}: {
  value: number;
  maxAbs: number;
  label: string;
  href?: string;
  meta?: string;
}) {
  const width = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  const positive = value >= 0;
  const title = (
    <span className="truncate font-medium text-[var(--text)]">{label}</span>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,9rem)_5.5rem] items-center gap-3 py-1.5">
      <div className="min-w-0">
        {href ? (
          <Link href={href} className="block truncate text-[var(--accent)] hover:underline">
            {label}
          </Link>
        ) : (
          title
        )}
        {meta ? (
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {meta}
          </p>
        ) : null}
      </div>
      <div className="relative h-3 overflow-hidden bg-[rgba(36,48,56,0.7)]">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: positive ? "var(--accent)" : "var(--danger)",
            opacity: 0.85,
          }}
        />
      </div>
      <p className="stat text-right text-sm" style={{ color: pnlColor(value) }}>
        {money(value)}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/overview");
    const json = await res.json();
    const raw = (json.top || json.bots || []) as Array<{
      id: string;
      status: string;
      tradeCount: number;
      equity: number;
      realizedPnl?: number;
      unrealizedPnl?: number;
      feesPaid?: number;
      netPnl?: number;
      positiveTrades?: number;
      negativeTrades?: number;
      profitPct?: number;
      strategy?: { name: string; family: string };
      name?: string;
      family?: string;
    }>;
    const top = raw.map((b) => ({
      id: b.id,
      name: b.strategy?.name || b.name || b.id,
      family: b.strategy?.family || b.family || "",
      status: b.status,
      tradeCount: b.tradeCount || 0,
      equity: b.equity,
      realizedPnl: b.realizedPnl || 0,
      unrealizedPnl: b.unrealizedPnl || 0,
      feesPaid: b.feesPaid || 0,
      netPnl: b.netPnl ?? b.equity - 1000,
      positiveTrades: b.positiveTrades || 0,
      negativeTrades: b.negativeTrades || 0,
      profitPct: b.profitPct || 0,
    }));
    const totals = json.totals || {};
    const fomo = json.fomo || {
      families: [],
      strategies: top.map((b) => ({
        id: b.id,
        name: b.name,
        family: b.family,
        netPnl: b.netPnl,
        equity: b.equity,
        tradeCount: b.tradeCount,
        profitable: b.netPnl > 0,
      })),
    };
    setData({
      updatedAt: json.updatedAt,
      strategyCount: json.strategyCount ?? top.length,
      runningCount: json.runningCount ?? totals.running ?? 0,
      eligibleCount: json.eligibleCount ?? 0,
      totalEquity: json.totalEquity ?? totals.equity ?? 0,
      totalPnl: json.totalPnl ?? totals.netPnl ?? 0,
      totalFees: json.totalFees ?? totals.feesPaid ?? 0,
      totalRealized: json.totalRealized ?? totals.realizedPnl ?? 0,
      totalUnrealized: json.totalUnrealized ?? totals.unrealizedPnl ?? 0,
      totalTrades: json.totalTrades ?? top.reduce((s, b) => s + b.tradeCount, 0),
      positiveTrades:
        json.positiveTrades ??
        totals.positiveTrades ??
        top.reduce((s, b) => s + b.positiveTrades, 0),
      negativeTrades:
        json.negativeTrades ??
        totals.negativeTrades ??
        top.reduce((s, b) => s + b.negativeTrades, 0),
      profitPct: json.profitPct ?? totals.profitPct ?? 0,
      top,
      fomo,
    });
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useSortableRows(
    data?.top || [],
    "netPnl",
    "desc"
  );

  const { updatedAt, live, setLive } = useLiveRefresh(load);

  async function run(action: string, family?: string) {
    setBusy(action);
    setMsg("");
    try {
      if (action === "tick") {
        const res = await fetch("/api/tick", { method: "POST" });
        const json = await res.json();
        setMsg(
          json.ok
            ? `Tick: ${json.ticked} bots, ${json.fills} fills`
            : `Tick failed: ${json.error}`
        );
      } else {
        const res = await fetch("/api/bots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "stop_all"
              ? { action: "stop_all" }
              : { action: "start_many", family }
          ),
        });
        const json = await res.json();
        setMsg(
          action === "stop_all"
            ? "All bots stopped"
            : `Started ${json.started} bots`
        );
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  const families = data?.fomo?.families || [];
  const familyMax = Math.max(1, ...families.map((f) => Math.abs(f.netPnl)));
  const strategies = data?.fomo?.strategies || [];
  const barMax = Math.max(1, ...strategies.map((s) => Math.abs(s.netPnl)));
  const winners = strategies.filter((s) => s.profitable);
  const losers = strategies.filter((s) => !s.profitable);
  const topBars = [...strategies].sort((a, b) => b.netPnl - a.netPnl).slice(0, 12);
  const bottomBars = [...strategies].sort((a, b) => a.netPnl - b.netPnl).slice(0, 12);

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Simulation desk · $1,000 / bot · Polymarket taker fees on
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              Race 100 strategies in paper
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              Net PnL = equity − $1,000 after fees. A bot can show trades with ~$0
              net if it only bought and price hasn&apos;t moved — check Realized /
              Unrealized / Fees columns. FOMO bars below compare wallet following
              vs our proprietary strategies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-accent" disabled={!!busy} onClick={() => run("start_many", "all")}>Start all</button>
            <button className="btn" disabled={!!busy} onClick={() => run("start_many", "wallet_discovery")}>Wallet bots</button>
            <button className="btn" disabled={!!busy} onClick={() => run("start_many", "proprietary")}>Prop bots</button>
            <button className="btn" disabled={!!busy} onClick={() => run("tick")}>Tick now</button>
            <button className="btn btn-danger" disabled={!!busy} onClick={() => run("stop_all")}>Stop all</button>
          </div>
        </div>
        <div className="mt-4">
          <LiveBadge
            updatedAt={updatedAt}
            live={live}
            onToggle={() => setLive((v) => !v)}
          />
        </div>
        {msg ? <p className="mt-2 font-mono text-sm text-[var(--accent)]">{msg}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["Strategies", data?.strategyCount ?? "—"],
          ["Running", data?.runningCount ?? "—"],
          ["Eligible", data?.eligibleCount ?? "—"],
          ["Trades", data?.totalTrades ?? "—"],
          [
            "Profit %",
            data
              ? `${(data.profitPct * 100).toFixed(0)}%`
              : "—",
          ],
          ["Equity", data ? money(data.totalEquity) : "—"],
          ["Fees", data ? money(data.totalFees) : "—"],
          ["Net PnL", data ? money(data.totalPnl) : "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
            <p className="stat mt-2 text-xl font-semibold">{value}</p>
            {label === "Profit %" && data ? (
              <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                +{data.positiveTrades} / −{data.negativeTrades} settled
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em]">
            Strategy FOMO
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Wallet following vs our proprietary book — who is profitable right now.
            {data
              ? ` ${winners.length} green · ${losers.length} red`
              : ""}
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-[var(--line)] p-4 lg:border-b-0 lg:border-r">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Family duel · total net PnL
            </p>
            <div className="space-y-4">
              {families.map((f) => (
                <div key={f.family}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{f.label}</p>
                      <p className="font-mono text-[11px] text-[var(--muted)]">
                        {f.winners}/{f.count} profitable · avg {money(f.avgNetPnl)} ·{" "}
                        {f.trades} trades
                        {typeof f.profitPct === "number"
                          ? ` · trade profit ${(f.profitPct * 100).toFixed(0)}% (+${f.positiveTrades ?? 0}/−${f.negativeTrades ?? 0})`
                          : ""}
                      </p>
                    </div>
                    <p
                      className="stat text-xl font-semibold"
                      style={{ color: pnlColor(f.netPnl) }}
                    >
                      {money(f.netPnl)}
                    </p>
                  </div>
                  <div className="relative h-5 overflow-hidden bg-[rgba(36,48,56,0.7)]">
                    <div
                      className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
                      style={{
                        width: `${Math.min(100, (Math.abs(f.netPnl) / familyMax) * 100)}%`,
                        background:
                          f.netPnl >= 0 ? "var(--ok)" : "var(--danger)",
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    win rate {(f.winRate * 100).toFixed(0)}% · equity {money(f.equity)}
                  </p>
                </div>
              ))}
              {!families.length ? (
                <p className="text-sm text-[var(--muted)]">Loading family split…</p>
              ) : null}
            </div>
          </div>

          <div className="p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Hot board · top 12 by net
            </p>
            <div>
              {topBars.map((s) => (
                <PnlBar
                  key={`top-${s.id}`}
                  value={s.netPnl}
                  maxAbs={barMax}
                  label={s.name}
                  href={`/bots/${encodeURIComponent(s.id)}`}
                  meta={`${familyLabel(s.family)} · ${s.tradeCount} trades`}
                />
              ))}
              {!topBars.length ? (
                <p className="text-sm text-[var(--muted)]">Waiting on bot data…</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--line)] p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Cold board · bottom 12
          </p>
          <div className="grid gap-x-8 gap-y-0 md:grid-cols-2">
            {bottomBars.map((s) => (
              <PnlBar
                key={`bot-${s.id}`}
                value={s.netPnl}
                maxAbs={barMax}
                label={s.name}
                href={`/bots/${encodeURIComponent(s.id)}`}
                meta={`${familyLabel(s.family)} · ${s.tradeCount} trades`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="panel overflow-x-auto">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em]">All paper bots</h3>
          <p className="font-mono text-[11px] text-[var(--muted)]">
            realized {data ? money(data.totalRealized) : "—"} · unrealized{" "}
            {data ? money(data.totalUnrealized) : "—"} · tap headers to sort
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <SortTh label="Bot" column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Family" column="family" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Trades" column="tradeCount" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Profit %" column="profitPct" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Equity" column="equity" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Realized" column="realizedPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Unrealized" column="unrealizedPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Fees" column="feesPaid" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Net PnL" column="netPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/bots/${encodeURIComponent(b.id)}`} className="text-[var(--accent)]">{b.name}</Link></td>
                <td className="font-mono text-xs text-[var(--muted)]">{b.family}</td>
                <td className="font-mono text-xs">{b.status}</td>
                <td className="stat">{b.tradeCount}</td>
                <td className="stat">
                  {(b.profitPct * 100).toFixed(0)}%
                  <span className="ml-1 font-mono text-[10px] text-[var(--muted)]">
                    +{b.positiveTrades}/−{b.negativeTrades}
                  </span>
                </td>
                <td className="stat">{money(b.equity)}</td>
                <td className="stat" style={{ color: pnlColor(b.realizedPnl) }}>{money(b.realizedPnl)}</td>
                <td className="stat" style={{ color: pnlColor(b.unrealizedPnl) }}>{money(b.unrealizedPnl)}</td>
                <td className="stat text-[var(--muted)]">{money(b.feesPaid)}</td>
                <td className="stat" style={{ color: pnlColor(b.netPnl) }}>{money(b.netPnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

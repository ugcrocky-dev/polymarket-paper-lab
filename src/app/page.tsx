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
  description?: string;
  status: string;
  tradeCount: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  feesPaid: number;
  netPnl: number;
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
  top: TopBot[];
};

export default function HomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/overview");
    const json = await res.json();
    const top = (json.top || []).map(
      (b: {
        id: string;
        status: string;
        tradeCount: number;
        equity: number;
        realizedPnl: number;
        unrealizedPnl: number;
        feesPaid: number;
        netPnl: number;
        strategy?: { name: string; family: string };
      }) => ({
        id: b.id,
        name: b.strategy?.name || b.id,
        family: b.strategy?.family || "",
        status: b.status,
        tradeCount: b.tradeCount,
        equity: b.equity,
        realizedPnl: b.realizedPnl || 0,
        unrealizedPnl: b.unrealizedPnl || 0,
        feesPaid: b.feesPaid || 0,
        netPnl: b.netPnl ?? b.equity - 1000,
      })
    );
    setData({ ...json, top });
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

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Simulation desk · $1,000 / bot · Polymarket taker fees on
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              Race 105 strategies in paper
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              Net PnL = equity − $1,000 after fees. A bot can show trades with ~$0
              net if it only bought and price hasn&apos;t moved — check Realized /
              Unrealized / Fees columns.
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          ["Strategies", data?.strategyCount ?? "—"],
          ["Running", data?.runningCount ?? "—"],
          ["Eligible", data?.eligibleCount ?? "—"],
          ["Trades", data?.totalTrades ?? "—"],
          ["Equity", data ? money(data.totalEquity) : "—"],
          ["Fees", data ? money(data.totalFees) : "—"],
          ["Net PnL", data ? money(data.totalPnl) : "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
            <p className="stat mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="panel overflow-x-auto">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em]">Top paper bots</h3>
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

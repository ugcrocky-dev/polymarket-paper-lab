"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  money,
  pnlColor,
  SortTh,
  useSortableRows,
} from "@/components/SortableTable";
import { LiveBadge, useLiveRefresh } from "@/hooks/useLiveRefresh";

type BotRow = {
  id: string;
  name: string;
  family: string;
  description: string;
  status: string;
  tradeCount: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  feesPaid: number;
  netPnl: number;
};

export default function BotsPage() {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [family, setFamily] = useState("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/bots");
    const json = await res.json();
    setBots(
      (json.bots || []).map(
        (b: {
          id: string;
          status: string;
          tradeCount: number;
          equity: number;
          realizedPnl?: number;
          unrealizedPnl?: number;
          feesPaid?: number;
          netPnl?: number;
          pnl?: number;
          strategy?: { name: string; family: string; description: string };
        }) => ({
          id: b.id,
          name: b.strategy?.name || b.id,
          family: b.strategy?.family || "",
          description: b.strategy?.description || "",
          status: b.status,
          tradeCount: b.tradeCount,
          equity: b.equity,
          realizedPnl: b.realizedPnl || 0,
          unrealizedPnl: b.unrealizedPnl || 0,
          feesPaid: b.feesPaid || 0,
          netPnl: b.netPnl ?? b.pnl ?? b.equity - 1000,
        })
      )
    );
  }, []);

  const { updatedAt, live, setLive } = useLiveRefresh(load);

  const filtered = useMemo(() => {
    return bots.filter((b) => {
      if (family !== "all" && b.family !== family) return false;
      if (!q) return true;
      return `${b.name} ${b.id}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [bots, family, q]);

  const { sorted, sortKey, sortDir, toggle } = useSortableRows(
    filtered,
    "netPnl",
    "desc"
  );

  async function setRunning(botId: string, start: boolean) {
    await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: start ? "start" : "stop", botId }),
    });
    await load();
  }

  async function bulk(action: string, fam?: string) {
    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "stop_all"
          ? { action: "stop_all" }
          : { action: "start_many", family: fam || "all" }
      ),
    });
    const json = await res.json();
    setMsg(action === "stop_all" ? "Stopped all" : `Started ${json.started} bots`);
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Bots</h2>
          <p className="text-sm text-[var(--muted)]">
            Tap headers to sort. Open a bot to review every fill. Net PnL includes fees.
          </p>
          <div className="mt-2">
            <LiveBadge updatedAt={updatedAt} live={live} onToggle={() => setLive((v) => !v)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-accent" onClick={() => bulk("start_many", "all")}>Start all</button>
          <button className="btn" onClick={() => bulk("start_many", "wallet_discovery")}>Discovery</button>
          <button className="btn" onClick={() => bulk("start_many", "proprietary")}>Proprietary</button>
          <button className="btn btn-danger" onClick={() => bulk("stop_all")}>Stop all</button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <select className="btn" value={family} onChange={(e) => setFamily(e.target.value)}>
          <option value="all">All families</option>
          <option value="wallet_discovery">Wallet discovery</option>
          <option value="proprietary">Proprietary</option>
        </select>
        <input className="btn min-w-[220px]" placeholder="Search bots" value={q} onChange={(e) => setQ(e.target.value)} />
        {msg ? <span className="font-mono text-sm text-[var(--accent)] self-center">{msg}</span> : null}
      </section>

      <section className="panel overflow-x-auto">
        <table>
          <thead>
            <tr>
              <SortTh label="Strategy" column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Family" column="family" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Trades" column="tradeCount" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Equity" column="equity" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Realized" column="realizedPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Unrealized" column="unrealizedPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Fees" column="feesPaid" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <SortTh label="Net PnL" column="netPnl" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-[var(--muted)] max-w-md">{b.description}</div>
                </td>
                <td className="font-mono text-xs">{b.family}</td>
                <td className="font-mono text-xs">{b.status}</td>
                <td className="stat">{b.tradeCount}</td>
                <td className="stat">{money(b.equity)}</td>
                <td className="stat" style={{ color: pnlColor(b.realizedPnl) }}>{money(b.realizedPnl)}</td>
                <td className="stat" style={{ color: pnlColor(b.unrealizedPnl) }}>{money(b.unrealizedPnl)}</td>
                <td className="stat text-[var(--muted)]">{money(b.feesPaid)}</td>
                <td className="stat" style={{ color: pnlColor(b.netPnl) }}>{money(b.netPnl)}</td>
                <td className="whitespace-nowrap">
                  <Link href={`/bots/${encodeURIComponent(b.id)}`} className="btn mr-2">
                    Review
                  </Link>
                  {b.status === "running" || b.status === "eligible_for_live" ? (
                    <button className="btn btn-danger" onClick={() => setRunning(b.id, false)}>Stop</button>
                  ) : (
                    <button className="btn" onClick={() => setRunning(b.id, true)}>Start</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

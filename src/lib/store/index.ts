import fs from "fs";
import path from "path";
import {
  BotState,
  DEFAULT_RULES,
  LabState,
  RiskRules,
  STARTING_BANKROLL,
} from "../types";
import { ALL_STRATEGIES } from "../strategies/catalog";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "lab-state.json");
const BLOB_PATHNAME = "lab-state.json";

function emptyBot(strategyId: string): BotState {
  return {
    id: `bot_${strategyId}`,
    strategyId,
    status: "stopped",
    cash: STARTING_BANKROLL,
    equity: STARTING_BANKROLL,
    startingBankroll: STARTING_BANKROLL,
    realizedPnl: 0,
    unrealizedPnl: 0,
    feesPaid: 0,
    maxEquity: STARTING_BANKROLL,
    maxDrawdown: 0,
    tradeCount: 0,
    winCount: 0,
    runningSince: null,
    stoppedAt: null,
    lastTickAt: null,
    lastError: null,
    positions: [],
    fills: [],
    watchedWallets: [],
    copyCursorMs: 0,
  };
}

export function defaultState(): LabState {
  return {
    updatedAt: new Date().toISOString(),
    rules: { ...DEFAULT_RULES },
    bots: ALL_STRATEGIES.map((s) => emptyBot(s.id)),
  };
}

function normalize(parsed: LabState): LabState {
  const map = new Map((parsed.bots || []).map((b) => [b.strategyId, b]));
  for (const s of ALL_STRATEGIES) if (!map.has(s.id)) map.set(s.id, emptyBot(s.id));
  parsed.bots = ALL_STRATEGIES.map((s) => {
    const b = map.get(s.id)!;
    if (typeof b.feesPaid !== "number") b.feesPaid = 0;
    if (typeof b.realizedPnl !== "number") b.realizedPnl = 0;
    if (typeof b.unrealizedPnl !== "number") b.unrealizedPnl = 0;
    if (typeof b.copyCursorMs !== "number") b.copyCursorMs = 0;
    for (const f of b.fills || []) {
      if (typeof f.feeUsd !== "number") f.feeUsd = 0;
      if (typeof f.realizedPnl !== "number") f.realizedPnl = 0;
    }
    return b;
  });
  const incoming = parsed.rules || ({} as RiskRules);
  parsed.rules = { ...DEFAULT_RULES, ...incoming };
  return parsed;
}

function blobEnabled() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
  );
}

function localFile() {
  return process.env.VERCEL ? path.join("/tmp", "lab-state.json") : FILE;
}

function readFs(): LabState | null {
  try {
    const target = localFile();
    if (fs.existsSync(target)) {
      return normalize(JSON.parse(fs.readFileSync(target, "utf8")) as LabState);
    }
    // Seed from committed snapshot when present (first boot on Vercel).
    if (process.env.VERCEL && fs.existsSync(FILE)) {
      return normalize(JSON.parse(fs.readFileSync(FILE, "utf8")) as LabState);
    }
    return null;
  } catch {
    return null;
  }
}

function writeFs(state: LabState) {
  const target = localFile();
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, JSON.stringify(state, null, 2));
}

async function readBlob(): Promise<LabState | null> {
  if (!blobEnabled()) return null;
  try {
    const { list, get } = await import("@vercel/blob");
    const listed = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const hit = listed.blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (!hit) return null;
    const result = await get(BLOB_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return normalize(JSON.parse(text) as LabState);
  } catch (err) {
    console.error("blob readState failed", err);
    return null;
  }
}

async function writeBlob(state: LabState) {
  if (!blobEnabled()) return;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATHNAME, JSON.stringify(state), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (err) {
    console.error("blob writeState failed", err);
  }
}

/** Sync read for local/dev. Prefer readStateAsync on Vercel. */
export function readState(): LabState {
  if (process.env.VERCEL) {
    try {
      const tmp = path.join("/tmp", "lab-state.json");
      if (fs.existsSync(tmp)) {
        return normalize(JSON.parse(fs.readFileSync(tmp, "utf8")) as LabState);
      }
    } catch {
      // fall through
    }
  }
  const fromDisk = readFs();
  if (fromDisk) return fromDisk;
  const s = defaultState();
  writeFs(s);
  return s;
}

export async function readStateAsync(): Promise<LabState> {
  const fromBlob = await readBlob();
  if (fromBlob) {
    writeFs(fromBlob);
    return fromBlob;
  }
  return readState();
}

export function writeState(state: LabState) {
  state.updatedAt = new Date().toISOString();
  writeFs(state);
  void writeBlob(state);
}

export async function writeStateAsync(state: LabState) {
  state.updatedAt = new Date().toISOString();
  writeFs(state);
  await writeBlob(state);
}

/** Wipe bankrolls/positions/fills and optionally start every strategy fresh. */
export async function resetLab(opts?: {
  startAll?: boolean;
}): Promise<LabState> {
  const prev = await readStateAsync();
  const state = defaultState();
  state.rules = { ...prev.rules };
  const now = new Date().toISOString();
  if (opts?.startAll !== false) {
    for (const bot of state.bots) {
      bot.status = "running";
      bot.runningSince = now;
      bot.stoppedAt = null;
    }
  }
  await writeStateAsync(state);
  return state;
}

export function patchRules(partial: Partial<RiskRules>) {
  const state = readState();
  state.rules = { ...state.rules, ...partial };
  writeState(state);
  return state;
}

export async function patchRulesAsync(partial: Partial<RiskRules>) {
  const state = await readStateAsync();
  state.rules = { ...state.rules, ...partial };
  await writeStateAsync(state);
  return state;
}

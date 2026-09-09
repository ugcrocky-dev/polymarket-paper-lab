import fs from "fs";
import path from "path";
import { AlertState, emptyAlertState } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "alert-state.json");

function localFile() {
  return process.env.VERCEL ? path.join("/tmp", "alert-state.json") : FILE;
}

function normalize(parsed: Partial<AlertState>): AlertState {
  const base = emptyAlertState();
  return {
    subscriptions: Array.isArray(parsed.subscriptions)
      ? parsed.subscriptions
      : base.subscriptions,
    cursorMs:
      typeof parsed.cursorMs === "number" ? parsed.cursorMs : base.cursorMs,
    recentKeys: Array.isArray(parsed.recentKeys)
      ? parsed.recentKeys
      : base.recentKeys,
    recentAlerts: Array.isArray(parsed.recentAlerts)
      ? parsed.recentAlerts
      : base.recentAlerts,
    lastScanAt:
      typeof parsed.lastScanAt === "string" || parsed.lastScanAt === null
        ? parsed.lastScanAt
        : base.lastScanAt,
    lastError:
      typeof parsed.lastError === "string" || parsed.lastError === null
        ? parsed.lastError
        : base.lastError,
  };
}

function readFs(): AlertState | null {
  try {
    const target = localFile();
    if (fs.existsSync(target)) {
      return normalize(
        JSON.parse(fs.readFileSync(target, "utf8")) as Partial<AlertState>
      );
    }
    // Seed from committed snapshot when present (first boot on Vercel).
    if (process.env.VERCEL && fs.existsSync(FILE)) {
      return normalize(
        JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<AlertState>
      );
    }
    return null;
  } catch {
    return null;
  }
}

function writeFs(state: AlertState) {
  const target = localFile();
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, JSON.stringify(state, null, 2));
}

/** Sync load for alert subscriptions, cursor, and recent dedup state. */
export function loadAlertState(): AlertState {
  if (process.env.VERCEL) {
    try {
      const tmp = path.join("/tmp", "alert-state.json");
      if (fs.existsSync(tmp)) {
        return normalize(
          JSON.parse(fs.readFileSync(tmp, "utf8")) as Partial<AlertState>
        );
      }
    } catch {
      // fall through
    }
  }
  const fromDisk = readFs();
  if (fromDisk) return fromDisk;
  const state = emptyAlertState();
  writeFs(state);
  return state;
}

export function saveAlertState(state: AlertState) {
  writeFs(state);
}

# Whale Alert Home Screen PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iPhone Home Screen PWA on Polymarket Paper Lab that Web-Pushes when Hot-board (top 12 by net PnL) bots' `watchedWallets` BUY or SELL at ≥ $500 — without changing paper fills.

**Architecture:** Pure filter helpers + dedicated `data/alert-state.json`; VAPID Web Push via `web-push`; `/alerts` PWA (manifest + `public/sw.js`); scan runs in `/api/tick` **after** `tickRunningBots()` inside try/catch so the broker path never fails because of alerts.

**Tech Stack:** Next.js 15 App Router, TypeScript, existing `fetchWatchedWalletTrades`, `web-push`, Web App Manifest + service worker.

**Spec:** `docs/superpowers/specs/2026-09-09-whale-alert-pwa-design.md`

## Global Constraints

- Wallet source: union of `watchedWallets` from **Hot board top 12** bots (sort by `equity - startingBankroll`)
- Sides: `BUY` and `SELL` only
- Min notional: `TradeRow.size >= 500` (USD notional; same units as strategy `minSize`)
- Delivery: Home Screen PWA + Web Push (iOS 16.4+)
- Trading: notify only — never call `executeIntent` / never mutate bot cash, positions, or fills
- Persistence: dedicated `data/alert-state.json` (never write alert data into `data/lab-state.json`)
- Deploy: do not wipe `data/lab-state.json`

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/alerts/types.ts` | `AlertState`, `WhaleAlertEvent`, `PushSubscriptionJSON` |
| `src/lib/alerts/filter.ts` | Hot-board selection, wallet union, size/side filter, dedup keys |
| `src/lib/alerts/store.ts` | Read/write `data/alert-state.json` |
| `src/lib/alerts/push.ts` | VAPID configure + `sendWhalePush` |
| `src/lib/alerts/scan.ts` | Orchestrate tape → filter → push → persist |
| `scripts/test-whale-alert-filter.mts` | Unit tests for filter/dedup |
| `src/app/api/alerts/subscribe/route.ts` | GET public key / POST subscribe / DELETE unsubscribe |
| `src/app/api/alerts/recent/route.ts` | Recent alerts + scan status |
| `src/app/api/tick/route.ts` | Call `runWhaleAlertScan` after bots (isolated) |
| `public/manifest.webmanifest` | PWA manifest |
| `public/sw.js` | `push` + `notificationclick` |
| `public/icons/alert-192.png`, `alert-512.png` | Icons |
| `src/app/alerts/page.tsx` | Enable notifications + recent list |
| `src/app/layout.tsx` | Nav link + manifest metadata |
| `package.json` | Add `web-push` |

### Task 1: Pure filter helpers (TDD)

**Files:** Create `src/lib/alerts/types.ts`, `src/lib/alerts/filter.ts`; Test `scripts/test-whale-alert-filter.mts`

**Exports:** `HOT_BOARD_N=12`, `MIN_ALERT_SIZE_USD=500`, `hotBoardBots`, `unionWatchedWallets`, `tradeDedupKey`, `filterAlertTrades`, `polymarketEventUrl`

- [ ] **Step 1: Write failing test** in `scripts/test-whale-alert-filter.mts` asserting hot board top-12 order, wallet union/dedup, dedup key format, and filter keeps BUY/SELL ≥500 newer than cursor while dropping small/old prints.

- [ ] **Step 2: Run** `npx --yes tsx scripts/test-whale-alert-filter.mts` — expect module-not-found failure.

- [ ] **Step 3: Implement** `types.ts` (`PushSubscriptionJSON` with `keys.p256dh`/`auth`; `WhaleAlertEvent` with `botIds`/`botNames`/`polymarketUrl`; `AlertState` with `subscriptions`, `cursorMs`, `recentKeys`, `recentAlerts`, `lastScanAt`, `lastError`; `emptyAlertState()`) and `filter.ts` using `startingBankroll` and `proxyWallet` field names matching lab types.

- [ ] **Step 4: Re-run test** — expect `ok whale-alert-filter`.

- [ ] **Step 5: Commit** `feat(alerts): hot-board wallet filter and dedup helpers`

### Task 2: Dedicated alert-state store

**Files:** Create `src/lib/alerts/store.ts`

- [ ] **Step 1: Implement** `loadAlertState` / `saveAlertState` writing only `data/alert-state.json` (Vercel: `/tmp/alert-state.json`). Never import lab-state writers.

- [ ] **Step 2: Smoke** load → `subscriptions.length === 0`.

- [ ] **Step 3: Commit** `feat(alerts): dedicated alert-state.json store`

### Task 3: Web Push sender + subscribe APIs

**Files:** `src/lib/alerts/push.ts`, `src/app/api/alerts/subscribe/route.ts`, `src/app/api/alerts/recent/route.ts`; add `web-push`.

**Env:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

- [ ] **Step 1:** `npm install web-push && npm install -D @types/web-push`

- [ ] **Step 2: Implement** `getVapidPublicKey` + `sendWhalePush` (treat HTTP 404/410 as `gone`).

- [ ] **Step 3: Routes** — GET publicKey; POST upsert subscription; DELETE by endpoint; GET recent `{ recentAlerts, lastScanAt, lastError, subscriptionCount, cursorMs }`.

- [ ] **Step 4: Commit** `feat(alerts): web-push sender and subscribe APIs`

### Task 4: Read-only scan + isolated tick hook

**Files:** Create `src/lib/alerts/scan.ts`; Modify `src/app/api/tick/route.ts`

- [ ] **Step 1: Implement** `runWhaleAlertScan`: `readStateAsync` → `hotBoardBots` → `unionWatchedWallets` → `fetchWatchedWalletTrades` → `filterAlertTrades` with `seenKeys` → `sendWhalePush` → persist cursor/`recentKeys`/`recentAlerts`. If `cursorMs===0`, seed to `Date.now()-60000`. Catch errors into `lastError` then rethrow.

- [ ] **Step 2: Hook tick** after `tickRunningBots()` in try/catch so bot result still returns when alerts fail; include `alerts` in JSON.

- [ ] **Step 3:** `npx tsc --noEmit` (alert files clean).

- [ ] **Step 4: Commit** `feat(alerts): read-only whale scan after lab tick`

### Task 5: PWA shell

**Files:** `public/manifest.webmanifest`, `public/sw.js`, icons, `src/app/alerts/page.tsx`, `src/app/layout.tsx`

- [ ] **Step 1:** Manifest `start_url=/alerts` `display=standalone`; SW handles `push` + `notificationclick` opening payload URL.

- [ ] **Step 2:** `/alerts` client page — register SW, request permission, subscribe with VAPID public key, POST subscription, list recent alerts linking to `polymarketUrl`.

- [ ] **Step 3:** Add Alerts nav + `manifest` / `appleWebApp` metadata.

- [ ] **Step 4:** Desktop Chrome smoke — subscriptionCount increments.

- [ ] **Step 5: Commit** `feat(alerts): Home Screen PWA UI and service worker`

### Task 6: VPS VAPID + deploy + fill regression

- [ ] **Step 1:** `npx web-push generate-vapid-keys` → set env on VPS.

- [ ] **Step 2:** Deploy without wiping `data/lab-state.json`.

- [ ] **Step 3:** Tick regression — fills/cash unchanged; response has `alerts`.

- [ ] **Step 4:** iPhone Safari → Add to Home Screen → Allow notifications.

- [ ] **Step 5:** Push branch `cursor/whale-alert-pwa-995f` (GitHub MCP if HTTPS push fails).

## Spec coverage

| Spec item | Task |
|-----------|------|
| Hot board top 12 wallets | 1 + 4 |
| BUY/SELL ≥ $500 | 1 |
| Home Screen PWA + push | 3 + 5 |
| Notify only / no broker | 2 + 4 |
| Dedup / cursor | 1 + 4 |
| Subscribe + recent APIs | 3 |
| Failure isolation | 4 |
| VAPID + fill regression | 6 |

## Self-review

- Names match lab: `startingBankroll`, `watchedWallets`, `proxyWallet`, `tickRunningBots`, `readStateAsync`, `fetchWatchedWalletTrades`, `executeIntent`
- Alert API names consistent: `hotBoardBots`, `filterAlertTrades`, `seenKeys`, `sendWhalePush`, `runWhaleAlertScan`
- Alert path never writes `lab-state.json`

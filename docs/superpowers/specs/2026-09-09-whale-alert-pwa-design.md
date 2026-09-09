# Whale Alert Home Screen PWA — Design Spec

**Date:** 2026-09-09  
**Status:** Approved (user confirmed architecture, UX, and runtime flow)  
**Host:** Polymarket Paper Lab (same deploy as paper bots)

## Goal

Give the operator an **iPhone Home Screen web app** that sends **Web Push** when Hot-board copy wallets **buy, scale in, or sell** at actionable size, so they can open Polymarket and trade manually.

Paper bot fills must remain unchanged.

## Product rules (v1)

| Rule | Value |
|------|--------|
| Wallet source | Union of `watchedWallets` from **Hot board top 12** bots (lab overview ranking by net PnL) |
| Sides | BUY and SELL (scale-ins are repeated BUYs on the same book) |
| Min notional | **$500** whale fill size |
| Delivery | iOS Home Screen PWA + Web Push (Safari, iOS 16.4+) |
| Trading | **Notify only** — no paper or live orders from the alert path |
| Paper fills | Alert path is **read-only**; never calls the paper broker |

## Non-goals (v1)

- Native App Store / TestFlight binary
- Auto-copy or Robinhood execution
- Kalshi desk alerts
- Alerting on every paper bot’s $50 clip (paper size is unrelated to push filters)

## Architecture

1. **`/alerts` PWA page** — enable notifications, subscription status, recent alert list; tap opens Polymarket market URL  
2. **Service worker** — receives Web Push and shows the system notification  
3. **`POST /api/alerts/subscribe`** — stores the browser push subscription (and unsubscribe)  
4. **Alert scan** — runs beside the existing lab tick as a **separate read-only pass**  
5. **VAPID keys** — server env on the VPS (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)

```
Hot board (top 12)
    → watchedWallets (union)
    → Polymarket wallet tape (existing client helpers)
    → filter: new since cursor, size ≥ 500, BUY|SELL
    → Web Push to subscribed devices
    → append recent alerts + advance cursor
```

## Data flow

1. Load running bots; take Hot board top 12 by net PnL.  
2. Build unique wallet set from those bots’ `watchedWallets`.  
3. Fetch recent fills for those wallets (reuse lab tape batching).  
4. Drop fills already seen (`alertCursor` / dedup key: wallet + timestamp + slug + side + price + size).  
5. Keep fills with `size >= 500` and side BUY or SELL.  
6. For each remaining fill, send push to all stored subscriptions; persist a short recent-alerts ring buffer.  
7. Advance cursors. Failed pushes are logged only; scan does not throw into the broker path.

## Components

### UI (`/alerts`)

- Brand + one clear CTA: **Enable notifications**  
- Status: watching / last scan / last alert time  
- Recent alerts list (wallet label or Hot-board bot name, side, title, price, $ size)  
- Deep link per row to Polymarket market  

### API

- `POST /api/alerts/subscribe` — body = PushSubscription JSON; upsert by endpoint  
- `DELETE /api/alerts/subscribe` (or POST action unsubscribe) — remove endpoint  
- Optional `GET /api/alerts/recent` — recent alerts for the page  

### Scanner

- Invoked from tick orchestration **after** or **alongside** bot ticks, wrapped so errors never block fills  
- Uses Hot board + wallet tape only; does not mutate bot cash, positions, or fills  

### Persistence

- Push subscriptions + alert cursor + recent alerts in lab store (or small dedicated JSON beside `lab-state`)  
- Must not wipe or reset bot state when deploying  

## Push payload

Each notification includes:

- Title: `BUY` or `SELL` + short wallet/bot label  
- Body: market title · price · `$size`  
- Data URL: Polymarket market link for tap-through  

## iPhone install (operator)

1. Open Safari → lab `/alerts`  
2. Share → **Add to Home Screen**  
3. Open the icon (standalone) → Allow Notifications  
4. Keep the PWA installed; iOS only delivers Web Push to Home Screen apps  

## Failure behavior

| Failure | Behavior |
|---------|----------|
| No subscription | Scan runs; nothing sent |
| Push send error | Log; continue other devices / next fill |
| Polymarket API error | Skip scan; retry next tick |
| Scanner exception | Catch/log; **paper broker and bot fills continue** |

## Testing

- Unit: filter (≥$500, BUY/SELL), dedup, Hot-board wallet union  
- Manual: subscribe from desktop or iOS PWA → inject or wait for a qualifying tape print → notification appears  
- Regression: run a lab tick with alerts enabled and confirm fill counts / bot cash unchanged vs pre-change baseline  

## Success criteria

- Operator receives iPhone pushes for Hot-board wallet buys/sells ≥ $500  
- Paper bots continue filling exactly as before  
- Duplicate prints do not spam  
- Recent alerts visible on `/alerts`

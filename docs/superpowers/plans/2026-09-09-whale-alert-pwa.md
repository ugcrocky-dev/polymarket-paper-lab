# Whale Alert Home Screen PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iPhone Home Screen PWA on Polymarket Paper Lab that Web-Pushes when Hot-board (top 12 by net PnL) bots’ `watchedWallets` BUY or SELL at ≥ $500 — without changing paper fills.

**Architecture:** Pure filter helpers + dedicated `data/alert-state.json`; VAPID Web Push via `web-push`; `/alerts` PWA (manifest + `public/sw.js`); scan runs in `/api/tick` **after** `tickRunningBots()` inside try/catch so the broker path never fails because of alerts.

**Tech Stack:** Next.js 15 App Router, TypeScript, existing `fetchWatchedWalletTrades`, `web-push`, Web App Manifest + service worker.

**Spec:** `docs/superpowers/specs/2026-09-09-whale-alert-pwa-design.md`

Full plan (Tasks 1–6) is in the repo working tree at this path. See local commit on branch `cursor/whale-alert-pwa-995f`.

## Tasks overview

1. Pure filter helpers (TDD) — hot board wallets, ≥$500 BUY/SELL, dedup
2. Dedicated `data/alert-state.json` store (never touches lab-state)
3. `web-push` sender + `/api/alerts/subscribe` + `/api/alerts/recent`
4. Read-only scan hooked after tick (isolated try/catch)
5. `/alerts` PWA (manifest, service worker, Enable notifications UI)
6. VPS VAPID keys, deploy without wiping bots, fill regression + iPhone install

## Global Constraints

- Wallet source: Hot board top 12 `watchedWallets`
- Sides: BUY and SELL; min size $500
- Notify only — no broker calls
- Dedicated alert-state.json; do not wipe lab-state.json

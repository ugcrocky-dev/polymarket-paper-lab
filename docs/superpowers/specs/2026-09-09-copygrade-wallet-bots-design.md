# CopyGrade wallet copy bots — design

**Date:** 2026-09-09  
**Status:** Approved (user: one bot per wallet @ $1k; leave existing bots alone)

## Goal

Add five paper bots that each mirror one CopyGrade “strong copy candidate” wallet. Existing 100 bots are unchanged.

## Decisions

| Decision | Choice |
| --- | --- |
| Wallets | PoppyG, phatsddds125, Misty-Notoriety-Manager, ziiizar01, BuBu12 |
| Bots per wallet | **1** |
| Starting bankroll | **$1,000** (existing `STARTING_BANKROLL`) |
| Existing bots | **Leave alone** (no reset / sabotage) |
| Family | `wallet_discovery` with `params.fixedWallet` |
| Default status | `running` so they begin copying on next tick |

## Implementation

1. Catalog: five new strategies `wd_51`…`wd_55` with `fixedWallet` address + handle label.
2. Runner `selectWallets`: if `fixedWallet` is set, return that address only (skip leaderboard pick).
3. Store `emptyBot`: for fixed-wallet strategies, seed `watchedWallets`, start `running`.
4. Existing bots: normalize only *adds* missing strategy bots; does not rewrite live state of old ones.

## Non-goals

- Auto live trading / Polymarket US execution  
- Messing with existing bot bankrolls or status  
- CopyGrade Pro alert subscription inside the lab

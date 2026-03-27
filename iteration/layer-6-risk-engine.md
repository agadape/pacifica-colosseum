# Layer 6: Risk Engine — Iteration Summary

**Date**: 2026-03-27
**Status**: 8/8 tasks completed

---

## Files Created (5 files)

| File | Purpose |
|------|---------|
| `engine/src/state/types.ts` | In-memory types (TraderState, PositionState, ArenaState, DrawdownLevel) + pure math functions (calcEquity, calcDrawdownPercent, calcUnrealizedPnl) |
| `engine/src/state/price-manager.ts` | Singleton PriceManager — connects to Pacifica WS, subscribes to prices, maintains Map<symbol, markPrice>, emits "price" events |
| `engine/src/services/risk-monitor.ts` | Core risk engine — initArena (build state from DB+REST), onPriceUpdate (per-tick equity/drawdown), handleDrawdownBreach (Second Life or elimination), onTradeExecuted (update position cache), updateArenaRound (transition) |
| `engine/src/services/periodic-sync.ts` | Every 30s: reconcile balance from Pacifica REST, write equity_snapshots to Supabase |
| `engine/src/services/leaderboard-updater.ts` | Every 3s: batch update arena_participants with PnL%, drawdown%. Also emitDrawdownEvent for threshold alerts |

---

## Files Modified (3 files)

| File | Change |
|------|--------|
| `engine/src/services/arena-manager.ts` | After startArena(): calls initArena(), startPeriodicSync(), startLeaderboardUpdater() |
| `engine/src/services/order-relay.ts` | After executeOrder(): calls onTradeExecuted() to update risk monitor state |
| `engine/src/index.ts` | On startup: creates PriceManager singleton and calls start() |

---

## Core Architecture

```
Pacifica WS ──→ PriceManager ──→ emit("price") ──→ RiskMonitor.onPriceUpdate()
                 Map<symbol,                          ↓
                  markPrice>                    For each active trader:
                                                  1. calcEquity(balance + Σ unrealizedPnl)
                                                  2. calcDrawdownPercent(equity, baseline)
                                                  3. if drawdown ≥ max → handleDrawdownBreach()
                                                     → Second Life (reset baseline) OR
                                                     → Eliminate (update DB, record, event)

Order Relay ──→ onTradeExecuted() ──→ Update in-memory position cache
                                       (new/increase/reduce/close logic)

Every 30s:  PeriodicSync ──→ Pacifica REST (reconcile) → equity_snapshots table
Every 3s:   LeaderboardUpdater ──→ Supabase arena_participants (PnL%, drawdown%)
```

## Key Formulas

- **Equity**: `balance + Σ(unrealizedPnl per position)`
- **Unrealized PnL**: `(markPrice - entryPrice) × size × direction` (direction: +1 long, -1 short)
- **Drawdown %**: `max(0, (baseline - equity) / baseline × 100)`
- **Wide Zone bonus**: effective max drawdown += 5%
- **Drawdown levels**: <50% safe, 50-75% caution, 75-90% danger, ≥90% critical

---

## Verification

```
tsc --noEmit (Next.js) → CLEAN
tsc --noEmit (Engine)  → CLEAN
Integration: arena-manager → risk-monitor → periodic-sync → leaderboard (all connected)
PriceManager uses verified PacificaWS (tested in Layer 2 — live prices confirmed)
```

---

## What's Next

**Layer 7 (Round & Elimination Engine)** — Round progression, grace periods, ranking eliminations, settlement.

**REMINDER**: After Layers 7-8, split into 2 agents for parallel frontend+backend work.

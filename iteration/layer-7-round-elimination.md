# Layer 7: Round & Elimination Engine — Iteration Summary

**Date**: 2026-03-27
**Status**: 10/10 tasks completed

---

## Files Created (6 files)

| File | Purpose |
|------|---------|
| `engine/src/services/round-engine.ts` | `advanceRound()` — orchestrates end-of-round: inactivity → ranking elimination → loot stub → grace period → begin next round. `beginNextRound()` — update status, enforce leverage, schedule timer. |
| `engine/src/timers/round-timer.ts` | `scheduleRoundEnd()` / `cancelRoundTimer()` — setTimeout-based round end triggers |
| `engine/src/services/grace-period.ts` | `startGracePeriod()` — pause drawdown monitoring, after duration → snapshot equity as new baseline, reset per-round counters |
| `engine/src/services/elimination-engine.ts` | `eliminateTrader()` — cancel orders → aggressive limit close → 5s wait → market fallback → return funds → update DB. `processRankingElimination()` — sort by PnL%, eliminate bottom X%. `processInactivityElimination()` — AFK check (< 3 trades or < 10% volume) |
| `engine/src/services/leverage-monitor.ts` | `checkLeverageCompliance()` — detect effective leverage > max, 3-strike system (warn → warn → eliminate) |
| `engine/src/services/settlement.ts` | `endArena()` — close all positions, return funds, determine winner (highest equity), award badges (champion/gladiator/warrior/survivor) |

---

## Files Modified (1 file)

| File | Change |
|------|--------|
| `engine/src/services/arena-manager.ts` | After startArena(): schedule round 1 end timer via `scheduleRoundEnd()` |

---

## Full Game Loop

```
Arena Start (arena-manager)
  → initArena() (risk-monitor)
  → startPeriodicSync() (30s)
  → startLeaderboardUpdater() (3s)
  → scheduleRoundEnd(round1.ends_at)
      ↓
Round Timer fires → advanceRound()
  → processInactivityElimination() (AFK check)
  → processRankingElimination() (bottom X% by PnL)
  → [loot calculation — Layer 8 stub]
  → startGracePeriod(2min)
      ↓
Grace Period ends
  → snapshot equity as new baseline
  → reset per-round counters
  → beginNextRound()
      → update arena status + round params
      → enforce leverage limits
      → scheduleRoundEnd(next round)
      → create round_start event
      ↓
... repeat for Rounds 2, 3, Sudden Death ...
      ↓
Round 4 ends OR ≤ 1 survivor → endArena()
  → close all positions (cancel + market)
  → return funds to vault
  → determine winner (highest equity)
  → award badges
  → status → "completed"
```

## Elimination Types

| Type | Trigger | Details |
|------|---------|---------|
| Drawdown breach | Real-time (risk-monitor) | Instant, per-tick check. Second Life forgives once. |
| Ranking | End of round (round-engine) | Bottom 30% R1, 40% R2, all but top 5 R3. Ties by max drawdown. |
| Inactivity | End of round (round-engine) | < 3 trades OR < 10% volume of starting capital |
| Leverage violation | Periodic (leverage-monitor) | 3-strike: warn → warn → eliminate. 10% buffer before flagging. |

---

## What's Next

**Layer 8 (Loot System)** — Fill in the loot calculation stub in round-engine. Wide Zone (lowest drawdown) + Second Life (highest PnL%).

# Layer 8: Loot System — Iteration Summary

**Date**: 2026-03-27
**Status**: 6/6 tasks completed

---

## Files Created (1 file)

| File | Purpose |
|------|---------|
| `engine/src/services/loot-calculator.ts` | `calculateLoot()` — awards Wide Zone (lowest drawdown) + Second Life (highest PnL%) to survivors at end of each round (except Sudden Death). Handles same-winner tiebreak, max 1 loot per trader. |

## Files Modified (1 file)

| File | Change |
|------|--------|
| `engine/src/services/round-engine.ts` | Replaced loot stub with `calculateLoot()` import and call |

## Pre-existing Implementation (from Layer 6)

| Task | Already Done In |
|------|----------------|
| Wide Zone +5% buffer | `risk-monitor.ts` line 176: `effectiveMax = maxDrawdown + 5` |
| Second Life breach forgiveness | `risk-monitor.ts` line 197: reset baseline, skip elimination |
| Loot reset on round transition | `risk-monitor.ts` line 362-363: `hasWideZone = false`, `hasSecondLife = false` |

This layer was fast because Layer 6 already implemented the loot *application* logic. Layer 8 only needed the loot *calculation and awarding* logic.

---

## Loot Award Logic

```
Survivors at round end:
  1. Sort by maxDrawdownHit ASC → winner = Wide Zone
  2. Sort by PnL% DESC → winner = Second Life
  3. If same trader wins both → keep Second Life, Wide Zone to runner-up
  4. Update arena_participants (has_wide_zone / has_second_life)
  5. Update rounds table (wide_zone_winner_id / second_life_winner_id)
  6. Create loot_awarded events
```

---

## Milestone: All MUST-HAVE Backend Layers Complete

Layers 0-8 are done. The complete backend game engine is functional:
- Project foundation + database + Pacifica SDK
- Authentication + arena management
- Trading engine + risk engine
- Round progression + elimination + settlement
- Loot system

**Next: Frontend layers (9-11) — SHOULD HAVE for demo.**

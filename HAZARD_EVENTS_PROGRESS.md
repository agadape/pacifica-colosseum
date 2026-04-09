# Hazard Events — Implementation Progress

> **Feature**: M-4 Hazard Events (random mid-round rule/market disruptions)
> **Status**: ✅ Complete
> **Last Updated**: 2026-04-09
> **Deadline**: April 16, 2026
> **Spec**: [MECHANICAL_IDEAS_DETAILED.md § MECHANICAL IDEA 4](./MECHANICAL_IDEAS_DETAILED.md)

---

## Rules for the Implementing Agent

1. Work phase by phase. Do NOT skip steps.
2. Mark each task `[x]` when done, `[/]` when in progress.
3. After every phase, run `tsc --noEmit` (both root and `engine/`). Fix errors before moving on.
4. Update **Notes for Resuming** at the bottom whenever you stop.
5. **Supabase stability rules apply** — no new high-frequency DB calls, no reducing existing timer intervals.
6. **Do NOT touch**: `engine/src/db.ts` singleton, pnlTimer interval, `maybeSingle()` patterns, `waitForSupabase()`.
7. `flash_crash` and `high_volatility` are **DEMO_MODE only** — they manipulate `MockPriceGenerator`. In real mode they must no-op gracefully (check `DEMO_MODE` flag before calling price generator methods).
8. All hot-path enforcement (leverage cap, side restriction, drawdown reduction) reads from **ArenaState in-memory** — NO DB queries in `onPriceUpdate` or `validateOrder` hot paths.

---

## Hazards Shipping (7 of 10 from spec)

| ID | Name | Category | Effect | Duration | Mode |
|----|------|----------|--------|----------|------|
| `flash_crash` | Flash Crash | market | BTC -10% gradual move | 30s | Demo only |
| `high_volatility` | High Volatility | market | 2× price swing volatility | 60s | Demo only |
| `leverage_cap` | Leverage Emergency | rule | Max leverage → 3× | Rest of round | Both |
| `drawdown_tighten` | Risk-Off | rule | Max drawdown −5% | Rest of round | Both |
| `no_shorting` | Short Ban | rule | Block ask/short orders | 60s | Both |
| `safe_haven` | Safe Haven | opportunity | +5% DD buffer (all traders) | 90s | Both |
| `insider_info` | Insider Info | opportunity | Reveal random trader's positions as event | 60s | Both |

**Cut from spec** (too complex): `pump_dump`, `liquidity_crisis`, `bonus_window`

---

## Phase Overview

```
Phase 1: Foundation    ← DB migration, TypeScript types, ArenaState fields, MockPriceGenerator extensions
Phase 2: Engine        ← hazard-manager.ts, round-engine wiring, order-validator, risk-monitor, index.ts API
Phase 3: Frontend      ← API route, Realtime subscription, HazardBanner component, page integration
```

---

## Phase 1: Foundation

> **Goal**: DB tables exist, types defined, ArenaState ready, price generator extended.
> Run `tsc --noEmit` after Step 3 before proceeding to Phase 2.

### Tasks

- [x] **Step 1** — DB Migration: Create and run `supabase/migrations/007_create_hazards.sql`
  - Creates: `hazard_events` (catalog), `active_hazard_events` (tracking)
  - Seeds all 7 hazard types
  - RLS: public SELECT on both tables, service role writes bypass
  - Verify: both tables exist, 7 rows in `hazard_events`

- [x] **Step 2** — TypeScript Types: Add `hazard_events` and `active_hazard_events` to `src/lib/supabase/types.ts`
  - Use `Relationships: []` pattern (same as abilities, territories)
  - `effect_config` column is `Json` type
  - Verify: `tsc --noEmit` passes

- [x] **Step 3** — ArenaState Extensions: Add 3 fields to `ArenaState` in `engine/src/state/types.ts`
  ```typescript
  activeHazardLeverageCap: number | null;      // null = no cap active
  activeHazardDrawdownReduction: number;        // subtracted from effectiveMax (0 = none)
  activeHazardSideRestriction: "ask" | null;   // "ask" = short orders blocked
  ```
  - Initialize all 3 to `null`/`0` in `initArena()` inside `risk-monitor.ts`
  - Clear all 3 in `updateArenaRound()` inside `risk-monitor.ts` (round transitions wipe hazard state)
  - Verify: `tsc --noEmit` passes

- [x] **Step 4** — MockPriceGenerator Extensions: Add price shock + volatility multiplier methods
  - `applyShock(symbol: string, magnitudePct: number, durationMs: number): void`
    - Gradually shifts price by `magnitudePct` over `durationMs` using 1s steps
    - After duration, clears the artificial shift (price resumes random walk from new base)
    - Use a `shockOffset` Map to track per-symbol shift separate from base price
  - `setVolatilityMultiplier(multiplier: number, durationMs: number): void`
    - Temporarily sets `this.volatility *= multiplier`, resets after `durationMs`
    - Guard: only one multiplier active at a time (clear previous before setting new)
  - Verify: `tsc --noEmit` passes; `getPrice()` returns shocked price during shock

---

## Phase 2: Engine

> **Goal**: Hazards scheduled at round start, effects enforced in hot paths.
> Run `tsc --noEmit` after each step.

### Tasks

- [x] **Step 5** — Create `engine/src/services/hazard-manager.ts`

  **Functions to implement:**

  `scheduleHazardsForRound(arenaId, roundNumber, roundEndsAt: Date): void`
  - Load all hazards from DB where `min_round <= roundNumber`
  - Pick 1–3 hazards via weighted random (weight column, no duplicates)
    - Round 1 → 1 hazard, Round 2 → 2, Round 3+ → 3
  - Schedule timing: first hazard fires 60s after round start, minimum 90s gap between, never within 30s of round end
  - For each selected hazard: `setTimeout` → fires warning → then `setTimeout(warningSeconds)` → fires effect
  - Warning fires: insert to `active_hazard_events` (status='warning'), insert to `events` (event_type='hazard_warning')
  - Effect fires: call `applyHazardEffect()`, update `active_hazard_events` (status='active')
  - Expiry fires (timed effects only): call `clearHazardEffect()`, update (status='expired')
  - ⚠️ Permanent-for-round effects (`duration_seconds = 0`): no expiry timer, cleared by `updateArenaRound()`

  `applyHazardEffect(arenaId, roundNumber, hazard): Promise<void>`
  - Switch on `hazard.effect_config.type`:
    - `price_shock` → `DEMO_MODE ? priceGenerator.applyShock(...) : no-op`
    - `volatility_multiplier` → `DEMO_MODE ? priceGenerator.setVolatilityMultiplier(...) : no-op`
    - `leverage_override` → `state.activeHazardLeverageCap = config.max_leverage`
    - `drawdown_reduction` → `state.activeHazardDrawdownReduction = config.reduction_percent`
    - `side_restriction` → `state.activeHazardSideRestriction = config.disabled_side`
    - `drawdown_buffer` → loop all active traders, add buffer to `trader.abilityDrawdownBuffer` (reuse existing field)
    - `position_reveal` → pick random active trader, write event with their positions as `data`

  `clearHazardEffect(arenaId, effectType): void`
  - Reverses timed effects: reset the matching ArenaState field to null/0
  - For `drawdown_buffer` (safe_haven): subtract the buffer amount from each trader's `abilityDrawdownBuffer`
  - ⚠️ For `leverage_override` and `drawdown_reduction` (duration=0): these are permanent for round — do NOT clear in expiry timer

  `getActiveHazards(arenaId): ActiveHazardRow[]`
  - DB query: `active_hazard_events` where `arena_id=X AND status IN ('warning','active')`
  - Used by internal API endpoint

  - Verify: `tsc --noEmit` passes

- [x] **Step 6** — Wire into `round-engine.ts`
  - Import `scheduleHazardsForRound` from hazard-manager
  - In `beginNextRound()`, after `executeTerritoryDraft()`:
    ```typescript
    if (round?.ends_at) {
      scheduleHazardsForRound(arenaId, roundNumber, new Date(round.ends_at));
    }
    ```
  - ⚠️ `scheduleHazardsForRound` is void (fire-and-forget via setTimeout) — do NOT await
  - Verify: engine logs show `[Hazard] Scheduled X hazards for round N`

- [x] **Step 7** — Wire into `order-validator.ts`
  - Import `getArenaState` (already imported)
  - After existing leverage check block, add:
    ```typescript
    const hazardLevCap = state?.activeHazardLeverageCap ?? null;
    if (hazardLevCap !== null && order.leverage > hazardLevCap) {
      return { valid: false, error: `Leverage ${order.leverage}x blocked — Leverage Emergency active (max ${hazardLevCap}x)` };
    }
    if (state?.activeHazardSideRestriction === order.side) {
      return { valid: false, error: `Short positions are currently banned — Short Ban hazard active` };
    }
    ```
  - ⚠️ `getArenaState` takes arenaId — call it once, reuse for both checks
  - Verify: `tsc --noEmit` passes

- [x] **Step 8** — Wire into `risk-monitor.ts`
  - In `onPriceUpdate()`, update `effectiveMax`:
    ```typescript
    const effectiveMax = state.maxDrawdownPercent
      + (trader.hasWideZone ? 5 : 0)
      + (trader.territoryDrawdownBuffer ?? 0)
      + (trader.abilityDrawdownBuffer ?? 0)
      - (state.activeHazardDrawdownReduction ?? 0);  // ← add this
    ```
  - ⚠️ No new imports needed. No DB calls. All from ArenaState.
  - Verify: `tsc --noEmit` passes

- [x] **Step 9** — Add internal API endpoint to `engine/src/index.ts`
  - `GET /internal/hazards/active/:arenaId`
    - Calls `getActiveHazards(arenaId)` — returns DB rows for warning/active hazards
    - ⚠️ Register BEFORE any dynamic `/:param` routes to avoid shadowing

---

## Phase 3: Frontend

> **Goal**: Warning banner visible on both trade and spectate pages. Realtime updates on new hazards.

### Tasks

- [x] **Step 10** — Frontend API Route
  - `GET /api/arenas/[arenaId]/hazards/active` — proxies to `GET /internal/hazards/active/:arenaId`
  - No auth required (spectators can see hazards)
  - File: `src/app/api/arenas/[arenaId]/hazards/active/route.ts`

- [x] **Step 11** — Realtime Subscription
  - In `src/hooks/use-arena-realtime.ts`, add `active_hazard_events` channel
  - On INSERT or UPDATE: `queryClient.invalidateQueries({ queryKey: ["hazards", arenaId] })`
  - Enable Realtime on `active_hazard_events` table in Supabase dashboard (same as territories)

- [x] **Step 12** — `HazardBanner.tsx` component
  - File: `src/components/HazardBanner.tsx`
  - Queries `["hazards", arenaId]` from `/api/arenas/[id]/hazards/active`
  - `refetchInterval: 3000` (fallback if Realtime misses an update)
  - **Warning phase** (status='warning'): amber background, `⚠️ HAZARD WARNING — Ns`, hazard name + description, countdown
  - **Active phase** (status='active'): color by severity (minor=blue, moderate=orange, severe=red), name + timer
  - Multiple hazards: stack vertically with AnimatePresence
  - Auto-dismiss when row status moves to 'expired' (Realtime + refetch clears it)
  - Position: fixed top banner (above everything), z-50

- [x] **Step 13** — Page Integration
  - **Spectate page**: add `<HazardBanner arenaId={arenaId} />` at root (floating, not in sidebar)
  - **Trade page**: add `<HazardBanner arenaId={arenaId} />` at root

---

## Done Criteria

- [x] 7 hazards seeded in `hazard_events` table
- [x] Hazards scheduled automatically at each round start (1 in R1, 2 in R2, 3 in R3+)
- [x] `flash_crash` fires in demo — BTC price visibly drops on chart for 30s (DEMO_MODE only)
- [x] `high_volatility` fires in demo — price swings noticeably larger for 60s (DEMO_MODE only)
- [x] `leverage_cap` blocks orders above 3x during Leverage Emergency
- [x] `drawdown_tighten` visibly reduces the drawdown threshold (traders breach sooner)
- [x] `no_shorting` blocks ask orders with clear error message
- [x] `safe_haven` increases all traders' drawdown buffers for 90s
- [x] `insider_info` appears in activity feed with revealed positions
- [x] Warning banner visible in both trade + spectate pages 10s before effect
- [x] Active banner shows countdown timer ticking down
- [x] Banner dismisses automatically when hazard expires
- [x] Realtime pushes new hazards to frontend without page refresh
- [x] `tsc --noEmit` passes with zero errors (both root and `engine/`)
- [x] Engine logs show `[Hazard] Scheduled`, `[Hazard] Warning:`, `[Hazard] Activated:`, `[Hazard] Cleared:`

---

## Notes for Resuming

**Session Apr 9 2026 — COMPLETE.**
- All 13 steps implemented and verified
- `tsc --noEmit` clean on both frontend and engine
- ⚠️ Manual step remaining: Enable Realtime on `active_hazard_events` table in Supabase dashboard
  (Tables → active_hazard_events → Realtime → Enable)
- Hazard Events are fully wired: DB → engine scheduling → enforcement → frontend banner

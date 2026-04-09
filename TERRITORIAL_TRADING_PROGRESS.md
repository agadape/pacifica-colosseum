# Territorial Trading — Implementation Progress

> **Feature**: M-1 Territorial Trading (chess-like board mechanic)
> **Status**: 🔴 Not Started
> **Last Updated**: 2026-04-09
> **Deadline**: April 16, 2026
> **Guide**: [IMPLEMENTATION_TERRITORIAL_TRADING.md](./IMPLEMENTATION_TERRITORIAL_TRADING.md) ← corrected, follow this
> **Context**: [project_territorial_trading.md](memory/) in auto-memory — read before starting

---

## Rules for the Implementing Agent

1. Follow `IMPLEMENTATION_TERRITORIAL_TRADING.md` step by step. Do NOT skip steps.
2. Mark each task `[x]` when done, `[/]` when in progress.
3. After every phase, run `tsc --noEmit`. Fix errors before moving to next phase.
4. Update **Notes for Resuming** at the bottom whenever you stop.
5. **Supabase stability rules apply** — no new high-frequency DB calls, no reducing existing timer intervals. See `DEVELOPMENT_LAYERS.md § Notes for Resuming Agents` for full history.
6. **Do NOT touch**: `engine/src/db.ts` singleton, pnlTimer interval, `maybeSingle()` patterns, `waitForSupabase()`. These are hard-won stability fixes.

---

## Phase Overview

```
Phase 1: Foundation      ← DB migration, TypeScript types, Territory Manager service
Phase 2: Engine          ← Wire into arena-manager, round-engine, risk-monitor, elimination-engine, order-validator, bot-traders
Phase 3: Skirmish        ← Skirmish scheduler (preset-aware) + internal API endpoints
Phase 4: Frontend        ← API routes, Realtime subscription, TerritoryBoard, TerritoryInfoCard, TerritoryDraftModal, page integration
```

---

## Progress Table

| Phase | Description | Status | Tasks |
|-------|-------------|--------|-------|
| 1 | Foundation | ✅ Done | 4/4 |
| 2 | Engine Integration | 🔴 Not Started | 0/8 |
| 3 | Skirmish System | 🔴 Not Started | 0/3 |
| 4 | Frontend | 🔴 Not Started | 0/6 |

**Total tasks: 21 | Done: 4 | Remaining: 17**

---

## Phase 1: Foundation

> **Goal**: Database tables exist, TypeScript types defined, core service written.
> Run `tsc --noEmit` after Step 3 before proceeding to Phase 2.

### Tasks

- [x] **Step 1** — DB Migration: Run `supabase/migrations/005_create_territories.sql` in Supabase dashboard SQL editor
  - Creates: `territories`, `participant_territories`, `territory_skirmishes` tables
  - ⚠️ Uses partial unique index `idx_pt_one_active_per_round` — NOT a plain UNIQUE constraint
  - Verify: 3 tables exist, 8 indexes, RLS enabled on all 3

- [x] **Step 2** — TypeScript Types: Add `territories`, `participant_territories`, `territory_skirmishes` to `src/lib/supabase/types.ts` inside the `Database` interface
  - Verify: `tsc --noEmit` passes with no errors about unknown tables

- [x] **Step 3** — Territory Manager Service: Create `engine/src/services/territory-manager.ts`
  - Contains: `generateTerritories`, `executeTerritoryDraft`, `resolveSkirmish`, `processTerritoryElimination`, `calculateAdjustedPnl`, `getTerritoryBoardState`
  - Verify: `cd engine && npx tsc --noEmit` passes

- [x] **Step 3.5** — TraderState Cache: Add `territoryDrawdownBuffer: number` to `TraderState` in `engine/src/state/types.ts`
  - Also: initialize to `0` in `initArena()` (risk-monitor.ts) and populate in `executeTerritoryDraft()` (territory-manager.ts)
  - ⚠️ CRITICAL: This is how the drawdown buffer is applied without DB queries in the hot path
  - Verify: `tsc --noEmit` passes; grep `TraderState` to confirm all instantiation sites have the new field

---

## Phase 2: Engine Integration

> **Goal**: Territory system is wired into the existing game loop.
> Each step modifies a different engine file. Run `tsc --noEmit` after each.

### Tasks

- [ ] **Step 3.6** — Engine Restart Buffer Reload (`engine/src/services/risk-monitor.ts`):
  - In `initArena()`, after building each `TraderState` from DB, query `participant_territories` for that arena to restore `territoryDrawdownBuffer` for all active participants
  - One batch query (not per-trader): `SELECT participant_id, territories!inner(drawdown_buffer_percent) WHERE arena_id=X AND is_active=true`
  - Populate `traderState.territoryDrawdownBuffer` from result Map
  - ⚠️ Without this: Railway restart wipes all territory buffers → traders lose protection silently
  - Verify: restart engine → check logs that buffer values are non-zero for traders with territory bonuses

- [ ] **Step 4** — Arena Manager (`engine/src/services/arena-manager.ts`):
  - Add import: `import { generateTerritories, executeTerritoryDraft } from "./territory-manager"`
  - After leverage-setting loop in `startArena()`, add: `await generateTerritories(arenaId)` then `await executeTerritoryDraft(arenaId, 1)`
  - ⚠️ Both calls required — Round 1 draft is NOT called by `beginNextRound`

- [ ] **Step 5** — Round Engine (`engine/src/services/round-engine.ts`):
  - Add import: `import { executeTerritoryDraft, processTerritoryElimination } from "./territory-manager"`
  - In `advanceRound()`: **REPLACE** `processRankingElimination` with `processTerritoryElimination` — do NOT add both, that double-eliminates
  - In `beginNextRound()`: add `await executeTerritoryDraft(arenaId, roundNumber)` after leverage loop

- [ ] **Step 6** — Risk Monitor (`engine/src/services/risk-monitor.ts`):
  - In `onPriceUpdate()`, update `effectiveMax` to include `trader.territoryDrawdownBuffer`:
    ```typescript
    const effectiveMax = state.maxDrawdownPercent
      + (trader.hasWideZone ? 5 : 0)
      + (trader.territoryDrawdownBuffer ?? 0);
    ```
  - ⚠️ No new imports needed. No DB calls. Buffer comes from TraderState (Step 3.5).
  - `handleDrawdownBreach` is UNCHANGED

- [ ] **Step 7** — Elimination Engine (`engine/src/services/elimination-engine.ts`):
  - Add import: `import { calculateAdjustedPnl } from "./territory-manager"`
  - Add `const supabase = getSupabase()` at top of `processRankingElimination`
  - Batch-query territory bonuses BEFORE the trader loop (one query, not N)
  - Apply bonus from Map lookup inside loop

- [ ] **Step 7.5** — Demo Setup (`engine/src/mock/demo-setup.ts`):
  - Add import: `import { generateTerritories, executeTerritoryDraft } from "../services/territory-manager"`
  - In `setupDemoArena()`: add `await generateTerritories(id)` + `await executeTerritoryDraft(id, 1)` after participant inserts, before `initArena()`
  - Same in `setupTraderDemoArena()`
  - ⚠️ Without this, TerritoryBoard is empty on demo day

- [ ] **Step 7.6** — Bot Auto-Skirmish (`engine/src/mock/bot-traders.ts`):
  - Add a periodic check (every 60s, aligned with skirmish-scheduler interval) where each bot:
    1. Queries its current active territory
    2. Fetches adjacent territory holders and their current PnL%
    3. If bot PnL lead ≥ 15% over any adjacent holder, calls `POST /internal/arenas/:id/skirmish` to declare attack
  - ⚠️ Blitz arenas run 90s rounds — bots should only attempt attack if >30s remain in round
  - ⚠️ Must not fire more frequently than skirmish-scheduler — use the same 60s (or preset-aware) interval
  - Verify: in demo run, watch engine logs for bot-declared skirmish events and subsequent territory swaps

- [ ] **Step 7.7** — Leverage Enforcement (`engine/src/services/order-validator.ts`):
  - Read current file first to understand existing validation logic
  - Add query for trader's active territory `leverage_override` (nullable — null means no cap)
  - If territory has `leverage_override`, clamp requested leverage to `min(requested, override)`
  - ⚠️ This is a DB call at order-submission time (acceptable — not in the price-tick hot path)
  - ⚠️ Cache result per-trader per-round if `order-validator.ts` is called frequently; check first
  - Verify: submit order with leverage above territory cap → order rejected or leverage clamped in logs

---

## Phase 3: Skirmish System

> **Goal**: Traders can declare attacks via API; scheduler resolves them every 60s.

### Tasks

- [ ] **Step 8** — Skirmish Scheduler: Create `engine/src/services/skirmish-scheduler.ts`
  - 60s base interval, 30s declaration window, resolves all pending attacks
  - **Preset-aware interval**: read arena's `preset` field; for `"blitz"` use 30s interval instead of 60s
    - Blitz has 90s rounds — 60s interval gives only one skirmish window; 30s gives two
    - Read `PRESETS` from `src/lib/utils/constants.ts` to know which preset names are short-round
  - Wire into `engine/src/index.ts` startup
  - Verify: engine logs show "Skirmish window open" every 30s (blitz) or 60s (other presets)

- [ ] **Step 8.5** — Preset-Aware Skirmish Interval (verification task):
  - Confirm that `skirmish-scheduler.ts` reads arena preset at startup (not hardcoded)
  - Confirm bot auto-skirmish interval (Step 7.6) matches the scheduler interval for each arena
  - Verify: start one blitz demo arena → 30s interval in logs; start one sprint arena → 60s interval

- [ ] **Step 9** — Internal API Endpoints: Add skirmish endpoints to `engine/src/index.ts`
  - `POST /internal/arenas/:id/skirmish` — declare attack (attacker + defender IDs)
  - `GET /internal/arenas/:id/territories` — board state for frontend API route

---

## Phase 4: Frontend

> **Goal**: Territory board visible on spectate page, territory info on trade page.
> Use `/frontend-design` skill for all new components (per CLAUDE.md).

### Tasks

- [ ] **Step 10** — Frontend API Routes (3 files):
  - `GET /api/arenas/[id]/territories` — board state (calls engine internal API)
  - `POST /api/arenas/[id]/skirmish` — declare attack (proxied to engine)
  - `GET /api/arenas/[id]/skirmish-log` — recent skirmishes for activity feed

- [ ] **Step 10.5** — Realtime Subscription for Territories (`src/hooks/use-arena-realtime.ts`):
  - Read existing hook first to understand current subscription setup
  - Add `participant_territories` table to the Supabase Realtime channel alongside existing subscriptions
  - On INSERT/UPDATE: invalidate the territories board state query (TanStack Query `queryClient.invalidateQueries`)
  - ⚠️ `participant_territories` must be enabled for Realtime in Supabase dashboard (Table Editor → Realtime toggle)
  - ⚠️ Without this: board only updates on 60s polling fallback — territory swaps look instant to attacker but delayed to spectators
  - Verify: declare skirmish in demo → board updates within 2s for all spectators

- [ ] **Step 11** — `TerritoryBoard` component (`src/components/TerritoryBoard.tsx`):
  - NxM grid of cells, each showing holder's username, PnL%, danger level
  - Elimination zone cells highlighted in red
  - Responsive, animated with Framer Motion

- [ ] **Step 12** — `TerritoryInfoCard` component (`src/components/TerritoryInfoCard.tsx`):
  - Shows current trader's territory modifiers (PnL bonus, DD buffer, leverage cap)
  - Appears in Trade page sidebar

- [ ] **Step 13** — `TerritoryDraftModal` component (`src/components/TerritoryDraftModal.tsx`):
  - Shows draft order and current pick at round start
  - Auto-dismiss when draft completes

- [ ] **Step 14** — Page Integration:
  - **Spectate page** (`src/app/arenas/[arenaId]/spectate/page.tsx`): add `TerritoryBoard` + skirmish button
  - **Trade page** (`src/app/arenas/[arenaId]/trade/page.tsx`): add `TerritoryInfoCard`

---

## Done Criteria

The feature is complete when:
- [ ] Territory grid visible on spectate page for both Demo Arena and Open Arena
- [ ] Territory info (bonuses, buffer) visible on trade page
- [ ] Skirmish can be declared and resolves correctly (swap visible on board within 2s via Realtime)
- [ ] Elimination at round end correctly prioritizes bottom-row territory holders
- [ ] Territory drawdown buffer visibly protects traders above round max drawdown
- [ ] Leverage cap from territory cell is enforced at order submission
- [ ] Bot traders auto-declare skirmishes when PnL lead ≥ 15% — territories change hands in demo
- [ ] Engine restart restores territory drawdown buffers from DB — no silent protection loss
- [ ] Skirmish interval is 30s for Blitz, 60s for other presets
- [ ] `tsc --noEmit` passes with zero errors
- [ ] Engine logs show territory generation, draft, and skirmish resolution without Supabase errors

---

## Notes for Resuming

*(Update this section whenever you stop. Include: last step completed, what's in progress, any blockers, Railway/Vercel deploy status.)*

**Session Apr 9 2026:**
- Feature planned. All 4 planning docs read and cross-checked against existing codebase.
- 8 bugs found in `IMPLEMENTATION_TERRITORIAL_TRADING.md` — all fixed. Guide is now correct.
- 6 additional gap tasks identified and added to this tracker (Steps 3.6, 7.6, 7.7, 8.5, 10.5 + Blitz note in Step 8).
- Total tasks: 21 (up from 16).
- No code written yet. Phase 1 Step 1 is the starting point.
- Infrastructure is stable (Supabase ~15-20 req/min, Railway engine healthy, no zombies).
- Before starting: confirm Supabase is still healthy (`SELECT NOW()` in dashboard SQL editor).

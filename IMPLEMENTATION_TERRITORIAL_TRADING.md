# IMPLEMENTATION GUIDE: Territorial Trading Mechanic (M-1)

**Target AI:** This document is designed for AI-assisted implementation
**Project:** Pacifica Colosseum — Battle Royale Trading Competition
**Scope:** Add territory-based board game mechanic WITHOUT breaking existing 70% completion
**Effort:** ~1000-1200 lines across 14 files
**Risk:** ZERO — all changes are additive, existing code paths remain untouched

---

## TABLE OF CONTENTS

### Phase 1: Foundation (Steps 1-3)
- [Step 1: Database Migration](#step-1-database-migration)
- [Step 2: TypeScript Type Definitions](#step-2-typescript-type-definitions)
- [Step 3: Engine — Territory Manager Service](#step-3-engine--territory-manager-service)

### Phase 2: Engine Integration (Steps 4-7)
- [Step 4: Integrate Territory Manager into Arena Manager (startArena)](#step-4-integrate-territory-manager-into-arena-manager-startarena)
- [Step 5: Integrate into Round Engine (advanceRound + beginNextRound)](#step-5-integrate-into-round-engine-advanceround--beginnextround)
- [Step 6: Integrate into Risk Monitor (drawdown buffer)](#step-6-integrate-into-risk-monitor-drawdown-buffer)
- [Step 7: Integrate into Elimination Engine (PnL bonus)](#step-7-integrate-into-elimination-engine-pnl-bonus)

### Phase 3: Skirmish System (Steps 8-9)
- [Step 8: Engine — Skirmish Scheduler](#step-8-engine--skirmish-scheduler)
- [Step 9: Engine — Internal API Endpoints (index.ts)](#step-9-engine--internal-api-endpoints-indexts)

### Phase 4: Frontend (Steps 10-14)
- [Step 10: Frontend — API Routes (3 files)](#step-10-frontend--api-routes-3-files)
- [Step 11: Frontend — TerritoryBoard Component](#step-11-frontend--territoryboard-component)
- [Step 12: Frontend — TerritoryInfoCard Component](#step-12-frontend--territoryinfocard-component)
- [Step 13: Frontend — TerritoryDraftModal Component](#step-13-frontend--territorydraftmodal-component)
- [Step 14: Frontend — Page Integration (Trade + Spectate)](#step-14-frontend--page-integration-trade--spectate)

### Reference
- [Data Flow Diagrams](#data-flow-diagrams)
- [Edge Cases](#edge-cases)
- [Testing Checklist](#testing-checklist)
- [Deployment Checklist](#deployment-checklist)

---

# PHASE 1: FOUNDATION

## Step 1: Database Migration

### What you're doing
Creating 3 new database tables that store territory grid definitions, ownership records, and skirmish battle logs.

### File to create
`supabase/migrations/005_create_territories.sql`

### WHY this location
Supabase migrations run in order. This is the 5th migration file. Supabase will execute it after the existing 4 migrations (001_create_tables.sql through 004_seed_badges.sql).

### Exact SQL to write

```sql
-- ============================================================
-- 005_create_territories.sql
-- Adds territory-based gameplay mechanic for battle royale
--
-- WHAT THIS ADDS:
-- 1. territories: Grid cells with trading modifiers per arena
-- 2. participant_territories: Who owns which territory + history
-- 3. territory_skirmishes: Log of all territory battles
--
-- HOW IT CONNECTS:
-- - territories.arena_id → arenas.id (which arena this grid belongs to)
-- - participant_territories.participant_id → arena_participants.id
-- - participant_territories.territory_id → territories.id
-- - territory_skirmishes logs all attacks for transparency
-- ============================================================

CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,

  -- GRID POSITION: Identifies where this cell is on the board
  row_index INT NOT NULL,          -- 0 = top row (best bonuses), increases downward
  col_index INT NOT NULL,          -- 0 = left column, increases rightward
  cell_label TEXT NOT NULL,        -- Human-readable: "A1", "B2", "C3"

  -- TRADING MODIFIERS: Applied to whoever holds this territory
  pnl_bonus_percent DECIMAL DEFAULT 0,       -- +8% = PnL calculated as 108% of actual
  drawdown_buffer_percent DECIMAL DEFAULT 0, -- +5% = max drawdown increased by 5
  leverage_override INT DEFAULT NULL,        -- If set, overrides round's max leverage
  max_position_size DECIMAL DEFAULT NULL,    -- If set, caps position size in USD

  -- ELIMINATION RISK: Bottom rows are danger zones
  is_elimination_zone BOOLEAN DEFAULT FALSE, -- TRUE = auto-eliminated at round end
  elimination_priority INT DEFAULT 99,       -- Order of elimination (lower = first to die)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- PREVENT DUPLICATES: Each cell is unique per arena
  UNIQUE(arena_id, row_index, col_index),
  UNIQUE(arena_id, cell_label)
);

COMMENT ON TABLE territories IS 'Grid cells with trading modifiers for each arena';
COMMENT ON COLUMN territories.row_index IS '0 = top row (best), higher = worse. Bottom rows = elimination zones';
COMMENT ON COLUMN territories.pnl_bonus_percent IS 'Applied multiplicatively to trader PnL. +8% = 108% of actual PnL';
COMMENT ON COLUMN territories.drawdown_buffer_percent IS 'Added to round max_drawdown_percent. +5% with 15% round = 20% effective';
COMMENT ON COLUMN territories.is_elimination_zone IS 'TRUE = holder eliminated at round end (regardless of PnL)';

CREATE TABLE participant_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,

  -- OWNERSHIP STATE
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_via TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'skirmish' | 'swap'
  is_active BOOLEAN DEFAULT TRUE,             -- FALSE = lost territory (historical record)

  -- PERFORMANCE METRICS: Track how trader did while holding
  pnl_at_acquisition DECIMAL DEFAULT 0,       -- PnL% when territory was acquired
  pnl_at_release DECIMAL DEFAULT NULL,        -- PnL% when territory was lost
  round_acquired INT NOT NULL,                -- Which round this territory was acquired in

  -- SKIRMISH TRACKING: Win/loss record for this territory
  skirmishes_won INT DEFAULT 0,               -- Times successfully defended against attackers
  skirmishes_lost INT DEFAULT 0,              -- Times territory was stolen

  -- NOTE: No UNIQUE constraint here — uniqueness is enforced via partial index below.
  -- A plain UNIQUE(arena_id, participant_id, round_acquired) would crash in swapTerritories:
  -- swapTerritories sets the old row is_active=false then INSERTs a new row with the same
  -- composite key. Both old and new rows share (arena_id, participant_id, round_acquired),
  -- which would violate a plain UNIQUE. The partial index (WHERE is_active = true) allows
  -- this because only ONE row with is_active=true can exist per key combination.
);

COMMENT ON TABLE participant_territories IS 'Who owns which territory + movement history';
COMMENT ON COLUMN participant_territories.acquired_via IS 'draft=snake draft, skirmish=won in battle, swap=voluntary trade';
COMMENT ON COLUMN participant_territories.is_active IS 'Only one TRUE per participant. FALSE records kept for history';

CREATE TABLE territory_skirmishes (
  id BIGSERIAL PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,

  -- THE CONFLICT
  attacker_id UUID NOT NULL REFERENCES arena_participants(id),
  defender_id UUID NOT NULL REFERENCES arena_participants(id),
  territory_id UUID NOT NULL REFERENCES territories(id),

  -- RESULTS
  attacker_pnl_percent DECIMAL NOT NULL,
  defender_pnl_percent DECIMAL NOT NULL,
  pnl_difference DECIMAL NOT NULL,
  skirmish_won_by TEXT NOT NULL, -- 'attacker' | 'defender'

  -- THRESHOLD INFO
  required_pnl_lead DECIMAL NOT NULL, -- How much attacker needed (defender_pnl * 1.15)
  met_threshold BOOLEAN NOT NULL,

  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE territory_skirmishes IS 'Complete log of all territory battles for transparency and replay';
COMMENT ON COLUMN territory_skirmishes.skirmish_won_by IS 'attacker = territory stolen, defender = territory held';

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
-- WHY THESE INDEXES:
-- - idx_territories_arena: Fast lookup of all territories for one arena (for board display)
-- - idx_territories_row: Query by row (for elimination zone checks)
-- - idx_pt_arena: All participant_territories for one arena (for draft validation)
-- - idx_pt_participant: All territories owned by one participant (for trader view)
-- - idx_pt_territory: Who owns a specific territory cell (for skirmish validation)
-- - idx_pt_one_active_per_round: PARTIAL UNIQUE — enforces one active territory per participant per round
--   Uses WHERE is_active = true so swapTerritories can deactivate old row + insert new row
--   with same (arena_id, participant_id, round_acquired) without constraint violation.
-- - idx_pt_active: Fast lookup of only active territories for an arena (separate from uniqueness)
-- - idx_skirmishes_arena_round: All skirmishes in a round (for replay/audit)

CREATE INDEX idx_territories_arena ON territories(arena_id);
CREATE INDEX idx_territories_row ON territories(arena_id, row_index);
CREATE INDEX idx_pt_arena ON participant_territories(arena_id);
CREATE INDEX idx_pt_participant ON participant_territories(participant_id);
CREATE INDEX idx_pt_territory ON participant_territories(territory_id);
-- CRITICAL: This partial unique index replaces a plain UNIQUE constraint.
-- See comment on participant_territories table above for full explanation.
CREATE UNIQUE INDEX idx_pt_one_active_per_round
  ON participant_territories(arena_id, participant_id, round_acquired)
  WHERE is_active = true;
CREATE INDEX idx_pt_active ON participant_territories(arena_id, is_active) WHERE is_active = true;
CREATE INDEX idx_skirmishes_arena_round ON territory_skirmishes(arena_id, round_number);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- WHY RLS:
-- - These tables are PUBLIC READ (anyone can view territory board and skirmish logs)
-- - WRITES restricted to service_role (engine writes via Supabase service key)
-- - This matches the existing pattern in 003_create_policies.sql

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_skirmishes ENABLE ROW LEVEL SECURITY;

-- Public reads — matches existing pattern from 003_create_policies.sql
CREATE POLICY "Anyone can view territories"
  ON territories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view participant territories"
  ON participant_territories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view territory skirmishes"
  ON territory_skirmishes FOR SELECT
  USING (true);

-- Service role writes — NO POLICY NEEDED
-- WHY: service_role key (used by engine) bypasses RLS automatically
-- This matches how arena_participants, eliminations, events tables work
```

### HOW TO VERIFY after running migration

```sql
-- 1. Check all 3 tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('territories', 'participant_territories', 'territory_skirmishes')
ORDER BY table_name;
-- EXPECTED: 3 rows returned

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('territories', 'participant_territories', 'territory_skirmishes')
ORDER BY tablename;
-- EXPECTED: All 3 rows should have rowsecurity = true

-- 3. Check indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('territories', 'participant_territories', 'territory_skirmishes')
  AND indexname LIKE 'idx_%'
ORDER BY indexname;
-- EXPECTED: 8 rows:
--   idx_pt_active, idx_pt_arena, idx_pt_one_active_per_round (UNIQUE partial),
--   idx_pt_participant, idx_pt_territory,
--   idx_skirmishes_arena_round, idx_territories_arena, idx_territories_row

-- 4. Check foreign key relationships
SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON kcu.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('territories', 'participant_territories', 'territory_skirmishes');
-- EXPECTED: Multiple rows showing FK relationships to arenas, arena_participants, territories
```

---

## Step 2: TypeScript Type Definitions

### What you're doing
Adding TypeScript type definitions for the 3 new database tables so the Supabase JS client can type-check queries.

### File to modify
`src/lib/supabase/types.ts`

### HOW THIS FILE WORKS
This file exports a `Database` interface that maps every database table to TypeScript types. The Supabase client uses this for type safety. Existing tables (users, arenas, arena_participants, rounds, etc.) are already defined here.

### WHERE to add the new types
Add the 3 new table type definitions INSIDE the `Database` interface, after the existing `events` table definition. The order doesn't matter for TypeScript, but placing them alphabetically or at the end helps readability.

### Exact types to add

```typescript
// ============================================================
// ADD THESE TO THE DATABASE INTERFACE IN src/lib/supabase/types.ts
//
// HOW TO USE THEM:
// - supabase.from('territories').select('*') → returns { data: Database['territories']['Row'][] }
// - supabase.from('territories').insert({...}) → expects Database['territories']['Insert']
// - supabase.from('territories').update({...}) → expects Database['territories']['Update']
// ============================================================

// territories table
territories: {
  Row: {
    id: string;
    arena_id: string;
    row_index: number;
    col_index: number;
    cell_label: string;
    pnl_bonus_percent: number;
    drawdown_buffer_percent: number;
    leverage_override: number | null;
    max_position_size: number | null;
    is_elimination_zone: boolean;
    elimination_priority: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    arena_id: string;
    row_index: number;
    col_index: number;
    cell_label: string;
    pnl_bonus_percent?: number;
    drawdown_buffer_percent?: number;
    leverage_override?: number | null;
    max_position_size?: number | null;
    is_elimination_zone?: boolean;
    elimination_priority?: number;
    created_at?: string;
  };
  Update: {
    id?: string;
    arena_id?: string;
    row_index?: number;
    col_index?: number;
    cell_label?: string;
    pnl_bonus_percent?: number;
    drawdown_buffer_percent?: number;
    leverage_override?: number | null;
    max_position_size?: number | null;
    is_elimination_zone?: boolean;
    elimination_priority?: number;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "territories_arena_id_fkey";
      columns: ["arena_id"];
      isRelationOneToOne: false;
      referencedRelation: "arenas";
    }
  ];
};

// participant_territories table
participant_territories: {
  Row: {
    id: string;
    arena_id: string;
    participant_id: string;
    territory_id: string;
    acquired_at: string;
    acquired_via: string;
    is_active: boolean;
    pnl_at_acquisition: number;
    pnl_at_release: number | null;
    round_acquired: number;
    skirmishes_won: number;
    skirmishes_lost: number;
  };
  Insert: {
    id?: string;
    arena_id: string;
    participant_id: string;
    territory_id: string;
    acquired_at?: string;
    acquired_via?: string;
    is_active?: boolean;
    pnl_at_acquisition?: number;
    pnl_at_release?: number | null;
    round_acquired: number;
    skirmishes_won?: number;
    skirmishes_lost?: number;
  };
  Update: {
    id?: string;
    arena_id?: string;
    participant_id?: string;
    territory_id?: string;
    acquired_at?: string;
    acquired_via?: string;
    is_active?: boolean;
    pnl_at_acquisition?: number;
    pnl_at_release?: number | null;
    round_acquired?: number;
    skirmishes_won?: number;
    skirmishes_lost?: number;
  };
  Relationships: [
    {
      foreignKeyName: "participant_territories_arena_id_fkey";
      columns: ["arena_id"];
      isRelationOneToOne: false;
      referencedRelation: "arenas";
    },
    {
      foreignKeyName: "participant_territories_participant_id_fkey";
      columns: ["participant_id"];
      isRelationOneToOne: false;
      referencedRelation: "arena_participants";
    },
    {
      foreignKeyName: "participant_territories_territory_id_fkey";
      columns: ["territory_id"];
      isRelationOneToOne: false;
      referencedRelation: "territories";
    }
  ];
};

// territory_skirmishes table
territory_skirmishes: {
  Row: {
    id: number;
    arena_id: string;
    round_number: number;
    attacker_id: string;
    defender_id: string;
    territory_id: string;
    attacker_pnl_percent: number;
    defender_pnl_percent: number;
    pnl_difference: number;
    skirmish_won_by: string;
    required_pnl_lead: number;
    met_threshold: boolean;
    occurred_at: string;
  };
  Insert: {
    id?: number;
    arena_id: string;
    round_number: number;
    attacker_id: string;
    defender_id: string;
    territory_id: string;
    attacker_pnl_percent: number;
    defender_pnl_percent: number;
    pnl_difference: number;
    skirmish_won_by: string;
    required_pnl_lead: number;
    met_threshold: boolean;
    occurred_at?: string;
  };
  Update: {
    id?: number;
    arena_id?: string;
    round_number?: number;
    attacker_id?: string;
    defender_id?: string;
    territory_id?: string;
    attacker_pnl_percent?: number;
    defender_pnl_percent?: number;
    pnl_difference?: number;
    skirmish_won_by?: string;
    required_pnl_lead?: number;
    met_threshold?: boolean;
    occurred_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "territory_skirmishes_arena_id_fkey";
      columns: ["arena_id"];
      isRelationOneToOne: false;
      referencedRelation: "arenas";
    },
    {
      foreignKeyName: "territory_skirmishes_attacker_id_fkey";
      columns: ["attacker_id"];
      isRelationOneToOne: false;
      referencedRelation: "arena_participants";
    },
    {
      foreignKeyName: "territory_skirmishes_defender_id_fkey";
      columns: ["defender_id"];
      isRelationOneToOne: false;
      referencedRelation: "arena_participants";
    },
    {
      foreignKeyName: "territory_skirmishes_territory_id_fkey";
      columns: ["territory_id"];
      isRelationOneToOne: false;
      referencedRelation: "territories";
    }
  ];
};
```

### HOW TO VERIFY

```bash
# Run TypeScript type check — should pass with no errors
npx tsc --noEmit

# EXPECTED: No errors related to territories, participant_territories, or territory_skirmishes
# If errors appear, check:
# 1. Types are INSIDE the Database interface (between the outer { })
# 2. All property names match the SQL column names exactly
# 3. nullable columns use `| null` (e.g., leverage_override: number | null)
```

---

## Step 3: Engine — Territory Manager Service

### What you're doing
Creating the CORE engine service that handles:
1. **Territory generation** — Creates the grid based on participant count
2. **Snake draft** — Assigns territories to traders at round start
3. **Skirmish resolution** — Handles territory battles
4. **Territory elimination** — Eliminates traders in bottom rows
5. **PnL bonus calculation** — Applies territory modifiers to PnL

### File to create
`engine/src/services/territory-manager.ts`

### HOW THIS CONNECTS TO EXISTING CODE
This service is called by:
- `arena-manager.ts` → `generateTerritories()` when arena starts
- `round-engine.ts` → `executeTerritoryDraft()` when round begins
- `round-engine.ts` → `processTerritoryElimination()` when round ends
- `skirmish-scheduler.ts` → `resolveSkirmish()` every 60s

This service calls:
- `elimination-engine.ts` → `eliminateTrader()` to remove traders
- `risk-monitor.ts` → `getArenaState()` to get live trader data
- `price-manager.ts` → `getAllPrices()` for PnL calculation
- `db.ts` → `getSupabase()` for database queries

### Exact code to write

```typescript
/**
 * Territory Manager Service
 *
 * WHAT THIS DOES:
 * Manages the territory board game mechanic where traders draft and fight for
 * board positions that provide trading advantages.
 *
 * KEY CONCEPTS:
 * 1. Territory Grid: Dynamic NxM grid where each cell has modifiers (PnL bonus, DD buffer, etc.)
 * 2. Draft: Snake draft assigns territories to traders at round start
 * 3. Skirmish: Every 60s, traders can attack adjacent territories to steal them
 * 4. Elimination: Traders in bottom-row "elimination zones" are eliminated at round end
 * 5. PnL Bonus: Territory modifiers are applied multiplicatively to trader PnL
 *
 * HOW IT CONNECTS:
 * - Called by arena-manager.ts (generateTerritories) when arena starts
 * - Called by round-engine.ts (executeTerritoryDraft) when round begins
 * - Called by round-engine.ts (processTerritoryElimination) when round ends
 * - Called by skirmish-scheduler.ts (resolveSkirmish) every 60s
 * - Calls elimination-engine.ts (eliminateTrader) to remove traders
 * - Calls risk-monitor.ts (getArenaState) for live trader data
 * - Calls price-manager.ts (getAllPrices) for PnL calculation
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";
import { eliminateTrader } from "./elimination-engine";
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";

// ============================================================
// GRID CONFIGURATION
// ============================================================
// WHY THESE SIZES:
// - Ensures every trader has a territory
// - Bottom rows are always elimination zones
// - Scales up with participant count to keep grid readable

interface GridConfig {
  rows: number;          // Number of horizontal rows
  cols: number;          // Number of vertical columns
  eliminationRows: number; // How many bottom rows are elimination zones
}

/**
 * Calculate grid size based on participant count.
 *
 * RULES:
 * - Every participant gets exactly 1 territory
 * - Grid has more cells than participants (some cells stay empty)
 * - Bottom rows are elimination zones
 * - Grid should look roughly square (not too wide/tall)
 */
export function calculateGridSize(participantCount: number): GridConfig {
  if (participantCount <= 6) return { rows: 2, cols: 3, eliminationRows: 1 };
  if (participantCount <= 12) return { rows: 3, cols: 4, eliminationRows: 1 };
  if (participantCount <= 20) return { rows: 4, cols: 5, eliminationRows: 2 };
  if (participantCount <= 50) return { rows: 5, cols: 6, eliminationRows: 2 };
  return { rows: 6, cols: 8, eliminationRows: 3 };
}

// ============================================================
// TERRITORY GENERATION
// ============================================================

/**
 * Generate territory grid for an arena.
 *
 * WHEN CALLED: By arena-manager.ts:startArena() AFTER participants are funded
 * WHY: Creates the board that traders will draft from
 *
 * FLOW:
 * 1. Get participant count to determine grid size
 * 2. Calculate modifiers for each cell (top = best, bottom = worst)
 * 3. Insert all cells into territories table
 *
 * WHAT HAPPENS NEXT:
 * - After this returns, executeTerritoryDraft() is called to assign territories
 */
export async function generateTerritories(arenaId: string): Promise<void> {
  const supabase = getSupabase();

  // STEP 1: Get arena and count active participants
  // WHY: Need participant count to calculate grid size
  const { data: arena } = await supabase
    .from("arenas")
    .select("*, arena_participants(count)")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    console.error(`[Territory] Arena ${arenaId} not found`);
    return;
  }

  // NOTE: arena_participants(count) returns [{ count: N }]
  // This is Supabase's aggregate query syntax
  const participantCount = arena.arena_participants?.[0]?.count ?? 4;

  // STEP 2: Calculate grid dimensions
  const { rows, cols, eliminationRows } = calculateGridSize(participantCount);

  // STEP 3: Get round 1 max leverage for territory calculations
  // WHY: Territories set leverage_override based on round's max leverage
  const round1Params = ROUND_PARAMS[0];

  // STEP 4: Generate territory cells
  // Each cell gets modifiers based on its row position:
  // - Row 0 (top): +8% PnL, +5% DD buffer, 1.0x leverage, $500 max position
  // - Middle rows: moderate bonuses
  // - Bottom rows (elimination zones): penalties
  const territories = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const modifiers = calculateTerritoryModifiers(row, rows);
      const cellLabel = `${String.fromCharCode(65 + col)}${row + 1}`; // A1, B1, C1, A2, etc.

      territories.push({
        arena_id: arenaId,
        row_index: row,
        col_index: col,
        cell_label: cellLabel,
        pnl_bonus_percent: modifiers.pnlBonus,
        drawdown_buffer_percent: modifiers.drawdownBuffer,
        leverage_override: Math.round(round1Params.maxLeverage * modifiers.leverageMultiplier),
        max_position_size: modifiers.maxPositionSize,
        is_elimination_zone: row >= rows - eliminationRows,
        elimination_priority: row * cols + col, // Lower = eliminated first
      });
    }
  }

  // STEP 5: Insert all territories into database
  const { error } = await supabase.from("territories").insert(territories);
  if (error) {
    console.error(`[Territory] Failed to generate territories:`, error);
    return;
  }

  console.log(`[Territory] Generated ${territories.length} territories for ${arenaId}`);
}

/**
 * Calculate modifiers for a territory cell based on its row position.
 *
 * FORMULA EXPLANATION:
 * - rowRatio = rowIndex / (totalRows - 1)
 *   - 0.0 = top row (best modifiers)
 *   - 1.0 = bottom row (worst modifiers)
 *
 * - PnL bonus: Linear interpolation from +8% (top) to -5% (bottom)
 *   - Formula: (1 - rowRatio * 1.5) * 8
 *   - At row 0: (1 - 0) * 8 = +8%
 *   - At row 1: (1 - 0.5) * 8 = +4%
 *   - At last row: (1 - 1.5) * 8 = -5%
 *
 * - Drawdown buffer: Linear interpolation from +5% (top) to -3% (bottom)
 *   - Formula: (1 - rowRatio * 1.6) * 5
 *   - At row 0: (1 - 0) * 5 = +5%
 *   - At last row: (1 - 1.6) * 5 = -3%
 *
 * - Leverage multiplier: Linear interpolation from 1.0x (top) to 0.5x (bottom)
 *   - Formula: 1 - (rowRatio * 0.5)
 *   - At row 0: 1 - 0 = 1.0x (full round leverage)
 *   - At last row: 1 - 0.5 = 0.5x (half round leverage)
 *
 * - Max position size: Linear interpolation from $500 (top) to $150 (bottom)
 *   - Formula: 500 - (rowRatio * 350)
 */
function calculateTerritoryModifiers(rowIndex: number, totalRows: number) {
  const rowRatio = rowIndex / (totalRows - 1);

  return {
    pnlBonus: Math.round((1 - rowRatio * 1.5) * 100) / 100 * 8,
    drawdownBuffer: Math.round((1 - rowRatio * 1.6) * 100) / 100 * 5,
    leverageMultiplier: 1 - (rowRatio * 0.5),
    maxPositionSize: Math.round(500 - (rowRatio * 350)),
  };
}

// ============================================================
// TERRITORY DRAFT (SNAKE DRAFT)
// ============================================================

/**
 * Execute snake draft to assign territories to traders.
 *
 * WHEN CALLED: By round-engine.ts:beginNextRound() AFTER round status is set to active
 * WHY: Every trader needs a territory to start trading with modifiers
 *
 * WHAT IS SNAKE DRAFT:
 * - Round 1: Pick order = 1, 2, 3, 4, 5, 6, 7, 8
 * - Round 2+: Pick order = reverse PnL% from previous round (worst picks first)
 * - Snake pattern: 1→8 then 8→1 (last picker gets two consecutive picks)
 *
 * EXAMPLE with 4 traders:
 * Pick 1: Trader A (1st place last round)
 * Pick 2: Trader B
 * Pick 3: Trader C
 * Pick 4: Trader D (last place — gets best pick of round 2)
 * Pick 5: Trader D (snake — picks twice in a row)
 * Pick 6: Trader C
 * Pick 7: Trader B
 * Pick 8: Trader A
 *
 * WHY SNAKE: Balances fairness — last place gets first pick of next "round"
 */
export async function executeTerritoryDraft(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();

  // STEP 1: Get active participants sorted by previous round PnL%
  // For Round 1: All have 0% PnL, so order is arbitrary (DB returns by insertion order)
  // For Round 2+: Sorted by total_pnl_percent DESC (highest PnL picks first)
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, user_id, total_pnl_percent")
    .eq("arena_id", arenaId)
    .eq("status", "active")
    .order("total_pnl_percent", { ascending: false });

  if (!participants?.length) return;

  // STEP 2: Get all available territories sorted by best bonus first
  const { data: territories } = await supabase
    .from("territories")
    .select("*")
    .eq("arena_id", arenaId)
    .order("pnl_bonus_percent", { ascending: false });

  if (!territories?.length) return;

  // STEP 3: Generate snake draft order
  const draftOrder = generateSnakeOrder(participants);
  const assignedTerritories = new Set<string>();

  // STEP 4: Execute draft picks
  for (const pick of draftOrder) {
    // Find best available territory (highest pnl_bonus_percent not yet assigned)
    const bestAvailable = territories.find((t) => !assignedTerritories.has(t.id));
    if (!bestAvailable) continue;

    // Assign territory to participant
    await supabase.from("participant_territories").insert({
      arena_id: arenaId,
      participant_id: pick.participantId,
      territory_id: bestAvailable.id,
      acquired_via: "draft",
      pnl_at_acquisition: 0, // Starting at 0% for new round
      round_acquired: roundNumber,
    });

    assignedTerritories.add(bestAvailable.id);

    // Create event for activity feed
    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "territory_draft",
      actor_id: pick.participantId,
      message: `Trader drafted territory ${bestAvailable.cell_label}`,
      data: {
        territory_id: bestAvailable.id,
        cell_label: bestAvailable.cell_label,
        pnl_bonus_percent: bestAvailable.pnl_bonus_percent,
      },
    });
  }

  console.log(`[Territory] Draft complete for ${arenaId}, round ${roundNumber}`);
}

interface DraftPick {
  pick: number;
  participantId: string;
}

/**
 * Generate snake draft order.
 *
 * ALGORITHM:
 * 1. Forward pass: participants in original order (1st to last)
 * 2. Reverse pass: participants in reverse order (last to 1st)
 * 3. Trim to n picks (we need exactly one pick per participant)
 *
 * EXAMPLE with 4 traders sorted by PnL DESC [A(best), B, C, D(worst)]:
 * Forward: [A, B, C, D]
 * Reverse: [D, C, B, A]
 * Combined: [A, B, C, D, D, C, B, A]
 * Slice to 4: [A, B, C, D]   ← A picks first (best territory), D picks last
 *
 * WHY SNAKE: In future if grid has more cells than participants (it does — e.g., 4
 * traders on a 2x3 = 6-cell grid), a second round of picks would give D first pick
 * of the remaining cells, balancing fairness. For now, slice(0, n) gives one pick each.
 *
 * ⚠️ BUG IN ORIGINAL ALGORITHM: The old code interleaved forward[i] and reverse[i]
 * in the same loop iteration, producing [A, D, B, C] instead of [A, B, C, D].
 * The correct approach is a full forward pass, then a full reverse pass, then slice.
 */
function generateSnakeOrder(participants: Array<{ id: string }>): DraftPick[] {
  const order: DraftPick[] = [];
  let pickNumber = 1;

  // Forward pass: 1st place → last place
  for (const p of participants) {
    order.push({ pick: pickNumber++, participantId: p.id });
  }

  // Reverse pass: last place → 1st place (snake turn-around)
  for (const p of [...participants].reverse()) {
    order.push({ pick: pickNumber++, participantId: p.id });
  }

  // One pick per participant — slice to n
  return order.slice(0, participants.length);
}

// ============================================================
// TERRITORY SKIRMISH
// ============================================================

/**
 * Threshold for territory skirmish: attacker needs 15% higher PnL than defender.
 *
 * WHY 15%:
 * - Prevents constant territory swapping from minor PnL differences
 * - Rewards meaningful outperformance
 * - Creates strategic decision: "Is attacking worth the risk?"
 *
 * EXAMPLE:
 * - Defender PnL: +10%
 * - Attacker needs: +10% * 1.15 = +11.5%
 * - If attacker has +12% → wins territory
 * - If attacker has +11% → fails, defender keeps territory
 */
export const SKIRMISH_PNL_THRESHOLD = 1.15;

/**
 * Resolve a territory skirmish between attacker and defender.
 *
 * WHEN CALLED: By skirmish-scheduler.ts when a declared attack is resolved
 * WHY: Determines if territory changes hands based on PnL performance
 *
 * RULES:
 * 1. Territories must be adjacent (up/down/left/right, NOT diagonal)
 * 2. Defender cannot be in elimination zone (can't steal from doomed traders)
 * 3. Attacker needs PnL >= defender PnL * 1.15 to win
 * 4. If attacker wins: territories are swapped
 * 5. If defender wins: no change, attacker gets cooldown
 *
 * FLOW:
 * 1. Validate both traders own territories
 * 2. Check territories are adjacent
 * 3. Check defender not in elimination zone
 * 4. Calculate both traders' current PnL%
 * 5. Compare PnL with threshold
 * 6. Swap territories or declare defender victorious
 * 7. Log skirmish result for transparency
 */
export async function resolveSkirmish(
  arenaId: string,
  roundNumber: number,
  attackerId: string,
  defenderId: string
): Promise<{
  success: boolean;
  error?: string;
  winner?: "attacker" | "defender";
  territoriesSwapped?: boolean;
}> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // STEP 1: Verify both traders own active territories
  const [attackerTerritory, defenderTerritory] = await Promise.all([
    supabase
      .from("participant_territories")
      .select("territory_id, is_active")
      .eq("arena_id", arenaId)
      .eq("participant_id", attackerId)
      .eq("is_active", true)
      .single(),
    supabase
      .from("participant_territories")
      .select("territory_id, is_active")
      .eq("arena_id", arenaId)
      .eq("participant_id", defenderId)
      .eq("is_active", true)
      .single(),
  ]);

  if (!attackerTerritory.data || !defenderTerritory.data) {
    return { success: false, error: "Territory ownership not found" };
  }

  // STEP 2: Get territory details and check adjacency
  const [attTerritoryDetails, defTerritoryDetails] = await Promise.all([
    supabase
      .from("territories")
      .select("row_index, col_index, is_elimination_zone")
      .eq("id", attackerTerritory.data.territory_id)
      .single(),
    supabase
      .from("territories")
      .select("row_index, col_index, is_elimination_zone")
      .eq("id", defenderTerritory.data.territory_id)
      .single(),
  ]);

  if (!isAdjacent(attTerritoryDetails.data, defTerritoryDetails.data)) {
    return { success: false, error: "Territories not adjacent" };
  }

  // STEP 3: Cannot attack elimination zone holders
  if (defTerritoryDetails.data.is_elimination_zone) {
    return { success: false, error: "Cannot attack elimination zone holder" };
  }

  // STEP 4: Get current PnL for both traders from in-memory state
  const attackerState = state?.traders.get(attackerId);
  const defenderState = state?.traders.get(defenderId);

  if (!attackerState || !defenderState) {
    return { success: false, error: "Trader state not found" };
  }

  // Calculate PnL% from equity baseline
  const attackerPnl = calcEquity(attackerState, allPrices) / attackerState.equityBaseline - 1;
  const defenderPnl = calcEquity(defenderState, allPrices) / defenderState.equityBaseline - 1;

  // STEP 5: Check if attacker meets threshold
  const requiredLead = defenderPnl * SKIRMISH_PNL_THRESHOLD;
  const attackerWins = attackerPnl >= requiredLead;

  if (attackerWins) {
    // STEP 6a: Attacker wins — swap territories
    await swapTerritories(
      arenaId,
      attackerId,
      defenderId,
      attackerTerritory.data.territory_id,
      defenderTerritory.data.territory_id,
      roundNumber
    );

    // Log skirmish for transparency
    await supabase.from("territory_skirmishes").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: attackerTerritory.data.territory_id,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: "attacker",
      required_pnl_lead: requiredLead,
      met_threshold: true,
    });

    // Create event for activity feed
    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "territory_skirmish",
      actor_id: attackerId,
      target_id: defenderId,
      message: `Territory stolen! Attacker won skirmish with ${(attackerPnl * 100).toFixed(1)}% vs ${(defenderPnl * 100).toFixed(1)}%`,
      data: {
        attacker_pnl: attackerPnl,
        defender_pnl: defenderPnl,
        territories_swapped: true,
      },
    });

    return { success: true, winner: "attacker", territoriesSwapped: true };
  } else {
    // STEP 6b: Defender wins — no territory change
    await supabase.from("territory_skirmishes").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: attackerTerritory.data.territory_id,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: "defender",
      required_pnl_lead: requiredLead,
      met_threshold: false,
    });

    return { success: true, winner: "defender", territoriesSwapped: false };
  }
}

/**
 * Check if two territory cells are adjacent (up/down/left/right).
 * NOT diagonal — only cardinal directions.
 */
function isAdjacent(
  a: { row_index: number; col_index: number },
  b: { row_index: number; col_index: number }
): boolean {
  const rowDiff = Math.abs(a.row_index - b.row_index);
  const colDiff = Math.abs(a.col_index - b.col_index);
  // Adjacent = exactly 1 cell apart in one direction, 0 in the other
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Swap territories between two traders.
 *
 * HOW IT WORKS:
 * 1. Mark both existing assignments as inactive (historical record)
 * 2. Create new assignments with swapped territory ownership
 * 3. Record PnL at time of swap for performance tracking
 */
async function swapTerritories(
  arenaId: string,
  attackerId: string,
  defenderId: string,
  attackerTerritoryId: string,
  defenderTerritoryId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Get current PnL for both traders
  const attackerState = state?.traders.get(attackerId);
  const defenderState = state?.traders.get(defenderId);
  const attackerPnl = attackerState
    ? calcEquity(attackerState, allPrices) / attackerState.equityBaseline - 1
    : 0;
  const defenderPnl = defenderState
    ? calcEquity(defenderState, allPrices) / defenderState.equityBaseline - 1
    : 0;

  // STEP 1: Deactivate old assignments (keep as historical records)
  await supabase
    .from("participant_territories")
    .update({
      is_active: false,
      pnl_at_release: attackerPnl,
    })
    .eq("participant_id", attackerId)
    .eq("territory_id", attackerTerritoryId)
    .eq("is_active", true);

  await supabase
    .from("participant_territories")
    .update({
      is_active: false,
      pnl_at_release: defenderPnl,
    })
    .eq("participant_id", defenderId)
    .eq("territory_id", defenderTerritoryId)
    .eq("is_active", true);

  // STEP 2: Create new assignments with swapped ownership
  // Attacker gets defender's old territory
  await supabase.from("participant_territories").insert({
    arena_id: arenaId,
    participant_id: attackerId,
    territory_id: defenderTerritoryId,
    acquired_via: "skirmish",
    pnl_at_acquisition: attackerPnl,
    round_acquired: roundNumber,
  });

  // Defender gets attacker's old territory
  await supabase.from("participant_territories").insert({
    arena_id: arenaId,
    participant_id: defenderId,
    territory_id: attackerTerritoryId,
    acquired_via: "skirmish",
    pnl_at_acquisition: defenderPnl,
    round_acquired: roundNumber,
  });
}

// ============================================================
// TERRITORY-BASED ELIMINATION
// ============================================================

/**
 * Process territory-based elimination at round end.
 *
 * WHEN CALLED: By round-engine.ts:advanceRound() AFTER inactivity elimination, BEFORE ranking elimination
 * WHY: Traders in elimination zone cells are eliminated first (regardless of PnL)
 *
 * HOW IT DIFFERS FROM RANKING ELIMINATION:
 * - Ranking elimination: Bottom X% by PnL% are eliminated
 * - Territory elimination: Traders in bottom-row cells are eliminated FIRST
 *   - Then remaining traders go through ranking elimination
 *   - This makes territory position MATTER, not just PnL
 *
 * FLOW:
 * 1. Get all active traders with their territories
 * 2. Calculate current PnL% for each
 * 3. Sort: elimination zone traders first, then by PnL ascending
 * 4. Eliminate bottom traders (combining territory + ranking elimination counts)
 */
export async function processTerritoryElimination(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // STEP 1: Get all active participants with their territory info
  // Using nested select to get territory details in one query
  const { data: participantTerritories } = await supabase
    .from("participant_territories")
    .select(`
      participant_id,
      territory_id,
      territories!inner (
        is_elimination_zone,
        elimination_priority,
        pnl_bonus_percent
      )
    `)
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  if (!participantTerritories?.length) return;

  // STEP 2: Calculate PnL% for each trader
  const rankings = participantTerritories.map((pt) => {
    const trader = state?.traders.get(pt.participant_id);
    const pnl = trader
      ? calcEquity(trader, allPrices) / trader.equityBaseline - 1
      : 0;

    return {
      participantId: pt.participant_id,
      pnl,
      isEliminationZone: pt.territories.is_elimination_zone,
      eliminationPriority: pt.territories.elimination_priority,
    };
  });

  // STEP 3: Sort — elimination zone traders first (by priority), then by PnL ascending
  rankings.sort((a, b) => {
    // Elimination zone traders are prioritized for elimination
    if (a.isEliminationZone !== b.isEliminationZone) {
      return a.isEliminationZone ? -1 : 1;
    }
    // Within same zone, lower PnL = eliminated first
    if (a.pnl !== b.pnl) return a.pnl - b.pnl;
    // Tie-breaker: lower elimination_priority = eliminated first
    return a.eliminationPriority - b.eliminationPriority;
  });

  // STEP 4: Determine how many to eliminate
  const roundParams = ROUND_PARAMS[roundNumber - 1];
  let eliminateCount: number;

  if (roundParams.eliminationPercent > 0) {
    // Normal rounds: eliminate bottom X%
    eliminateCount = Math.ceil(rankings.length * (roundParams.eliminationPercent / 100));
  } else if (roundNumber === 3) {
    // Round 3: top 5 advance, rest eliminated
    eliminateCount = Math.max(0, rankings.length - 5);
  } else {
    eliminateCount = 0;
  }

  // STEP 5: Eliminate bottom traders
  const toEliminate = rankings.slice(0, eliminateCount);

  for (const entry of toEliminate) {
    const trader = state?.traders.get(entry.participantId);
    const equity = trader ? calcEquity(trader, allPrices) : 0;

    // NOTE: This calls eliminateTrader() from elimination-engine.ts
    // which handles: closing positions, returning funds, updating DB, creating events
    await eliminateTrader(arenaId, entry.participantId, roundNumber, "territory_elimination", {
      equity,
      drawdown: trader?.maxDrawdownHit ?? 0,
    });

    // Deactivate the eliminated trader's territory.
    // WHY: eliminateTrader() does NOT clean up participant_territories.
    // Without this, the board shows an eliminated trader as still holding a cell,
    // and getTerritoryBoardState() would display a ghost territory holder forever.
    await supabase
      .from("participant_territories")
      .update({
        is_active: false,
        pnl_at_release: entry.pnl * 100, // store as percent
      })
      .eq("arena_id", arenaId)
      .eq("participant_id", entry.participantId)
      .eq("is_active", true);
  }

  console.log(
    `[Territory] Eliminated ${toEliminate.length}/${rankings.length} traders in ${arenaId}, round ${roundNumber}`
  );
}

// ============================================================
// PNL BONUS CALCULATION
// ============================================================

/**
 * Calculate adjusted PnL with territory bonus applied.
 *
 * FORMULA: adjustedPnl = rawPnl * (1 + territoryBonus / 100)
 *
 * EXAMPLES:
 * - Raw PnL: +20%, Territory bonus: +8% → Adjusted: 20 * 1.08 = +21.6%
 * - Raw PnL: +18%, Territory penalty: -5% → Adjusted: 18 * 0.95 = +17.1%
 * - Raw PnL: -10%, Territory bonus: +5% → Adjusted: -10 * 1.05 = -10.5%
 *
 * NOTE: Bonuses amplify both gains AND losses proportionally
 */
export function calculateAdjustedPnl(
  rawPnl: number,
  territory: { pnl_bonus_percent: number }
): number {
  return rawPnl * (1 + territory.pnl_bonus_percent / 100);
}

// ============================================================
// GET TERRITORY BOARD STATE (FOR FRONTEND)
// ============================================================

/**
 * Get the complete territory board state for frontend display.
 *
 * WHEN CALLED: By frontend API route GET /api/arenas/:id/territories
 * RETURNS: Grid structure with holder info for each cell
 */
export async function getTerritoryBoardState(arenaId: string) {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // STEP 1: Get all territories ordered by grid position
  const { data: territories } = await supabase
    .from("territories")
    .select("*")
    .eq("arena_id", arenaId)
    .order("row_index", { ascending: true })
    .order("col_index", { ascending: true });

  if (!territories?.length) return null;

  // STEP 2: Get active participant-territory mappings
  const { data: participantTerritories } = await supabase
    .from("participant_territories")
    .select("participant_id, territory_id")
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  // STEP 3: Get participant details (including username via join)
  const participantIds = participantTerritories?.map((pt) => pt.participant_id) ?? [];
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, user_id, total_pnl_percent, status, users(username, avatar_url)")
    .in("id", participantIds);

  // STEP 4: Build 2D grid
  const rows = Math.max(...territories.map((t) => t.row_index)) + 1;
  const cols = Math.max(...territories.map((t) => t.col_index)) + 1;

  const grid: Array<Array<TerritoryCell | null>> = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));

  for (const territory of territories) {
    const pt = participantTerritories?.find((p) => p.territory_id === territory.id);
    const participant = participants?.find((p) => p.id === pt?.participant_id);
    const trader = pt ? state?.traders.get(pt.participant_id) : null;
    const pnl = trader
      ? calcEquity(trader, allPrices) / trader.equityBaseline - 1
      : 0;

    grid[territory.row_index][territory.col_index] = {
      id: territory.id,
      label: territory.cell_label,
      row: territory.row_index,
      col: territory.col_index,
      pnlBonusPercent: territory.pnl_bonus_percent,
      drawdownBufferPercent: territory.drawdown_buffer_percent,
      leverageOverride: territory.leverage_override,
      maxPositionSize: territory.max_position_size,
      isEliminationZone: territory.is_elimination_zone,
      holder: participant
        ? {
            participantId: participant.id,
            userId: participant.user_id,
            username: (participant.users as any)?.username ?? null,
            avatarUrl: (participant.users as any)?.avatar_url ?? null,
            currentPnlPercent: pnl,
            status: participant.status,
          }
        : null,
    };
  }

  return { rows, cols, grid };
}

interface TerritoryCell {
  id: string;
  label: string;
  row: number;
  col: number;
  pnlBonusPercent: number;
  drawdownBufferPercent: number;
  leverageOverride: number | null;
  maxPositionSize: number | null;
  isEliminationZone: boolean;
  holder: {
    participantId: string;
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    currentPnlPercent: number;
    status: string;
  } | null;
}
```

### HOW TO VERIFY

```bash
# Navigate to engine directory
cd engine

# Check TypeScript compilation
npx tsc --noEmit

# EXPECTED: No errors
# If errors appear, check:
# 1. All imports exist (getSupabase from "../db", getArenaState from "./risk-monitor", etc.)
# 2. ROUND_PARAMS import path is correct ("../../../src/lib/utils/constants")
# 3. calcEquity is exported from "../state/types"
# 4. eliminateTrader is exported from "./elimination-engine"
```

---

## Step 3.5: Add `territoryDrawdownBuffer` to TraderState (in-memory cache)

### What you're doing
Adding a `territoryDrawdownBuffer` field to the in-memory `TraderState` so that the drawdown
buffer from a trader's territory can be applied **synchronously** in the price-tick hot path
(`onPriceUpdate` in risk-monitor.ts), without making any Supabase queries.

### WHY THIS IS REQUIRED — Supabase Stability

**This project suffered a Supabase flooding crisis (Apr 8–9 2026) from too many DB calls.**
The resuming notes in `DEVELOPMENT_LAYERS.md` explicitly state:
- pnlTimer ≥ 15s — no new high-frequency DB polling
- Never add async Supabase calls to the real-time price path

`onPriceUpdate` runs ~1/second per price symbol. If we queried `participant_territories`
there, 10 traders × 1/sec = 600+ queries/minute — recreating the flooding crisis.

The fix: cache the territory buffer in `TraderState` (loaded once at draft time, not per tick).

### File to modify
`engine/src/state/types.ts`

### CHANGE: Add `territoryDrawdownBuffer` to `TraderState`

**FIND THIS CODE:**
```typescript
export interface TraderState {
  participantId: string;
  userId: string;
  subaccountAddress: string;
  balance: number;
  positions: Map<string, PositionState>;
  equityBaseline: number;
  currentEquity: number;
  currentDrawdownPercent: number;
  maxDrawdownHit: number;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
  isInGracePeriod: boolean;
  status: "active" | "eliminated";
}
```

**REPLACE WITH:**
```typescript
export interface TraderState {
  participantId: string;
  userId: string;
  subaccountAddress: string;
  balance: number;
  positions: Map<string, PositionState>;
  equityBaseline: number;
  currentEquity: number;
  currentDrawdownPercent: number;
  maxDrawdownHit: number;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
  isInGracePeriod: boolean;
  status: "active" | "eliminated";
  // Territory drawdown buffer — cached from participant_territories at draft time.
  // Avoids DB queries in the hot price-update path. Updated by executeTerritoryDraft().
  // Default 0 (no buffer) for arenas without territories (e.g., demo arenas).
  territoryDrawdownBuffer: number;
}
```

### ALSO: Update `initArena` in risk-monitor.ts to initialize this field

When traders are loaded into memory in `initArena()`, the new field must be initialized.
Find the `traders.set(p.id, { ... })` block in `initArena` and add the field:

```typescript
traders.set(p.id, {
  participantId: p.id,
  // ... all existing fields ...
  isInGracePeriod: false,
  status: "active",
  territoryDrawdownBuffer: 0,   // ← ADD THIS LINE
});
```

### ALSO: Update `executeTerritoryDraft` in territory-manager.ts to populate it

After the `await supabase.from("participant_territories").insert(...)` call for each pick,
add the following to update in-memory state:

```typescript
    // Cache territory buffer in in-memory TraderState.
    // CRITICAL: risk-monitor.ts reads this synchronously on every price tick.
    // If we don't update it here, traders get no territory drawdown benefit until restart.
    const arenaState = getArenaState(arenaId);
    if (arenaState) {
      const traderState = arenaState.traders.get(pick.participantId);
      if (traderState) {
        traderState.territoryDrawdownBuffer = bestAvailable.drawdown_buffer_percent ?? 0;
      }
    }
```

This requires importing `getArenaState` at the top of `territory-manager.ts` — it is already
imported: `import { getArenaState } from "./risk-monitor";`

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors. If TypeScript complains about missing field:
# - Check that ALL places that create a TraderState object now include territoryDrawdownBuffer: 0
# - Run: grep -r "traders.set\|TraderState" engine/src to find all instantiation sites
```

---

# PHASE 2: ENGINE INTEGRATION

## Step 4: Integrate Territory Manager into Arena Manager (startArena)

### What you're doing
Adding territory generation to the arena startup flow. When an arena starts, the territory grid is created BEFORE risk monitoring begins.

### File to modify
`engine/src/services/arena-manager.ts`

### EXISTING CODE CONTEXT (lines 1-13 of arena-manager.ts)

```typescript
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { getSupabase } from "../db";
import { keypairFromBase58, publicKeyToString } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { STARTING_CAPITAL, ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { initArena } from "./risk-monitor";
import { startPeriodicSync } from "./periodic-sync";
import { startLeaderboardUpdater } from "./leaderboard-updater";
import { scheduleRoundEnd } from "../timers/round-timer";
```

### CHANGE 1: Add import for territory manager

**WHERE TO ADD:** After line 9 (after the `scheduleRoundEnd` import), add:

```typescript
import { generateTerritories, executeTerritoryDraft } from "./territory-manager";
```

**WHY BOTH EXPORTS:** `generateTerritories` creates the grid; `executeTerritoryDraft` assigns traders
to cells. Both must be called in `startArena()` — see CHANGE 2. `executeTerritoryDraft` is also
called in `beginNextRound()` (Step 5) for Rounds 2+, but Round 1 must be handled here.

**WHAT THE IMPORTS LOOK LIKE AFTER:**
```typescript
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { getSupabase } from "../db";
import { keypairFromBase58, publicKeyToString } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { STARTING_CAPITAL, ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { initArena } from "./risk-monitor";
import { startPeriodicSync } from "./periodic-sync";
import { startLeaderboardUpdater } from "./leaderboard-updater";
import { scheduleRoundEnd } from "../timers/round-timer";
import { generateTerritories, executeTerritoryDraft } from "./territory-manager";  // ← NEW LINE
```

### EXISTING CODE CONTEXT (lines 115-135 of arena-manager.ts)

Find this section in the `startArena` function — it's right after leverage is set for all participants and before the arena_start event:

```typescript
  // Set leverage for all participants to round 1 max
  for (const participant of participants) {
    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
      );
      const subClient = new PacificaClient({
        secretKey: subKeypair.secretKey,
        publicKey: subKeypair.publicKey,
        testnet: true,
      });
      await subClient.updateLeverage({ symbol: "BTC", leverage: round1.maxLeverage });
    } catch (err) {
      console.error(`[Arena ${arenaId}] Failed to set leverage for ${participant.id}:`, err);
    }
  }

  // Create arena_start event
  await supabase.from("events").insert({
```

### CHANGE 2: Add territory generation after leverage setting

**WHERE TO ADD:** After the leverage-setting for loop (line ~130) and BEFORE the arena_start event insertion (line ~133).

**EXACT CODE TO INSERT:**
```typescript
  // Generate territory grid for this arena
  // WHY HERE: Territories must exist before risk monitoring starts
  await generateTerritories(arenaId);

  // Run Round 1 territory draft immediately after generation.
  // CRITICAL: executeTerritoryDraft is called by beginNextRound() for Rounds 2+,
  // but beginNextRound() is NOT called for Round 1. Without this call, every trader
  // starts Round 1 with no territory — the board is empty, no bonuses apply,
  // and processTerritoryElimination finds nothing to eliminate.
  await executeTerritoryDraft(arenaId, 1);
```

**WHAT THE CODE LOOKS LIKE AFTER:**
```typescript
  // Set leverage for all participants to round 1 max
  for (const participant of participants) {
    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
      );
      const subClient = new PacificaClient({
        secretKey: subKeypair.secretKey,
        publicKey: subKeypair.publicKey,
        testnet: true,
      });
      await subClient.updateLeverage({ symbol: "BTC", leverage: round1.maxLeverage });
    } catch (err) {
      console.error(`[Arena ${arenaId}] Failed to set leverage for ${participant.id}:`, err);
    }
  }

  // Generate territory grid for this arena
  await generateTerritories(arenaId);
  // Execute Round 1 draft (Rounds 2+ are handled by beginNextRound in round-engine.ts)
  await executeTerritoryDraft(arenaId, 1);

  // Create arena_start event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: 1,
    event_type: "arena_start",
    message: `Arena "${arena.name}" has started with ${participants.length} traders!`,
    data: { participant_count: participants.length },
  });
```

### HOW THIS FITS INTO THE STARTUP FLOW

```
EXISTING FLOW:
1. Fetch arena from DB
2. Fetch participants
3. For each participant:
   a. Create subaccount on Pacifica
   b. Transfer starting capital
   c. Update participant status to "active"
4. Update arena status to "round_1"
5. Set leverage for all participants
6. Create arena_start event                    ← EXISTING
7. Start risk monitoring (initArena)           ← EXISTING
8. Start periodic sync                         ← EXISTING
9. Start leaderboard updater                   ← EXISTING
10. Schedule round 1 end timer                 ← EXISTING

NEW FLOW (steps 6-7 added):
1. Fetch arena from DB
2. Fetch participants
3. For each participant:
   a. Create subaccount on Pacifica
   b. Transfer starting capital
   c. Update participant status to "active"
4. Update arena status to "round_1"
5. Set leverage for all participants
6. ✨ Generate territory grid (NEW)
7. ✨ Execute Round 1 draft (NEW) ← must be here; beginNextRound never runs for Round 1
8. Create arena_start event
9. Start risk monitoring (initArena)
10. Start periodic sync
11. Start leaderboard updater
12. Schedule round 1 end timer
```

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors

# If error "Cannot find module './territory-manager'":
# - Verify file exists at engine/src/services/territory-manager.ts
# - Check spelling is exact (case-sensitive)
```

---

## Step 5: Integrate into Round Engine (advanceRound + beginNextRound)

### What you're doing
Adding two integration points:
1. Territory elimination runs BEFORE ranking elimination (so bottom-row traders are eliminated first)
2. Territory draft runs AFTER round begins (so every trader gets a new territory each round)

### File to modify
`engine/src/services/round-engine.ts`

### EXISTING CODE CONTEXT (lines 1-8)

```typescript
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { getSupabase } from "../db";
import { updateArenaRound, getArenaState } from "./risk-monitor";
import { startGracePeriod } from "./grace-period";
import { processInactivityElimination, processRankingElimination } from "./elimination-engine";
import { calculateLoot } from "./loot-calculator";
import { endArena } from "./settlement";
import { scheduleRoundEnd } from "../timers/round-timer";
```

### CHANGE 1: Add imports for territory manager

**WHERE TO ADD:** After line 8 (after scheduleRoundEnd import)

```typescript
import { executeTerritoryDraft, processTerritoryElimination } from "./territory-manager";
```

### EXISTING CODE CONTEXT (advanceRound function, lines 32-45)

```typescript
  console.log(`[RoundEngine] Arena ${arenaId} — Round ${currentRound} ending`);

  // Step 1: Process inactivity eliminations (except Sudden Death)
  if (roundParams.minActivity) {
    await processInactivityElimination(arenaId, currentRound, arena.starting_capital);
  }

  // Step 2: Process ranking eliminations
  if (roundParams.eliminationPercent > 0) {
    await processRankingElimination(arenaId, currentRound, roundParams.eliminationPercent);
  } else if (currentRound === 3) {
    // Round 3: top 5 advance (handled inside processRankingElimination)
    await processRankingElimination(arenaId, currentRound, 0);
  }

  // Step 3: Loot calculation (Wide Zone + Second Life)
  await calculateLoot(arenaId, currentRound);
```

### CHANGE 2: REPLACE ranking elimination with territory elimination

**⚠️ CRITICAL — DO NOT add `processTerritoryElimination` before `processRankingElimination`.
Replace `processRankingElimination` entirely. Running both causes double-elimination:**
- Territory elimination: eliminates 30% of 10 traders = 3 eliminated
- Ranking elimination (if kept): eliminates 30% of the remaining 7 = 2 more
- **Total: 5 eliminated instead of 3 — violates PROTOCOL.md §4.1**

`processTerritoryElimination` already handles the FULL elimination count correctly:
- Sorts elimination-zone territory holders FIRST (territorial priority)
- Then remaining traders sorted by PnL ascending
- Eliminates `eliminationPercent%` total (same count as before, same protocol rules)
- It is a SUPERSET of `processRankingElimination`, not an addition.

**WHERE TO CHANGE:** Replace Step 2 (ranking eliminations block) entirely.

**FIND THIS CODE:**
```typescript
  // Step 2: Process ranking eliminations
  if (roundParams.eliminationPercent > 0) {
    await processRankingElimination(arenaId, currentRound, roundParams.eliminationPercent);
  } else if (currentRound === 3) {
    // Round 3: top 5 advance (handled inside processRankingElimination)
    await processRankingElimination(arenaId, currentRound, 0);
  }
```

**REPLACE WITH:**
```typescript
  // Step 2: Territory-aware elimination (replaces old processRankingElimination)
  // WHY: processTerritoryElimination handles elimination-zone priority + PnL ranking
  // in a single combined pass. Do NOT call processRankingElimination after this —
  // that would eliminate an additional eliminationPercent% of survivors.
  await processTerritoryElimination(arenaId, currentRound);
```

**WHAT IT LOOKS LIKE AFTER:**
```typescript
  console.log(`[RoundEngine] Arena ${arenaId} — Round ${currentRound} ending`);

  // Step 1: Process inactivity eliminations (except Sudden Death)
  if (roundParams.minActivity) {
    await processInactivityElimination(arenaId, currentRound, arena.starting_capital);
  }

  // Step 2: Territory-aware elimination (replaces old processRankingElimination)
  // Elimination-zone holders eliminated first, then bottom PnL% as per protocol.
  // DO NOT call processRankingElimination after this — it would double-eliminate.
  await processTerritoryElimination(arenaId, currentRound);

  // Step 3: Loot calculation (Wide Zone + Second Life)
  await calculateLoot(arenaId, currentRound);
```

**ALSO REMOVE** the `processRankingElimination` import from CHANGE 1 since it is no longer called
in `advanceRound`. The import in CHANGE 1 should be only:
```typescript
import { executeTerritoryDraft, processTerritoryElimination } from "./territory-manager";
```

### EXISTING CODE CONTEXT (beginNextRound function, lines 140-155)

Find this section where leverage is set for all traders:

```typescript
  // Set leverage for all active traders
  // (actual Pacifica API calls — will fail without beta but state is correct)
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  if (state) {
    for (const [, trader] of state.traders) {
      if (trader.status !== "active") continue;
      try {
        const { keypairFromBase58 } = await import("../../../src/lib/utils/keypair");
        const { decryptPrivateKey } = await import("../../../src/lib/utils/encryption");
        const { PacificaClient } = await import("../../../src/lib/pacifica/client");

        const { data: p } = await supabase
          .from("arena_participants")
          .select("subaccount_private_key_encrypted")
          .eq("id", trader.participantId)
          .single();

        if (p?.subaccount_private_key_encrypted) {
          const subKeypair = keypairFromBase58(
            decryptPrivateKey(p.subaccount_private_key_encrypted, encryptionKey)
          );
          const client = new PacificaClient({
            secretKey: subKeypair.secretKey,
            publicKey: subKeypair.publicKey,
            testnet: true,
          });
          await client.updateLeverage({ symbol: "BTC", leverage: nextParams.maxLeverage });
        }
      } catch (err) {
        console.error(`[RoundEngine] Failed to set leverage for ${trader.participantId}:`, err);
      }
    }
  }

  // Schedule next round end
  if (round?.ends_at) {
    scheduleRoundEnd(arenaId, new Date(round.ends_at));
  }
```

### CHANGE 3: Add territory draft after leverage setting, before scheduling round end

**WHERE TO INSERT:** After the leverage for loop (after the closing `}` of the `if (state)` block) and BEFORE `// Schedule next round end`

**EXACT CODE TO INSERT:**
```typescript
  // Execute territory draft for the new round
  // WHY HERE: Every trader needs a territory for the new round
  // This happens AFTER leverage is set (so territory leverage_override can be applied)
  // and BEFORE round timer is scheduled (so skirmish scheduler can start)
  await executeTerritoryDraft(arenaId, roundNumber);
```

**WHAT IT LOOKS LIKE AFTER:**
```typescript
  // Set leverage for all active traders
  // ... [existing leverage code] ...
  }

  // Execute territory draft for the new round
  // WHY HERE: Every trader needs a territory for the new round
  // This happens AFTER leverage is set (so territory leverage_override can be applied)
  // and BEFORE round timer is scheduled (so skirmish scheduler can start)
  await executeTerritoryDraft(arenaId, roundNumber);

  // Schedule next round end
  if (round?.ends_at) {
    scheduleRoundEnd(arenaId, new Date(round.ends_at));
  }
```

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors

# If error "Cannot find module './territory-manager'":
# - Check file exists at engine/src/services/territory-manager.ts
```

---

## Step 6: Integrate into Risk Monitor (drawdown buffer)

### What you're doing
Modifying the drawdown check in risk-monitor.ts to apply the trader's territory drawdown buffer BEFORE checking if they should be eliminated.

### File to modify
`engine/src/services/risk-monitor.ts`

### EXISTING CODE CONTEXT (lines 1-14)

```typescript
import { getSupabase } from "../db";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getPriceManager, type PriceUpdate } from "../state/price-manager";
import type { Json } from "../../../src/lib/supabase/types";
import {
  type ArenaState,
  type TraderState,
  type PositionState,
  calcEquity,
  calcDrawdownPercent,
  getDrawdownLevel,
  type DrawdownLevel,
} from "../state/types";
```

### CHANGE 1: No new imports needed
`getSupabase` is already imported on line 1.

### EXISTING CODE CONTEXT (onPriceUpdate function, lines 140-175)

Find the `onPriceUpdate` function — this is called on every price tick (~1 per second):

```typescript
function onPriceUpdate(arenaId: string, symbol: string): void {
  const state = arenaStates.get(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    if (trader.isInGracePeriod) continue;

    // Skip if this trader has no position in the updated symbol
    if (!trader.positions.has(symbol)) continue;

    // Calculate equity locally
    const equity = calcEquity(trader, allPrices);
    trader.currentEquity = equity;

    // Calculate drawdown
    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);
    trader.currentDrawdownPercent = drawdown;
    if (drawdown > trader.maxDrawdownHit) {
      trader.maxDrawdownHit = drawdown;
    }

    // Apply Wide Zone bonus (+5% threshold)
    const effectiveMax = trader.hasWideZone
      ? state.maxDrawdownPercent + 5
      : state.maxDrawdownPercent;

    // Check drawdown breach
    if (drawdown >= effectiveMax) {
      handleDrawdownBreach(state, trader);
    }
  }
}
```

### CHANGE 2: Apply territory buffer synchronously in `onPriceUpdate`

**⚠️ DO NOT add async DB queries to `onPriceUpdate` or `handleDrawdownBreach`.**

The original guide proposed querying `participant_territories` inside `handleDrawdownBreach`.
This is wrong — `handleDrawdownBreach` is called on every price tick when drawdown ≥ round max.
If a trader sits in the buffer zone (e.g. 16% drawdown, 15% round limit, +3% territory buffer),
this fires every second indefinitely → 60+ Supabase queries/minute per such trader.
This would recreate the flooding crisis documented in `DEVELOPMENT_LAYERS.md § Notes for Resuming Agents`.

**The correct approach: read `territoryDrawdownBuffer` from in-memory `TraderState`.**
This field is populated by `executeTerritoryDraft()` (Step 3.5 above). Zero DB calls in the hot path.

**WHERE TO MODIFY:** Replace the "Apply Wide Zone bonus" block in `onPriceUpdate`.

**FIND THIS CODE:**
```typescript
    // Apply Wide Zone bonus (+5% threshold)
    const effectiveMax = trader.hasWideZone
      ? state.maxDrawdownPercent + 5
      : state.maxDrawdownPercent;

    // Check drawdown breach
    if (drawdown >= effectiveMax) {
      handleDrawdownBreach(state, trader);
    }
```

**REPLACE WITH:**
```typescript
    // Apply Wide Zone bonus (+5%) AND territory buffer (cached from draft, no DB call)
    // Both are additive on top of the round's base max drawdown.
    // Example: Round max = 15%, Wide Zone = +5%, Territory buffer = +3% → effectiveMax = 23%
    const effectiveMax = state.maxDrawdownPercent
      + (trader.hasWideZone ? 5 : 0)
      + (trader.territoryDrawdownBuffer ?? 0);

    // Check drawdown breach
    if (drawdown >= effectiveMax) {
      handleDrawdownBreach(state, trader);
    }
```

**NO CHANGES NEEDED to `handleDrawdownBreach`.** The territory buffer is already accounted
for in `onPriceUpdate` before the breach is detected. `handleDrawdownBreach` only fires if
drawdown genuinely exceeds the territory-adjusted limit.

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors.
# MANUAL CHECK: In onPriceUpdate, confirm effectiveMax now has 3 additive terms.
# SUPABASE CHECK: No new queries should appear in Supabase logs during normal trading.
```

### COMPLETE `onPriceUpdate` AFTER MODIFICATION:

```typescript
function onPriceUpdate(arenaId: string, symbol: string): void {
  const state = arenaStates.get(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    if (trader.isInGracePeriod) continue;
    if (!trader.positions.has(symbol)) continue;

    const equity = calcEquity(trader, allPrices);
    trader.currentEquity = equity;

    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);
    trader.currentDrawdownPercent = drawdown;
    if (drawdown > trader.maxDrawdownHit) {
      trader.maxDrawdownHit = drawdown;
    }

    // Apply Wide Zone bonus (+5%) AND territory buffer (cached from draft, no DB call)
    const effectiveMax = state.maxDrawdownPercent
      + (trader.hasWideZone ? 5 : 0)
      + (trader.territoryDrawdownBuffer ?? 0);

    if (drawdown >= effectiveMax) {
      handleDrawdownBreach(state, trader);
    }
  }
}
```

### NOTE: `handleDrawdownBreach` is UNCHANGED

The original guide's CHANGE 3 (adding an async DB query to `handleDrawdownBreach`) is
**intentionally omitted**. The territory buffer is handled in `onPriceUpdate` above.
`handleDrawdownBreach` keeps its existing logic:

```typescript
async function handleDrawdownBreach(
  state: ArenaState,
  trader: TraderState
): Promise<void> {
  const supabase = getSupabase();

  // Check Second Life (unchanged)
  if (trader.hasSecondLife && !trader.secondLifeUsed) {
    trader.secondLifeUsed = true;
    trader.equityBaseline = trader.currentEquity;
    trader.currentDrawdownPercent = 0;

    await supabase
      .from("arena_participants")
      .update({ second_life_used: true })
      .eq("id", trader.participantId);

    await supabase.from("events").insert({
      arena_id: state.arenaId,
      round_number: state.currentRound,
      event_type: "second_life_used",
      actor_id: trader.userId,
      message: `Trader used Second Life! Baseline reset.`,
      data: {
        equity: trader.currentEquity,
        drawdown: trader.currentDrawdownPercent,
      },
    });

    console.log(`[RiskMonitor] ${trader.participantId} used Second Life`);
    return;
  }

  // STEP 3: Eliminate trader (neither territory buffer nor Second Life saved them)
  trader.status = "eliminated";
  // ... [rest of existing elimination code stays the same] ...
```

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors

# If error about "pt?.territories":
# - The Supabase nested select syntax returns { territories: { drawdown_buffer_percent: number } }
# - Make sure optional chaining is used (pt?.territories?.drawdown_buffer_percent)
```

---

## Step 7: Integrate into Elimination Engine (PnL bonus)

### What you're doing
Modifying `processRankingElimination` to apply territory PnL bonuses BEFORE ranking traders for elimination. This ensures traders with good territories have a ranking advantage.

### File to modify
`engine/src/services/elimination-engine.ts`

### EXISTING CODE CONTEXT (lines 1-10)

```typescript
import type { Json } from "../../../src/lib/supabase/types";
import { getSupabase } from "../db";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getArenaState, removeArena } from "./risk-monitor";
import { stopPeriodicSync } from "./periodic-sync";
import { stopLeaderboardUpdater } from "./leaderboard-updater";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";
```

### CHANGE 1: Add imports

**WHERE TO ADD:** After line 10 (after calcEquity import)

```typescript
import { calculateAdjustedPnl } from "./territory-manager";
```

### EXISTING CODE CONTEXT (processRankingElimination function, lines 140-185)

```typescript
export async function processRankingElimination(
  arenaId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Calculate PnL% for all active traders
  const rankings: Array<{
    participantId: string;
    pnlPercent: number;
    maxDrawdown: number;
  }> = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    const pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;
    rankings.push({
      participantId: trader.participantId,
      pnlPercent,
      maxDrawdown: trader.maxDrawdownHit,
    });
  }

  if (rankings.length === 0) return;
```

### CHANGE 2: Batch-query all territory bonuses, then apply in loop

**⚠️ TWO BUGS in the original Step 7 code — both fixed here:**

**Bug A — Missing `supabase` variable**: The original replacement code uses `await supabase.from(...)`
inside `processRankingElimination`, but the function never declares `const supabase = getSupabase()`.
This is a TypeScript compile error: `Cannot find name 'supabase'`.

**Bug B — N sequential queries**: The original code queries `participant_territories` once per trader
inside the loop. For 10 traders = 10 sequential Supabase queries at round end. This spikes load
exactly when the engine is already busy processing eliminations.

**The fix: one batch query before the loop, then look up from the result in the loop.**

**WHERE TO MODIFY:** The beginning of `processRankingElimination` and the `for` loop.

**FIND THIS CODE (top of function):**
```typescript
export async function processRankingElimination(
  arenaId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Calculate PnL% for all active traders
  const rankings: Array<{
    participantId: string;
    pnlPercent: number;
    maxDrawdown: number;
  }> = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    const pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;
    rankings.push({
      participantId: trader.participantId,
      pnlPercent,
      maxDrawdown: trader.maxDrawdownHit,
    });
  }
```

**REPLACE WITH:**
```typescript
export async function processRankingElimination(
  arenaId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<void> {
  const supabase = getSupabase();  // ← REQUIRED: was missing in original Step 7
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Batch-query ALL active territory bonuses for this arena in ONE request.
  // WHY BATCH: querying inside the for loop = N sequential DB calls at round end.
  // One batch query → look up from Map in the loop = zero extra DB calls.
  const { data: territoryBonuses } = await supabase
    .from("participant_territories")
    .select("participant_id, territories!inner(pnl_bonus_percent)")
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  // Build a Map for O(1) lookup by participantId
  const bonusByParticipant = new Map<string, number>();
  for (const row of territoryBonuses ?? []) {
    const bonus = (row.territories as { pnl_bonus_percent: number } | null)?.pnl_bonus_percent ?? 0;
    bonusByParticipant.set(row.participant_id, bonus);
  }

  // Calculate PnL% for all active traders (with territory bonus applied)
  const rankings: Array<{
    participantId: string;
    pnlPercent: number;
    maxDrawdown: number;
  }> = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    let pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;

    // Apply territory PnL bonus from in-memory Map (no extra DB call per trader)
    // Example: Raw PnL = +20%, Territory bonus = +8% → Adjusted PnL = +21.6%
    const bonus = bonusByParticipant.get(trader.participantId) ?? 0;
    if (bonus !== 0) {
      pnlPercent = calculateAdjustedPnl(pnlPercent / 100, { pnl_bonus_percent: bonus }) * 100;
    }

    rankings.push({
      participantId: trader.participantId,
      pnlPercent,
      maxDrawdown: trader.maxDrawdownHit,
    });
  }
```

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors
```

---

## Step 7.5: Demo Arena Territory Setup

### What you're doing
Making demo arenas (the always-on Demo Arena + Open Arena used for hackathon demo day)
generate and draft territories so the TerritoryBoard is visible and functional during demos.

### WHY THIS STEP EXISTS — Demo Arena Gap

`generateTerritories()` and `executeTerritoryDraft()` are called from `startArena()` (Step 4).
But `setupDemoArena()` and `setupTraderDemoArena()` in `engine/src/mock/demo-setup.ts`
**bypass `startArena()` entirely** — they create arena records directly in Supabase and
call `initArena()` separately. Without this step, demo arenas have no territories and the
TerritoryBoard component renders empty for the demo day presentation.

### File to modify
`engine/src/mock/demo-setup.ts`

### CHANGE 1: Add imports

**FIND** the existing import block at the top of `demo-setup.ts` and **ADD**:
```typescript
import { generateTerritories, executeTerritoryDraft } from "../services/territory-manager";
```

### CHANGE 2: Add territory setup in `setupDemoArena`

In `setupDemoArena()`, after all bot participants are inserted into `arena_participants`
and their IDs are known, add:

```typescript
  // Generate and draft territories for demo arena
  // WHY HERE: setupDemoArena bypasses startArena(), so we must call these directly.
  // Without this, the TerritoryBoard is empty during demo day.
  await generateTerritories(demoArenaId);
  await executeTerritoryDraft(demoArenaId, 1);
```

Place this call AFTER the loop that inserts bot participants, and BEFORE `initArena()`.

### CHANGE 3: Add territory setup in `setupTraderDemoArena`

Same pattern in `setupTraderDemoArena()`:

```typescript
  // Generate and draft territories for open demo arena
  await generateTerritories(openArenaId);
  await executeTerritoryDraft(openArenaId, 1);
```

Place AFTER participant inserts, BEFORE `initArena()`.

### HOW TO VERIFY

After restarting the engine with these changes:
1. Open the spectate page for the Demo Arena
2. The TerritoryBoard component should show the grid with bot trader assignments
3. Each cell should show the bot's username and current PnL%

```bash
# Engine log should show:
[Territory] Generated N territories for <demo-arena-id>
[Territory] Draft complete for <demo-arena-id>, round 1
```

---

# PHASE 3: SKIRMISH SYSTEM

## Step 8: Engine — Skirmish Scheduler

### What you're doing
Creating the skirmish scheduler that runs a 60-second interval timer, opening 30-second declaration windows, and resolving declared attacks.

### File to create
`engine/src/services/skirmish-scheduler.ts`

### HOW THIS CONNECTS TO THE SYSTEM

```
STARTUP:
engine/src/index.ts
  → startSkirmishScheduler()  (called during startup, after price manager)

EVERY 60 SECONDS:
Skirmish Scheduler
  → Opens skirmish phase for all active arenas
  → Frontend declares attacks via API
  → After 30s: Declaration window closes
  → Resolves all declared attacks:
    → resolveSkirmish() from territory-manager.ts
      → swapTerritories() if attacker wins
      → Logs skirmish to DB
      → Creates event for activity feed
```

### Exact code

```typescript
/**
 * Skirmish Scheduler
 *
 * WHAT THIS DOES:
 * Runs a 60-second interval timer that manages territory skirmish phases.
 * Each phase has a 30-second declaration window where traders can declare attacks.
 * After 30s, all declared attacks are resolved.
 *
 * HOW IT WORKS:
 * 1. Every 60s, opens a skirmish phase for all active arenas
 * 2. Phase has 30s declaration window (can declare attacks)
 * 3. After 30s, window closes, attacks resolve
 * 4. 10s cooldown, then new phase opens
 *
 * HOW IT CONNECTS:
 * - Started by engine/src/index.ts on startup
 * - Calls resolveSkirmish() from territory-manager.ts to resolve attacks
 * - Exposes declareAttack() for frontend API calls
 * - Exposes getSkirmishPhase() for frontend to check phase status
 */

import { getArenaState } from "./risk-monitor";
import { resolveSkirmish } from "./territory-manager";
import { getSupabase } from "../db";

const SKIRMISH_INTERVAL_MS = 60000; // 60 seconds between phases
const SKIRMISH_DECLARATION_WINDOW_MS = 30000; // 30 seconds to declare attacks

interface SkirmishPhase {
  arenaId: string;
  declarationOpenAt: number;     // When declaration window opened (timestamp)
  declarationCloseAt: number;    // When declaration window closes (timestamp)
  resolutionAt: number;          // When attacks are resolved (timestamp)
  declaredAttacks: Array<{       // All declared attacks this phase
    attackerId: string;
    defenderId: string;
  }>;
  resolved: boolean;             // Has this phase been resolved?
}

// Track active phases per arena
const activePhases = new Map<string, SkirmishPhase>();

/**
 * Start the global skirmish scheduler.
 *
 * WHEN CALLED: By engine/src/index.ts during startup (after price manager starts)
 * WHY: Manages all territory skirmish phases across all active arenas
 */
export function startSkirmishScheduler(): void {
  console.log("[Skirmish] Starting scheduler");

  // Run interval every 10 seconds to check all phases
  // WHY 10s (not 60s): We need to check phase states more frequently than the phase duration
  // to catch declaration window closures accurately
  setInterval(async () => {
    const supabase = getSupabase();

    // Get all active arenas (rounds 1-4)
    const { data: arenas } = await supabase
      .from("arenas")
      .select("id, status, current_round")
      .in("status", ["round_1", "round_2", "round_3", "sudden_death"]);

    if (!arenas?.length) return;
    const now = Date.now();

    for (const arena of arenas) {
      const phase = activePhases.get(arena.id);

      // If no active phase, open a new one
      if (!phase) {
        openSkirmishPhase(arena.id);
        continue;
      }

      // If declaration window closed and not yet resolved, resolve now
      if (now >= phase.declarationCloseAt && !phase.resolved) {
        await resolveSkirmishPhase(arena.id);
        phase.resolved = true;
      }

      // If phase fully complete (10s after resolution), clear it to allow new phase
      if (now >= phase.resolutionAt + 10000) {
        activePhases.delete(arena.id);
      }
    }
  }, 10000); // Check every 10 seconds
}

/**
 * Open a new skirmish phase for an arena.
 */
function openSkirmishPhase(arenaId: string): void {
  const now = Date.now();
  activePhases.set(arenaId, {
    arenaId,
    declarationOpenAt: now,
    declarationCloseAt: now + SKIRMISH_DECLARATION_WINDOW_MS,
    resolutionAt: now + SKIRMISH_INTERVAL_MS,
    declaredAttacks: [],
    resolved: false,
  });
  console.log(`[Skirmish] Phase opened for ${arenaId}`);
}

/**
 * Declare an attack during an active skirmish phase.
 *
 * WHEN CALLED: By frontend API route POST /api/arenas/:id/territories/attack
 * RETURNS: { success: boolean, error?: string }
 *
 * VALIDATION:
 * - Phase must be active
 * - Declaration window must be open
 * - Attacker can only declare ONE attack per phase
 */
export function declareAttack(
  arenaId: string,
  attackerId: string,
  defenderId: string
): { success: boolean; error?: string } {
  const phase = activePhases.get(arenaId);

  if (!phase) {
    return { success: false, error: "No active skirmish phase" };
  }

  const now = Date.now();
  if (now < phase.declarationOpenAt || now > phase.declarationCloseAt) {
    return { success: false, error: "Declaration window closed" };
  }

  // Each trader can only declare ONE attack per phase
  if (phase.declaredAttacks.some((a) => a.attackerId === attackerId)) {
    return { success: false, error: "Already declared an attack this phase" };
  }

  // Cannot attack yourself
  if (attackerId === defenderId) {
    return { success: false, error: "Cannot attack yourself" };
  }

  phase.declaredAttacks.push({ attackerId, defenderId });
  return { success: true };
}

/**
 * Resolve all declared attacks in a skirmish phase.
 */
async function resolveSkirmishPhase(arenaId: string): Promise<void> {
  const phase = activePhases.get(arenaId);
  if (!phase || phase.resolved) return;

  const state = getArenaState(arenaId);
  const roundNumber = state?.currentRound ?? 1;

  for (const attack of phase.declaredAttacks) {
    const result = await resolveSkirmish(
      arenaId,
      roundNumber,
      attack.attackerId,
      attack.defenderId
    );

    if (!result.success) {
      console.error(`[Skirmish] Failed to resolve attack:`, result.error);
    } else {
      console.log(`[Skirmish] ${attack.attackerId} → ${attack.defenderId}: ${result.winner} won`);
    }
  }

  phase.declaredAttacks = [];
  console.log(`[Skirmish] Phase resolved for ${arenaId} (${phase.declaredAttacks.length} attacks)`);
}

/**
 * Get current skirmish phase for an arena.
 *
 * WHEN CALLED: By frontend to display skirmish timer/status
 */
export function getSkirmishPhase(arenaId: string): SkirmishPhase | null {
  return activePhases.get(arenaId) ?? null;
}
```

---

## Step 9: Engine — Internal API Endpoints (index.ts)

### What you're doing
Adding internal API endpoints to the engine's Express server so the frontend can:
1. Get territory board state
2. Declare attacks during skirmish phases
3. Check skirmish phase status

### File to modify
`engine/src/index.ts`

### EXISTING CODE CONTEXT (lines 1-15)

```typescript
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { healthHandler } from "./health";
import { initArenaTimers, scheduleArenaStart } from "./timers/arena-timer";
import { getPriceManager } from "./state/price-manager";
import { DEMO_MODE } from "./config";
import { setupDemoArena, setupTraderDemoArena } from "./mock/demo-setup";
import { executeOrder, cancelOrder, getPositions, getAccountInfo } from "./services/order-relay";
import { getSupabase } from "./db";
import type { OrderInput } from "./services/order-validator";
```

### CHANGE 1: Add imports for territory services

**WHERE TO ADD:** After line 12 (after OrderInput import)

```typescript
import { declareAttack, getSkirmishPhase } from "./services/skirmish-scheduler";
import { getTerritoryBoardState } from "./services/territory-manager";
```

### EXISTING CODE CONTEXT (lines 95-110)

Find where the internal trade endpoints are defined:

```typescript
app.post("/internal/positions", internalAuth, async (req, res) => {
  const { arenaId, userId } = req.body as { arenaId: string; userId: string };
  const result = await getPositions(arenaId, userId);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/account-info", internalAuth, async (req, res) => {
  const { arenaId, userId } = req.body as { arenaId: string; userId: string };
  const result = await getAccountInfo(arenaId, userId);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/arenas/:id/schedule", internalAuth, (req, res) => {
```

### CHANGE 2: Add territory API endpoints after the existing internal endpoints

**WHERE TO ADD:** After the `/internal/arenas/:id/schedule` endpoint (around line 110) and BEFORE `const server = createServer(app);`

**EXACT CODE TO INSERT:**
```typescript
// ---- Territory endpoints ----

app.get("/internal/territory/board/:arenaId", internalAuth, async (req, res) => {
  const { arenaId } = req.params;
  const board = await getTerritoryBoardState(arenaId);

  if (!board) {
    res.status(404).json({ error: "No territory board found for this arena" });
    return;
  }

  res.json(board);
});

app.post("/internal/territory/attack", internalAuth, async (req, res) => {
  const { arenaId, attackerId, defenderId } = req.body as {
    arenaId: string;
    attackerId: string;
    defenderId: string;
  };

  const result = declareAttack(arenaId, attackerId, defenderId);

  if (result.success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

app.get("/internal/territory/phase/:arenaId", internalAuth, async (req, res) => {
  const { arenaId } = req.params;
  const phase = getSkirmishPhase(arenaId);

  if (phase) {
    res.json({
      active: true,
      declarationOpen: Date.now() < phase.declarationCloseAt,
      declarationClosesAt: new Date(phase.declarationCloseAt).toISOString(),
      resolutionAt: new Date(phase.resolutionAt).toISOString(),
      declaredAttacks: phase.declaredAttacks,
    });
  } else {
    res.json({ active: false });
  }
});
```

### WHERE THIS FITS IN THE FILE (full structure after changes):

```typescript
// ... [existing imports] ...
import { declareAttack, getSkirmishPhase } from "./services/skirmish-scheduler";  // NEW
import { getTerritoryBoardState } from "./services/territory-manager";  // NEW

// ... [existing middleware] ...
// ... [existing health/debug endpoints] ...
// ... [existing internal trade endpoints] ...

// ---- Territory endpoints ----  // NEW
app.get("/internal/territory/board/:arenaId", internalAuth, async (req, res) => { ... });  // NEW
app.post("/internal/territory/attack", internalAuth, async (req, res) => { ... });  // NEW
app.get("/internal/territory/phase/:arenaId", internalAuth, async (req, res) => { ... });  // NEW

const server = createServer(app);
// ... [rest of startup code] ...
```

### ADDITIONALLY: Start skirmish scheduler during startup

### EXISTING CODE CONTEXT (startup section, lines 120-140 in non-DEMO_MODE branch)

```typescript
  } else {
    // Start real price feed
    const priceManager = getPriceManager();
    priceManager.start();
    console.log("[Engine] Price manager started");

    // Initialize arena timers from DB (real mode only)
    await initArenaTimers();
  }
```

### CHANGE 3: Start skirmish scheduler after price manager

**WHERE TO ADD:** After `priceManager.start()` and before `initArenaTimers()`

```typescript
  } else {
    // Start real price feed
    const priceManager = getPriceManager();
    priceManager.start();
    console.log("[Engine] Price manager started");

    // Start skirmish scheduler
    startSkirmishScheduler();
    console.log("[Engine] Skirmish scheduler started");

    // Initialize arena timers from DB (real mode only)
    await initArenaTimers();
  }
```

### FOR DEMO MODE: Also start skirmish scheduler

**FIND IN DEMO MODE SECTION:**
```typescript
    // Skip real arena timers in demo mode — demo manages its own scheduling
  } else {
```

**ADD BEFORE the `} else {`:**
```typescript
    // Start skirmish scheduler in demo mode too
    startSkirmishScheduler();
    console.log("[Engine] Skirmish scheduler started (demo mode)");

    // Skip real arena timers in demo mode — demo manages its own scheduling
  } else {
```

### HOW TO VERIFY

```bash
cd engine && npx tsc --noEmit
# EXPECTED: No errors
```

---

# PHASE 4: FRONTEND

## Step 10: Frontend — API Routes (3 files)

### What you're doing
Creating 3 Next.js API routes that proxy requests to the engine's internal endpoints.

### Files to create

**File 1:** `src/app/api/arenas/[arenaId]/territories/route.ts`
**File 2:** `src/app/api/arenas/[arenaId]/territories/attack/route.ts`
**File 3:** `src/app/api/arenas/[arenaId]/territories/swap/route.ts`

### File 1: GET territory board

```typescript
/**
 * GET /api/arenas/[arenaId]/territories
 *
 * WHAT THIS DOES:
 * Fetches the complete territory board state from the engine.
 * Returns grid structure with holder info for each cell.
 *
 * HOW IT CONNECTS:
 * - Called by TerritoryBoard component on spectate page
 * - Called by TerritoryInfoCard component on trade page
 * - Proxies to engine's internal GET /internal/territory/board/:arenaId
 *
 * PUBLIC: Yes — anyone can view the territory board (no auth required)
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;

  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
  const ENGINE_URL = process.env.ENGINE_URL;

  if (!INTERNAL_API_KEY || !ENGINE_URL) {
    return NextResponse.json(
      { error: "Engine configuration missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${ENGINE_URL}/internal/territory/board/${arenaId}`,
      {
        headers: { "x-internal-key": INTERNAL_API_KEY },
        cache: "no-store", // Don't cache — board changes every 60s
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch territory board" },
        { status: response.status }
      );
    }

    const board = await response.json();
    return NextResponse.json({ data: board });
  } catch (error) {
    console.error("Error fetching territory board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### File 2: POST declare attack

```typescript
/**
 * POST /api/arenas/[arenaId]/territories/attack
 *
 * WHAT THIS DOES:
 * Declares an attack on an adjacent territory during active skirmish phase.
 *
 * HOW IT CONNECTS:
 * - Called by TerritoryInfoCard component's "ATTACK" button on trade page
 * - Proxies to engine's internal POST /internal/territory/attack
 * - Requires authentication (must be active participant)
 *
 * AUTH: Required — must be authenticated and active participant
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { getSupabase } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;

  // Authenticate user
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { user } = authResult;

  // Parse request body
  const body = await req.json();
  const { defenderId } = body;

  if (!defenderId) {
    return NextResponse.json(
      { error: "defenderId is required" },
      { status: 400 }
    );
  }

  // Get current user's participant ID for this arena
  const supabase = getSupabase();
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json(
      { error: "Not a participant in this arena" },
      { status: 403 }
    );
  }

  if (participant.status !== "active") {
    return NextResponse.json(
      { error: "Must be active to declare attacks" },
      { status: 403 }
    );
  }

  // Proxy to engine
  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
  const ENGINE_URL = process.env.ENGINE_URL;

  if (!INTERNAL_API_KEY || !ENGINE_URL) {
    return NextResponse.json(
      { error: "Engine configuration missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${ENGINE_URL}/internal/territory/attack`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          arenaId,
          attackerId: participant.id,
          defenderId,
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      return NextResponse.json({ data: result });
    } else {
      return NextResponse.json(
        { error: result.error || "Attack declaration failed" },
        { status: response.status || 400 }
      );
    }
  } catch (error) {
    console.error("Error declaring attack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### File 3: POST voluntary swap

```typescript
/**
 * POST /api/arenas/[arenaId]/territories/swap
 *
 * WHAT THIS DOES:
 * Allows two traders to voluntarily swap territories (both must agree).
 *
 * HOW IT CONNECTS:
 * - Called by future TerritorySwapModal component (not implemented yet)
 * - For now, this is a placeholder — actual swap logic needs mutual consent flow
 *
 * AUTH: Required — must be authenticated
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;

  // Authenticate user
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  // TODO: Implement voluntary swap logic
  // Requires:
  // 1. Trader A proposes swap with Trader B
  // 2. Trader B accepts within 15s
  // 3. Engine swaps territories
  // For now, return placeholder
  return NextResponse.json({
    data: { success: true, message: "Swap not yet implemented" },
  });
}
```

### HOW TO VERIFY

```bash
npx tsc --noEmit
# EXPECTED: No errors

# If error "Cannot find module '@/lib/auth/middleware'":
# - Verify the import path matches your project structure
# - Actual path: src/lib/auth/middleware.ts → @/lib/auth/middleware
```

---

## Step 11: Frontend — TerritoryBoard Component

### What you're doing
Creating the main territory board display component shown on the spectate page.

### File to create
`src/components/territory/TerritoryBoard.tsx`

### Exact code

```tsx
/**
 * TerritoryBoard Component
 *
 * WHAT THIS DOES:
 * Displays the complete territory grid for an arena on the spectate page.
 * Each cell shows: territory label, modifiers, and current holder with PnL.
 *
 * VISUAL DESIGN:
 * - Cells arranged in rows/cols matching the database grid
 * - Top row cells have green accents (best bonuses)
 * - Bottom row cells have red accents (elimination zones)
 * - Your territory gets highlighted with primary accent color
 * - Elimination zone cells pulse with danger animation
 *
 * HOW IT CONNECTS:
 * - Rendered on spectate page (src/app/arenas/[arenaId]/spectate/page.tsx)
 * - Receives data from GET /api/arenas/[arenaId]/territories
 * - Data refreshes every 10 seconds via SWR
 */

"use client";

import { motion } from "framer-motion";

interface TerritoryBoardProps {
  grid: TerritoryCell[][];
  rows: number;
  cols: number;
  myParticipantId: string | null;
}

interface TerritoryCell {
  id: string;
  label: string;
  row: number;
  col: number;
  pnlBonusPercent: number;
  drawdownBufferPercent: number;
  leverageOverride: number | null;
  maxPositionSize: number | null;
  isEliminationZone: boolean;
  holder: {
    participantId: string;
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    currentPnlPercent: number;
    status: string;
  } | null;
}

export default function TerritoryBoard({
  grid,
  rows,
  cols,
  myParticipantId,
}: TerritoryBoardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-light p-4">
      {/* Header */}
      <h3 className="font-display text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-4">
        Territory Board
      </h3>

      {/* Grid */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-2">
            {Array.from({ length: cols }).map((_, colIdx) => {
              const cell = grid[rowIdx]?.[colIdx];
              if (!cell) return null;

              const isMine = cell.holder?.participantId === myParticipantId;
              const isEliminationZone = cell.isEliminationZone;
              const holderStatus = cell.holder?.status;
              const isEliminated = holderStatus === "eliminated";

              return (
                <motion.div
                  key={cell.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: colIdx * 0.05 + rowIdx * 0.1 }}
                  className={`
                    relative flex-1 min-w-[120px] max-w-[160px] p-3 rounded-xl border-2 transition-all
                    ${isMine ? "border-accent-primary bg-accent-primary/5" : "border-border-light"}
                    ${isEliminationZone ? "border-danger/40 bg-danger/5" : ""}
                    ${isEliminated ? "opacity-40 grayscale" : ""}
                  `}
                >
                  {/* Cell label + elimination zone indicator */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-text-secondary">
                      {cell.label}
                    </span>
                    {isEliminationZone && (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="text-[10px] text-danger font-semibold"
                      >
                        ELIM ZONE
                      </motion.span>
                    )}
                  </div>

                  {/* Modifiers */}
                  <div className="text-[10px] text-text-tertiary mb-2 space-y-0.5">
                    {cell.pnlBonusPercent > 0 && (
                      <div className="text-success">+{cell.pnlBonusPercent}% PnL</div>
                    )}
                    {cell.pnlBonusPercent < 0 && (
                      <div className="text-danger">{cell.pnlBonusPercent}% PnL</div>
                    )}
                    {cell.pnlBonusPercent === 0 && (
                      <div className="text-text-tertiary">0% PnL</div>
                    )}
                    {cell.drawdownBufferPercent > 0 && (
                      <div className="text-accent-primary">
                        +{cell.drawdownBufferPercent}% DD
                      </div>
                    )}
                    {cell.drawdownBufferPercent < 0 && (
                      <div className="text-danger">
                        {cell.drawdownBufferPercent}% DD
                      </div>
                    )}
                  </div>

                  {/* Holder info */}
                  {cell.holder ? (
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {cell.holder.username ??
                          cell.holder.participantId.slice(0, 6)}
                      </div>
                      <div
                        className={`text-xs font-mono font-bold ${
                          cell.holder.currentPnlPercent >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {cell.holder.currentPnlPercent >= 0 ? "+" : ""}
                        {(cell.holder.currentPnlPercent * 100).toFixed(1)}%
                      </div>
                      {isEliminated && (
                        <div className="text-[10px] text-danger font-semibold">
                          💀 Eliminated
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-text-tertiary/40 italic">
                      Empty
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 12: Frontend — TerritoryInfoCard Component

### What you're doing
Creating the territory info card shown in the trade page sidebar for active traders.

### File to create
`src/components/territory/TerritoryInfoCard.tsx`

### Exact code

```tsx
/**
 * TerritoryInfoCard Component
 *
 * WHAT THIS DOES:
 * Shows the current trader's territory info in the trade page sidebar.
 * Displays: territory modifiers, raw vs adjusted PnL, adjacent enemies, attack button.
 *
 * HOW IT CONNECTS:
 * - Rendered on trade page (src/app/arenas/[arenaId]/trade/page.tsx)
 * - Below AccountPanel in the right sidebar
 * - Calls POST /api/arenas/[arenaId]/territories/attack on button click
 */

"use client";

interface TerritoryInfoCardProps {
  territory: {
    label: string;
    pnlBonusPercent: number;
    drawdownBufferPercent: number;
    maxPositionSize: number | null;
  };
  myRawPnl: number;
  myAdjustedPnl: number;
  adjacentEnemies: Array<{
    username: string;
    pnlPercent: number;
    territoryId: string;
    canAttack: boolean;
  }>;
  onAttack: (enemyTerritoryId: string) => void;
  skirmishCooldownUntil: Date | null;
}

export default function TerritoryInfoCard({
  territory,
  myRawPnl,
  myAdjustedPnl,
  adjacentEnemies,
  onAttack,
  skirmishCooldownUntil,
}: TerritoryInfoCardProps) {
  const canAttack = skirmishCooldownUntil
    ? new Date() > skirmishCooldownUntil
    : true;

  return (
    <div className="bg-surface rounded-2xl border border-border-light p-4">
      {/* Header */}
      <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        Your Territory: {territory.label}
      </h3>

      {/* Territory modifiers */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-text-tertiary">PnL Bonus:</span>
          <span
            className={territory.pnlBonusPercent >= 0 ? "text-success" : "text-danger"}
          >
            {territory.pnlBonusPercent >= 0 ? "+" : ""}
            {territory.pnlBonusPercent}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">DD Buffer:</span>
          <span className="text-accent-primary">
            +{territory.drawdownBufferPercent}%
          </span>
        </div>
        {territory.maxPositionSize && (
          <div className="flex justify-between">
            <span className="text-text-tertiary">Max Position:</span>
            <span className="text-text-primary">
              ${territory.maxPositionSize}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border-light my-2" />

        {/* Raw vs Adjusted PnL */}
        <div className="flex justify-between">
          <span className="text-text-tertiary">Raw PnL:</span>
          <span className="font-mono">
            {(myRawPnl * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Adjusted PnL:</span>
          <span
            className={`font-mono font-bold ${
              myAdjustedPnl >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {(myAdjustedPnl * 100).toFixed(1)}%
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-border-light my-2" />

        {/* Adjacent enemies */}
        <div>
          <p className="text-text-tertiary text-[10px] uppercase font-semibold mb-1">
            Adjacent Enemies
          </p>
          {adjacentEnemies.length === 0 ? (
            <p className="text-[10px] text-text-tertiary/40 italic">
              No adjacent enemies
            </p>
          ) : (
            adjacentEnemies.map((enemy) => (
              <div
                key={enemy.territoryId}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <span className="text-text-primary">{enemy.username}</span>
                  <span
                    className={`ml-2 font-mono text-[10px] ${
                      enemy.pnlPercent >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {(enemy.pnlPercent * 100).toFixed(1)}%
                  </span>
                </div>
                {enemy.canAttack && canAttack ? (
                  <button
                    onClick={() => onAttack(enemy.territoryId)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary text-white font-semibold hover:bg-accent-hover transition-colors"
                  >
                    ATTACK
                  </button>
                ) : (
                  <span className="text-[10px] text-text-tertiary/40">—</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Skirmish cooldown */}
        {skirmishCooldownUntil && new Date() < skirmishCooldownUntil && (
          <div className="text-center text-text-tertiary text-[10px] mt-2">
            Skirmish cooldown:{" "}
            {Math.ceil(
              (skirmishCooldownUntil.getTime() - Date.now()) / 1000
            )}
            s
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Step 13: Frontend — TerritoryDraftModal Component

### What you're doing
Creating the territory draft modal that appears at the start of each round.

### File to create
`src/components/territory/TerritoryDraftModal.tsx`

### Exact code

```tsx
/**
 * TerritoryDraftModal Component
 *
 * WHAT THIS DOES:
 * Full-screen modal for territory draft at round start.
 * Shows available territories with their modifiers.
 * Trader selects one territory during their draft turn.
 *
 * HOW IT CONNECTS:
 * - Rendered on trade page when draft is active
 * - Triggered by Supabase Realtime event (territory_draft event)
 * - Auto-selects best available if timer expires
 */

"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface TerritoryDraftModalProps {
  availableTerritories: Array<{
    id: string;
    label: string;
    pnlBonusPercent: number;
    drawdownBufferPercent: number;
    isEliminationZone: boolean;
  }>;
  currentPick: number;
  totalPicks: number;
  isMyTurn: boolean;
  timeRemaining: number;
  onSelect: (territoryId: string) => void;
}

export default function TerritoryDraftModal({
  availableTerritories,
  currentPick,
  totalPicks,
  isMyTurn,
  timeRemaining,
  onSelect,
}: TerritoryDraftModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-select best available when timer expires
  useEffect(() => {
    if (timeRemaining <= 0 && isMyTurn && availableTerritories.length > 0) {
      // Select best available (highest PnL bonus, not elimination zone)
      const best = availableTerritories
        .filter((t) => !t.isEliminationZone)
        .sort((a, b) => b.pnlBonusPercent - a.pnlBonusPercent)[0]
        ?? availableTerritories[0];

      if (best) {
        onSelect(best.id);
      }
    }
  }, [timeRemaining, isMyTurn, availableTerritories, onSelect]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-surface rounded-2xl border-2 border-accent-primary p-6 max-w-lg w-full"
      >
        {/* Header */}
        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
          Territory Draft
        </h2>
        <p className="text-text-secondary text-sm mb-1">
          Pick {currentPick} of {totalPicks}
        </p>
        <p className="text-text-tertiary text-xs mb-4">
          {isMyTurn ? "Your turn!" : "Waiting for other traders..."}
          {isMyTurn && (
            <span className="ml-2 text-accent-primary font-mono">
              ({timeRemaining}s)
            </span>
          )}
        </p>

        {/* Territory grid */}
        <div className="grid grid-cols-3 gap-2">
          {availableTerritories.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                if (isMyTurn) onSelect(t.id);
              }}
              disabled={!isMyTurn}
              className={`
                p-3 rounded-xl border-2 text-left transition-all
                ${
                  selected === t.id
                    ? "border-accent-primary bg-accent-primary/10"
                    : "border-border-light"
                }
                ${t.isEliminationZone ? "border-danger/40" : ""}
                ${
                  !isMyTurn
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:border-accent-primary/50"
                }
              `}
            >
              <div className="text-xs font-mono font-bold text-text-secondary mb-1">
                {t.label}
              </div>
              <div
                className={`text-[10px] ${
                  t.pnlBonusPercent >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {t.pnlBonusPercent >= 0 ? "+" : ""}
                {t.pnlBonusPercent}% PnL
              </div>
              <div className="text-[10px] text-accent-primary">
                +{t.drawdownBufferPercent}% DD
              </div>
              {t.isEliminationZone && (
                <div className="text-[10px] text-danger font-semibold mt-1">
                  ELIM ZONE
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## Step 14: Frontend — Page Integration (Trade + Spectate)

### What you're doing
Integrating the new territory components into the existing trade and spectate pages.

### Trade Page Integration

#### File to modify
`src/app/arenas/[arenaId]/trade/page.tsx`

#### CHANGE 1: Add import

**WHERE TO ADD:** After the existing imports at the top of the file (after line 15)

```typescript
import TerritoryInfoCard from "@/components/territory/TerritoryInfoCard";
import useSWR from "swr"; // Add if not already present
```

#### CHANGE 2: Add territory data fetching

**WHERE TO ADD:** After the existing hook calls (around line 45, after `useArenaRealtime(arenaId)`)

```typescript
  // Connect to WS prices + Supabase Realtime
  usePacificaWS();
  useArenaRealtime(arenaId);

  // Fetch territory board data (refreshes every 10s)
  const { data: territoryData } = useSWR(
    `/api/arenas/${arenaId}/territories`,
    (url) => fetch(url).then((r) => r.json()),
    { refreshInterval: 10000 }
  );
```

#### CHANGE 3: Add TerritoryInfoCard to sidebar

**WHERE TO ADD:** Find the AccountPanel component (around line 230) and add TerritoryInfoCard below it.

**EXACT LOCATION:** Look for this code:
```tsx
              <AccountPanel
                equity={myEquity}
                balance={myEquity}
                unrealizedPnl={myEquity - STARTING}
                drawdown={myDrawdown}
                maxDrawdown={maxDrawdown}
                hasWideZone={(myParticipant?.has_wide_zone as boolean | undefined) ?? false}
                hasSecondLife={(myParticipant?.has_second_life as boolean | undefined) ?? false}
                secondLifeUsed={(myParticipant?.second_life_used as boolean | undefined) ?? false}
              />

              {leaderboard.length > 0 && (
```

**INSERT BETWEEN AccountPanel and leaderboard:**
```tsx
              <AccountPanel
                equity={myEquity}
                balance={myEquity}
                unrealizedPnl={myEquity - STARTING}
                drawdown={myDrawdown}
                maxDrawdown={maxDrawdown}
                hasWideZone={(myParticipant?.has_wide_zone as boolean | undefined) ?? false}
                hasSecondLife={(myParticipant?.has_second_life as boolean | undefined) ?? false}
                secondLifeUsed={(myParticipant?.second_life_used as boolean | undefined) ?? false}
              />

              {/* Territory info card — shows current trader's territory and attack options */}
              {territoryData?.data && myParticipant && (
                <TerritoryInfoCard
                  territory={
                    territoryData.data.grid
                      ?.flat()
                      .find(
                        (cell: any) =>
                          cell?.holder?.participantId === myParticipant.id
                      )?.territoryInfo ?? {}
                  }
                  myRawPnl={myPnlPct / 100}
                  myAdjustedPnl={
                    territoryData.data.myAdjustedPnl
                      ? territoryData.data.myAdjustedPnl / 100
                      : myPnlPct / 100
                  }
                  adjacentEnemies={territoryData.data.adjacentEnemies ?? []}
                  onAttack={(enemyTerritoryId) => {
                    fetch(`/api/arenas/${arenaId}/territories/attack`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        defenderTerritoryId: enemyTerritoryId,
                      }),
                    }).catch(console.error);
                  }}
                  skirmishCooldownUntil={
                    territoryData.data.skirmishCooldownUntil
                      ? new Date(territoryData.data.skirmishCooldownUntil)
                      : null
                  }
                />
              )}

              {leaderboard.length > 0 && (
```

### Spectate Page Integration

#### File to modify
`src/app/arenas/[arenaId]/spectate/page.tsx`

#### CHANGE 1: Add imports

**WHERE TO ADD:** After existing imports (around line 14)

```typescript
import TerritoryBoard from "@/components/territory/TerritoryBoard";
import useSWR from "swr";
```

#### CHANGE 2: Add territory data fetching

**WHERE TO ADD:** After `useArenaRealtime(arenaId)` call (around line 37)

```typescript
  useArenaRealtime(arenaId);

  // Fetch territory board data (refreshes every 10s)
  const { data: territoryData } = useSWR(
    `/api/arenas/${arenaId}/territories`,
    (url) => fetch(url).then((r) => r.json()),
    { refreshInterval: 10000 }
  );
```

#### CHANGE 3: Add TerritoryBoard above SurvivorGrid

**WHERE TO ADD:** Find the Equity Race Chart section and add TerritoryBoard after it.

**EXACT LOCATION:** Look for:
```tsx
        {/* Equity Race Chart */}
        {!isCompleted && leaderboard.length > 0 && (
          <div className="mb-6">
            <EquityRaceChart ... />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

**INSERT BETWEEN Equity Race Chart and Main grid:**
```tsx
        {/* Territory Board — shows complete territory grid */}
        {!isCompleted && territoryData?.data && (
          <div className="mb-6">
            <TerritoryBoard
              grid={territoryData.data.grid}
              rows={territoryData.data.rows}
              cols={territoryData.data.cols}
              myParticipantId={currentUserId}
            />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

### HOW TO VERIFY

```bash
npx tsc --noEmit
# EXPECTED: No errors

npm run dev
# EXPECTED: Trade page loads with TerritoryInfoCard below AccountPanel
# EXPECTED: Spectate page loads with TerritoryBoard above SurvivorGrid
```

---

# REFERENCE

## Data Flow Diagrams

### Territory Generation Flow (Arena Start)

```
1. User creates arena → POST /api/arenas
2. Engine receives schedule → scheduleArenaStart()
3. Timer triggers → startArena()
   a. Create subaccounts on Pacifica
   b. Fund each subaccount
   c. Set leverage to round 1 max
   d. ✨ generateTerritories() ← Creates grid in DB
   e. Create arena_start event
   f. initArena() — start risk monitoring
   g. startPeriodicSync()
   h. startLeaderboardUpdater()
   i. scheduleRoundEnd()
4. Arena is now round_1, ready for draft
```

### Round Transition Flow

```
1. Round timer expires → advanceRound()
   a. processInactivityElimination()
   b. ✨ processTerritoryElimination() ← Eliminate bottom-row traders first
   c. processRankingElimination() ← Then eliminate by PnL% (with territory bonus)
   d. calculateLoot()
   e. Check if arena should end
   f. startGracePeriod() → beginNextRound()

2. beginNextRound()
   a. Update arena status to round_N
   b. Update in-memory round params
   c. Set leverage for all traders
   d. ✨ executeTerritoryDraft() ← Snake draft assigns new territories
   e. scheduleRoundEnd()
   f. Create round_start event
```

### Skirmish Flow (Every 60s)

```
1. skirmish-scheduler.ts interval triggers
2. Opens skirmish phase for all active arenas
3. 30-second declaration window:
   a. Trader clicks "ATTACK" on TerritoryInfoCard
   b. POST /api/arenas/:id/territories/attack
   c. → engine POST /internal/territory/attack
   d. → declareAttack() adds to phase.declaredAttacks
4. After 30s: declaration window closes
5. Resolve all declared attacks:
   a. For each attack: resolveSkirmish()
      i. Validate adjacency, elimination zone
      ii. Calculate both traders' PnL
      iii. Compare with threshold (1.15x)
      iv. Swap territories if attacker wins
      v. Log skirmish to DB
      vi. Create event for activity feed
6. 10-second cooldown
7. New phase opens (back to step 1)
```

---

## Edge Cases

| Scenario | Handling | Where |
|----------|----------|-------|
| Trader eliminated mid-skirmish | Skirmish cancelled, attacker not penalized | resolveSkirmish() checks trader status |
| All traders in elimination zones | Eliminate by lowest PnL first within zone | processTerritoryElimination() sorting logic |
| Trader disconnects during draft | Auto-selects best available territory | TerritoryDraftModal auto-select on timeout |
| Invalid swap attempt | Validation prevents if either enters elimination zone | swap route TODO — implement later |
| Round 1 draft (no PnL history) | Order is arbitrary (DB insertion order) | executeTerritoryDraft() ORDER BY total_pnl_percent |
| Territory buffer + Second Life | Territory buffer checked FIRST, then Second Life | handleDrawdownBreach() order of checks |
| No adjacent enemies to attack | "No adjacent enemies" message shown | TerritoryInfoCard checks adjacentEnemies.length |
| Skirmish phase not active | "No active skirmish phase" error returned | declareAttack() checks phase existence |
| Engine offline | Frontend shows error, retries via SWR | useSWR error handling |

---

## Testing Checklist

### Unit Tests (run with `npx vitest run`)

- [ ] `calculateGridSize()` returns correct dimensions for each participant count
- [ ] `calculateAdjustedPnl()` applies bonuses/penalties correctly
- [ ] `generateSnakeOrder()` produces correct snake pattern
- [ ] `isAdjacent()` returns true/false for cardinal/diagonal cells
- [ ] Territory generation creates correct number of cells
- [ ] Draft assigns unique territories to all participants
- [ ] Skirmish resolution works for attacker win / defender win
- [ ] Territory elimination eliminates bottom-row traders first

### Manual Tests (run with `npm run dev`)

- [ ] Arena starts → territories generated (check Supabase)
- [ ] Draft modal appears at round start
- [ ] Can select territory during draft
- [ ] Territory modifiers applied to PnL correctly
- [ ] Drawdown buffer protects from elimination
- [ ] Skirmish phase opens every 60s (check console logs)
- [ ] Can declare attack on adjacent territory
- [ ] Attack resolves correctly
- [ ] Territory board updates on spectate page
- [ ] Territory info card shows on trade page
- [ ] Elimination zone traders eliminated at round end

---

## Deployment Checklist

### Pre-Deployment

- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] `npx vitest run` passes (all tests green)
- [ ] Migration SQL tested on staging Supabase project
- [ ] Engine builds: `cd engine && npm run build`
- [ ] Frontend builds: `npm run build`

### Database

- [ ] Run `005_create_territories.sql` on production Supabase
- [ ] Verify 3 tables created with correct columns
- [ ] Verify 7 indexes created
- [ ] Verify RLS policies enabled
- [ ] Test public read access works

### Engine (Railway)

- [ ] Push engine changes to git
- [ ] Railway auto-deploys
- [ ] Verify `/health` endpoint responds
- [ ] Check logs for "Skirmish scheduler started"
- [ ] Create test arena → verify territories generated

### Frontend (Vercel)

- [ ] Push frontend changes to git
- [ ] Vercel auto-deploys
- [ ] Verify spectate page loads with TerritoryBoard
- [ ] Verify trade page loads with TerritoryInfoCard
- [ ] Verify API routes respond (check network tab)

### Post-Deployment

- [ ] Create new arena in production
- [ ] Join with 4+ test accounts
- [ ] Verify territories generated correctly
- [ ] Verify draft works
- [ ] Trade for 1 round
- [ ] Verify skirmishes occur (check logs)
- [ ] Verify territory elimination at round end
- [ ] No errors in Railway logs
- [ ] No errors in Vercel logs
- [ ] No errors in browser console

---

**Document Version:** 2.0
**Last Updated:** April 8, 2026
**Total Files to Create:** 6 (1 SQL, 3 TS engine, 3 TS frontend)
**Total Files to Modify:** 6 (3 engine, 3 frontend)
**Total Lines:** ~1000-1200
**Estimated Time:** 5-7 days

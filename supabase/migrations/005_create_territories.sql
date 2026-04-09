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
  skirmishes_lost INT DEFAULT 0              -- Times territory was stolen

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

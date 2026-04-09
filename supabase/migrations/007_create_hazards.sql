-- ============================================================
-- 007_create_hazards.sql
-- Adds the Hazard Events mechanic for battle royale
--
-- WHAT THIS ADDS:
-- 1. hazard_events:        Catalog of all possible hazard types (seeded)
-- 2. active_hazard_events: Currently active/warning hazards per arena/round
--
-- HOW IT CONNECTS:
-- - active_hazard_events.arena_id → arenas.id
-- - Engine schedules hazards at round start, reads from DB for frontend API
-- - Hot-path enforcement (leverage cap, side ban, drawdown reduction) is
--   cached in ArenaState in-memory — NO DB queries per tick
-- ============================================================

-- ============================================================
-- TABLE: hazard_events
-- Catalog of all hazard types (static, seeded)
-- ============================================================
CREATE TABLE hazard_events (
  id TEXT PRIMARY KEY,           -- 'flash_crash', 'high_volatility', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,

  -- Classification
  category TEXT NOT NULL,        -- 'market' | 'rule' | 'opportunity'
  severity TEXT NOT NULL,        -- 'minor' | 'moderate' | 'severe'

  -- Timing
  warning_seconds INT NOT NULL DEFAULT 10,  -- Telegraph time before effect starts
  duration_seconds INT NOT NULL DEFAULT 0,  -- 0 = permanent for remainder of round

  -- Effect definition
  effect_config JSONB NOT NULL,  -- Type-specific config (see comments per row)

  -- Restrictions
  min_round INT NOT NULL DEFAULT 1,
  max_occurrences_per_round INT NOT NULL DEFAULT 1,
  weight INT NOT NULL DEFAULT 10,  -- Probability weight for weighted random selection

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hazard_events IS 'Catalog of hazard event types. Seeded at migration time.';
COMMENT ON COLUMN hazard_events.duration_seconds IS '0 = permanent for rest of round. >0 = timed effect that reverts.';
COMMENT ON COLUMN hazard_events.weight IS 'Higher weight = more likely to be selected. Used for weighted random pick.';

-- ============================================================
-- TABLE: active_hazard_events
-- Tracks hazards that are warning or currently active in an arena
-- ============================================================
CREATE TABLE active_hazard_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,

  -- Which hazard
  hazard_id TEXT NOT NULL REFERENCES hazard_events(id),

  -- Timing
  warned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,   -- NULL for permanent-for-round effects

  -- State
  status TEXT NOT NULL DEFAULT 'warning',  -- 'warning' | 'active' | 'expired'

  -- For position_reveal: store revealed data here
  effect_state JSONB DEFAULT NULL
);

COMMENT ON TABLE active_hazard_events IS 'Hazards in warning or active state for an arena/round.';
COMMENT ON COLUMN active_hazard_events.status IS 'warning = telegraphing; active = effect in force; expired = cleared.';
COMMENT ON COLUMN active_hazard_events.expires_at IS 'NULL for permanent-for-round effects (duration_seconds=0).';

CREATE INDEX idx_ahz_arena ON active_hazard_events(arena_id);
CREATE INDEX idx_ahz_arena_round ON active_hazard_events(arena_id, round_number);
CREATE INDEX idx_ahz_active ON active_hazard_events(arena_id, status)
  WHERE status IN ('warning', 'active');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE hazard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_hazard_events ENABLE ROW LEVEL SECURITY;

-- Public reads — spectators can see what hazards are active
CREATE POLICY "Anyone can view hazard catalog" ON hazard_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view active hazards" ON active_hazard_events FOR SELECT USING (true);

-- Service role writes bypass RLS automatically

-- ============================================================
-- SEED: Hazard catalog (7 implemented hazards)
-- ============================================================
INSERT INTO hazard_events (id, name, description, icon, category, severity, warning_seconds, duration_seconds, effect_config, min_round, max_occurrences_per_round, weight) VALUES

-- MARKET HAZARDS (demo-only — manipulate mock price generator)
('flash_crash',
 'Flash Crash',
 'BTC drops 10% over 30 seconds. Short positions benefit, longs suffer.',
 '📉', 'market', 'severe', 10, 30,
 '{"type": "price_shock", "symbol": "BTC", "direction": "down", "magnitude": 0.10}',
 1, 1, 5),

('high_volatility',
 'High Volatility',
 'All price swings 2× normal for 60 seconds. High risk, high reward.',
 '🌊', 'market', 'moderate', 10, 60,
 '{"type": "volatility_multiplier", "multiplier": 2.0}',
 1, 2, 8),

-- RULE HAZARDS (both modes — enforce via ArenaState in-memory)
('leverage_cap',
 'Leverage Emergency',
 'Max leverage capped at 3× for the remainder of this round.',
 '🚫', 'rule', 'severe', 15, 0,
 '{"type": "leverage_override", "max_leverage": 3}',
 1, 1, 4),

('drawdown_tighten',
 'Risk-Off',
 'Max drawdown reduced by 5% for the remainder of this round.',
 '⚠️', 'rule', 'severe', 10, 0,
 '{"type": "drawdown_reduction", "reduction_percent": 5}',
 1, 1, 4),

('no_shorting',
 'Short Ban',
 'Short (ask) orders are disabled for 60 seconds.',
 '🚷', 'rule', 'moderate', 10, 60,
 '{"type": "side_restriction", "disabled_side": "ask"}',
 1, 1, 5),

-- OPPORTUNITY EVENTS (both modes)
('safe_haven',
 'Safe Haven',
 '+5% drawdown buffer granted to ALL traders for 90 seconds.',
 '🏠', 'opportunity', 'minor', 5, 90,
 '{"type": "drawdown_buffer", "buffer_percent": 5}',
 1, 2, 8),

('insider_info',
 'Insider Info',
 'A random trader''s full positions are revealed to everyone for 60 seconds.',
 '🔎', 'opportunity', 'minor', 0, 60,
 '{"type": "position_reveal", "target": "random"}',
 1, 1, 6);

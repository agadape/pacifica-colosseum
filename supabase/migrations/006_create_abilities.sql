-- ============================================================
-- 006_create_abilities.sql
-- Adds the Ability System mechanic for battle royale
--
-- WHAT THIS ADDS:
-- 1. abilities: Catalog of all available abilities (seeded)
-- 2. participant_abilities: Which abilities each trader owns
-- 3. active_ability_effects: Currently active timed effects
--
-- HOW IT CONNECTS:
-- - participant_abilities.participant_id → arena_participants.id
-- - active_ability_effects.target_participant_id → arena_participants.id
-- - Engine awards abilities at round end, applies effects on activation
-- ============================================================

-- ============================================================
-- TABLE: abilities
-- Catalog of all ability types (static, seeded)
-- ============================================================
CREATE TABLE abilities (
  id TEXT PRIMARY KEY,           -- 'shield', 'fortress', 'second_wind', 'sabotage'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,

  -- Classification
  category TEXT NOT NULL,        -- 'attack' | 'defense' | 'utility'
  rarity TEXT NOT NULL,          -- 'common' | 'rare' | 'epic' | 'legendary'

  -- Effect config
  effect_type TEXT NOT NULL,     -- 'elimination_immunity' | 'drawdown_buffer' | 'drawdown_reset' | 'target_leverage_reduction'
  effect_value DECIMAL NOT NULL, -- Magnitude (e.g., 10 for +10% buffer, 0.5 for -50% leverage)
  effect_duration_seconds INT NOT NULL DEFAULT 0, -- 0 = instant/permanent for round

  -- Restrictions
  min_round INT NOT NULL DEFAULT 1,
  requires_target BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = must specify a target participant

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE abilities IS 'Catalog of all ability types. Seeded at migration time.';
COMMENT ON COLUMN abilities.effect_value IS 'For drawdown_buffer: percentage points added. For leverage_reduction: multiplier (0.5 = halved). For immunity: ignored.';
COMMENT ON COLUMN abilities.requires_target IS 'TRUE for attack abilities like Sabotage that target another trader.';

-- ============================================================
-- TABLE: participant_abilities
-- Which abilities each trader owns + usage state
-- ============================================================
CREATE TABLE participant_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  ability_id TEXT NOT NULL REFERENCES abilities(id),

  -- Lifecycle
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_in_round INT NOT NULL,
  awarded_for TEXT NOT NULL,      -- 'highest_pnl' | 'lowest_drawdown' | 'most_trades'
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ DEFAULT NULL,

  -- Targeted abilities
  target_participant_id UUID REFERENCES arena_participants(id) DEFAULT NULL,

  UNIQUE(participant_id, ability_id, acquired_in_round)
);

COMMENT ON TABLE participant_abilities IS 'Tracks ability ownership. One row per (participant, ability, round). is_used flips when activated.';
COMMENT ON COLUMN participant_abilities.awarded_for IS 'Which achievement triggered this award: highest_pnl, lowest_drawdown, most_trades';

CREATE INDEX idx_pa_arena ON participant_abilities(arena_id);
CREATE INDEX idx_pa_participant ON participant_abilities(participant_id);
CREATE INDEX idx_pa_unused ON participant_abilities(participant_id, is_used) WHERE is_used = false;

-- ============================================================
-- TABLE: active_ability_effects
-- Currently active timed effects (used by engine for enforcement)
-- ============================================================
CREATE TABLE active_ability_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  target_participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,

  -- What's active
  ability_id TEXT NOT NULL REFERENCES abilities(id),
  applied_by_participant_id UUID REFERENCES arena_participants(id),
  effect_type TEXT NOT NULL,
  effect_value DECIMAL NOT NULL,

  -- Timing
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE active_ability_effects IS 'Timed effects currently in force. Engine reads this at order submission (sabotage) and round end (shield).';
COMMENT ON COLUMN active_ability_effects.expires_at IS 'Effect expires at this timestamp. Engine ignores rows where expires_at < NOW().';

CREATE INDEX idx_aae_arena ON active_ability_effects(arena_id);
CREATE INDEX idx_aae_target ON active_ability_effects(target_participant_id);
CREATE INDEX idx_aae_active ON active_ability_effects(arena_id, is_active, expires_at) WHERE is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_ability_effects ENABLE ROW LEVEL SECURITY;

-- Public reads — spectators can see who has what abilities and active effects
CREATE POLICY "Anyone can view abilities" ON abilities FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant abilities" ON participant_abilities FOR SELECT USING (true);
CREATE POLICY "Anyone can view active ability effects" ON active_ability_effects FOR SELECT USING (true);

-- Service role writes bypass RLS automatically (no INSERT policy needed)

-- ============================================================
-- SEED: Ability catalog (4 implemented abilities)
-- ============================================================
INSERT INTO abilities (id, name, description, icon, category, rarity, effect_type, effect_value, effect_duration_seconds, min_round, requires_target) VALUES

-- DEFENSE
('shield',      'Shield',      'Immune from elimination for 60 seconds — drawdown breach cannot remove you.', '🛡️', 'defense', 'rare',      'elimination_immunity',        1,    60,  1, false),
('fortress',    'Fortress',    '+10% drawdown buffer for the rest of this round.', '🏰', 'defense', 'rare',      'drawdown_buffer',            10,     0,  1, false),
('second_wind', 'Second Wind', 'Reset your drawdown to 0%. Your equity baseline is recalculated right now.', '🌊', 'defense', 'epic',      'drawdown_reset',              1,     0,  2, false),

-- ATTACK
('sabotage',    'Sabotage',    'Force a trader to trade at 50% of their current max leverage for 60 seconds.', '⚔️', 'attack',  'rare',      'target_leverage_reduction',   0.5,  60,  1, true);

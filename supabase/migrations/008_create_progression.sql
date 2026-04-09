-- 008_create_progression.sql
-- Progression Tree (M-5): survivors choose a path bonus after each round.

-- Catalog of unlock nodes
CREATE TABLE unlock_nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'aggressive' | 'defensive' | 'scout'
  round_available INT NOT NULL,  -- end of which round triggers this choice (1 = after round 1)
  effect_type TEXT NOT NULL,     -- 'leverage_bonus' | 'drawdown_buffer' | 'position_scout'
  effect_value DECIMAL NOT NULL, -- magnitude
  requires_node_id TEXT REFERENCES unlock_nodes(id) DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-participant choices
CREATE TABLE participant_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  node_id TEXT REFERENCES unlock_nodes(id) DEFAULT NULL, -- NULL = pending choice
  round_number INT NOT NULL,  -- which round end triggered this award
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'chosen' | 'timeout'
  chosen_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(participant_id, round_number)
);

CREATE INDEX idx_pu_arena ON participant_unlocks(arena_id);
CREATE INDEX idx_pu_participant ON participant_unlocks(participant_id);
CREATE INDEX idx_pu_pending ON participant_unlocks(arena_id, status) WHERE status = 'pending';
CREATE INDEX idx_pu_chosen ON participant_unlocks(participant_id, status) WHERE status = 'chosen';

-- RLS
ALTER TABLE unlock_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unlock nodes" ON unlock_nodes FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant unlocks" ON participant_unlocks FOR SELECT USING (true);

-- Seed: 9 nodes (3 rounds × 3 paths)
-- Round 1 → 2 choices
INSERT INTO unlock_nodes (id, name, description, icon, category, round_available, effect_type, effect_value, requires_node_id, display_order) VALUES
('r1_aggressive', 'Aggressive I',   '+5x leverage on top of the round cap. Press your edge hard.',        '⚔️',  'aggressive', 1, 'leverage_bonus',  5,  NULL,            1),
('r1_defensive',  'Defensive I',    '+5% drawdown buffer. More breathing room before elimination.',        '🛡️',  'defensive',  1, 'drawdown_buffer', 5,  NULL,            2),
('r1_scout',      'Scout I',        'Reveal the top 3 traders'' positions in the activity feed.',          '🔍',  'scout',      1, 'position_scout',  3,  NULL,            3),

-- Round 2 → 3 choices (require round 1 path)
('r2_aggressive', 'Aggressive II',  '+10x leverage bonus total. High risk, high reward late game.',        '⚔️⚔️', 'aggressive', 2, 'leverage_bonus',  10, 'r1_aggressive', 4),
('r2_defensive',  'Defensive II',   '+10% drawdown buffer total. Survive where others can''t.',           '🛡️🛡️', 'defensive',  2, 'drawdown_buffer', 10, 'r1_defensive',  5),
('r2_scout',      'Scout II',       'Reveal the top 5 traders'' positions — see the whole leaderboard.',  '🔍🔍', 'scout',      2, 'position_scout',  5,  'r1_scout',      6),

-- Round 3 → Sudden Death choices (require round 2 path)
('r3_aggressive', 'Aggressive III', '+15x leverage bonus total. Maximum aggression in Sudden Death.',     '⚔️⚔️⚔️', 'aggressive', 3, 'leverage_bonus',  15, 'r2_aggressive', 7),
('r3_defensive',  'Defensive III',  '+15% drawdown buffer total. Nearly untouchable before elimination.', '🛡️🛡️🛡️', 'defensive',  3, 'drawdown_buffer', 15, 'r2_defensive',  8),
('r3_scout',      'Scout III',      'Reveal ALL active traders'' positions instantly.',                    '🔍🔍🔍', 'scout',      3, 'position_scout',  99, 'r2_scout',      9);

-- ============================================================
-- PACIFICA COLOSSEUM — Complete Migration Script
-- Run this ONE file in Supabase SQL Editor (new project)
-- ============================================================

-- ============================================================
-- 001_create_tables.sql — Core tables
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    privy_user_id TEXT UNIQUE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES users(id),
    total_arenas_entered INTEGER DEFAULT 0,
    total_arenas_won INTEGER DEFAULT 0,
    total_rounds_survived INTEGER DEFAULT 0,
    total_eliminations INTEGER DEFAULT 0,
    best_pnl_percent DECIMAL(10,4) DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'registration',
    preset TEXT NOT NULL DEFAULT 'sprint',
    starting_capital DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
    min_participants INTEGER NOT NULL DEFAULT 4,
    max_participants INTEGER NOT NULL DEFAULT 100,
    is_invite_only BOOLEAN DEFAULT FALSE,
    invite_code TEXT,
    registration_deadline TIMESTAMPTZ NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    current_round INTEGER DEFAULT 0,
    current_round_ends_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    round_1_duration INTEGER NOT NULL,
    round_2_duration INTEGER NOT NULL,
    round_3_duration INTEGER NOT NULL,
    sudden_death_duration INTEGER NOT NULL,
    master_wallet_address TEXT,
    master_private_key_encrypted TEXT,
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE arena_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    subaccount_address TEXT,
    subaccount_private_key_encrypted TEXT,
    status TEXT NOT NULL DEFAULT 'registered',
    eliminated_at TIMESTAMPTZ,
    eliminated_in_round INTEGER,
    elimination_reason TEXT,
    elimination_equity DECIMAL(12,4),
    equity_round_1_start DECIMAL(12,4),
    equity_round_1_end DECIMAL(12,4),
    equity_round_2_start DECIMAL(12,4),
    equity_round_2_end DECIMAL(12,4),
    equity_round_3_start DECIMAL(12,4),
    equity_round_3_end DECIMAL(12,4),
    equity_sudden_death_start DECIMAL(12,4),
    equity_final DECIMAL(12,4),
    has_wide_zone BOOLEAN DEFAULT FALSE,
    has_second_life BOOLEAN DEFAULT FALSE,
    second_life_used BOOLEAN DEFAULT FALSE,
    trades_this_round INTEGER DEFAULT 0,
    volume_this_round DECIMAL(16,4) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(12,4) DEFAULT 0,
    total_pnl_percent DECIMAL(10,4) DEFAULT 0,
    max_drawdown_hit DECIMAL(10,4) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(arena_id, user_id)
);

CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    actual_ended_at TIMESTAMPTZ,
    name TEXT NOT NULL,
    max_leverage INTEGER NOT NULL,
    margin_mode TEXT NOT NULL,
    max_drawdown_percent DECIMAL(5,2) NOT NULL,
    elimination_percent DECIMAL(5,2) NOT NULL,
    allowed_pairs TEXT[] NOT NULL,
    wide_zone_winner_id UUID REFERENCES users(id),
    second_life_winner_id UUID REFERENCES users(id),
    traders_at_start INTEGER,
    traders_at_end INTEGER,
    traders_eliminated INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    UNIQUE(arena_id, round_number)
);

CREATE TABLE equity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    equity DECIMAL(12,4) NOT NULL,
    balance DECIMAL(12,4) NOT NULL,
    unrealized_pnl DECIMAL(12,4) NOT NULL,
    drawdown_percent DECIMAL(10,4) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    order_type TEXT NOT NULL,
    size DECIMAL(16,8) NOT NULL,
    price DECIMAL(16,4) NOT NULL,
    leverage DECIMAL(5,1),
    realized_pnl DECIMAL(12,4),
    fee DECIMAL(12,4),
    pacifica_order_id TEXT,
    pacifica_trade_id TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eliminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    equity_at_elimination DECIMAL(12,4) NOT NULL,
    drawdown_at_elimination DECIMAL(10,4),
    rank_at_elimination INTEGER,
    total_traders_at_elimination INTEGER,
    positions_snapshot JSONB,
    eliminated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE spectator_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    voter_id UUID NOT NULL REFERENCES users(id),
    voted_for_id UUID NOT NULL REFERENCES arena_participants(id),
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(arena_id, round_number, voter_id)
);

CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    rarity TEXT NOT NULL
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id TEXT NOT NULL REFERENCES badges(id),
    arena_id UUID REFERENCES arenas(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id, arena_id)
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES users(id),
    target_id UUID REFERENCES users(id),
    data JSONB NOT NULL DEFAULT '{}',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 002_create_indexes.sql — Performance indexes
-- ============================================================
CREATE INDEX idx_equity_snapshots_participant_round ON equity_snapshots(participant_id, round_number, recorded_at DESC);
CREATE INDEX idx_trades_arena_round ON trades(arena_id, round_number, executed_at DESC);
CREATE INDEX idx_events_arena ON events(arena_id, created_at DESC);
CREATE INDEX idx_participants_arena_status ON arena_participants(arena_id, status);
CREATE INDEX idx_participants_arena_equity ON arena_participants(arena_id, status, equity_final DESC);
CREATE INDEX idx_arenas_status ON arenas(status);
CREATE INDEX idx_arenas_status_created ON arenas(status, created_at DESC);
CREATE INDEX idx_eliminations_arena_round ON eliminations(arena_id, round_number);
CREATE INDEX idx_votes_arena_round_target ON spectator_votes(arena_id, round_number, voted_for_id);

-- ============================================================
-- 003_create_policies.sql — Row Level Security
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE eliminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectator_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_public_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_own_update" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_service_insert" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "arenas_public_read" ON arenas FOR SELECT USING (true);
CREATE POLICY "arenas_service_insert" ON arenas FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "arenas_service_update" ON arenas FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "participants_public_read" ON arena_participants FOR SELECT USING (true);
CREATE POLICY "participants_service_insert" ON arena_participants FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "participants_service_update" ON arena_participants FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "rounds_public_read" ON rounds FOR SELECT USING (true);
CREATE POLICY "rounds_service_insert" ON rounds FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rounds_service_update" ON rounds FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "snapshots_public_read" ON equity_snapshots FOR SELECT USING (true);
CREATE POLICY "snapshots_service_insert" ON equity_snapshots FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "trades_public_read" ON trades FOR SELECT USING (true);
CREATE POLICY "trades_service_insert" ON trades FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "eliminations_public_read" ON eliminations FOR SELECT USING (true);
CREATE POLICY "eliminations_service_insert" ON eliminations FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "votes_public_read" ON spectator_votes FOR SELECT USING (true);
CREATE POLICY "votes_authenticated_insert" ON spectator_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);
CREATE POLICY "badges_service_insert" ON badges FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "user_badges_public_read" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_service_insert" ON user_badges FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "events_public_read" ON events FOR SELECT USING (true);
CREATE POLICY "events_service_insert" ON events FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 004_seed_badges.sql — Badge definitions
-- ============================================================
INSERT INTO badges (id, name, description, rarity) VALUES
    ('champion',    'Champion',           'Won an arena',                                      'legendary'),
    ('gladiator',   'Gladiator',          'Finished 2nd in an arena',                          'epic'),
    ('warrior',     'Warrior',            'Finished 3rd in an arena',                          'epic'),
    ('survivor',    'Survivor',           'Survived all rounds',                               'rare'),
    ('almost',      'Almost!',            'Last trader eliminated before finals',               'rare'),
    ('strategist',  'Strategist',         'Highest Sharpe Ratio in an arena',                  'epic'),
    ('fan_favorite','Fan Favorite',       'Most Second Life votes in an arena',                'rare'),
    ('first_blood', 'First Blood',        'First elimination in an arena',                     'common'),
    ('iron_will',   'Iron Will',          'Used Second Life and still survived the round',     'epic'),
    ('streak_3',    'Hot Streak',         'Won 3 arenas in a row',                             'legendary'),
    ('veteran_10',  'Veteran',            'Entered 10 arenas',                                 'common'),
    ('veteran_50',  'Gladiator Veteran',  'Entered 50 arenas',                                 'rare'),
    ('zero_dd',     'Untouchable',        'Won a round with 0% drawdown',                      'legendary');

-- ============================================================
-- 005_create_territories.sql — Territory system
-- ============================================================
CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    col_index INT NOT NULL,
    cell_label TEXT NOT NULL,
    pnl_bonus_percent DECIMAL DEFAULT 0,
    drawdown_buffer_percent DECIMAL DEFAULT 0,
    leverage_override INT DEFAULT NULL,
    max_position_size DECIMAL DEFAULT NULL,
    is_elimination_zone BOOLEAN DEFAULT FALSE,
    elimination_priority INT DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(arena_id, row_index, col_index),
    UNIQUE(arena_id, cell_label)
);

CREATE TABLE participant_territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    acquired_via TEXT NOT NULL DEFAULT 'draft',
    is_active BOOLEAN DEFAULT TRUE,
    pnl_at_acquisition DECIMAL DEFAULT 0,
    pnl_at_release DECIMAL DEFAULT NULL,
    round_acquired INT NOT NULL,
    skirmishes_won INT DEFAULT 0,
    skirmishes_lost INT DEFAULT 0
);

CREATE TABLE territory_skirmishes (
    id BIGSERIAL PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    attacker_id UUID NOT NULL REFERENCES arena_participants(id),
    defender_id UUID NOT NULL REFERENCES arena_participants(id),
    territory_id UUID NOT NULL REFERENCES territories(id),
    attacker_pnl_percent DECIMAL NOT NULL,
    defender_pnl_percent DECIMAL NOT NULL,
    pnl_difference DECIMAL NOT NULL,
    skirmish_won_by TEXT NOT NULL,
    required_pnl_lead DECIMAL NOT NULL,
    met_threshold BOOLEAN NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_territories_arena ON territories(arena_id);
CREATE INDEX idx_territories_row ON territories(arena_id, row_index);
CREATE INDEX idx_pt_arena ON participant_territories(arena_id);
CREATE INDEX idx_pt_participant ON participant_territories(participant_id);
CREATE INDEX idx_pt_territory ON participant_territories(territory_id);
CREATE UNIQUE INDEX idx_pt_one_active_per_round ON participant_territories(arena_id, participant_id, round_acquired) WHERE is_active = true;
CREATE INDEX idx_pt_active ON participant_territories(arena_id, is_active) WHERE is_active = true;
CREATE INDEX idx_skirmishes_arena_round ON territory_skirmishes(arena_id, round_number);

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_skirmishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view territories" ON territories FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant territories" ON participant_territories FOR SELECT USING (true);
CREATE POLICY "Anyone can view territory skirmishes" ON territory_skirmishes FOR SELECT USING (true);

-- ============================================================
-- 006_create_abilities.sql — Ability system
-- ============================================================
CREATE TABLE abilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    rarity TEXT NOT NULL,
    effect_type TEXT NOT NULL,
    effect_value DECIMAL NOT NULL,
    effect_duration_seconds INT NOT NULL DEFAULT 0,
    min_round INT NOT NULL DEFAULT 1,
    requires_target BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participant_abilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    ability_id TEXT NOT NULL REFERENCES abilities(id),
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    acquired_in_round INT NOT NULL,
    awarded_for TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ DEFAULT NULL,
    target_participant_id UUID REFERENCES arena_participants(id) DEFAULT NULL,
    UNIQUE(participant_id, ability_id, acquired_in_round)
);

CREATE TABLE active_ability_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    target_participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    ability_id TEXT NOT NULL REFERENCES abilities(id),
    applied_by_participant_id UUID REFERENCES arena_participants(id),
    effect_type TEXT NOT NULL,
    effect_value DECIMAL NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_pa_arena ON participant_abilities(arena_id);
CREATE INDEX idx_pa_participant ON participant_abilities(participant_id);
CREATE INDEX idx_pa_unused ON participant_abilities(participant_id, is_used) WHERE is_used = false;
CREATE INDEX idx_aae_arena ON active_ability_effects(arena_id);
CREATE INDEX idx_aae_target ON active_ability_effects(target_participant_id);
CREATE INDEX idx_aae_active ON active_ability_effects(arena_id, is_active, expires_at) WHERE is_active = true;

ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_ability_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view abilities" ON abilities FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant abilities" ON participant_abilities FOR SELECT USING (true);
CREATE POLICY "Anyone can view active ability effects" ON active_ability_effects FOR SELECT USING (true);

INSERT INTO abilities (id, name, description, icon, category, rarity, effect_type, effect_value, effect_duration_seconds, min_round, requires_target) VALUES
('shield',      'Shield',      'Immune from elimination for 60 seconds — drawdown breach cannot remove you.', '🛡️', 'defense', 'rare',      'elimination_immunity',        1,    60,  1, false),
('fortress',    'Fortress',    '+10% drawdown buffer for the rest of this round.', '🏰', 'defense', 'rare',      'drawdown_buffer',            10,     0,  1, false),
('second_wind', 'Second Wind', 'Reset your drawdown to 0%. Your equity baseline is recalculated right now.', '🌊', 'defense', 'epic',      'drawdown_reset',              1,     0,  2, false),
('sabotage',    'Sabotage',    'Force a trader to trade at 50% of their current max leverage for 60 seconds.', '⚔️', 'attack',  'rare',      'target_leverage_reduction',   0.5,  60,  1, true);

-- ============================================================
-- 007_create_hazards.sql — Hazard events
-- ============================================================
CREATE TABLE hazard_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    warning_seconds INT NOT NULL DEFAULT 10,
    duration_seconds INT NOT NULL DEFAULT 0,
    effect_config JSONB NOT NULL,
    min_round INT NOT NULL DEFAULT 1,
    max_occurrences_per_round INT NOT NULL DEFAULT 1,
    weight INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE active_hazard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    hazard_id TEXT NOT NULL REFERENCES hazard_events(id),
    warned_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'warning',
    effect_state JSONB DEFAULT NULL
);

CREATE INDEX idx_ahz_arena ON active_hazard_events(arena_id);
CREATE INDEX idx_ahz_arena_round ON active_hazard_events(arena_id, round_number);
CREATE INDEX idx_ahz_active ON active_hazard_events(arena_id, status) WHERE status IN ('warning', 'active');

ALTER TABLE hazard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_hazard_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hazard catalog" ON hazard_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view active hazards" ON active_hazard_events FOR SELECT USING (true);

INSERT INTO hazard_events (id, name, description, icon, category, severity, warning_seconds, duration_seconds, effect_config, min_round, max_occurrences_per_round, weight) VALUES
('flash_crash',    'Flash Crash',     'BTC drops 10% over 30 seconds. Short positions benefit, longs suffer.', '📉', 'market', 'severe',   10, 30, '{"type": "price_shock", "symbol": "BTC", "direction": "down", "magnitude": 0.10}',  1, 1, 5),
('high_volatility','High Volatility', 'All price swings 2× normal for 60 seconds. High risk, high reward.',       '🌊', 'market', 'moderate', 10, 60, '{"type": "volatility_multiplier", "multiplier": 2.0}',                           1, 2, 8),
('leverage_cap',   'Leverage Emergency', 'Max leverage capped at 3× for the remainder of this round.',         '🚫', 'rule',   'severe',   15,  0, '{"type": "leverage_override", "max_leverage": 3}',                                  1, 1, 4),
('drawdown_tighten','Risk-Off',      'Max drawdown reduced by 5% for the remainder of this round.',            '⚠️', 'rule',   'severe',   10,  0, '{"type": "drawdown_reduction", "reduction_percent": 5}',                              1, 1, 4),
('no_shorting',    'Short Ban',       'Short (ask) orders are disabled for 60 seconds.',                        '🚷', 'rule',   'moderate', 10, 60, '{"type": "side_restriction", "disabled_side": "ask"}',                                   1, 1, 5),
('safe_haven',     'Safe Haven',      '+5% drawdown buffer granted to ALL traders for 90 seconds.',              '🏠', 'opportunity', 'minor',  5, 90, '{"type": "drawdown_buffer", "buffer_percent": 5}',                                     1, 2, 8),
('insider_info',   'Insider Info',    'A random trader''s full positions are revealed to everyone for 60 sec.','🔎', 'opportunity', 'minor',  0, 60, '{"type": "position_reveal", "target": "random"}',                                     1, 1, 6);

-- ============================================================
-- 008_create_progression.sql — Progression tree
-- ============================================================
CREATE TABLE unlock_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    round_available INT NOT NULL,
    effect_type TEXT NOT NULL,
    effect_value DECIMAL NOT NULL,
    requires_node_id TEXT REFERENCES unlock_nodes(id) DEFAULT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participant_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    node_id TEXT REFERENCES unlock_nodes(id) DEFAULT NULL,
    round_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    chosen_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(participant_id, round_number)
);

CREATE INDEX idx_pu_arena ON participant_unlocks(arena_id);
CREATE INDEX idx_pu_participant ON participant_unlocks(participant_id);
CREATE INDEX idx_pu_pending ON participant_unlocks(arena_id, status) WHERE status = 'pending';
CREATE INDEX idx_pu_chosen ON participant_unlocks(participant_id, status) WHERE status = 'chosen';

ALTER TABLE unlock_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unlock nodes" ON unlock_nodes FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant unlocks" ON participant_unlocks FOR SELECT USING (true);

INSERT INTO unlock_nodes (id, name, description, icon, category, round_available, effect_type, effect_value, requires_node_id, display_order) VALUES
('r1_aggressive', 'Aggressive I',   '+5x leverage on top of the round cap.',        '⚔️',  'aggressive', 1, 'leverage_bonus',  5,  NULL,            1),
('r1_defensive',  'Defensive I',  '+5% drawdown buffer.',                          '🛡️',  'defensive',  1, 'drawdown_buffer', 5,  NULL,            2),
('r1_scout',      'Scout I',        'Reveal top 3 traders'' positions.',               '🔍',  'scout',      1, 'position_scout',  3,  NULL,            3),
('r2_aggressive', 'Aggressive II', '+10x leverage bonus total.',                     '⚔️⚔️', 'aggressive', 2, 'leverage_bonus',  10, 'r1_aggressive', 4),
('r2_defensive',  'Defensive II',  '+10% drawdown buffer total.',                    '🛡️🛡️', 'defensive',  2, 'drawdown_buffer', 10, 'r1_defensive',  5),
('r2_scout',      'Scout II',       'Reveal top 5 traders'' positions.',              '🔍🔍', 'scout',      2, 'position_scout',  5,  'r1_scout',      6),
('r3_aggressive', 'Aggressive III','+15x leverage bonus total.',                     '⚔️⚔️⚔️', 'aggressive', 3, 'leverage_bonus',  15, 'r2_aggressive', 7),
('r3_defensive',  'Defensive III', '+15% drawdown buffer total.',                    '🛡️🛡️🛡️', 'defensive',  3, 'drawdown_buffer', 15, 'r2_defensive',  8),
('r3_scout',      'Scout III',      'Reveal ALL active traders'' positions.',          '🔍🔍🔍', 'scout',      3, 'position_scout',  99, 'r2_scout',      9);

-- ============================================================
-- 009_create_alliances.sql — Alliance system
-- ============================================================
CREATE TABLE alliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','betraying','dissolved')),
    proposer_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    betrayal_started_at TIMESTAMPTZ,
    betrayal_deadline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alliance_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    betrayal_vote TEXT CHECK (betrayal_vote IN ('stay','betray') OR betrayal_vote IS NULL),
    voted_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_id, round_number)
);

CREATE INDEX idx_alliances_arena ON alliances(arena_id);
CREATE INDEX idx_alliances_status ON alliances(status);
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX idx_alliance_members_participant ON alliance_members(participant_id);

-- ============================================================
-- DONE
-- ============================================================
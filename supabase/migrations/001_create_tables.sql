-- 001_create_tables.sql
-- Pacifica Colosseum — All core tables

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    privy_user_id TEXT UNIQUE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES users(id),

    -- Stats (denormalized for quick reads)
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

-- ============================================================
-- 2. ARENAS
-- ============================================================
CREATE TABLE arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),

    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'registration',

    -- Configuration
    preset TEXT NOT NULL DEFAULT 'sprint',
    starting_capital DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
    min_participants INTEGER NOT NULL DEFAULT 4,
    max_participants INTEGER NOT NULL DEFAULT 100,
    is_invite_only BOOLEAN DEFAULT FALSE,
    invite_code TEXT,

    -- Timing
    registration_deadline TIMESTAMPTZ NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    current_round INTEGER DEFAULT 0,
    current_round_ends_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Round durations (in seconds)
    round_1_duration INTEGER NOT NULL,
    round_2_duration INTEGER NOT NULL,
    round_3_duration INTEGER NOT NULL,
    sudden_death_duration INTEGER NOT NULL,

    -- Pacifica integration
    master_wallet_address TEXT,
    master_private_key_encrypted TEXT,

    -- Results
    winner_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ARENA_PARTICIPANTS
-- ============================================================
CREATE TABLE arena_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    -- Pacifica subaccount
    subaccount_address TEXT,
    subaccount_private_key_encrypted TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'registered',

    -- Elimination details
    eliminated_at TIMESTAMPTZ,
    eliminated_in_round INTEGER,
    elimination_reason TEXT,
    elimination_equity DECIMAL(12,4),

    -- Per-round equity snapshots
    equity_round_1_start DECIMAL(12,4),
    equity_round_1_end DECIMAL(12,4),
    equity_round_2_start DECIMAL(12,4),
    equity_round_2_end DECIMAL(12,4),
    equity_round_3_start DECIMAL(12,4),
    equity_round_3_end DECIMAL(12,4),
    equity_sudden_death_start DECIMAL(12,4),
    equity_final DECIMAL(12,4),

    -- Active loots (simplified: 2 loots for MVP)
    has_wide_zone BOOLEAN DEFAULT FALSE,
    has_second_life BOOLEAN DEFAULT FALSE,
    second_life_used BOOLEAN DEFAULT FALSE,

    -- Per-round activity tracking (anti-AFK)
    trades_this_round INTEGER DEFAULT 0,
    volume_this_round DECIMAL(16,4) DEFAULT 0,

    -- Overall stats for this arena
    total_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(12,4) DEFAULT 0,
    total_pnl_percent DECIMAL(10,4) DEFAULT 0,
    max_drawdown_hit DECIMAL(10,4) DEFAULT 0,

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(arena_id, user_id)
);

-- ============================================================
-- 4. ROUNDS
-- ============================================================
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    actual_ended_at TIMESTAMPTZ,

    -- Parameters
    name TEXT NOT NULL,
    max_leverage INTEGER NOT NULL,
    margin_mode TEXT NOT NULL,
    max_drawdown_percent DECIMAL(5,2) NOT NULL,
    elimination_percent DECIMAL(5,2) NOT NULL,
    allowed_pairs TEXT[] NOT NULL,

    -- Loot recipients (simplified: 2 loots for MVP)
    wide_zone_winner_id UUID REFERENCES users(id),
    second_life_winner_id UUID REFERENCES users(id),

    -- Stats
    traders_at_start INTEGER,
    traders_at_end INTEGER,
    traders_eliminated INTEGER,

    status TEXT NOT NULL DEFAULT 'pending',

    UNIQUE(arena_id, round_number)
);

-- ============================================================
-- 5. EQUITY_SNAPSHOTS
-- ============================================================
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

-- ============================================================
-- 6. TRADES
-- ============================================================
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

-- ============================================================
-- 7. ELIMINATIONS
-- ============================================================
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

-- ============================================================
-- 8. SPECTATOR_VOTES
-- ============================================================
CREATE TABLE spectator_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    voter_id UUID NOT NULL REFERENCES users(id),
    voted_for_id UUID NOT NULL REFERENCES arena_participants(id),

    voted_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(arena_id, round_number, voter_id)
);

-- ============================================================
-- 9. BADGES
-- ============================================================
CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    rarity TEXT NOT NULL
);

-- ============================================================
-- 10. USER_BADGES
-- ============================================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id TEXT NOT NULL REFERENCES badges(id),
    arena_id UUID REFERENCES arenas(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, badge_id, arena_id)
);

-- ============================================================
-- 11. EVENTS
-- ============================================================
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

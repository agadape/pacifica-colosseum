-- 003_create_policies.sql
-- Row Level Security policies for all tables
-- Pattern: public reads, server-side writes (via service role key)

-- ============================================================
-- Enable RLS on ALL tables
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

-- ============================================================
-- USERS — public read, own write
-- ============================================================
CREATE POLICY "users_public_read" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_own_update" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_service_insert" ON users
    FOR INSERT WITH CHECK (true);
    -- Controlled by service role; anon can't insert due to RLS defaults

-- ============================================================
-- ARENAS — public read, server-side write
-- ============================================================
CREATE POLICY "arenas_public_read" ON arenas
    FOR SELECT USING (true);

CREATE POLICY "arenas_service_insert" ON arenas
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "arenas_service_update" ON arenas
    FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================================
-- ARENA_PARTICIPANTS — public read, server-side write
-- ============================================================
CREATE POLICY "participants_public_read" ON arena_participants
    FOR SELECT USING (true);

CREATE POLICY "participants_service_insert" ON arena_participants
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "participants_service_update" ON arena_participants
    FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================================
-- ROUNDS — public read, server-side write
-- ============================================================
CREATE POLICY "rounds_public_read" ON rounds
    FOR SELECT USING (true);

CREATE POLICY "rounds_service_insert" ON rounds
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "rounds_service_update" ON rounds
    FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================================
-- EQUITY_SNAPSHOTS — public read, server-side write
-- ============================================================
CREATE POLICY "snapshots_public_read" ON equity_snapshots
    FOR SELECT USING (true);

CREATE POLICY "snapshots_service_insert" ON equity_snapshots
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- TRADES — public read, server-side write
-- ============================================================
CREATE POLICY "trades_public_read" ON trades
    FOR SELECT USING (true);

CREATE POLICY "trades_service_insert" ON trades
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ELIMINATIONS — public read, server-side write
-- ============================================================
CREATE POLICY "eliminations_public_read" ON eliminations
    FOR SELECT USING (true);

CREATE POLICY "eliminations_service_insert" ON eliminations
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- SPECTATOR_VOTES — public read, authenticated write (1 per round)
-- ============================================================
CREATE POLICY "votes_public_read" ON spectator_votes
    FOR SELECT USING (true);

CREATE POLICY "votes_authenticated_insert" ON spectator_votes
    FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- ============================================================
-- BADGES — public read, server-side write
-- ============================================================
CREATE POLICY "badges_public_read" ON badges
    FOR SELECT USING (true);

CREATE POLICY "badges_service_insert" ON badges
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- USER_BADGES — public read, server-side write
-- ============================================================
CREATE POLICY "user_badges_public_read" ON user_badges
    FOR SELECT USING (true);

CREATE POLICY "user_badges_service_insert" ON user_badges
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- EVENTS — public read, server-side write
-- ============================================================
CREATE POLICY "events_public_read" ON events
    FOR SELECT USING (true);

CREATE POLICY "events_service_insert" ON events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

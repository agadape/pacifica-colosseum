-- 002_create_indexes.sql
-- Performance indexes for hot query paths

-- Equity snapshots: fetched per participant per round, ordered by time
CREATE INDEX idx_equity_snapshots_participant_round
    ON equity_snapshots(participant_id, round_number, recorded_at DESC);

-- Trades: fetched per arena per round, ordered by time
CREATE INDEX idx_trades_arena_round
    ON trades(arena_id, round_number, executed_at DESC);

-- Events: activity feed per arena, ordered by time
CREATE INDEX idx_events_arena
    ON events(arena_id, created_at DESC);

-- Arena participants: lookup by arena + status (for active traders)
CREATE INDEX idx_participants_arena_status
    ON arena_participants(arena_id, status);

-- Arenas: filter by status (for listing active/registration arenas)
CREATE INDEX idx_arenas_status
    ON arenas(status);

-- Eliminations: lookup by arena + round
CREATE INDEX idx_eliminations_arena_round
    ON eliminations(arena_id, round_number);

-- Spectator votes: count votes per participant per round
CREATE INDEX idx_votes_arena_round_target
    ON spectator_votes(arena_id, round_number, voted_for_id);

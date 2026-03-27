# Layer 1: Database — Iteration Summary

**Date**: 2026-03-27
**Status**: 9/9 tasks completed

---

## Files Created

### Migrations (`supabase/migrations/`)
| File | Purpose |
|------|---------|
| `001_create_tables.sql` | All 11 tables: users, arenas, arena_participants, rounds, equity_snapshots, trades, eliminations, spectator_votes, badges, user_badges, events |
| `002_create_indexes.sql` | 7 performance indexes for hot query paths (snapshots, trades, events, participants, arenas, eliminations, votes) |
| `003_create_policies.sql` | RLS enabled on all 11 tables. Public reads everywhere. Server-side writes via service_role. Authenticated insert on spectator_votes. Own-row update on users. |
| `004_seed_badges.sql` | 13 badge definitions: 3 legendary, 4 epic, 4 rare, 2 common |

### Supabase Clients (`src/lib/supabase/`)
| File | Purpose |
|------|---------|
| `client.ts` | Browser-side Supabase client using `@supabase/ssr` `createBrowserClient` with anon key |
| `server.ts` | Server-side client using `createClient` with service role key (for all writes) |
| `types.ts` | Full TypeScript Database interface with Row/Insert/Update types for all 11 tables |

---

## Files Modified

| File | Change |
|------|--------|
| `DEVELOPMENT_LAYERS.md` | Marked tasks 1.2–1.5, 1.7, 1.8 as `[x]`. Updated progress table (6/9). Updated resuming notes. |
| `CLAUDE.md` | Added "Session Setup" section (reload-plugins rule) and "Iteration Summaries (MANDATORY)" rule |

---

## Packages Installed

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | latest | Core Supabase client library |
| `@supabase/ssr` | latest | Server-side rendering helpers (createBrowserClient) |

---

## Database Schema Details

### Tables Created (11 total)

| Table | Primary Key | Key Relationships | Purpose |
|-------|------------|-------------------|---------|
| `users` | UUID | self-ref (referred_by) | Player profiles, wallet, stats |
| `arenas` | UUID | FK to users (creator, winner) | Competition instances |
| `arena_participants` | UUID | FK to arenas + users, UNIQUE(arena_id, user_id) | Player enrollment per arena |
| `rounds` | UUID | FK to arenas, UNIQUE(arena_id, round_number) | Round config & parameters |
| `equity_snapshots` | BIGSERIAL | FK to arenas + participants | Periodic equity records |
| `trades` | UUID | FK to arenas + participants | Trade execution log |
| `eliminations` | UUID | FK to arenas + participants | Elimination records + position snapshots |
| `spectator_votes` | UUID | FK to arenas + users + participants, UNIQUE(arena, round, voter) | Second Life voting |
| `badges` | TEXT | none | Badge definitions (13 total) |
| `user_badges` | UUID | FK to users + badges + arenas, UNIQUE(user, badge, arena) | Earned badges |
| `events` | BIGSERIAL | FK to arenas + users (actor, target) | Activity feed |

### Indexes Created (7 total)

| Index | Table | Columns | Why |
|-------|-------|---------|-----|
| `idx_equity_snapshots_participant_round` | equity_snapshots | (participant_id, round_number, recorded_at DESC) | Fetch trader equity history |
| `idx_trades_arena_round` | trades | (arena_id, round_number, executed_at DESC) | Trade feed per arena/round |
| `idx_events_arena` | events | (arena_id, created_at DESC) | Activity feed queries |
| `idx_participants_arena_status` | arena_participants | (arena_id, status) | List active traders in arena |
| `idx_arenas_status` | arenas | (status) | Filter arenas by status |
| `idx_eliminations_arena_round` | eliminations | (arena_id, round_number) | Elimination history |
| `idx_votes_arena_round_target` | spectator_votes | (arena_id, round_number, voted_for_id) | Count votes per trader |

### RLS Policy Pattern

- **All tables**: RLS enabled
- **Read**: Public (`USING (true)`) on every table — all data is public in a competition
- **Write**: `service_role` only — the engine/backend handles all mutations via service role key
- **Exceptions**:
  - `users`: authenticated users can update their own row (`auth.uid() = id`)
  - `spectator_votes`: authenticated users can insert votes (`auth.uid() = voter_id`)

### Badge Seed Data (13 badges)

| ID | Name | Rarity | Condition |
|----|------|--------|-----------|
| champion | Champion | legendary | Won an arena |
| gladiator | Gladiator | epic | Finished 2nd |
| warrior | Warrior | epic | Finished 3rd |
| survivor | Survivor | rare | Survived all rounds |
| almost | Almost! | rare | Last eliminated before finals |
| strategist | Strategist | epic | Highest Sharpe Ratio |
| fan_favorite | Fan Favorite | rare | Most Second Life votes |
| first_blood | First Blood | common | First elimination |
| iron_will | Iron Will | epic | Used Second Life & survived |
| streak_3 | Hot Streak | legendary | Won 3 arenas in a row |
| veteran_10 | Veteran | common | Entered 10 arenas |
| veteran_50 | Gladiator Veteran | rare | Entered 50 arenas |
| zero_dd | Untouchable | legendary | Won a round with 0% drawdown |

---

## Key Decisions

1. **Manual TypeScript types instead of generated** — No live Supabase project yet, so types were written by hand matching the SQL schema exactly. Row/Insert/Update variants for each table. Will be replaced by `supabase gen types` once the project is live.
2. **4 extra indexes beyond blueprint** — Added `idx_participants_arena_status`, `idx_arenas_status`, `idx_eliminations_arena_round`, `idx_votes_arena_round_target` because these are obvious hot query paths.
3. **@supabase/ssr for browser client** — Using the SSR-aware client creation rather than raw `createClient`, which handles cookie-based auth better in Next.js App Router.
4. **Server client uses service role directly** — No cookie-based auth for server writes. The engine and API routes use the service role key for all mutations.

---

## How to Verify

```bash
# TypeScript compiles clean
npx tsc --noEmit
# → no output = no errors

# Migration files exist
ls supabase/migrations/
# → 001_create_tables.sql, 002_create_indexes.sql, 003_create_policies.sql, 004_seed_badges.sql

# Client files exist and import correctly
cat src/lib/supabase/client.ts
cat src/lib/supabase/server.ts
cat src/lib/supabase/types.ts
```

---

## Previously Blocked (Now Complete)

| Task | Resolution |
|------|-----------|
| **1.1** Create Supabase project | Created at `oawbnqlngiiabofdseen.supabase.co` |
| **1.6** Run migrations | All 4 SQL files executed via Supabase SQL Editor |
| **1.9** Verify connection | Verification script confirmed: 11 tables accessible, 13 badges present |

### Verification Script

Created `scripts/verify-db.ts` — connects with service role key, queries all 11 tables, confirms 13 badges. Output:
```
Badges found: 13 (expected: 13)
  OK — all 13 badges present
Table check: all 11 tables OK
```

### Additional Package Installed
| Package | Purpose |
|---------|---------|
| `dotenv` (devDependency) | Load .env.local for verification script |

---

## What's Next

Proceed to **Layer 2 (Pacifica TypeScript SDK)** — wrap Python SDK patterns into TypeScript client.

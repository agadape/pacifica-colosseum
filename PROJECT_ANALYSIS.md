# Pacifica Colosseum — Comprehensive Project Analysis

**Project:** Battle Royale Trading Competition Platform
**Live:** [pacifica-colosseum.vercel.app](https://pacifica-colosseum.vercel.app)
**Built for:** Pacifica Hackathon 2026 (deadline: April 16, 2026)
**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, Framer Motion, Zustand, TanStack React Query v5, Privy, Supabase, Pacifica Exchange (REST + WebSocket), Express 5, TradingView Lightweight Charts, Three.js

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Complete File Inventory](#complete-file-inventory)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Engine Internal API](#engine-internal-api)
6. [WebSocket Channels](#websocket-channels)
7. [Color Scheme & Visual Design](#color-scheme--visual-design)
8. [Every Page Flow](#every-page-flow)
9. [Every Component](#every-component)
10. [Custom Hooks](#custom-hooks)
11. [State Management (Zustand Stores)](#state-management-zustand-stores)
12. [Game Mechanics](#game-mechanics)
13. [Round Progression](#round-progression)
14. [Elimination Logic](#elimination-logic)
15. [Loot System](#loot-system)
16. [Trading Mechanics](#trading-mechanics)
17. [Spectator Features](#spectator-features)
18. [Timer Mechanics](#timer-mechanics)
19. [Auth Flow](#auth-flow)
20. [Real-Time Data Flow](#real-time-data-flow)
21. [Demo Mode](#demo-mode)
22. [Bot Traders](#bot-traders)
23. [Tests](#tests)
24. [Configuration Files](#configuration-files)
25. [Deployment](#deployment)
26. [Security Considerations](#security-considerations)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PACIFICA COLOSSEUM                              │
├──────────────────────┬──────────────────────────┬───────────────────────┤
│   Next.js Frontend   │   Game Engine (Express)   │   Pacifica Exchange   │
│   (Vercel)           │   (Railway)              │   (External)          │
│                      │                          │                       │
│  Pages (App Router)  │  ┌──────────────────┐    │  REST API (Ed25519)  │
│  ├── /               │  │ Risk Monitor     │◄───│  WebSocket (WS)     │
│  ├── /arenas         │  │ - Price tick     │    │                       │
│  ├── /arenas/[id]    │  │ - Drawdown check │    │  ┌────────────────┐  │
│  ├── /arenas/[id]/   │  │ - Elimination    │    │  │ Subaccounts    │  │
│  │   trade           │  │                  │    │  │ Orders         │  │
│  ├── /arenas/[id]/   │  ├──────────────────┤    │  │ Positions      │  │
│  │   spectate        │  │ Round Engine     │    │  │ Price Feed     │  │
│  ├── /leaderboard    │  │ - Round timers   │    │  └────────────────┘  │
│  ├── /profile        │  │ - Grace periods  │                           │
│  └── /api/*          │  │ - Loot awards    │    ┌─────────────────────┐ │
│                      │  │                  │    │ Supabase (Postgres) │ │
│  Auth: Privy         │  ├──────────────────┤    │                     │ │
│  State: Zustand      │  │ Arena Manager    │    │  11 Tables          │ │
│  Data: React Query   │  │ - Start/Cancel   │    │  Row-Level Security │ │
│  Realtime: Supabase  │  │ - Fund subs      │    │  Realtime channels  │ │
│  WS: Pacifica        │  │                  │    └─────────────────────┘ │
│                      │  ├──────────────────┤                           │
│  UI: Tailwind v4     │  │ Order Relay      │                           │
│  Motion: Framer      │  │ - Validate       │                           │
│  Charts: TV/Lightwt  │  │ - Execute        │                           │
│  3D: Three.js/Drei   │  │ - Record         │                           │
│                      │  │                  │                           │
│  Components: 30+     │  ├──────────────────┤                           │
│  Hooks: 7            │  │ Settlement       │                           │
│  Stores: 3           │  │ - Close positions│                           │
│                      │  │ - Award badges   │                           │
│                      │  │                  │                           │
│                      │  ├──────────────────┤    ┌─────────────────────┐ │
│                      │  │ Leaderboard      │    │ External Services   │ │
│                      │  │ Updates (3s)     │    │                     │ │
│                      │  │                  │    │ Elfa AI (sentiment) │ │
│                      │  ├──────────────────┤    │ Fuul (anti-sybil)   │ │
│                      │  │ Periodic Sync    │    │ DiceBear (avatars)  │ │
│                      │  │ (30s REST)       │    └─────────────────────┘ │
│                      │  │                  │                           │
│                      │  ├──────────────────┤                           │
│                      │  │ Mock/Demo Mode   │                           │
│                      │  │ - Price generator│                           │
│                      │  │ - Bot traders (6)│                           │
│                      │  │ - Mock Pacifica  │                           │
│                      │  │ - Auto-restart   │                           │
│                      │  └──────────────────┘                           │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### Three-Tier Architecture

1. **Frontend (Next.js on Vercel)** — All UI pages, API routes, and client-side logic
2. **Game Engine (Express on Railway)** — Real-time risk monitoring, round management, eliminations, trading execution
3. **Data Layer (Supabase)** — PostgreSQL database with RLS, Realtime subscriptions, and service role writes

The engine connects to Pacifica's testnet exchange via REST API (Ed25519-signed requests) and WebSocket (real-time mark prices).

---

## Complete File Inventory

### Frontend — Next.js App (`src/`)

#### App Pages (`src/app/`)

| File | Purpose |
|------|---------|
| `layout.tsx` | Root layout with Inter/Sora/JetBrains Mono fonts, Providers, Navbar, BackgroundEffects |
| `page.tsx` | Landing page — hero section with 3D sword model, "How it works" steps, rounds display, stats, CTA |
| `providers.tsx` | Wraps PrivyProvider + QueryClientProvider |
| `globals.css` | Tailwind theme with custom colors (indigo/purple/gold palette), font variables |
| `arenas/page.tsx` | Arena listing with status filters, pagination, ArenaCard grid |
| `arenas/create/page.tsx` | Create arena form — name, description, preset selection, start time |
| `arenas/[arenaId]/page.tsx` | Arena detail — participants, round info, join/leave buttons, round indicator |
| `arenas/[arenaId]/trade/page.tsx` | Trader view — chart, order form, positions, orders, account panel, elimination/winner overlays |
| `arenas/[arenaId]/spectate/page.tsx` | Spectator view — survivor grid, equity race chart, activity feed, vote panel, avatar row |
| `leaderboard/page.tsx` | Global leaderboard — top 50 by wins, medals, win rate, streak |
| `profile/[address]/page.tsx` | User profile — stats, username edit, referral link, badges placeholder |

#### API Routes (`src/app/api/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/arenas` | GET | List arenas (with filters: status, preset, pagination) |
| `/api/arenas` | POST | Create arena (auth required, generates vault keypair, notifies engine) |
| `/api/arenas/[id]` | GET | Arena detail with participants + rounds |
| `/api/arenas/[id]/join` | POST | Join arena (auth, sybil check, generates subaccount keypair) |
| `/api/arenas/[id]/leave` | DELETE | Leave arena (registration phase only) |
| `/api/arenas/[id]/trade` | POST | Execute trade (proxied to engine) |
| `/api/arenas/[id]/positions` | GET | Get user's positions (proxied to engine) |
| `/api/arenas/[id]/orders` | GET | Get user's trade history from DB |
| `/api/arenas/[id]/events` | GET | Activity feed events |
| `/api/arenas/[id]/snapshots` | GET | Equity snapshots for charts |
| `/api/arenas/[id]/vote` | GET | Vote tally + user vote status |
| `/api/arenas/[id]/vote` | POST | Cast Second Life vote |
| `/api/leaderboard` | GET | Global leaderboard (top 50) |
| `/api/users/me` | GET | Current user profile |
| `/api/users/me` | PATCH | Update username/avatar |
| `/api/markets/sentiment/[symbol]` | GET | Elfa AI social sentiment |
| `/api/markets/commentary/[id]` | GET | AI market commentary |
| `/api/demo/reset` | POST/GET | Zombie arena reset |
| `/api/demo/reset-open-arena` | POST | Open arena reset via engine |

#### Components (`src/components/`)

##### Arena Components

| Component | Purpose |
|-----------|---------|
| `ArenaCard.tsx` | Arena listing card — preset badge, status indicator, participant progress bar, prize pool estimate, live indicator |
| `RoundIndicator.tsx` | Current round info — name, number, leverage, drawdown, allowed pairs, countdown timer |
| `RoundTransition.tsx` | Full-screen overlay — announces new round with 3-2-1 countdown, spring animations |

##### Shared Components

| Component | Purpose |
|-----------|---------|
| `Navbar.tsx` | Fixed top nav — logo, Arenas/Leaderboard links, ConnectButton, scroll-aware transparency |
| `ConnectButton.tsx` | Privy auth button — shows connect/login when unauthenticated, username + disconnect when authenticated |
| `PrivyWrapper.tsx` | PrivyProvider wrapper with dark theme, Solana embedded wallet |
| `BackgroundEffects.tsx` | Global background — 3 floating gradient orbs, canvas particle system, noise grain overlay |
| `ArenaBackground.tsx` | Arena-specific bg — spotlights, grid floor, ripple rings, corner accents, noise texture |
| `HeroModel.tsx` | 3D sword model (Three.js + R3F) — floating, rotating, neon Excalibur GLB |
| `TrophyModel.tsx` | 3D trophy model (Three.js + R3F) — floating, rotating, golden lighting |
| `Timer.tsx` | Countdown display — adapts format (days/hours, HH:MM:SS, MM:SS), urgent pulsing under 60s |
| `StatusBadge.tsx` | Drawdown status indicator — SAFE/CAUTION/DANGER/CRITICAL/ELIMINATED with color coding |
| `DrawdownMeter.tsx` | Visual progress bar — shows drawdown % vs max, color transitions (green → yellow → orange → red pulse) |
| `ConnectionStatus.tsx` | WS reconnection banner — slides in when disconnected from price feed |
| `Skeleton.tsx` | Loading skeletons — Card, Line, Block variants |
| `EmptyState.tsx` | Empty content state — title, message, optional CTA |
| `ErrorState.tsx` | Error state with retry button |
| `PageTransition.tsx` | Page-level fade-in animation |

##### Trading Components

| Component | Purpose |
|-----------|---------|
| `Chart.tsx` | TradingView Lightweight Chart — line chart with live WS price updates, responsive, responsive resize |
| `OrderForm.tsx` | Order entry — market/limit tabs, long/short buttons, size input, quick presets, leverage slider, reduce-only checkbox |
| `PositionList.tsx` | Open positions table — symbol, side, size, entry, mark, uPnL, close button, close all |
| `OrderList.tsx` | Trade history table — symbol, side, size, type, time |
| `AccountPanel.tsx` | Account summary — equity, balance, unrealized PnL, drawdown meter, active loot badges |

##### Spectator Components

| Component | Purpose |
|-----------|---------|
| `SurvivorGrid.tsx` | Responsive grid of TraderCards — sorted by PnL%, shows active count |
| `TraderCard.tsx` | Individual trader card — rank badge, avatar, PnL%, sparkline, drawdown meter, loot badges, winner crown |
| `AvatarRow.tsx` | Horizontal avatar row — sorted by status then PnL, ring colors by danger level, grayscale eliminated, crown for winner, click for popup |
| `TraderPopup.tsx` | Click-to-reveal popup — avatar, name, status, PnL, drawdown bar, trades count |
| `EquityRaceChart.tsx` | SVG multi-line equity race chart — one line per trader, death zone fill, warning line, dynamic elimination cutline, endpoint pulse animations, frozen state for missing data |
| `ActivityFeed.tsx` | Scrollable event feed — type-coded icons and colors, relative timestamps |
| `EliminationBanner.tsx` | Full-screen elimination toast — red banner, trader address, reason, equity, auto-dismiss |
| `VotePanel.tsx` | Second Life voting UI — candidate list with vote bars, tally display, open/closed states |
| `MarketContext.tsx` | AI commentary + sentiment scores — Elfa AI integration, bullish/neutral/bearish labels |

#### Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `use-arena.ts` | React Query hooks: useArenas, useArena, useCreateArena, useJoinArena, useLeaveArena, useCurrentUser, useUpdateUsername |
| `use-arena-realtime.ts` | Supabase Realtime subscriptions for arena data (status, participants, events, snapshots, votes) |
| `use-countdown.ts` | Timer countdown logic — returns days/hours/minutes/seconds/isExpired/formatted |
| `use-leaderboard.ts` | React Query hooks: useLeaderboard, useArenaEvents, useVoteStatus, useEquitySnapshots |
| `use-positions.ts` | React Query hooks: usePositions, useOpenOrders (auth-required, 15s refetch) |
| `use-trading.ts` | React Query mutations: useSubmitOrder, useCancelOrder |
| `use-websocket.ts` | Pacifica WebSocket connection — subscribes to prices, stores in WS store, exponential backoff reconnect |

#### Stores (`src/stores/`)

| Store | State |
|-------|-------|
| `arena-store.ts` | Arena filters (status, preset, page) |
| `trading-store.ts` | Order form state (type, side, size, price, leverage, reduceOnly) |
| `ws-store.ts` | WebSocket connection state (connected boolean, prices Map) |

#### Library (`src/lib/`)

| Path | Purpose |
|------|---------|
| `pacifica/client.ts` | Pacifica REST API client — market/limit orders, TWAP, TPSL, subaccounts, leverage, transfers |
| `pacifica/auth.ts` | Ed25519 signing — sortKeys, compact JSON, signMessage, buildSignedRequest |
| `pacifica/websocket.ts` | Pacifica WS client — subscribe prices/orderbook/TWAP, send authenticated orders, auto-reconnect with ping |
| `pacifica/types.ts` | All Pacifica types — requests, responses, positions, orders, WS messages |
| `supabase/client.ts` | Browser Supabase client (anon key) |
| `supabase/server.ts` | Server Supabase client (service role key) + public client |
| `supabase/realtime.ts` | Realtime channel subscription helpers |
| `supabase/types.ts` | Full TypeScript types for all 11 tables (Insert, Row, Update, Relationships) |
| `auth/middleware.ts` | Privy JWT verification, unauthorized() helper |
| `auth/register.ts` | findOrCreateUser — creates user on first login, generates referral code |
| `privy/config.ts` | Privy config — email/Google/Twitter/wallet login, dark theme, Solana embedded wallet |
| `utils/constants.ts` | Protocol constants: MIN/MAX participants, starting capital, round params, presets, timing calculator |
| `utils/encryption.ts` | AES-256-GCM encrypt/decrypt for private key storage |
| `utils/keypair.ts` | Ed25519 keypair generation, base58 encoding/decoding (tweetnacl + bs58) |
| `utils/columns.ts` | Safe column lists for API responses (excludes encrypted fields) |
| `elfa/client.ts` | Elfa AI sentiment + commentary API (stubbed when no API key) |
| `fuul/client.ts` | Fuul anti-sybil + referral API (stubbed when no API key) |

### Game Engine (`engine/src/`)

#### Services

| Service | Purpose |
|---------|---------|
| `arena-manager.ts` | startArena() — verifies participants, creates subaccounts on Pacifica, funds each, updates status, starts monitoring |
| `risk-monitor.ts` | initArena() — builds in-memory state, listens to price updates, calculates equity/drawdown, handles breaches, updates on trade |
| `round-engine.ts` | advanceRound() — inactivity check → ranking elimination → loot → check end → grace period → begin next round |
| `elimination-engine.ts` | eliminateTrader() — close positions, return funds, update DB; processRankingElimination() — bottom X% by PnL; processInactivityElimination() — AFK check |
| `grace-period.ts` | startGracePeriod() — pauses drawdown monitoring, only reduce/close orders allowed, snapshots equity as new baseline |
| `loot-calculator.ts` | calculateLoot() — Wide Zone to lowest drawdown, Second Life to highest PnL, handles same-winner conflict |
| `order-relay.ts` | executeOrder() — validate → execute (mock or real Pacifica) → record trade → update counters → notify risk monitor |
| `order-validator.ts` | validateOrder() — checks arena status, participant status, grace period, allowed symbols, leverage limits |
| `periodic-sync.ts` | startPeriodicSync() — every 30s reconciles with Pacifica REST, writes equity snapshots |
| `leaderboard-updater.ts` | startLeaderboardUpdater() — every 3s writes PnL/drawdown to DB, triggers Supabase Realtime |
| `leverage-monitor.ts` | checkLeverageCompliance() — checks effective leverage during sync, 3 violations = elimination |
| `settlement.ts` | endArena() — close all positions, return funds, determine winner, award badges, cleanup |

#### State

| File | Purpose |
|------|---------|
| `state/types.ts` | In-memory types: PositionState, TraderState, ArenaState, DrawdownLevel + calcEquity, calcDrawdownPercent, calcUnrealizedPnl, getDrawdownLevel |
| `state/price-manager.ts` | Singleton PriceManager — connects to Pacifica WS, maintains Map<symbol, price>, emits "price" events |

#### Timers

| File | Purpose |
|------|---------|
| `timers/arena-timer.ts` | scheduleArenaStart() — setTimeout based on starts_at; initArenaTimers() — schedules all pending arenas on startup |
| `timers/round-timer.ts` | scheduleRoundEnd() — setTimeout based on round ends_at; cancelRoundTimer() |

#### Mock/Demo

| File | Purpose |
|------|---------|
| `mock/demo-setup.ts` | setupDemoArena() — creates Blitz arena with 6 bots; setupTraderDemoArena() — creates Open Arena with 4 bots + 2 user slots |
| `mock/bot-traders.ts` | 6 bot personalities (Conservative Carl, Aggressive Alice, Scalper Sam, YOLO Yuki, Steady Steve, Degen Dave) with different trade intervals, sizes, long bias |
| `mock/mock-pacifica.ts` | In-memory Pacifica mock — accounts, positions, orders, transfers, price tracking |
| `mock/price-generator.ts` | MockPriceGenerator — random walk with configurable volatility, emits every second for BTC/ETH/SOL |

#### Entry Point

| File | Purpose |
|------|---------|
| `index.ts` | Express + WS server setup, health endpoint, internal auth middleware, debug endpoints, trade/positions/account endpoints, arena scheduling endpoint, startup logic |
| `config.ts` | DEMO_MODE flag, ENGINE_PORT |
| `db.ts` | Supabase singleton (prevents connection pool exhaustion) |
| `health.ts` | /health endpoint — status, service name, uptime, timestamp |

### Database (`supabase/migrations/`)

| File | Purpose |
|------|---------|
| `001_create_tables.sql` | 11 tables: users, arenas, arena_participants, rounds, equity_snapshots, trades, eliminations, spectator_votes, badges, user_badges, events |
| `002_create_indexes.sql` | 7 performance indexes on hot query paths |
| `003_create_policies.sql` | Row Level Security policies — public reads, server-side writes, authenticated vote inserts |
| `004_seed_badges.sql` | 13 badge definitions: champion, gladiator, warrior, survivor, almost, strategist, fan_favorite, first_blood, iron_will, streak_3, veteran_10, veteran_50, zero_dd |

### Tests (`tests/engine/`)

| File | Tests |
|------|-------|
| `encryption.test.ts` | Encryption round-trip, keypair operations, signing (9 tests) |
| `loot-calculator.test.ts` | Wide Zone effect, Second Life effect, loot winner selection (8 tests) |
| `order-validator.test.ts` | Round params, presets, timing calculations (17 tests) |
| `risk-monitor.test.ts` | PnL calculations, equity, drawdown levels (19 tests) |

### Config Files

| File | Purpose |
|------|---------|
| `package.json` | Next.js 15, dependencies, scripts (dev, build, engine:dev) |
| `next.config.ts` | Suppress Farcaster peer dep warning |
| `tsconfig.json` | Strict, ES2017 target, @/ path alias |
| `vitest.config.ts` | Vitest with path alias |
| `railway.toml` | Engine deployment — Nixpacks build, start command, healthcheck |
| `vercel.json` | Empty (uses defaults) |
| `.env.example` | Environment variable template |
| `.gitignore` | Standard Next.js + Node.js ignores |
| `eslint.config.mjs` | ESLint config |
| `postcss.config.mjs` | PostCSS with Tailwind v4 |

---

## Database Schema

### Tables Overview

```
users ──────────────────────┐
  ├── arenas (creator_id)   │
  ├── arena_participants    │
  ├── spectator_votes       │
  ├── eliminations          │
  └── user_badges           │
                            │
arenas ─────────────────────┤
  ├── arena_participants    │
  ├── rounds                │
  ├── equity_snapshots      │
  ├── trades                │
  ├── eliminations          │
  ├── spectator_votes       │
  └── events                │
                            │
arena_participants ─────────┤
  ├── equity_snapshots      │
  ├── trades                │
  ├── eliminations          │
  └── spectator_votes       │
                            │
rounds ─────────────────────┤
                            │
badges ─────────────────────┤
  └── user_badges           │
                            │
events ─────────────────────┘
```

### Table Details

#### `users`
- `id` (UUID, PK)
- `wallet_address` (TEXT, unique, not null)
- `privy_user_id` (TEXT, unique)
- `username` (TEXT, unique)
- `avatar_url` (TEXT)
- `referral_code` (TEXT, unique, not null)
- `referred_by` (UUID, self-reference)
- `total_arenas_entered` (INT, default 0)
- `total_arenas_won` (INT, default 0)
- `total_rounds_survived` (INT, default 0)
- `total_eliminations` (INT, default 0)
- `best_pnl_percent` (DECIMAL, default 0)
- `win_streak` / `current_win_streak` (INT)
- `created_at` / `updated_at` (TIMESTAMPTZ)

#### `arenas`
- `id` (UUID, PK)
- `creator_id` (UUID, FK -> users)
- `name` (TEXT, not null)
- `description` (TEXT)
- `status` (TEXT, default 'registration') — values: registration, starting, round_1, round_2, round_3, sudden_death, round_1_elimination, round_2_elimination, round_3_elimination, settling, completed, cancelled
- `preset` (TEXT, default 'sprint') — blitz, sprint, daily, weekly
- `starting_capital` (DECIMAL, default 1000)
- `min_participants` (INT, default 4)
- `max_participants` (INT, default 100)
- `is_invite_only` (BOOLEAN)
- `registration_deadline` / `starts_at` (TIMESTAMPTZ)
- `current_round` (INT, default 0)
- `current_round_ends_at` (TIMESTAMPTZ)
- `ended_at` (TIMESTAMPTZ)
- Round durations in seconds (4 fields)
- `master_wallet_address` / `master_private_key_encrypted` (TEXT)
- `winner_id` (UUID, FK -> users)

#### `arena_participants`
- `id` (UUID, PK)
- `arena_id`, `user_id` (FK, unique composite)
- `subaccount_address` / `subaccount_private_key_encrypted` (TEXT)
- `status` (TEXT, default 'registered') — registered, active, eliminated, survived, winner
- Elimination fields (at, round, reason, equity)
- Per-round equity (8 fields: round_1_start/end, round_2_start/end, round_3_start/end, sudden_death_start, final)
- Loot flags: `has_wide_zone`, `has_second_life`, `second_life_used`
- Activity: `trades_this_round`, `volume_this_round`, `total_trades`, `total_pnl`, `total_pnl_percent`, `max_drawdown_hit`

#### `rounds`
- `id` (UUID, PK), `arena_id` (FK), `round_number` (unique composite)
- `starts_at` / `ends_at` / `actual_ended_at` (TIMESTAMPTZ)
- `name`, `max_leverage`, `margin_mode`, `max_drawdown_percent`, `elimination_percent`
- `allowed_pairs` (TEXT[])
- `wide_zone_winner_id` / `second_life_winner_id` (UUID)
- `traders_at_start` / `traders_at_end` / `traders_eliminated`
- `status` (TEXT, default 'pending')

#### `equity_snapshots`
- `id` (BIGSERIAL, PK)
- `arena_id`, `participant_id`, `round_number` (FKs)
- `equity`, `balance`, `unrealized_pnl`, `drawdown_percent` (DECIMAL)
- `recorded_at` (TIMESTAMPTZ)

#### `trades`
- `id` (UUID, PK)
- `arena_id`, `participant_id`, `round_number` (FKs)
- `symbol`, `side`, `order_type`, `size`, `price`, `leverage`, `realized_pnl`, `fee`
- `pacifica_order_id`, `pacifica_trade_id`
- `executed_at` (TIMESTAMPTZ)

#### `eliminations`
- `id` (UUID, PK)
- `arena_id`, `participant_id`, `round_number` (FKs)
- `reason`, `equity_at_elimination`, `drawdown_at_elimination`
- `rank_at_elimination`, `total_traders_at_elimination`
- `positions_snapshot` (JSONB)
- `eliminated_at` (TIMESTAMPTZ)

#### `spectator_votes`
- `id` (UUID, PK)
- `arena_id`, `round_number`, `voter_id`, `voted_for_id` (all FKs)
- `voted_at` (TIMESTAMPTZ)
- Unique: (arena_id, round_number, voter_id)

#### `badges`
- `id` (TEXT, PK)
- `name`, `description`, `icon_url`, `rarity`

#### `user_badges`
- `id` (UUID, PK)
- `user_id`, `badge_id`, `arena_id` (FKs)
- `earned_at` (TIMESTAMPTZ)
- Unique: (user_id, badge_id, arena_id)

#### `events`
- `id` (BIGSERIAL, PK)
- `arena_id`, `round_number`
- `event_type` — values: arena_start, arena_end, round_start, round_end, elimination, trade_opened, trade_closed, loot_awarded, second_life_used, leverage_warning, vote_cast
- `actor_id`, `target_id` (UUID)
- `data` (JSONB), `message` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## API Endpoints

### Next.js API Routes

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/arenas` | None (public) | List arenas with filters (status, preset, pagination). Hides completed by default. |
| `POST /api/arenas` | Privy JWT | Create arena. Validates input, generates vault keypair, encrypts private key, inserts arena + rounds, notifies engine. |
| `GET /api/arenas/[id]` | None | Arena detail with participants (joined with users) and rounds. |
| `POST /api/arenas/[id]/join` | Privy JWT | Join arena. Checks registration status, deadline, capacity, sybil (Fuul), generates encrypted subaccount keypair. |
| `DELETE /api/arenas/[id]/leave` | Privy JWT | Leave arena (registration phase only). Deletes participant record. |
| `POST /api/arenas/[id]/trade` | Privy JWT | Execute trade. Validates via Zod schema, proxies to engine `/internal/trade`. |
| `GET /api/arenas/[id]/positions` | Privy JWT | Get user's positions from engine `/internal/positions`. |
| `GET /api/arenas/[id]/orders` | Privy JWT | Get user's trade history from Supabase trades table. |
| `GET /api/arenas/[id]/events` | None | Activity feed events, most recent first, max 100. |
| `GET /api/arenas/[id]/snapshots` | None | Equity snapshots for Equity Race Chart, max 600, ordered by time. |
| `GET /api/arenas/[id]/vote` | Optional | Vote tally (public) + user vote status (if authenticated). |
| `POST /api/arenas/[id]/vote` | Privy JWT | Cast Second Life vote. Validates round number, checks for duplicate, inserts vote + event. |
| `GET /api/leaderboard` | None | Global top 50 traders, ordered by wins DESC then best PnL DESC. |
| `GET /api/users/me` | Privy JWT | Current user profile + stats. |
| `PATCH /api/users/me` | Privy JWT | Update username (3-20 chars, alphanumeric + underscore) or avatar_url. |
| `GET /api/markets/sentiment/[symbol]` | None | Elfa AI social sentiment score. |
| `GET /api/markets/commentary/[id]` | None | AI market commentary for arena context. |
| `POST /api/demo/reset` | None | Force-complete zombie demo arenas. |
| `GET /api/demo/reset` | None | Check if zombie arenas exist. |
| `POST /api/demo/reset-open-arena` | None | Reset open arena via engine debug endpoint. |

---

## Engine Internal API

All internal endpoints require `x-internal-key` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check — status, service name, uptime, timestamp |
| `/internal/trade` | POST | Execute trade — validates, executes (mock or real), records in DB |
| `/internal/cancel-order` | POST | Cancel order on Pacifica |
| `/internal/positions` | POST | Get positions for a participant |
| `/internal/account-info` | POST | Get account info for a participant |
| `/internal/arenas/:id/schedule` | POST | Schedule arena start timer |
| `/debug/demo/restart` | POST | Restart demo arena (DEMO_MODE only) |
| `/debug/demo/restart-trader` | POST | Restart open arena (DEMO_MODE only) |

---

## WebSocket Channels

### Pacifica WebSocket (`wss://test-ws.pacifica.fi/ws`)

| Channel | Auth | Description |
|---------|------|-------------|
| `prices` | None | Real-time mark prices for all symbols. Format: `{ channel: "prices", data: [{ symbol, mark, oracle, timestamp }] }` |
| `orderbook` | None | Order book data for a specific symbol |
| `account_twap_orders` | Auth | TWAP order status updates |

### Authenticated WS Actions

| Action | Description |
|--------|-------------|
| `create_market_order` | Market order via WS |
| `create_order` | Limit order via WS |
| `cancel_order` | Cancel single order |
| `cancel_all_orders` | Cancel all open orders |

### Supabase Realtime Channels (used by `use-arena-realtime.ts`)

| Channel | Table | Filter | Purpose |
|---------|-------|--------|---------|
| `arena-{id}` | arenas | arena_id = id | Arena status changes |
| `participants-{id}` | arena_participants | arena_id = id | PnL, status, elimination updates |
| `events-{id}` | events | arena_id = id | New events (trades, eliminations, loots) |
| `snapshots-{id}` | equity_snapshots | arena_id = id | Equity snapshots for charts |
| `votes-{id}` | spectator_votes | arena_id = id | Vote updates |

---

## Color Scheme & Visual Design

### Design Language

The application uses a **dual-theme approach**:
- **Landing page**: Dark mode (`#0a0a1a` background, white text, indigo/purple accents)
- **App pages**: Light mode (`#FAFAF8` background, `#1A1A2E` text, indigo `#6366f1` accent)

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#FAFAF8` | Light page backgrounds |
| `--color-bg-secondary` | `#F3F0FF` | Light purple tint |
| `--color-bg-tertiary` | `#E8E4F0` | Skeleton loaders, subtle fills |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-accent-primary` | `#6366f1` | Primary indigo — buttons, links, active states |
| `--color-accent-hover` | `#4f46e5` | Hover state for primary |
| `--color-accent-gold` | `#f59e0b` | Winner highlights, loot badges, Second Life |
| `--color-danger` | `#ef4444` | Eliminations, losses, short positions |
| `--color-success` | `#22c55e` | Gains, long positions, safe status |
| `--color-warning` | `#eab308` | Caution status, drawdown warnings |
| `--color-text-primary` | `#1A1A2E` | Primary text |
| `--color-text-secondary` | `#6B7280` | Secondary text |
| `--color-text-tertiary` | `#9CA3AF` | Muted text |

### Typography

| Font | Source | Usage |
|------|--------|-------|
| **Inter** | `--font-inter` | Body text, UI elements |
| **Sora** | `--font-display` | Headings, titles (weights: 400, 600, 700, 800) |
| **JetBrains Mono** | `--font-mono` | Numbers, addresses, prices, code |

### Animations & Visual Effects

#### Framer Motion (extensively used)

- **Page transitions**: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}` on every page
- **Staggered lists**: `staggerChildren: 0.06-0.08` for arena cards, leaderboard rows
- **Hover effects**: `whileHover={{ scale: 1.02-1.05 }}`, `whileTap={{ scale: 0.97-0.98 }}`
- **Spring physics**: `type: "spring", stiffness: 300-500, damping: 25-30` for interactive elements
- **Pulse animations**: `animate={{ opacity: [1, 0.4, 1] }}` for live indicators
- **Slide-in overlays**: Elimination banner, round transition, connection status

#### 3D Models (Three.js / React Three Fiber)

- **Hero sword model**: Neon Excalibur GLB, floating (`floatIntensity: 0.5`), slow Y-axis rotation, ambient + point lights (indigo, purple, pink)
- **Trophy model**: Trophy GLB, floating, golden + purple lighting, used in CTA section

#### Canvas Particles

- **Particle system**: Density-based (1 particle per 25,000px), small dots (0.5-2px), low opacity (0.03-0.15), random drift, indigo color

#### Gradient Orbs

- 3 floating orbs (indigo top-right, purple bottom-left, gold center-right), large blurred circles (400-600px), slow drift animation (20-30s cycles)

#### Background Effects

- **Noise grain**: SVG feTurbulence-based grain overlay at 3% opacity
- **Spotlight beams**: Conic gradients in arena backgrounds
- **Ripple rings**: Expanding circular borders from center, staggered delays
- **Grid floor**: Perspective grid with radial mask in arena backgrounds

---

## Every Page Flow

### 1. Landing Page (`/`)

**Purpose:** Marketing/hero page to attract users to the platform.

**Sections (top to bottom):**
1. **Hero section** — Full-screen with 3D sword model, animated gradient title ("Survive. Adapt. Trade."), ripple rings, scroll hint indicator
2. **How it works** — 3-step cards (Join, Trade, Win) with images, hover lift effect, color-coded accents
3. **Trust signals** — "Powered by Pacifica Exchange" badge, asset tags (BTC/ETH/SOL), Testnet indicator
4. **Rounds display** — 4 round cards with colored left borders, leverage/drawdown/cut stats
5. **Stats glass card** — Animated counters (Max Traders: 100, Starting Capital: $1,000, Rounds: 4, Survival Rate: 12%)
6. **CTA section** — "Ready to compete?" with 3D trophy, ripple rings, Enter the Arena button
7. **Footer** — Logo + navigation links

**Data flow:** Static content, no API calls.

### 2. Arenas Listing (`/arenas`)

**Purpose:** Browse all active arenas.

**Flow:**
1. Header with "Compete" label + "Create Arena" button
2. Status filter pills (All, Open, Active, Completed) — stored in Zustand arena-store
3. Grid of ArenaCard components (responsive: 1/2/3 columns)
4. Skeleton loading → EmptyState → ArenaCard grid based on data state

**Data flow:** `useArenas()` fetches `/api/arenas` with filters → React Query caches with 30s refetch.

### 3. Create Arena (`/arenas/create`)

**Purpose:** Create a new battle royale arena.

**Flow:**
1. Arena name input (3-50 chars)
2. Description input (optional, max 200)
3. Preset selection — 4 cards: Blitz (5 min), Sprint (2 hours), Daily (24 hours), Weekly (7 days)
4. Start time selector (5 min to 24 hours from now)
5. Submit → creates arena via `useCreateArena()` → redirects to arena detail page

**Data flow:** POST `/api/arenas` with Privy JWT → validates → generates keypair → creates arena + rounds → notifies engine.

### 4. Arena Detail (`/arenas/[arenaId]`)

**Purpose:** View arena info, join/leave, see participants.

**Flow:**
1. Arena name, preset, status header
2. Action buttons: "Watch Live" (spectate), "Trade" (if participant)
3. Round indicator (if active) — shows current round name, leverage, drawdown, pairs, countdown
4. Registration phase: participant count, countdown timer, Join/Leave button
5. Zombie banner (if start time passed but engine didn't start) — Reset button
6. Participants list — rank, name, PnL%, status

**Data flow:** `useArena()` fetches arena detail with participants + rounds, `useCurrentUser()` checks if user is participant.

### 5. Trade Page (`/arenas/[arenaId]/trade`)

**Purpose:** Active trading interface for arena participants.

**Layout (4-column grid):**
```
┌─────────────────────────────────────┬──────────┐
│ Chart (3 cols)                      │ OrderForm│
│ - TradingView lightweight chart     │          │
│ - Live price from WS                │ Drawdown │
│                                     │ Warning  │
│                                     │          │
├─────────────────────────────────────┤ Account  │
│ Position List  │  Order List         │          │
│ (1 col each)   │                     │Standings │
└─────────────────────────────────────┴──────────┘
```

**Special features:**
- **Elimination overlay**: Full-screen skull + "Eliminated" message, redirects to spectate
- **Winner overlay**: Full-screen trophy + "You Win!" message
- **Round end toast**: "Round X complete — Round Y begins"
- **Sudden Death banner**: Pulsing red warning
- **Symbol selector**: Tabs for allowed pairs
- **Drawdown warning**: Amber/red warning box when approaching limit

**Data flow:**
- WS prices → Chart updates
- Supabase Realtime → leaderboard, events, status
- Order form → POST `/api/arenas/[id]/trade` → engine → Pacifica
- Positions/orders → GET from engine/DB, 15s refetch

### 6. Spectate Page (`/arenas/[arenaId]/spectate`)

**Purpose:** Watch live arena progress as a spectator.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Arena Name                    │ AvatarRow            │
│ Round Indicator                                       │
├─────────────────────────────────────────────────────┤
│ Equity Race Chart (full width)                       │
├──────────────────────────┬──────────────────────────┤
│ SurvivorGrid (2 cols)    │ VotePanel                │
│                          │ ActivityFeed             │
│                          │ MarketContext            │
└──────────────────────────┴──────────────────────────┘
```

**Special features:**
- **Elimination banner**: Red banner slides in when trader eliminated
- **Zombie arena banner**: Reset button if engine stalled
- **Winner banner**: Gold-bordered card with winner name + PnL
- **Avatar row**: Click avatar for popup with stats
- **Equity Race Chart**: SVG multi-line chart, death zone, elimination cutline
- **Vote Panel**: Second Life voting for bottom 50% traders

**Data flow:** Same as trade page + vote status + equity snapshots.

### 7. Leaderboard (`/leaderboard`)

**Purpose:** Global ranking of all traders.

**Layout:**
- Table with columns: Rank (#, medal, or number), Trader (avatar + name), Wins, Played, Best PnL, Win Rate, Streak
- Sorted by total_arenas_won DESC, then best_pnl_percent DESC
- Top 3 get gold/silver/bronze medals
- Current win streak shows fire emoji

**Data flow:** GET `/api/leaderboard` every 30s.

### 8. Profile (`/profile/[address]`)

**Purpose:** User profile with stats and referral link.

**Sections:**
- Username (editable inline)
- Stats cards: Arenas, Wins, Rounds survived, Best PnL
- Referral link (copyable)
- Badges (placeholder — "No badges earned yet")
- Match history (placeholder — "No matches played yet")

**Data flow:** `useCurrentUser()` for own profile data.

---

## Every Component

### ArenaCard
- **Props:** arena object with id, name, preset, status, starts_at, current_round, min/max_participants, starting_capital, participant count
- **Visual:** Card with colored top bar (accent-primary for active, border-light for completed), preset badge, participant progress bar, live indicator with pulsing dot
- **Behavior:** Links to spectate page (if active) or arena detail (if registration)
- **Preset styling:** blitz=red, sprint=indigo, daily=green, weekly=gold

### RoundIndicator
- **Props:** roundName, roundNumber, maxLeverage, maxDrawdown, allowedPairs, endsAt
- **Visual:** Card with round number/name header, leverage (monospace), drawdown (red), pairs (comma-separated), countdown timer
- **Animation:** Fade-in from bottom

### RoundTransition
- **Props:** roundName, roundNumber, maxLeverage, maxDrawdown, onComplete callback
- **Visual:** Full-screen overlay with 95% opacity bg, announces round name in large text, 3-2-1 countdown
- **Animation:** Spring scale-in for announcement, bounce scale for countdown numbers

### Chart
- **Tech:** TradingView Lightweight Charts v5, LineSeries
- **Props:** symbol, className
- **Data:** WS prices from ws-store
- **Features:** Responsive via ResizeObserver, indigo line, grid lines, crosshair, time visible on x-axis
- **Update:** Updates chart with each new WS price tick

### OrderForm
- **State:** From trading-store (orderType, side, size, price, leverage, reduceOnly)
- **Visual:** Card with market/limit tab buttons, Long (green) / Short (red) buttons, size input with $ contract conversion, quick size presets ($25/$50/$100/$250), leverage slider, reduce-only checkbox
- **Behavior:** Validates size, submits via useSubmitOrder mutation, shows success/error feedback
- **Smart features:** Calculates contracts from USD size using WS mark price, disables limit price input for market orders

### PositionList
- **Data:** usePositions hook, 15s refetch
- **Visual:** Table with symbol, side (Long=green, Short=red), size, entry price, mark price, uPnL (color-coded), close button
- **Features:** Close All button, real-time mark price from WS, calculates uPnL client-side

### OrderList
- **Data:** useOpenOrders hook (returns trade history, not open orders)
- **Visual:** Table with symbol, side, size, type, time
- **Behavior:** Fade-in animation for new rows

### AccountPanel
- **Props:** equity, balance, unrealizedPnl, drawdown, maxDrawdown, hasWideZone, hasSecondLife, secondLifeUsed
- **Visual:** Equity in large font, balance + uPnL side-by-side, drawdown meter, loot badges (Wide Zone in indigo, Second Life in gold with strikethrough if used)

### SurvivorGrid
- **Layout:** Responsive grid (1/2/3 columns)
- **Data:** Leaderboard sorted by PnL%
- **Features:** Shows active count, uses AnimatePresence for layout transitions, sparklines from equity snapshots

### TraderCard
- **Visual:** Card with rank badge (gold/silver/bronze/gray), display name, trade count, large PnL% (green/red), drawdown meter, sparkline SVG, loot badges, winner crown
- **Status handling:** Eliminated = 40% opacity, strikethrough name; Winner = gold border + shadow + crown; Top 3 = accent border + shadow

### AvatarRow
- **Layout:** Horizontal flex-wrap, sorted by status (active first) then PnL
- **Features:** Avatar from DiceBear pixel-art, ring color by danger level, grayscale for eliminated, pulsing overlay by danger, crown for winner
- **Interaction:** Click opens TraderPopup

### TraderPopup
- **Visual:** 208px wide card with avatar, name, status label, PnL, drawdown stats, drawdown bar
- **Behavior:** Click-outside to close, spring animation

### EquityRaceChart
- **Tech:** SVG with motion.path for animated lines
- **Features:** 
  - One colored line per trader (6-color palette)
  - Gradient fill below each line
  - Death zone (red gradient fill at bottom)
  - Warning line (yellow dashed at 70% of max drawdown)
  - Death line (red at max drawdown)
  - Dynamic elimination cutline (purple dashed, shows which trader is on the bubble)
  - Pulsing endpoint dots with glow filter for leader
  - Frozen state when data temporarily unavailable
  - Legend with trader names and current PnL%
- **Data:** Equity snapshots grouped by participant, normalized to PnL% from round start

### ActivityFeed
- **Event types:** trade_opened (green), trade_closed (indigo), elimination (red), round_start/end, loot_awarded (gold), arena_start/end, second_life_used (gold), leverage_warning (yellow), vote_cast
- **Icons:** Unicode symbols (↗, ↙, ✕, ▶, ■, ★, ⚡, 🏁, ♻, ⚠, 🗳)
- **Behavior:** Max height 400px with scroll, relative timestamps (s/m/h), AnimatePresence for new items

### VotePanel
- **Data:** Vote tally per candidate, user's vote status, voting open/closed
- **Visual:** Card with gold accent, pulsing "OPEN" indicator, candidate buttons with vote bar fill, vote count display
- **Behavior:** One vote per user per round, optimistic local state update, vote bar fill animation

### EliminationBanner
- **Visual:** Fixed red banner at top center, trader address, elimination reason, equity at elimination
- **Behavior:** Auto-dismisses after 5 seconds, spring slide-in animation

### Navbar
- **Behavior:** Fixed top nav, transparent on homepage when at top, solid bg on scroll or other pages
- **Active link indicator:** Animated underline using layoutId
- **Responsive:** Hides nav links on mobile

### BackgroundEffects
- **GradientOrbs:** 3 floating blurred circles with drift animation
- **Particles:** Canvas-based particle system, density-adaptive
- **GrainOverlay:** SVG noise texture at 3% opacity

### DrawdownMeter
- **Visual:** Bar with background track, fill bar with color transitions
- **Colors:** Green (<50%), Yellow (50-75%), Orange (75-90%), Red pulse (90%+)
- **Animation:** Spring fill from 0 to current percentage

### StatusBadge
- **Levels:** SAFE (green), CAUTION (yellow), DANGER (orange), CRITICAL (orange + pulse), ELIMINATED (gray + strikethrough)
- **Calculation:** ratio = drawdown / maxDrawdown

### Timer
- **Format adaptation:** Days (>24h) → HH:MM:SS (>1h) → MM:SS (<1h) → "00:00" (expired)
- **Urgent state:** Red color + pulse animation when under 60 seconds

---

## Custom Hooks

### useArena / useArenas / useCreateArena / useJoinArena / useLeaveArena
- All use TanStack React Query
- `useArenas` — paginated list with 30s refetch, 15s stale time
- `useArena` — single arena with 60s refetch (realtime handles live updates)
- `useCreateArena` / `useJoinArena` / `useLeaveArena` — mutations with cache invalidation

### useArenaRealtime
- Subscribes to 5 Supabase Realtime channels for an arena
- Automatically invalidates React Query caches on any DB change
- Cleanup on unmount or arenaId change

### useCountdown
- State-based countdown, updates every second
- Returns structured time object + formatted string + isExpired flag

### useLeaderboard / useArenaEvents / useVoteStatus / useEquitySnapshots
- All React Query hooks with appropriate stale times
- `useEquitySnapshots` groups by participant_id for chart consumption

### usePositions / useOpenOrders
- Auth-required, 15s refetch interval, 8s stale time

### useSubmitOrder / useCancelOrder
- Mutations that call the trading API, invalidate positions/orders on success

### usePacificaWS
- Connects to `wss://test-ws.pacifica.fi/ws`
- Subscribes to `prices` channel
- Stores prices in ws-store
- Exponential backoff reconnect (1s → 30s max)

---

## State Management (Zustand Stores)

### Arena Store (`arena-store.ts`)
- **Filters:** { status: string | null, preset: string | null, page: number }
- **Actions:** setStatus, setPreset, setPage, resetFilters
- **Behavior:** Setting status or preset resets page to 1

### Trading Store (`trading-store.ts`)
- **State:** orderType, side, size, price, leverage (default 5), reduceOnly, slippagePercent
- **Actions:** Setters for each field, reset (clears size/price/reduceOnly)
- **Used by:** OrderForm component

### WS Store (`ws-store.ts`)
- **State:** connected (boolean), prices (Map<string, PriceEntry>)
- **Actions:** setConnected, updatePrice, getPrice
- **Used by:** Chart, PositionList, OrderForm (for mark price)

---

## Game Mechanics

### Core Concept

Traders enter arenas with $1,000 starting capital and trade perpetual futures (BTC, ETH, SOL) on Pacifica Exchange. Each round gets progressively harder — leverage drops, drawdown tightens, and the bottom performers get eliminated. The last trader standing wins.

### Arena Types (Presets)

| Preset | Total Duration | Round 1 | Round 2 | Round 3 | Sudden Death | Use Case |
|--------|---------------|---------|---------|---------|-------------|----------|
| **Blitz** | 5 min | 90s | 90s | 60s | 60s | Quick demo |
| **Sprint** | 2 hours | 30 min | 30 min | 30 min | 30 min | Short sessions |
| **Daily** | 24 hours | 6h | 6h | 6h | 6h | Daily competitions |
| **Weekly** | 7 days | 48h | 48h | 48h | 24h | Long tournaments |

### Arena Creation Flow

1. User selects preset → generates starts_at time
2. POST `/api/arenas` → validates, generates vault keypair, encrypts private key
3. Creates arena record + 4 round records with pre-calculated timings
4. Notifies engine to schedule arena start timer
5. During registration phase: users can join/leave
6. At starts_at: engine checks min participants, funds subaccounts, starts Round 1

### Subaccount Architecture

Each arena has a **master vault** (generated Ed25519 keypair) that:
1. Creates subaccounts on Pacifica for each participant
2. Transfers $1,000 starting capital to each subaccount
3. Receives remaining funds back when traders are eliminated or arena ends

Private keys are encrypted with AES-256-GCM using server's ENCRYPTION_KEY before storage.

### Anti-Sybil Check

When joining an arena, the wallet address is checked against Fuul's sybil detection API (currently stubbed — allows all).

---

## Round Progression

### Round 1: "Open Field"
- **Leverage:** 20x (maximum freedom)
- **Drawdown:** 20%
- **Pairs:** BTC, ETH, SOL
- **Elimination:** Bottom 30% by PnL%
- **Activity requirement:** Minimum 3 trades + 10% volume of starting capital
- **Loots:** Wide Zone + Second Life awarded

### Round 2: "The Storm"
- **Leverage:** 10x (halved)
- **Drawdown:** 15% (tighter)
- **Margin mode:** Isolated only
- **Pairs:** BTC, ETH, SOL
- **Elimination:** Bottom 40% by PnL%
- **Activity requirement:** Same as Round 1
- **Loots:** Wide Zone + Second Life awarded

### Round 3: "Final Circle"
- **Leverage:** 5x
- **Drawdown:** 10%
- **Pairs:** BTC only
- **Elimination:** Top 5 advance (rest eliminated)
- **Activity requirement:** Same
- **Loots:** Wide Zone + Second Life awarded

### Round 4: "Sudden Death"
- **Leverage:** 3x
- **Drawdown:** 8%
- **Pairs:** BTC only
- **Elimination:** ANY drawdown breach = instant elimination
- **Activity requirement:** None
- **No loots**
- **Grace period:** 60 seconds (vs 120s for other rounds)

### Round Transition Flow

```
Round N ends
    │
    ▼
Inactivity elimination (if required)
    │
    ▼
Ranking elimination (bottom X%)
    │
    ▼
Loot calculation (Wide Zone + Second Life)
    │
    ▼
Check if arena should end (round 4 or 1 survivor)
    │
    ▼
Grace period (60-120s) — only reduce/close orders
    │
    ▼
Snapshot equity → Reset baselines → Begin next round
```

---

## Elimination Logic

### Drawdown Breach (Real-time)
- **Trigger:** On every price tick (~1/sec), engine recalculates equity and drawdown
- **Check:** If drawdown >= maxDrawdown (or maxDrawdown + 5% with Wide Zone)
- **First response:** If trader has Second Life and hasn't used it → baseline resets to current equity, drawdown resets to 0
- **Second response:** If no Second Life → instant elimination

### Ranking Elimination (End of Round)
- **Trigger:** Round timer expires
- **Process:** 
  1. Calculate PnL% for all active traders
  2. Sort ascending (worst first)
  3. Round 3 special: eliminate all but top 5
  4. Other rounds: eliminate ceil(activeCount * eliminationPercent / 100)
  5. Ties broken by highest max drawdown (worse trader eliminated first)

### Inactivity Elimination (End of Round)
- **Trigger:** Round timer expires
- **Check:** Less than 3 trades OR less than 10% of starting capital in volume
- **Result:** Eliminated for "inactivity"

### Leverage Violation (Periodic)
- **Trigger:** Every 30s during periodic sync
- **Check:** Effective leverage > maxLeverage * 1.1 (10% buffer)
- **Warning:** First 2 violations generate events
- **Elimination:** 3 violations in same round = eliminated

### Sudden Death
- **Rule:** ANY drawdown breach = instant elimination
- **Winner:** Last surviving trader
- **Grace period:** 60 seconds only

---

## Loot System

### Wide Zone
- **Awarded to:** Trader with LOWEST maxDrawdownHit this round (best risk management)
- **Effect:** +5% drawdown buffer for next round (e.g., 15% → 20%)
- **Duration:** One round only

### Second Life
- **Awarded to:** Trader with HIGHEST PnL% this round (best performance)
- **Effect:** First drawdown breach is forgiven — baseline resets to current equity instead of eliminating
- **Duration:** One use, one round

### Conflict Resolution
If the same trader wins both loots:
- They get Second Life (more impactful)
- Wide Zone goes to runner-up (second lowest drawdown)
- If only 2 survivors and same person tops both: only Second Life is awarded

### Spectator Vote for Second Life
- **When:** During each round (last 5 minutes for long rounds, entire round for blitz)
- **Who:** Active traders can vote
- **For whom:** Bottom 50% of active traders (by PnL%)
- **Purpose:** Community decides who gets Second Life consideration
- **Note:** Vote tally is displayed but the actual mechanic appears to be informational at this stage

---

## Trading Mechanics

### Supported Order Types
- **Market orders:** Immediate execution at best available price, configurable slippage (default 1%)
- **Limit orders:** GTC/IOC/FOK/POST_ONLY time-in-force options

### Position Management
- **Net mode:** Trading opposite side reduces/closes existing position
- **Close button:** Per-position close with 5% slippage
- **Close All:** Closes all positions simultaneously

### Leverage
- **Set per round:** Engine updates leverage for all traders on round transition
- **Slider UI:** 1x to round max, adjustable per order
- **Enforcement:** Order validator rejects orders exceeding round max

### Margin Mode
- **Round 1:** Any (cross or isolated)
- **Rounds 2-4:** Isolated only (enforced on Pacifica account level)

### Symbol Restrictions
- **Rounds 1-2:** BTC, ETH, SOL
- **Rounds 3-4:** BTC only
- **Enforcement:** Order validator rejects disallowed symbols

### Price Feed
- **Source:** Pacifica WebSocket (`wss://test-ws.pacifica.fi/ws`)
- **Channel:** `prices` — mark prices for all symbols
- **Update frequency:** ~1 second
- **Reconnect:** Exponential backoff (1s → 2s → 4s → 8s → 15s → 30s max)

---

## Spectator Features

### Survivor Grid
- Responsive card for each trader
- Sorted by PnL% (highest first)
- Real-time updates via Supabase Realtime
- Active count badge

### Equity Race Chart
- SVG multi-line chart showing PnL% over time
- Each trader gets a unique color
- Death zone (red gradient) at drawdown limit
- Dynamic elimination cutline (shows who's on the bubble)
- Pulsing endpoint dots
- Leader gets glow filter

### Avatar Row
- Pixel art avatars from DiceBear
- Ring color indicates danger level
- Grayscale for eliminated traders
- Click for detailed popup
- Crown for winner

### Activity Feed
- Color-coded event types
- Relative timestamps
- Scrollable with max height
- AnimatePresence for smooth additions

### Vote Panel
- Second Life voting UI
- Real-time vote tally
- Progress bar fills
- Vote confirmation

### Market Context
- AI-generated commentary (Elfa AI)
- Social sentiment scores (bullish/neutral/bearish)
- Updates every 5 minutes

---

## Timer Mechanics

### Arena Start Timer
- **Scheduled:** When arena is created, engine sets a setTimeout for starts_at
- **On engine startup:** Queries all arenas in "registration" status and schedules them
- **Immediate start:** If starts_at has already passed, starts immediately

### Round End Timer
- **Scheduled:** When a round begins, engine sets a setTimeout for round ends_at
- **On expiry:** Calls advanceRound() which processes eliminations, loots, and starts next round

### Grace Period
- **Duration:** 120 seconds (60s for Sudden Death)
- **Behavior:** 
  - Drawdown monitoring paused (isInGracePeriod = true)
  - Only reduce/close orders allowed
  - After period: equity snapshot, baseline reset, next round begins

### Countdown Display
- Client-side useCountdown hook, updates every second
- Format adapts: days+hours, HH:MM:SS, MM:SS
- Urgent pulsing under 60 seconds

---

## Auth Flow

### Privy Authentication
1. User clicks "Connect" → Privy modal opens
2. Login methods: email, Google, Twitter, wallet
3. Solana embedded wallet auto-created on first login
4. Privy returns JWT → stored by Privy SDK

### User Registration
1. API routes verify Privy JWT via `verifyAuth()` middleware
2. `findOrCreateUser()` checks if user exists by privy_user_id
3. If new: creates user record with wallet_address, referral_code (8-char hex)
4. Returns user with public columns only (never encrypted fields)

### API Authentication Pattern
```
Request → verifyAuth() → findOrCreateUser() → proceed with user context
```

All write operations require Privy JWT in `Authorization: Bearer <token>` header.

---

## Real-Time Data Flow

### Price Updates (Engine-side)
```
Pacifica WS (every ~1s)
  → PriceManager receives price update
  → Emits "price" event
  → RiskMonitor onPriceUpdate()
    → Recalculate equity for traders with position in this symbol
    → Calculate drawdown from baseline
    → Check drawdown breach → handleDrawdownBreach()
      → Check Second Life → reset baseline OR
      → Eliminate trader → close positions, record elimination
```

### Leaderboard Updates (Engine-side)
```
setInterval (every 3s)
  → updateLeaderboard(arenaId)
  → For each active trader: calculate PnL%, drawdown%
  → UPDATE arena_participants in Supabase
  → Supabase Realtime broadcasts to all connected clients
```

### Frontend Real-Time
```
Supabase Realtime channel subscription
  → on postgres_changes event
  → queryClient.invalidateQueries({ queryKey: [...] })
  → React Query refetches → components re-render
```

### WebSocket Prices (Frontend)
```
Pacifica WS → usePacificaWS hook → ws-store updatePrice()
  → Chart reads prices Map → updates line chart
  → PositionList reads prices → recalculates uPnL
```

---

## Demo Mode

When `DEMO_MODE=true`, the engine runs entirely in-memory without Pacifica:

### Mock Price Generator
- Random walk for BTC ($87k), ETH ($2.1k), SOL ($148)
- Volatility: 0.1% per tick
- Updates every second
- Floor at 50% of current price

### Mock Pacifica
- In-memory accounts with balance + positions
- Supports: create subaccount, transfer funds, market orders, get positions, get account info
- Position management: increase, decrease, close, reverse

### Bot Traders
6 personality-driven bots trade automatically:
- Conservative Carl: 15s intervals, 5% position size, 60% long bias, max 1 position
- Aggressive Alice: 5s intervals, 20% size, 50% long bias, max 3 positions
- Scalper Sam: 3s intervals, 3% size, 50% long bias, max 2 positions
- YOLO Yuki: 8s intervals, 35% size, 70% long bias, max 2 positions (gets eliminated)
- Steady Steve: 20s intervals, 8% size, 55% long bias, max 1 position
- Degen Dave: 4s intervals, 25% size, 40% long bias (short bias), max 3 positions

### Demo Arena Types
1. **Blitz Arena** — 6 bots, 5-minute total, auto-restarts after 60s cooldown
2. **Open Arena** — 4 bots + 2 open slots for real users, 5-minute registration, longer rounds (5min/5min/3min/2min)

### Zombie Arena Recovery
- Spectate page detects round end time passed but status still active
- Shows amber banner with "Reset Demo" button
- Auto-resets after 5 seconds
- Engine watchdog re-checks every 60s

---

## Tests

### Encryption Tests (4 tests)
- Round-trip encrypt/decrypt
- Ciphertext differs from plaintext
- Different keys produce different ciphertexts
- Wrong key throws on decrypt

### Keypair Tests (3 tests)
- Generates valid Ed25519 keypair (32-byte public, 64-byte secret)
- Reconstructs from base58
- Survives encrypt/decrypt round-trip

### Signing Tests (3 tests)
- Produces 88-char base58 signature
- sortKeys sorts recursively
- Different payloads produce different signatures

### Loot Calculator Tests (8 tests)
- Wide Zone +5% buffer math
- Trader with Wide Zone survives at 18% (max 15% + 5%)
- Trader without Wide Zone eliminated at 18%
- Second Life first breach resets baseline
- Second Life second breach eliminates
- Wide Zone goes to lowest drawdown
- Second Life goes to highest PnL
- Same winner conflict resolution

### Round Params Tests (9 tests)
- 4 rounds exist
- Correct leverage per round
- Isolated margin in round 2+
- BTC-only in round 3
- Sudden death 8% drawdown
- Round names correct
- Leverage decreases each round
- Drawdown tightens each round

### Preset Tests (4 tests)
- Blitz = 300s total
- Sprint = 7200s total
- Daily = 86400s total
- Weekly = 604800s total

### Timing Tests (4 tests)
- Generates 4 rounds
- Rounds are sequential (no gaps)
- First round starts at startsAt
- Last round ends at correct total duration

### Risk Monitor Tests (19 tests)
- calcUnrealizedPnl for long profit/loss
- calcUnrealizedPnl for short profit/loss
- Fractional sizes
- calcEquity with no positions
- calcEquity with single/multiple positions
- calcDrawdownPercent at various levels
- getDrawdownLevel thresholds (safe/caution/danger/critical)

**Total: 53 tests**

---

## Configuration Files

### package.json
- **Dependencies:** Next.js 15, React 19, Framer Motion, Zustand, React Query v5, Privy, Supabase, Pacifica SDK, Solana web3.js, Three.js, Lightweight Charts, Zod v4, tweetnacl, bs58
- **Scripts:** `dev` (next dev), `build` (next build), `engine:dev` (cd engine && npm run dev)

### railway.toml
- Builder: Nixpacks
- Build: `cd engine && npm install && npm run build`
- Start: `cd engine && node dist/engine/src/index.js`
- Healthcheck: `/health`
- Restart policy: On failure, max 3 retries

### tsconfig.json
- Target: ES2017
- Strict mode, noEmit
- Path alias: `@/*` → `./src/*`
- Includes Next plugin

### vitest.config.ts
- Globals enabled
- Path alias for @/

---

## Deployment

### Frontend (Vercel)
- Next.js 15 App Router
- Automatic deployments from git push
- Environment variables configured in Vercel dashboard

### Engine (Railway)
- Express server on port 4000
- Built with Nixpacks
- Health check at `/health`
- Environment variables: DATABASE_URL, ENCRYPTION_KEY, DEMO_MODE, INTERNAL_API_KEY, etc.

### Database (Supabase)
- PostgreSQL with Row Level Security
- Realtime subscriptions for live updates
- Service role key for engine writes
- Anon key for public reads

---

## Security Considerations

### Private Key Management
- **Encryption:** AES-256-GCM with random IV per encryption
- **Storage:** Encrypted base64 string in Supabase (iv + ciphertext + authTag)
- **Access:** Only decrypted in engine memory during trade execution
- **Never exposed:** Column safety lists explicitly exclude `_encrypted` fields

### Row Level Security
- All 11 tables have RLS enabled
- Public reads (SELECT) allowed for all tables
- Writes restricted to service_role (except votes which use auth.uid())
- Prevents client-side unauthorized access

### API Authentication
- All write endpoints require Privy JWT
- Internal endpoints require `x-internal-key` header
- Service role key never exposed to client

### Sybil Protection
- Fuul anti-sybil check on arena join (currently stubbed)
- Wallet address uniqueness enforced at user level

### Input Validation
- Zod schemas on all POST endpoints
- Username validation (3-20 chars, alphanumeric + underscore only)
- Order validation (leverage, symbols, size, type)

### Error Handling
- Fail-open on external services (Elfa, Fuul return defaults when unavailable)
- Graceful degradation on WS disconnect (reconnect with backoff)
- Zombie arena detection and auto-recovery

---

## Key Observations

### Battle Royale Theme Expression

The battle royale concept is expressed through:
1. **Round names:** "Open Field" → "The Storm" → "Final Circle" → "Sudden Death" (Fortnite/PUBG-inspired)
2. **Elimination mechanics:** Bottom performers cut each round, like closing circles
3. **Loot drops:** "Wide Zone" and "Second Life" power-ups awarded round-end
4. **Visual language:** Skull emoji for elimination, crown for winner, red "death zone" in charts
5. **Terminology:** "Survivors", "Eliminated", "Sudden Death", "Enter the Arena"
6. **Increasing pressure:** Each round restricts leverage, tightens drawdown, reduces available pairs

### Architecture Strengths
- Clean separation between frontend and engine
- Real-time risk monitoring with zero REST calls during normal operation
- Supabase Realtime as the bridge between engine DB writes and frontend updates
- In-memory state for hot path (price ticks), persisted for durability (snapshots)
- Demo mode enables full testing without external dependencies

### Areas of Note
- Spectator vote system records votes but the connection to Second Life awards is informational (not automatic)
- Badge system is defined (13 badges) but awarding is minimal (champion, gladiator, warrior, survivor)
- Match history and badges sections in profile are placeholders
- Fuul sybil check and Elfa AI sentiment are stubbed without API keys
- The Open Arena demo mode has a `scheduleTraderDemoRounds` function marked as `_DEAD` (dead code), suggesting the trader demo round scheduling logic may need attention

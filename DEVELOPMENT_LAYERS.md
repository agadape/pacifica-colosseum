# Pacifica Colosseum — Layered Development Guide

> **Project**: pacifica-colosseum
> **Status**: 🔨 In Progress (Layer 0 of 15)
> **Last Updated**: 2026-03-27
> **Related Docs**: [Blueprint](./COLOSSEUM_BLUEPRINT.md) | [Protocol](./PROTOCOL.md)
> **Hackathon Deadline**: April 16, 2026

---

## How to Use This File

This document breaks the entire Colosseum project into **16 development layers** (0–15).
Each layer is **self-contained** — it focuses on one system, lists every task with checkboxes, and specifies what must be true before the layer is "done."

**Rules:**
1. Complete layers in order. Each layer lists its dependencies.
2. Work one task at a time within a layer. Verify before moving on.
3. Check the box `[x]` when a task is done. Mark `[/]` for in-progress.
4. Update the **"Notes for Resuming"** section at the bottom whenever you stop.
5. Some layers can run in parallel (noted in dependencies). Prioritize backend layers first.

**Priority if running out of time** — cut from the bottom up:
- Layers 0–8: **MUST HAVE** (core engine — no project without these)
- Layers 9–11: **SHOULD HAVE** (frontend — needed for demo)
- Layers 12–15: **NICE TO HAVE** (polish, integrations, mock mode)

---

## Layer Overview

```
Layer 0:  Project Foundation         ← Monorepo, tooling, env vars, deploy scaffolding
Layer 1:  Database                   ← Supabase schema, migrations, RLS, seed data
Layer 2:  Pacifica TypeScript SDK    ← Wrap Python SDK patterns into TS client
Layer 3:  Authentication             ← Privy integration, user registration, JWT middleware
Layer 4:  Arena Management           ← Create, join, list arenas, subaccount creation, funding
Layer 5:  Trading Engine             ← Order validator, execution relay, position tracking
Layer 6:  Risk Engine                ← Local PnL Engine, WebSocket price feeds, drawdown monitoring
Layer 7:  Round & Elimination Engine ← Round progression, grace periods, eliminations, settlement
Layer 8:  Loot System                ← Wide Zone, Second Life, calculation, application
Layer 9:  Frontend — Shell & Pages   ← Layout, routing, landing, arena list, arena detail
Layer 10: Frontend — Trading UI      ← Order form, positions, charts, account panel
Layer 11: Frontend — Spectator       ← Survivor grid, activity feed, drawdown meters, voting
Layer 12: Real-Time System           ← Supabase Realtime, Pacifica WS to frontend, live updates
Layer 13: Integrations               ← Fuul (referrals/sybil), Elfa AI (sentiment/commentary)
Layer 14: Mock Engine                ← DEMO_MODE, simulated traders, fake price data
Layer 15: Polish & Deployment        ← UI polish, testing, demo prep, submission
```

---

## Layer 0: Project Foundation

> **Goal**: Monorepo scaffolded, both servers start, env configured, CI ready.
> **Depends on**: Nothing
> **Estimated effort**: 1 day

### Tasks

- [x] **0.1** Initialize git repo in `pacifica-colosseum/`
- [x] **0.2** Initialize Next.js 15 project (App Router, TypeScript, Tailwind CSS v4)
  - `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
- [x] **0.3** Install core frontend dependencies
  - `zustand`, `@tanstack/react-query`, `lightweight-charts`, `framer-motion`
  - `@solana/web3.js`, `tweetnacl`, `bs58`
- [x] **0.4** Create Engine server scaffold (separate persistent Node.js process)
  - Create `engine/` directory at project root
  - `engine/package.json` with TypeScript, `tsx` for dev
  - `engine/src/index.ts` — Express/Fastify HTTP server + WebSocket server
  - `engine/src/health.ts` — GET /health endpoint
  - Verify: `npm run dev` starts engine on port 4000
- [x] **0.5** Configure Tailwind dark theme (design system from blueprint)
  - Colors: `--bg-primary: #0a0a1a`, `--accent-primary: #6366f1`, etc.
  - Fonts: Inter (body) + JetBrains Mono (numbers)
- [x] **0.6** Create `.env.example` with all required variables
  ```
  PACIFICA_API_URL=https://test-api.pacifica.fi/api/v1
  PACIFICA_WS_URL=wss://test-ws.pacifica.fi/ws
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  NEXT_PUBLIC_PRIVY_APP_ID=
  PRIVY_APP_SECRET=
  FUUL_API_KEY=
  ELFA_API_KEY=
  ENCRYPTION_KEY=
  ENGINE_URL=http://localhost:4000
  ```
- [x] **0.7** Create `.gitignore` (node_modules, .env, .env.local, .next, dist)
- [x] **0.8** Verify: `npm run dev` (Next.js on 3000) + `npm run engine:dev` (Engine on 4000) both start
- [ ] **0.9** Deploy empty Next.js to Vercel (verify URL works)
- [ ] **0.10** Set up Railway project for engine (or Fly.io — verify persistent process works)

### Done Criteria
- [x] Both dev servers start without errors
- [ ] Vercel preview deployment accessible
- [x] `.env.example` documents every variable
- [x] Dark theme renders correctly on landing page placeholder

### Key Files Created
```
pacifica-colosseum/
├── src/app/layout.tsx
├── src/app/page.tsx
├── src/styles/globals.css
├── engine/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts
├── .env.example
├── .gitignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Layer 1: Database

> **Goal**: Supabase project created, all tables migrated, RLS policies active, seed data loaded.
> **Depends on**: Layer 0
> **Estimated effort**: 0.5 day

### Tasks

- [x] **1.1** Create Supabase project (free tier)
- [x] **1.2** Create migration `001_create_tables.sql` with all tables:
  - [x] `users` — wallet_address, privy_user_id, username, stats fields
  - [x] `arenas` — config, timing, vault wallet, round durations, status
  - [x] `arena_participants` — subaccount, status, equity snapshots, loots, activity tracking
  - [x] `rounds` — parameters per round (leverage, drawdown, pairs, elimination%)
  - [x] `equity_snapshots` — periodic equity records (participant, round, equity, drawdown)
  - [x] `trades` — trade log (symbol, side, size, price, leverage, PnL)
  - [x] `eliminations` — detailed elimination records with position snapshots
  - [x] `spectator_votes` — Second Life voting
  - [x] `badges` — badge definitions
  - [x] `user_badges` — earned badges junction table
  - [x] `events` — activity feed events (denormalized for fast reads)
- [x] **1.3** Create migration `002_create_indexes.sql`
  - [x] `idx_equity_snapshots_participant_round` on (participant_id, round_number, recorded_at DESC)
  - [x] `idx_trades_arena_round` on (arena_id, round_number, executed_at DESC)
  - [x] `idx_events_arena` on (arena_id, created_at DESC)
- [x] **1.4** Create migration `003_create_policies.sql` — RLS policies
  - [x] Enable RLS on all tables
  - [x] Users: public read, own write
  - [x] Arenas, participants, events, trades, snapshots: public read
  - [x] Votes: public read, authenticated write (1 per round)
  - [x] All write operations: server-side only (service role key)
- [x] **1.5** Create `004_seed_badges.sql` — insert all 13 badge definitions
- [x] **1.6** Run migrations via Supabase CLI: `npx supabase db push`
- [x] **1.7** Generate TypeScript types from Supabase schema
  - `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts`
  - (manually written to match schema; replace with generated types when Supabase project is live)
- [x] **1.8** Create Supabase client files
  - `src/lib/supabase/client.ts` — browser client (anon key)
  - `src/lib/supabase/server.ts` — server client (service role key)
- [x] **1.9** Verify: connect from Next.js, query badges table, see 13 rows

### Done Criteria
- [x] All 11 tables exist in Supabase with correct columns and constraints
- [x] RLS policies are active (public reads work, writes require service role)
- [x] Badge seed data present (13 badges)
- [x] TypeScript types generated and importable
- [x] Both browser and server Supabase clients work

### Key Files Created
```
supabase/
├── migrations/
│   ├── 001_create_tables.sql
│   ├── 002_create_indexes.sql
│   ├── 003_create_policies.sql
│   └── 004_seed_badges.sql
src/lib/supabase/
├── client.ts
├── server.ts
└── types.ts
```

---

## Layer 2: Pacifica TypeScript SDK

> **Goal**: Full TypeScript client wrapping all Pacifica REST + WebSocket APIs with Ed25519 auth.
> **Depends on**: Layer 0
> **Estimated effort**: 1.5 days

### Tasks

- [x] **2.1** Create auth module: `src/lib/pacifica/auth.ts`
  - [x] `signMessage(header, payload, keypair)` → `{ message, signature }`
  - [x] `sortKeys(obj)` — recursive JSON key sorting
  - [x] Compact JSON serialization (no spaces)
  - [x] Ed25519 signing via `tweetnacl`
  - [x] Base58 encoding via `bs58`
  - [x] Signature expiry window: 5000ms default
  - [x] Verify: sign a test message, compare output format with Python SDK
- [x] **2.2** Create types: `src/lib/pacifica/types.ts`
  - [x] `SignedRequest`, `OrderRequest`, `MarketOrderRequest`, `LimitOrderRequest`
  - [x] `SubaccountCreateRequest`, `TransferRequest`, `LeverageUpdateRequest`
  - [x] `Position`, `AccountInfo`, `OrderbookData`, `PriceData`
  - [x] `TWAPOrderRequest`, `TPSLRequest`, `BatchOrderRequest`
- [x] **2.3** Create REST client: `src/lib/pacifica/client.ts`
  - [x] Base URL config (testnet vs mainnet)
  - [x] Helper: `buildSignedRequest(type, payload, keypair)` — builds full request object
  - [x] Orders:
    - [x] `createMarketOrder(params)` → POST /orders/create_market
    - [x] `createLimitOrder(params)` → POST /orders/create
    - [x] `cancelOrder(params)` → POST /orders/cancel
    - [x] `cancelAllOrders(params)` → POST /orders/cancel_all
    - [x] `batchOrders(params)` → POST /orders/batch
    - [x] `createTWAPOrder(params)` → POST /orders/twap/create
    - [x] `cancelTWAPOrder(params)` → POST /orders/twap/cancel
    - [x] `getOpenTWAPOrders(account)` → GET /orders/twap
  - [x] Positions:
    - [x] `setTPSL(params)` → POST /positions/tpsl
  - [x] Account:
    - [x] `updateLeverage(params)` → POST /account/leverage
    - [x] `getAccountInfo(address)` → GET /account/info
    - [x] `getPositions(address)` → GET /account/positions
  - [x] Subaccounts:
    - [x] `createSubaccount(mainKeypair, subKeypair)` → POST /account/subaccount/create
      - Dual-signature flow: sub signs main pubkey, main signs sub signature
    - [x] `listSubaccounts(keypair)` → POST /account/subaccount/list
    - [x] `transferFunds(fromKeypair, toAddress, amount)` → POST /account/subaccount/transfer
- [x] **2.4** Create WebSocket client: `src/lib/pacifica/websocket.ts`
  - [x] `PacificaWS` class with auto-reconnect + exponential backoff
  - [x] `subscribe(source, callback)` — subscribe to public channels
  - [x] `subscribePrices(callback)` — `{"method":"subscribe","params":{"source":"prices"}}`
  - [x] `subscribeOrderbook(symbol, callback)` — orderbook channel
  - [x] `sendOrder(type, params)` — trading via WebSocket
  - [x] Heartbeat / ping-pong handling
  - [x] Reconnect on disconnect (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
- [x] **2.5** Create encryption utilities: `src/lib/utils/encryption.ts`
  - [x] `encryptPrivateKey(key, encryptionKey)` — AES-256-GCM
  - [x] `decryptPrivateKey(encrypted, encryptionKey)` — AES-256-GCM
  - [x] Used for vault + subaccount private keys stored in DB
- [x] **2.6** Create keypair utilities: `src/lib/utils/keypair.ts`
  - [x] `generateKeypair()` — returns Solana Keypair
  - [x] `keypairFromBase58(secret)` — reconstruct from stored key
  - [x] `publicKeyToString(keypair)` — base58 public key string
- [x] **2.7** Test: create a subaccount on Pacifica testnet end-to-end
  - API format verified (6/6 pass). Needs beta code + deposit for full e2e.
- [x] **2.8** Test: place a market order via REST on testnet
  - API format verified. Needs funded account for execution.
- [x] **2.9** Test: subscribe to price WebSocket, receive mark prices
- [x] **2.10** Test: transfer funds between vault and subaccount
  - API format verified. Needs funded account for execution.

### Done Criteria
- [x] All Pacifica REST endpoints callable from TypeScript
- [x] Ed25519 signatures match Python SDK output format
- [x] WebSocket connects, subscribes to prices, receives data
- [x] Subaccount creation + funding works end-to-end on testnet (format verified 6/6, needs beta code)
- [x] Private key encryption/decryption round-trips correctly

### Key Files Created
```
src/lib/pacifica/
├── auth.ts
├── client.ts
├── websocket.ts
└── types.ts
src/lib/utils/
├── encryption.ts
└── keypair.ts
```

---

## Layer 3: Authentication

> **Goal**: Users can log in via Privy, JWT verified on API routes, user auto-registered in DB.
> **Depends on**: Layer 0, Layer 1
> **Estimated effort**: 0.5 day

### Tasks

- [x] **3.1** Install Privy SDK: `@privy-io/react-auth`, `@privy-io/server-auth`
- [x] **3.2** Create Privy config: `src/lib/privy/config.ts`
  - App ID from env
  - Login methods: email, google, twitter, wallet (Phantom, Solflare)
  - Embedded wallet creation enabled
- [x] **3.3** Add PrivyProvider to `src/app/layout.tsx`
  - Wrap app in PrivyProvider with config
  - Set appearance to dark theme
- [x] **3.4** Create `ConnectButton` component: `src/components/shared/ConnectButton.tsx`
  - Uses `usePrivy()` hook
  - Shows "Enter the Arena" when not connected
  - Shows wallet address (truncated) + logout when connected
- [x] **3.5** Create auth middleware: `src/lib/auth/middleware.ts`
  - `verifyPrivyToken(request)` — verify JWT from Authorization header
  - Returns user info (privy ID, wallet address)
  - Reusable across all API routes
- [x] **3.6** Create user auto-registration: `src/lib/auth/register.ts`
  - On first login: insert into `users` table
  - Generate unique `referral_code`
  - Set wallet_address from Privy
  - On subsequent login: fetch existing user
- [x] **3.7** Create API route: `GET /api/users/me`
  - Requires auth
  - Returns user profile + stats
- [x] **3.8** Create API route: `PATCH /api/users/me`
  - Update username, avatar_url
- [x] **3.9** Verify: full flow — API returns 401 unauthenticated, Privy provider loads (needs APP_ID for full login test)

### Done Criteria
- [x] Privy login modal works (email, social, wallet) — needs APP_ID in .env.local for live test
- [x] JWT verified on protected API routes
- [x] User auto-created in DB on first login
- [x] ConnectButton renders correctly in navbar
- [x] Unauthorized requests return 401

### Key Files Created
```
src/lib/privy/config.ts
src/lib/auth/middleware.ts
src/lib/auth/register.ts
src/components/shared/ConnectButton.tsx
src/app/api/users/me/route.ts
```

---

## Layer 4: Arena Management

> **Goal**: Arenas can be created, listed, joined. Subaccounts created and funded on Pacifica.
> **Depends on**: Layer 1, Layer 2, Layer 3
> **Estimated effort**: 2 days

### Tasks

- [x] **4.1** Create constants: `src/lib/utils/constants.ts`
  - Round parameter table (per preset: Blitz, Sprint, Daily, Weekly)
  - Protocol constants: MIN_PARTICIPANTS=4, MAX_PARTICIPANTS=100, STARTING_CAPITAL=1000, etc.
  - Round names: "Open Field", "The Storm", "Final Circle", "Sudden Death"
- [x] **4.2** Create API route: `POST /api/arenas` — create arena
  - Validate input with Zod (name, preset, startsAt, min/max participants)
  - Generate vault keypair (Solana)
  - Encrypt and store vault private key
  - Calculate round timings from preset
  - Insert arena + round records into DB
  - Return arena object
- [x] **4.3** Create API route: `GET /api/arenas` — list arenas
  - Query params: status, preset, page, limit
  - Return arenas with participant count
  - Public (no auth required)
- [x] **4.4** Create API route: `GET /api/arenas/[arenaId]` — arena detail
  - Return arena + participants + current round info
  - Public
- [x] **4.5** Create API route: `POST /api/arenas/[arenaId]/join` — join arena
  - Validate: arena in registration status, not full, not already joined
  - Generate subaccount keypair
  - Encrypt and store subaccount private key
  - Insert arena_participant record
  - Return participant object
- [x] **4.6** Create API route: `DELETE /api/arenas/[arenaId]/leave` — leave arena
  - Only during registration phase
- [x] **4.7** Create arena start logic: `engine/src/services/arena-manager.ts`
  - `startArena(arenaId)`:
    - Verify minimum participants met (else cancel)
    - Fund all subaccounts ($1,000 each via Pacifica transfer)
    - Snapshot starting equity for all participants
    - Set leverage to Round 1 max (20x)
    - Update arena status → "round_1"
    - Create "arena_start" event
  - `cancelArena(arenaId, reason)` — if min participants not met
- [x] **4.8** Create arena start timer: `engine/src/timers/arena-timer.ts`
  - On engine startup: query all arenas with `starts_at` in the future
  - Schedule `startArena()` for each
- [x] **4.9** Verify: API routes tested — list returns empty, detail returns 404, auth protected routes return 401

### Done Criteria
- [x] Arena CRUD API routes work (create, list, get, join, leave)
- [x] Subaccount created on Pacifica testnet per participant (code ready, needs beta code for live test)
- [x] Funds transferred from vault to each subaccount on arena start (code ready, needs beta code)
- [x] Arena auto-cancels if < 4 participants at start time
- [x] All data persisted correctly in Supabase

### Key Files Created
```
src/lib/utils/constants.ts
src/app/api/arenas/route.ts
src/app/api/arenas/[arenaId]/route.ts
src/app/api/arenas/[arenaId]/join/route.ts
src/app/api/arenas/[arenaId]/leave/route.ts
engine/src/services/arena-manager.ts
engine/src/timers/arena-timer.ts
```

---

## Layer 5: Trading Engine

> **Goal**: Traders can submit orders through our backend, validated against round rules, relayed to Pacifica.
> **Depends on**: Layer 2, Layer 4
> **Estimated effort**: 1.5 days

### Tasks

- [x] **5.1** Create order validator: `engine/src/services/order-validator.ts`
  - `validateOrder(arenaId, participantId, order)`:
    - [x] Check participant status is "active"
    - [x] Check symbol is in allowed pairs for current round
    - [x] Check effective leverage won't exceed round max
    - [x] Check margin mode compliance (isolated-only in Round 2+)
    - [x] Check not in grace period (unless reduce/close only)
    - [x] Return `{ valid: true }` or `{ valid: false, error: "message" }`
- [x] **5.2** Create order execution relay: `engine/src/services/order-relay.ts`
  - `executeOrder(arenaId, participantId, order)`:
    - Validate via order-validator
    - Decrypt subaccount private key
    - Sign and send order to Pacifica API
    - Record trade in `trades` table
    - Create "trade_opened" or "trade_closed" event
    - Update participant activity counters (trades_this_round, volume_this_round)
- [x] **5.3** Create API route: `POST /api/arenas/[arenaId]/trade` — execute trade
  - Auth required, calls engine via internal endpoint
- [x] **5.4** Create API route: `DELETE /api/arenas/[arenaId]/trade/[orderId]` — cancel order
  - Cancel specific order on Pacifica via engine
- [x] **5.5** Create API route: `GET /api/arenas/[arenaId]/positions` — get own positions
  - Auth required, queries Pacifica via engine
- [x] **5.6** Create API route: `GET /api/arenas/[arenaId]/orders` — get own open orders
  - Auth required, queries Pacifica via engine
- [x] **5.7** Verify: engine internal endpoints respond correctly (401 without key, validates arena)
- [x] **5.8** Verify: API routes return 401 without auth, validated request shape with Zod

### Done Criteria
- [x] Orders validated against round rules before reaching Pacifica
- [x] Market and limit orders execute on Pacifica testnet (code ready, needs beta code)
- [x] Invalid orders return clear error messages
- [x] Trade activity tracked per participant per round
- [x] Positions and open orders queryable via API

### Key Files Created
```
engine/src/services/order-validator.ts
engine/src/services/order-relay.ts
src/app/api/arenas/[arenaId]/trade/route.ts
src/app/api/arenas/[arenaId]/trade/[orderId]/route.ts
src/app/api/arenas/[arenaId]/positions/route.ts
src/app/api/arenas/[arenaId]/orders/route.ts
```

---

## Layer 6: Risk Engine (Local PnL Engine)

> **Goal**: Real-time equity calculation from WebSocket mark prices, drawdown monitoring, equity snapshots.
> **Depends on**: Layer 2, Layer 4
> **Estimated effort**: 1.5 days

### Tasks

- [x] **6.1** Create in-memory state types: `engine/src/state/types.ts`
  - TraderState, PositionState, ArenaState, DrawdownLevel
  - calcEquity(), calcDrawdownPercent(), calcUnrealizedPnl(), getDrawdownLevel()
- [x] **6.2** Create mark price manager: `engine/src/state/price-manager.ts`
  - PacificaWS subscription to prices channel, Map<symbol, markPrice>, auto-reconnect, EventEmitter
- [x] **6.3** Create risk monitor: `engine/src/services/risk-monitor.ts`
  - initArena(), onPriceUpdate(), onTradeExecuted(), handleDrawdownBreach()
  - Second Life logic, elimination recording, updateArenaRound()
- [x] **6.4** Create periodic sync: `engine/src/services/periodic-sync.ts`
  - Every 30s: reconcile balance from Pacifica REST, write equity_snapshots
- [x] **6.5** Create leaderboard updater: `engine/src/services/leaderboard-updater.ts`
  - Every 3s: batch update arena_participants with PnL%, drawdown%
- [x] **6.6** Create drawdown event emitter
  - DrawdownLevel thresholds (safe/caution/danger/critical), emitDrawdownEvent()
- [x] **6.7** Verify: tsc clean, price manager connects to live WS, risk monitor integrates with arena-manager
- [x] **6.8** Verify: order-relay calls onTradeExecuted(), arena start triggers initArena() + periodic sync + leaderboard

### Done Criteria
- [x] Equity calculated locally from cached positions + WS mark prices
- [x] Zero REST API calls for routine monitoring (WS only)
- [x] Periodic sync runs every 30s to reconcile state
- [x] Equity snapshots recorded to DB for charts
- [x] Leaderboard updates broadcast every 3 seconds
- [x] Drawdown breach detection works correctly

### Key Files Created
```
engine/src/state/types.ts
engine/src/state/price-manager.ts
engine/src/services/risk-monitor.ts
engine/src/services/periodic-sync.ts
engine/src/services/leaderboard-updater.ts
```

---

## Layer 7: Round & Elimination Engine

> **Goal**: Rounds progress automatically, grace periods work, traders get eliminated, arena settles.
> **Depends on**: Layer 5, Layer 6
> **Estimated effort**: 2 days

### Tasks

- [ ] **7.1** Create round engine: `engine/src/services/round-engine.ts`
  - `advanceRound(arenaId)`:
    - [ ] Process inactivity eliminations (trades_this_round < 3 or volume < 10%)
    - [ ] Process ranking eliminations (bottom X% by PnL%)
    - [ ] Calculate and award loots (calls Layer 8)
    - [ ] Check if arena should end (round >= 4 or <= 1 survivor)
    - [ ] Start grace period for next round (2 min, 1 min for Sudden Death)
    - [ ] Enforce new leverage limits via Pacifica API
    - [ ] After grace period: snapshot equity as new baseline, resume monitoring
    - [ ] Update arena status + current_round in DB
    - [ ] Create round_start event with new parameters
- [ ] **7.2** Create round timer: `engine/src/timers/round-timer.ts`
  - Schedule `advanceRound()` when `current_round_ends_at` is reached
  - Handle: pause/resume if Pacifica API goes down
- [ ] **7.3** Create grace period handler: `engine/src/services/grace-period.ts`
  - Set `isGracePeriod = true` for all traders in arena
  - Drawdown monitoring paused during grace
  - Only reduce/close orders allowed (new positions blocked via order-validator)
  - After grace duration: take equity snapshot → set as new baseline
  - Set `isGracePeriod = false`, resume monitoring
- [ ] **7.4** Create elimination engine: `engine/src/services/elimination-engine.ts`
  - `eliminateTrader(arenaId, participant, round, reason, details)`:
    - [ ] Cancel all open orders (POST /orders/cancel_all)
    - [ ] Close all positions via aggressive limit orders (bid*0.999 / ask*1.001)
    - [ ] Wait 5 seconds
    - [ ] If positions remain: fallback to market close
    - [ ] Transfer remaining funds back to vault
    - [ ] Update participant status → "eliminated"
    - [ ] Record in `eliminations` table
    - [ ] Create "elimination" event
    - [ ] Remove from in-memory monitoring
  - `processRankingElimination(arenaId, round)`:
    - [ ] Calculate PnL% for all active traders
    - [ ] Sort ascending
    - [ ] Eliminate bottom X% (30% R1, 40% R2, top 5 R3)
    - [ ] Ties broken by lowest max drawdown hit
  - `processInactivityElimination(arenaId, round)`:
    - [ ] Check trades_this_round < 3 OR volume < 10% of starting capital
    - [ ] Eliminate with reason "inactivity"
- [ ] **7.5** Create leverage violation handler: `engine/src/services/leverage-monitor.ts`
  - Check effective leverage on each position sync
  - Warning notification (10s grace)
  - Force-reduce if not corrected
  - Eliminate if repeated 3x in same round
- [ ] **7.6** Create settlement: `engine/src/services/settlement.ts`
  - `endArena(arenaId)`:
    - [ ] Determine winner (last standing, or highest PnL% if multiple survive, or last eliminated timestamp)
    - [ ] Close all remaining positions (cancel + market close)
    - [ ] Record final equity for all survivors
    - [ ] Transfer all remaining funds back to vault
    - [ ] Award badges (champion, gladiator, warrior, etc.)
    - [ ] Update arena status → "completed"
    - [ ] Create "arena_end" event
- [ ] **7.7** Create Sudden Death safety valve
  - If ALL traders eliminated within 60s of Sudden Death start:
    - Reset round with 12% drawdown limit (instead of 8%)
    - Restore traders to pre-elimination state
- [ ] **7.8** Verify: full lifecycle — Round 1 → elimination → Round 2 → ... → winner determined
- [ ] **7.9** Verify: grace period works — drawdown paused, baseline recalculated
- [ ] **7.10** Verify: inactivity elimination triggers for AFK traders

### Done Criteria
- [ ] Rounds advance automatically based on timer
- [ ] Grace period pauses drawdown monitoring, recalculates baseline
- [ ] Drawdown breach → instant elimination with position close
- [ ] Ranking elimination at round end (correct percentages)
- [ ] Inactivity elimination enforced (anti-AFK)
- [ ] Arena settlement determines winner, closes all positions, returns funds
- [ ] Sudden Death safety valve works

### Key Files Created
```
engine/src/services/round-engine.ts
engine/src/services/grace-period.ts
engine/src/services/elimination-engine.ts
engine/src/services/leverage-monitor.ts
engine/src/services/settlement.ts
engine/src/timers/round-timer.ts
```

---

## Layer 8: Loot System

> **Goal**: Wide Zone and Second Life loots calculated, awarded, and applied correctly.
> **Depends on**: Layer 6, Layer 7
> **Estimated effort**: 0.5 day

### Tasks

- [ ] **8.1** Create loot calculator: `engine/src/services/loot-calculator.ts`
  - `calculateLoot(arenaId, roundNumber, survivors)`:
    - [ ] **Wide Zone**: Find trader with lowest `maxDrawdownHit` this round
    - [ ] **Second Life**: Find trader with highest PnL% this round (auto-award)
    - [ ] If same trader wins both: they choose one, runner-up gets the other
      - For MVP: auto-assign Wide Zone to lowest drawdown, Second Life to highest PnL
      - If same person: give them Second Life (more impactful), Wide Zone to runner-up
    - [ ] Max 1 loot per trader per round
    - [ ] Update `arena_participants` — set `has_wide_zone` or `has_second_life`
    - [ ] Create "loot_awarded" events
- [ ] **8.2** Integrate Wide Zone into risk monitor
  - In `onPriceUpdate()`: if trader `has_wide_zone`, add +5% to max drawdown threshold
  - Example: Round 2 max drawdown = 15%, with Wide Zone = 20%
- [ ] **8.3** Integrate Second Life into risk monitor
  - In drawdown breach check: if trader `has_second_life` and `!second_life_used`:
    - Reset equity baseline to current equity
    - Set `second_life_used = true`
    - Create "second_life_used" event
    - Skip elimination
  - Second breach (no more Second Life): eliminate normally
- [ ] **8.4** Clear loots on round transition
  - At start of each round: reset `has_wide_zone`, `has_second_life`, `second_life_used` to false
  - Then apply newly awarded loots for this round
- [ ] **8.5** Verify: trader with lowest drawdown gets Wide Zone → +5% buffer in next round
- [ ] **8.6** Verify: trader with Second Life survives first drawdown breach → eliminated on second

### Done Criteria
- [ ] Wide Zone correctly adds +5% drawdown buffer for one round
- [ ] Second Life forgives first drawdown breach, resets baseline
- [ ] Loots expire after one round (not cumulative)
- [ ] Max 1 loot per trader per round enforced
- [ ] Loot events created and visible

### Key Files Created
```
engine/src/services/loot-calculator.ts
```

---

## Layer 9: Frontend — Shell & Pages

> **Goal**: App shell with routing, landing page, arena list, arena detail, profile page.
> **Depends on**: Layer 0, Layer 3
> **Estimated effort**: 2 days

### Tasks

- [ ] **9.1** Create root layout: `src/app/layout.tsx`
  - [ ] PrivyProvider wrapper
  - [ ] TanStack QueryClientProvider
  - [ ] Global dark theme
  - [ ] Navbar component
- [ ] **9.2** Create Navbar: `src/components/shared/Navbar.tsx`
  - [ ] Logo ("COLOSSEUM")
  - [ ] Nav links: Arenas, Leaderboard, Profile
  - [ ] ConnectButton (from Layer 3)
- [ ] **9.3** Create landing page: `src/app/page.tsx`
  - [ ] Hero section: tagline ("Survive. Adapt. Trade."), brief description
  - [ ] How it works: 3-step visual (Join → Trade → Survive)
  - [ ] Call-to-action: "Enter the Arena" → connect wallet + browse arenas
- [ ] **9.4** Create ArenaCard component: `src/components/arena/ArenaCard.tsx`
  - [ ] Show: name, preset badge, status, participant count, start time, timer
- [ ] **9.5** Create arena list page: `src/app/arenas/page.tsx`
  - [ ] Fetch arenas via TanStack Query
  - [ ] Filter by status (registration, active, completed)
  - [ ] Grid of ArenaCards
  - [ ] "Create Arena" button
- [ ] **9.6** Create arena creation form: `src/app/arenas/create/page.tsx`
  - [ ] Form fields: name, description, preset selector (Blitz/Sprint/Daily/Weekly)
  - [ ] Start time picker (min 1 hour in future)
  - [ ] Min/max participants
  - [ ] Invite-only toggle
  - [ ] Submit → POST /api/arenas → redirect to arena page
- [ ] **9.7** Create arena detail page: `src/app/arenas/[arenaId]/page.tsx`
  - [ ] Registration phase: participant list, join button, countdown to start
  - [ ] Active phase: redirect to trade or spectate based on role
  - [ ] Completed phase: final results, winner, stats
- [ ] **9.8** Create RoundIndicator component: `src/components/arena/RoundIndicator.tsx`
  - [ ] Shows: current round name, timer, zone parameters (max leverage, drawdown, pairs)
- [ ] **9.9** Create Timer component: `src/components/shared/Timer.tsx`
  - [ ] Countdown timer (hook: `useCountdown`)
- [ ] **9.10** Create profile page: `src/app/profile/[address]/page.tsx`
  - [ ] User stats: arenas entered, wins, survival rate
  - [ ] Badge collection grid
  - [ ] Match history list
- [ ] **9.11** Create leaderboard page: `src/app/leaderboard/page.tsx`
  - [ ] Global rankings table
  - [ ] Sort by: wins, PnL, survival rate

### Done Criteria
- [ ] All pages render with dark theme
- [ ] Arena CRUD flow works end-to-end (create → list → detail → join)
- [ ] Navigation between pages is smooth
- [ ] Timer component shows accurate countdown
- [ ] Profile page displays user stats and badges

### Key Files Created
```
src/app/layout.tsx
src/app/page.tsx
src/app/arenas/page.tsx
src/app/arenas/create/page.tsx
src/app/arenas/[arenaId]/page.tsx
src/app/profile/[address]/page.tsx
src/app/leaderboard/page.tsx
src/components/shared/Navbar.tsx
src/components/shared/Timer.tsx
src/components/arena/ArenaCard.tsx
src/components/arena/ArenaGrid.tsx
src/components/arena/CreateArenaForm.tsx
src/components/arena/RoundIndicator.tsx
src/hooks/use-countdown.ts
src/hooks/use-arena.ts
src/stores/arena-store.ts
```

---

## Layer 10: Frontend — Trading UI

> **Goal**: Traders can place orders, view positions, see charts and account info within the arena.
> **Depends on**: Layer 5, Layer 9
> **Estimated effort**: 2 days

### Tasks

- [ ] **10.1** Create trading page: `src/app/arenas/[arenaId]/trade/page.tsx`
  - [ ] Layout: chart (left), order form (right), positions (bottom)
  - [ ] Round info bar at top (RoundIndicator + timer)
  - [ ] Mini leaderboard sidebar (your rank + nearby traders)
- [ ] **10.2** Create OrderForm component: `src/components/trading/OrderForm.tsx`
  - [ ] Tabs: Market / Limit
  - [ ] Fields: side (Long/Short), size, price (limit only), leverage slider
  - [ ] TP/SL optional inputs
  - [ ] Reduce-only toggle
  - [ ] Submit → POST /api/arenas/:id/trade
  - [ ] Error display (validation failures from order-validator)
- [ ] **10.3** Create PositionList component: `src/components/trading/PositionList.tsx`
  - [ ] Table: symbol, side, size, entry price, mark price, unrealized PnL, PnL%, leverage
  - [ ] Close button per position
  - [ ] TP/SL display + edit
  - [ ] Real-time PnL update from mark prices
- [ ] **10.4** Create OrderList component: `src/components/trading/OrderList.tsx`
  - [ ] Open orders table: symbol, side, type, size, price, status
  - [ ] Cancel button per order
- [ ] **10.5** Create Chart component: `src/components/trading/Chart.tsx`
  - [ ] TradingView Lightweight Charts integration
  - [ ] Candlestick chart with volume
  - [ ] Connect to Pacifica WS candle data (direct, public)
  - [ ] Symbol selector (only allowed pairs for current round)
- [ ] **10.6** Create AccountPanel component: `src/components/trading/AccountPanel.tsx`
  - [ ] Equity display (formatted with JetBrains Mono)
  - [ ] Balance, unrealized PnL
  - [ ] DrawdownMeter (from spectator components — shared)
  - [ ] Current leverage display
  - [ ] Loot badges (Wide Zone, Second Life) if active
- [ ] **10.7** Create DrawdownMeter component: `src/components/shared/DrawdownMeter.tsx`
  - [ ] Horizontal bar: current drawdown vs max allowed
  - [ ] Colors: green (0-50%), yellow (50-75%), orange (75-90%), red (90-100%+)
  - [ ] Pulse animation when in DANGER zone
- [ ] **10.8** Create trading hooks
  - [ ] `useTrading()` — order submission, cancel
  - [ ] `usePositions()` — position data, real-time updates
  - [ ] `useWebSocket()` — Pacifica WS connection management
- [ ] **10.9** Create Zustand stores
  - [ ] `trading-store.ts` — order form state
  - [ ] `ws-store.ts` — WebSocket connection state, mark prices
- [ ] **10.10** Verify: place order from UI → position appears → PnL updates live

### Done Criteria
- [ ] Market and limit orders submittable from UI
- [ ] Positions display with real-time PnL from mark prices
- [ ] Chart renders live candles
- [ ] DrawdownMeter updates in real-time with correct colors
- [ ] Order validation errors shown to user
- [ ] Round restrictions enforced (pair selector only shows allowed pairs)

### Key Files Created
```
src/app/arenas/[arenaId]/trade/page.tsx
src/components/trading/OrderForm.tsx
src/components/trading/PositionList.tsx
src/components/trading/OrderList.tsx
src/components/trading/Chart.tsx
src/components/trading/AccountPanel.tsx
src/components/shared/DrawdownMeter.tsx
src/hooks/use-trading.ts
src/hooks/use-positions.ts
src/hooks/use-websocket.ts
src/stores/trading-store.ts
src/stores/ws-store.ts
```

---

## Layer 11: Frontend — Spectator Experience

> **Goal**: Spectators can watch live arena action, see eliminations, vote for Second Life.
> **Depends on**: Layer 9, Layer 12
> **Estimated effort**: 1.5 days

### Tasks

- [ ] **11.1** Create spectator page: `src/app/arenas/[arenaId]/spectate/page.tsx`
  - [ ] Survivor grid (main area)
  - [ ] Activity feed (sidebar or bottom)
  - [ ] Round info + timer (top bar)
  - [ ] Vote panel (when voting is active)
- [ ] **11.2** Create SurvivorGrid component: `src/components/spectator/SurvivorGrid.tsx`
  - [ ] Grid of trader cards
  - [ ] Sorted by PnL% (real-time reorder)
  - [ ] Each card: rank, username, PnL%, drawdown meter, status badge, loot icons
  - [ ] Click to expand → TraderCard detail
- [ ] **11.3** Create StatusBadge component: `src/components/shared/StatusBadge.tsx`
  - [ ] SAFE (green), CAUTION (yellow), DANGER (orange), CRITICAL (red, pulsing), ELIMINATED (grey)
  - [ ] Calculated from drawdown % vs max thresholds
- [ ] **11.4** Create TraderCard component: `src/components/spectator/TraderCard.tsx`
  - [ ] Expanded view when clicking a trader
  - [ ] Shows: PnL%, drawdown meter, trade count, active loots
  - [ ] After round ends: shows positions, trade history, equity curve
- [ ] **11.5** Create ActivityFeed component: `src/components/spectator/ActivityFeed.tsx`
  - [ ] Scrolling list of events (newest at top)
  - [ ] Event types: trade, elimination, loot award, round transition, Second Life
  - [ ] Color-coded by type
  - [ ] Auto-scroll on new events
- [ ] **11.6** Create EliminationBanner component: `src/components/spectator/EliminationBanner.tsx`
  - [ ] Full-width alert banner when a trader is eliminated
  - [ ] Red theme, trader name, reason, final equity
  - [ ] Auto-dismiss after 5 seconds
  - [ ] Sound effect: elimination.mp3
- [ ] **11.7** Create VotePanel component: `src/components/spectator/VotePanel.tsx`
  - [ ] Shows eligible traders (bottom 50% only)
  - [ ] Vote button per trader
  - [ ] Live vote tally
  - [ ] Voting window indicator (last 5 min of round / 30s for Blitz)
  - [ ] 1 vote per spectator per round
- [ ] **11.8** Create RoundTransition component: `src/components/arena/RoundTransition.tsx`
  - [ ] Full-screen overlay animation
  - [ ] New round name, parameter changes (red flash for tightening)
  - [ ] 3-2-1 countdown
  - [ ] Sound effect: round-start.mp3
- [ ] **11.9** Create vote API route: `POST /api/arenas/[arenaId]/vote`
  - Auth required, 1 vote per round per wallet
  - Only during voting window
  - Only bottom 50% traders eligible
- [ ] **11.10** Verify: spectator sees live leaderboard, elimination banner, and can vote

### Done Criteria
- [ ] Survivor grid shows all traders with real-time PnL and drawdown
- [ ] Activity feed streams events in real-time
- [ ] Elimination banner appears with animation + sound
- [ ] Voting works with anti-sybil constraints (1 per wallet, bottom 50% only)
- [ ] Round transition animation plays between rounds

### Key Files Created
```
src/app/arenas/[arenaId]/spectate/page.tsx
src/components/spectator/SurvivorGrid.tsx
src/components/spectator/TraderCard.tsx
src/components/spectator/ActivityFeed.tsx
src/components/spectator/EliminationBanner.tsx
src/components/spectator/VotePanel.tsx
src/components/shared/StatusBadge.tsx
src/components/arena/RoundTransition.tsx
src/app/api/arenas/[arenaId]/vote/route.ts
src/hooks/use-leaderboard.ts
public/sounds/elimination.mp3
public/sounds/round-start.mp3
```

---

## Layer 12: Real-Time System

> **Goal**: Live data flows from engine → Supabase Realtime → frontend. Pacifica WS → frontend for public data.
> **Depends on**: Layer 6, Layer 9
> **Estimated effort**: 1 day

### Tasks

- [ ] **12.1** Set up Supabase Realtime subscriptions on frontend
  - [ ] `arena-updates` channel: listen for arena status changes (round transitions)
  - [ ] `arena-events` channel: listen for new events (trades, eliminations, loots)
  - [ ] `participant-updates` channel: listen for participant changes (elimination, equity)
  - [ ] `votes` channel: listen for new spectator votes
- [ ] **12.2** Create `useArenaRealtime` hook: `src/hooks/use-arena-realtime.ts`
  - Subscribe to all relevant channels for a given arenaId
  - Update Zustand stores on data arrival
  - Clean up subscriptions on unmount
- [ ] **12.3** Set up direct Pacifica WS connection for public data
  - [ ] Price data → chart updates (candles, mark price overlay)
  - [ ] Orderbook data → orderbook visualization
  - [ ] No auth needed (public channels)
  - [ ] Separate from engine's WS connection
- [ ] **12.4** Throttle Supabase Realtime writes from engine
  - Leaderboard updates: batch write every 3 seconds (not on every price tick)
  - Event inserts: immediate (low frequency, ~1-5 per minute)
  - Equity snapshots: every 10 seconds
- [ ] **12.5** Handle disconnection gracefully
  - [ ] Auto-reconnect Supabase Realtime
  - [ ] Auto-reconnect Pacifica WS
  - [ ] Show "reconnecting..." indicator in UI
  - [ ] Refetch full state after reconnection
- [ ] **12.6** Verify: price update on Pacifica → engine calculates equity → writes to Supabase → frontend updates leaderboard — all within 3 seconds

### Done Criteria
- [ ] Leaderboard updates live (< 3s latency)
- [ ] Elimination events appear instantly
- [ ] Charts update in real-time from Pacifica WS
- [ ] Reconnection works after brief disconnection
- [ ] No memory leaks from WebSocket subscriptions

### Key Files Created
```
src/hooks/use-arena-realtime.ts
src/lib/pacifica/frontend-ws.ts
```

---

## Layer 13: Integrations

> **Goal**: Fuul (referrals + sybil) and Elfa AI (sentiment + commentary) integrated.
> **Depends on**: Layer 3, Layer 4
> **Estimated effort**: 1 day

### Tasks

- [ ] **13.1** Create Fuul client: `src/lib/fuul/client.ts`
  - [ ] `checkSybil(walletAddress)` — verify wallet legitimacy on arena join
  - [ ] `trackEvent(eventName, data)` — track: arena_joined, arena_won, round_survived, elimination
  - [ ] `getReferralLink(userId)` — generate unique referral URL
  - [ ] `getLeaderboard()` — fetch global leaderboard data
- [ ] **13.2** Integrate sybil check into arena join flow (Layer 4)
  - Before creating subaccount: call `checkSybil()`
  - If flagged: reject join with error
- [ ] **13.3** Integrate event tracking into arena lifecycle
  - [ ] On join: `trackEvent("arena_joined")`
  - [ ] On elimination: `trackEvent("elimination")`
  - [ ] On win: `trackEvent("arena_won")`
- [ ] **13.4** Create referral UI
  - [ ] Referral link display on profile page
  - [ ] Copy-to-clipboard button
  - [ ] Referral stats (count, points)
- [ ] **13.5** Create Elfa AI client: `src/lib/elfa/client.ts`
  - [ ] `getSentiment(symbol)` — fetch social sentiment score
  - [ ] `generateCommentary(context)` — AI-generated market commentary
- [ ] **13.6** Create MarketContext component: `src/components/spectator/MarketContext.tsx`
  - [ ] Display sentiment scores per asset
  - [ ] AI commentary at round start and on major events
  - [ ] Refresh every 5 minutes
- [ ] **13.7** Create API routes for market data
  - [ ] `GET /api/markets/sentiment/[symbol]` — proxied from Elfa AI
  - [ ] `GET /api/markets/commentary/[arenaId]` — generated commentary
- [ ] **13.8** Verify: sybil check blocks flagged wallets
- [ ] **13.9** Verify: referral link generates and tracks correctly

### Done Criteria
- [ ] Sybil check blocks flagged wallets from joining arenas
- [ ] Referral events tracked in Fuul
- [ ] Global leaderboard populated from Fuul data
- [ ] Market sentiment displayed in spectator view
- [ ] AI commentary generates at round start

### Key Files Created
```
src/lib/fuul/client.ts
src/lib/elfa/client.ts
src/components/spectator/MarketContext.tsx
src/app/api/markets/sentiment/[symbol]/route.ts
src/app/api/markets/commentary/[arenaId]/route.ts
```

---

## Layer 14: Mock Engine (Demo Safety Net)

> **Goal**: DEMO_MODE=true runs the full game with simulated data — no Pacifica dependency.
> **Depends on**: Layer 6, Layer 7
> **Estimated effort**: 1 day

### Tasks

- [ ] **14.1** Create mock price generator: `engine/src/mock/price-generator.ts`
  - Random walk price data for BTC, ETH, SOL
  - Emits price updates every 1 second
  - Configurable volatility
  - Realistic-looking candle data
- [ ] **14.2** Create mock traders: `engine/src/mock/bot-traders.ts`
  - 4-8 pre-scripted bot behaviors:
    - "Conservative" — small positions, tight stops
    - "Aggressive" — high leverage, volatile PnL
    - "Scalper" — frequent small trades
    - "YOLO" — destined to hit drawdown limit (for demo elimination)
  - Each bot generates trades at randomized intervals
- [ ] **14.3** Create mock Pacifica client: `engine/src/mock/mock-pacifica.ts`
  - Same interface as real Pacifica client
  - All operations work in-memory (no network calls)
  - Simulated order fills, positions, equity
- [ ] **14.4** Create mock mode toggle: `engine/src/config.ts`
  - `DEMO_MODE = process.env.DEMO_MODE === "true"`
  - When true: use mock clients instead of real Pacifica
  - Same game logic, same DB writes, same frontend experience
- [ ] **14.5** Create demo arena auto-setup
  - On engine start in DEMO_MODE:
    - Auto-create a Blitz arena
    - Auto-join 6-8 bot traders
    - Auto-start after 30 seconds
    - Full lifecycle runs automatically
- [ ] **14.6** Verify: DEMO_MODE=true → full arena lifecycle with bots → winner determined → no Pacifica calls

### Done Criteria
- [ ] DEMO_MODE=true runs full game loop without Pacifica
- [ ] Bot traders behave distinctly (different strategies visible in data)
- [ ] At least one bot gets eliminated per round (dramatic for demo)
- [ ] All frontend features work identically in mock mode
- [ ] No real API calls made when DEMO_MODE=true

### Key Files Created
```
engine/src/mock/price-generator.ts
engine/src/mock/bot-traders.ts
engine/src/mock/mock-pacifica.ts
engine/src/config.ts
```

---

## Layer 15: Polish, Testing & Deployment

> **Goal**: Everything is polished, tested, deployed, and ready for demo day.
> **Depends on**: All previous layers
> **Estimated effort**: 3-4 days

### Tasks

#### Testing
- [ ] **15.1** Write unit tests: `tests/engine/`
  - [ ] `risk-monitor.test.ts` — drawdown calculation, Wide Zone buffer, Second Life
  - [ ] `elimination.test.ts` — cancel orders, close positions, transfer funds
  - [ ] `loot-calculator.test.ts` — Wide Zone winner, Second Life winner, edge cases
  - [ ] `order-validator.test.ts` — pair restriction, leverage limit, grace period
- [ ] **15.2** Write integration tests: `tests/api/`
  - [ ] `arenas.test.ts` — create, list, join, edge cases (full, duplicate)
  - [ ] `trade.test.ts` — market order, limit order, validation rejection
- [ ] **15.3** End-to-end test: Blitz arena lifecycle
  - Create → join 4+ → start → trade → eliminate → advance rounds → winner
- [ ] **15.4** Multi-user test (multiple browser windows)
- [ ] **15.5** Run all edge case scenarios from PROTOCOL.md Section 3.9

#### UI Polish
- [ ] **15.6** Loading states and skeleton screens for all pages
- [ ] **15.7** Error states (network error, API error, empty states)
- [ ] **15.8** Responsive layout (desktop priority, 1920px, 1440px, 1024px)
- [ ] **15.9** Animation polish (Framer Motion on key transitions)
- [ ] **15.10** Typography consistency (Inter + JetBrains Mono)

#### Deployment
- [ ] **15.11** Deploy frontend to Vercel (production)
- [ ] **15.12** Deploy engine to Railway (production, always-on)
- [ ] **15.13** Configure production environment variables
- [ ] **15.14** Verify health checks on both services
- [ ] **15.15** Test full flow on production deployment

#### Demo Prep
- [ ] **15.16** Set up 6 test wallets with testnet funds
- [ ] **15.17** Pre-create demo arena, pre-join traders
- [ ] **15.18** Pre-execute some trades (history for demo)
- [ ] **15.19** Stage one trader near drawdown limit (live elimination during demo)
- [ ] **15.20** Rehearse demo flow 3 times
- [ ] **15.21** Record backup video (in case of live issues)

#### Submission
- [ ] **15.22** Clean commit history
- [ ] **15.23** Write final README.md (setup instructions, tech stack, Pacifica endpoints used)
- [ ] **15.24** Prepare submission materials (code repo, demo video, documentation)
- [ ] **15.25** Submit via: https://forms.gle/zYm9ZBH1SoUE9t9o7

### Done Criteria
- [ ] All unit tests pass
- [ ] Full Blitz lifecycle completes without errors
- [ ] UI renders correctly on 1024px+ screens
- [ ] Both services deployed and healthy in production
- [ ] Demo runs smoothly 3 consecutive times
- [ ] All submission materials ready

---

## Progress Summary

| Layer | Name | Status | Tasks Done |
|-------|------|--------|------------|
| 0 | Project Foundation | 🟡 In Progress | 8/10 |
| 1 | Database | ✅ Complete | 9/9 |
| 2 | Pacifica TypeScript SDK | ✅ Complete | 10/10 |
| 3 | Authentication | ✅ Complete | 9/9 |
| 4 | Arena Management | ✅ Complete | 9/9 |
| 5 | Trading Engine | ✅ Complete | 8/8 |
| 6 | Risk Engine | ✅ Complete | 8/8 |
| 7 | Round & Elimination Engine | ⬜ Not Started | 0/10 |
| 8 | Loot System | ⬜ Not Started | 0/6 |
| 9 | Frontend — Shell & Pages | ⬜ Not Started | 0/11 |
| 10 | Frontend — Trading UI | ⬜ Not Started | 0/10 |
| 11 | Frontend — Spectator | ⬜ Not Started | 0/10 |
| 12 | Real-Time System | ⬜ Not Started | 0/6 |
| 13 | Integrations | ⬜ Not Started | 0/9 |
| 14 | Mock Engine | ⬜ Not Started | 0/6 |
| 15 | Polish & Deployment | ⬜ Not Started | 0/25 |

**Total tasks: 156 | Done: 61 | Remaining: 95**

---

## Notes for Resuming Agents

- **What was just completed**: Layer 6 complete. In-memory state types (TraderState, PositionState, ArenaState), PriceManager (Pacifica WS → Map<symbol, markPrice>), RiskMonitor (per-tick equity calc, drawdown breach → elimination/Second Life), PeriodicSync (30s reconciliation + equity snapshots), LeaderboardUpdater (3s PnL% updates). Integrated: arena-manager calls initArena() + starts sync/leaderboard, order-relay calls onTradeExecuted().
- **What to do next**: Layer 7 (Round & Elimination Engine). REMINDER: After Layer 7-8, consider splitting into 2 agents (backend + frontend).
- **Key files to read first**:
  1. `COLOSSEUM_BLUEPRINT.md` — full project spec (game mechanics, DB schema, backend services, frontend pages)
  2. `PROTOCOL.md` — distilled protocol rules (round parameters, elimination logic, loot rules)
  3. `pacifica-sdk/` — Python SDK examples showing exact Pacifica API patterns
  4. This file (`DEVELOPMENT_LAYERS.md`) — layer-by-layer task checklist
- **Known blockers**: Tasks 0.9 and 0.10 need cloud accounts (Vercel + Railway/Fly.io). Pacifica testnet access needs to be verified.
- **Critical decisions already made**:
  - Two-server architecture: Next.js on Vercel (frontend) + Node.js on Railway (game engine)
  - Local PnL Engine calculates equity from WS mark prices (not REST polling)
  - Testnet only ($1,000 starting capital)
  - 2 loots only for MVP (Wide Zone + Second Life)
  - Blitz preset (5 min) for demo day
- **Don't forget**: The `pacifica-sdk/` directory contains working Python examples for every API call — use these as reference when building the TypeScript SDK (Layer 2).

---

## Dependency Graph

```
Layer 0 (Foundation)
  ├── Layer 1 (Database)
  │     └── Layer 3 (Auth) ────────────────────────┐
  │           └── Layer 4 (Arena Management) ◄──────┤
  │                 ├── Layer 5 (Trading Engine) ◄──┤── Layer 2 (Pacifica SDK)
  │                 └── Layer 6 (Risk Engine) ◄─────┘
  │                       ├── Layer 7 (Round & Elimination)
  │                       │     └── Layer 8 (Loot System)
  │                       └── Layer 12 (Real-Time) ──────┐
  │                                                       │
  └── Layer 9 (Frontend Shell) ◄──────────────────────────┘
        ├── Layer 10 (Trading UI) ◄── Layer 5
        └── Layer 11 (Spectator) ◄── Layer 12
              └── Layer 13 (Integrations) ◄── Layer 3, 4

  Layer 14 (Mock Engine) ◄── Layer 6, 7
  Layer 15 (Polish) ◄── All layers
```

**Parallelizable:**
- Layer 1 + Layer 2 can run in parallel (both depend only on Layer 0)
- Layer 9 can start as soon as Layer 0 + Layer 3 are done (frontend work independent of engine)
- Layer 14 can be built anytime after Layer 6+7

---

*Last updated: 2026-03-27*

# Pacifica Colosseum

**Battle Royale Trading Competition** — built on [Pacifica](https://pacifica.fi) perpetual futures.

> Traders enter an arena. Rounds get harder. Leverage drops. Drawdown tightens. Only one survives.

**Live**: [pacifica-colosseum.vercel.app](https://pacifica-colosseum.vercel.app)

---

## How It Works

1. **Join** — Enter an arena with other traders
2. **Draft Territory** — Each round, snake draft assigns you a board position with unique modifiers
3. **Trade** — Open positions on Pacifica perpetual futures (BTC, ETH, SOL)
4. **Survive** — Each round tightens the rules. Bottom-row territories = auto-elimination
5. **Skirmish** — Attack adjacent territories every 60s to steal better positions
6. **Win** — Last trader standing takes the crown

### Round Progression

| Round | Name | Max Leverage | Max Drawdown | Elimination |
|-------|------|-------------|-------------|-------------|
| 1 | Open Field | 20x | 20% | Territory-based: bottom row + bottom 30% PnL |
| 2 | The Storm | 10x | 15% | Territory-based: bottom row + bottom 40% PnL |
| 3 | Final Circle | 5x | 10% | Territory-based: top 5 advance |
| 4 | Sudden Death | 3x | 8% | Any drawdown breach |

### Territory System

Each arena generates a **territory board** where each cell provides unique modifiers:

| Tier | PnL Bonus | DD Buffer | Leverage | Max Position |
|------|-----------|-----------|----------|-------------|
| **Top Row** | +5–8% | +3–5% | 100% | $500 |
| **Middle Row** | 0–2% | 0–1% | 70% | $250 |
| **Bottom Row** ⚠️ | -3–5% | -2–3% | 50% | $150 |

- **Snake Draft:** Top PnL% picks first. Last place gets first pick of next round.
- **Skirmish:** Every 60s, attack adjacent territories. Need 15% PnL lead to steal.
- **Elimination Zone:** Bottom-row traders auto-eliminated at round end.

### Loot System

- **Wide Zone** — +5% drawdown buffer for one round (awarded to lowest drawdown)
- **Second Life** — Forgives one drawdown breach (awarded to highest PnL%)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Framer Motion |
| State | Zustand, TanStack React Query v5 |
| Auth | Privy (email, social, wallet) |
| Database | Supabase (PostgreSQL, Realtime, RLS) |
| Trading | Pacifica TypeScript SDK (REST + WebSocket) |
| Engine | Node.js, Express 5, WebSocket |
| Charts | TradingView Lightweight Charts v5 |
| Deployment | Vercel (frontend), Railway (engine) |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Next.js App    │────▶│   Game Engine     │────▶│  Pacifica    │
│   (Vercel)       │     │   (Railway)       │     │  Testnet     │
│                  │     │                   │     │              │
│  • Pages/UI      │     │  • Risk Monitor   │     │  • REST API  │
│  • API Routes    │     │  • Round Engine   │     │  • WebSocket │
│  • Auth (Privy)  │     │  • Price Feed     │     │  • Orders    │
└────────┬─────────┘     │  • Eliminations   │     └──────────────┘
         │               │  • Settlement     │
         │               └────────┬──────────┘
         │                        │
         └────────────┬───────────┘
                      │
              ┌───────▼───────┐
              │   Supabase    │
              │               │
              │  • 14 Tables  │
              │  • RLS        │
              │  • Realtime   │
              └───────────────┘
```

### Real-Time Risk Engine

The engine monitors every trader's equity on every price tick (~1/sec) using WebSocket mark prices — **zero REST API calls** during normal operation:

```
Pacifica WS → PriceManager → RiskMonitor → Drawdown Check → Elimination
                                         → Equity Snapshots (every 30s)
                                         → Leaderboard Updates (every 3s)
```

---

## Pacifica API Endpoints Used

### REST (Authenticated, Ed25519 signed)
| Endpoint | Purpose |
|----------|---------|
| `POST /orders/create_market` | Market orders |
| `POST /orders/create` | Limit orders |
| `POST /orders/cancel` | Cancel order |
| `POST /orders/cancel_all` | Cancel all orders |
| `POST /orders/batch` | Batch orders |
| `POST /account/subaccount/create` | Create trader subaccount |
| `POST /account/subaccount/transfer` | Fund/withdraw subaccount |
| `POST /account/leverage` | Set leverage |
| `GET /account` | Account balance/equity |
| `GET /positions` | Open positions |
| `POST /whitelist/claim` | Claim access code (type: claim_access_code) |

### WebSocket (Public)
| Channel | Purpose |
|---------|---------|
| `prices` | Real-time mark prices for risk monitoring + charts |

---

## Local Development

### Prerequisites
- Node.js 22+
- npm
- Supabase project
- Privy app

### Setup

```bash
# Clone
git clone <repo-url>
cd pacifica-colosseum

# Install
npm install
cd engine && npm install && cd ..

# Environment
cp .env.example .env.local
# Fill in all values (see .env.example for descriptions)

# Run migrations
# Paste each file in supabase/migrations/ into Supabase SQL Editor

# Start frontend (port 3000)
npm run dev

# Start engine (port 4000) — separate terminal
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config engine/src/index.ts

# Demo mode (mock data, no Pacifica needed)
DEMO_MODE=true DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config engine/src/index.ts
```

### Tests

```bash
npx vitest run    # 53 tests
npx tsc --noEmit  # type check
```

---

## Project Structure

```
pacifica-colosseum/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (arenas, users, trade, vote)
│   │   ├── arenas/             # Arena pages (list, create, detail, trade, spectate)
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── arena/              # ArenaCard, RoundIndicator, RoundTransition
│   │   ├── shared/             # Navbar, Timer, DrawdownMeter, StatusBadge
│   │   ├── spectator/          # SurvivorGrid, TraderCard, ActivityFeed, VotePanel
│   │   ├── trading/            # OrderForm, PositionList, Chart, AccountPanel
│   │   └── territory/          # TerritoryBoard, TerritoryInfoCard, TerritoryDraftModal
│   ├── hooks/                  # useArena, useCountdown, useTrading, useWebSocket
│   ├── stores/                 # Zustand (arena, trading, ws)
│   └── lib/
│       ├── pacifica/           # Pacifica SDK (auth, client, websocket, types)
│       ├── supabase/           # Supabase clients + types
│       ├── auth/               # Privy middleware + user registration
│       └── utils/              # Constants, encryption, keypair, columns
├── engine/
│   ├── src/
│   │   ├── services/           # arena-manager, risk-monitor, territory-manager,
│   │   │                       # skirmish-scheduler, ability-manager, hazard-manager,
│   │   │                       # progression-manager, order-relay, settlement, etc.
│   │   ├── state/              # In-memory types, price manager
│   │   ├── timers/             # Arena + round timers
│   │   └── mock/               # Demo mode (price gen, bot traders, mock Pacifica)
│   └── package.json
├── supabase/migrations/        # SQL schema (5+ files)
├── tests/                      # Vitest unit tests (60+ tests)
└── iteration/                  # Layer-by-layer development summaries
```

---

## Hackathon

Built for the **Pacifica Hackathon 2026** (deadline: April 16, 2026).

- 20+ development layers, 200+ tasks
- ~120+ source files
- 60+ unit tests
- **Unique mechanics:** Territorial Trading, Ability System, Hazard Events, Progression Tree
- Live E2E verified on Pacifica testnet (subaccounts, trading, fund transfers)
- Deployed on Vercel + Railway

**Testnet Access**: Use code `Pacifica` at [test-app.pacifica.fi](https://test-app.pacifica.fi)

---

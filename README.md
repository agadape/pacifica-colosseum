# Pacifica Colosseum

**Battle Royale Trading Competition** — built on [Pacifica](https://pacifica.fi) perpetual futures.

> Traders enter an arena. Rounds get harder. Leverage drops. Drawdown tightens. Only one survives.

**Live Demo**: [pacifica-colosseum.vercel.app](https://pacifica-colosseum.vercel.app)
**Game Engine**: [adequate-determination-production-4cb3.up.railway.app](https://adequate-determination-production-4cb3.up.railway.app)

---

## How It Works

1. **Join** — Enter an arena with other traders
2. **Draft Territory** — Each round, snake draft assigns you a board position with unique modifiers
3. **Trade** — Open positions on Pacifica perpetual futures (BTC, ETH, SOL)
4. **Survive** — Each round tightens the rules. Bottom-row territories = auto-elimination
5. **Skirmish** — Attack adjacent territories every 60s to steal better positions
6. **Alliances** — Ally with another trader to average PnL. But beware: betrayal投票时刻
7. **Win** — Last trader standing takes the crown

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
|------|-----------|-----------|----------|---------------|
| **Top Row** | +5–8% | +3–5% | 100% | $500 |
| **Middle Row** | 0–2% | 0–1% | 70% | $250 |
| **Bottom Row** | -3–5% | -2–3% | 50% | $150 |

- **Snake Draft:** Top PnL% picks first. Last place gets first pick of next round.
- **Skirmish:** Every 60s, attack adjacent territories. Need 15% PnL lead to steal.
- **Elimination Zone:** Bottom-row traders auto-eliminated at round end.

### Alliance System

Form alliances with other traders. Averaged PnL counts for elimination ranking — weaker ally helps you survive. But a **betrayal vote** opens 60 seconds before round end: if a majority votes to betray, the traitor is eliminated instantly.

### Special Systems

- **Abilities** (M-2): Shield, Fortress, Second Wind, Sabotage — awarded each round, one-time use
- **Hazard Events** (M-4): 7 types (liquidation spike, volatility surge, funding shock, etc.) — weighted random, 1-3/round
- **Progression Tree** (M-5): After each round, choose Aggressive (+2x leverage), Defensive (+3% DD buffer), or Scout (reveal top traders' positions)
- **Loot**: Wide Zone (+5% DD buffer), Second Life (forgive one breach)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Framer Motion |
| State | Zustand, TanStack React Query v5 |
| Auth | Privy (email, social, wallet) |
| Database | Supabase (PostgreSQL, Realtime, RLS) |
| Trading | Pacifica TypeScript SDK (REST + WebSocket) |
| Engine | Node.js, Express, WebSocket |
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
         │               │  • Skirmish       │
         │               │  • Alliance       │
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

The engine monitors every trader's equity on every price tick (~1/sec) via WebSocket mark prices:

```
Pacifica WS → PriceManager → RiskMonitor → Drawdown Check → Elimination
                                         → Equity Snapshots (every 30s)
                                         → Leaderboard (every 15s)
```

### Demo Mode

Set `DEMO_MODE=true` to run fully without Pacifica testnet. Bot traders with 6 personalities (Conservative, Aggressive, Scalper, YOLO, Steady, Degen) auto-trade with realistic behavior. Perfect for hackathon demos.

---

## Pacifica API Endpoints Used

### REST (Authenticated, Ed25519 signed)
| Endpoint | Purpose |
|----------|---------|
| `POST /orders/create_market` | Market orders |
| `POST /orders/create` | Limit orders |
| `POST /orders/cancel` | Cancel order |
| `POST /orders/cancel_all` | Cancel all orders |
| `POST /account/subaccount/create` | Create trader subaccount |
| `POST /account/subaccount/transfer` | Fund/withdraw subaccount |
| `POST /account/leverage` | Set leverage |
| `GET /account` | Account balance/equity |
| `GET /positions` | Open positions |
| `POST /whitelist/claim` | Claim access code |

### WebSocket (Public)
| Channel | Purpose |
|---------|---------|
| `prices` | Real-time mark prices for risk monitoring + charts |

**Testnet Access**: Use code `Pacifica` at [test-app.pacifica.fi](https://test-app.pacifica.fi)

---

## Local Development

### Prerequisites
- Node.js 22+
- npm
- Supabase project (run `combined.sql`)
- Privy app

### Setup

```bash
# Clone
git clone https://github.com/<your-org>/pacifica-colosseum
cd pacifica-colosseum

# Install
npm install
cd engine && npm install && cd ..

# Environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRIVY_APP_ID, PRIVY_APP_SECRET, PACIFICA_ACCESS_CODE, ENCRYPTION_KEY

# Run migrations — paste supabase/migrations/combined.sql into Supabase SQL Editor

# Start frontend
npm run dev

# Start engine (separate terminal)
cd engine && npx tsx src/index.ts

# Demo mode (no Pacifica needed)
cd engine && DEMO_MODE=true npx tsx src/index.ts
```

### Running Tests

```bash
npx vitest run
npx tsc --noEmit
```

---

## Project Structure

```
pacifica-colosseum/
├── src/
│   ├── app/
│   │   ├── api/arenas/           # Arena REST API
│   │   ├── arenas/              # Arena list, create, detail pages
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── AlliancePanel.tsx    # Alliance propose/accept/decline
│   │   ├── BetrayalVoteModal.tsx # Betrayal vote UI
│   │   ├── TerritoryBoard.tsx   # Territory grid + draft
│   │   ├── ProgressionModal.tsx # Path selection modal
│   │   ├── HazardBanner.tsx     # Active hazard alerts
│   │   └── trading/             # OrderForm, Chart, Positions
│   └── hooks/                   # useArena, useLeaderboard, usePositions
├── engine/src/
│   ├── services/
│   │   ├── arena-manager.ts     # Arena lifecycle
│   │   ├── risk-monitor.ts      # Drawdown tracking + elimination
│   │   ├── settlement.ts        # Round close + winner determination
│   │   ├── skirmish-scheduler.ts # Territory attack scheduler
│   │   ├── ability-manager.ts   # Ability award + activation
│   │   ├── hazard-manager.ts    # Hazard event scheduler
│   │   ├── alliance-manager.ts  # Alliance PnL averaging + betrayal
│   │   └── order-relay.ts       # Pacifica order execution
│   ├── state/price-manager.ts   # WebSocket price feed + staleness
│   ├── timers/                  # Round + arena timers
│   └── mock/
│       ├── demo-setup.ts        # DEMO_MODE auto-setup
│       ├── bot-traders.ts       # 6 bot personalities
│       └── mock-pacifica.ts     # Mock REST + WS
├── supabase/migrations/
│   ├── combined.sql             # All migrations consolidated
│   └── 001-009_*.sql            # Individual migrations
└── tests/engine/               # Vitest unit tests
```

**Supabase Schema**: 14 tables — arenas, traders, participants, territories, abilities, hazards, progressions, alliances, equity_snapshots, leaderboard_snapshots, trade_logs, game_events, badges, anomaly_events

---

## Submission

**Hackathon**: Pacifica Hackathon 2026 — Deadline April 16, 2026

**Demo**: The app ships with `DEMO_MODE=true` for fully functional demo without testnet access.

**Key features for judges**:
- Unique battle royale trading mechanic (4-round progressive elimination)
- Territory system with strategic skirmish battles
- Alliance + betrayal mechanic (social layer)
- Real-time risk monitoring via WebSocket
- Full game loop: setup → rounds → eliminations → settlement → badges
- 6 bot personalities for self-running demos
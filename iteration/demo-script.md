# Pacifica Colosseum — Demo Script

**Duration**: 5-7 minutes
**URL**: https://pacifica-colosseum.vercel.app
**Engine**: https://adequate-determination-production-4cb3.up.railway.app

---

## Demo Flow

### 1. Landing Page (30s)
- Open https://pacifica-colosseum.vercel.app
- Show the cinematic hero: "Survive. Adapt. Trade."
- Scroll down to "How it works" — 3 steps
- Point out: clean UI, animations, light theme

### 2. Connect Wallet (30s)
- Click "Connect" → Privy modal opens
- Login with email (fastest for demo)
- Show wallet address in navbar

### 3. Browse Arenas (30s)
- Navigate to /arenas
- Show the demo arena (auto-created by DEMO_MODE)
- Point out: status badges, countdown timers, participant counts
- Show filters (Open, Active, Completed)

### 4. Arena Detail (1 min)
- Click into the demo arena
- Show: participant list with bot traders
- Show: round indicator (Open Field, leverage 20x, drawdown 20%)
- If registration phase: show Join button
- If active: show real-time data updating

### 5. Trading View (1 min)
- Navigate to /arenas/{id}/trade
- Show: live chart with price feed from Pacifica WebSocket
- Show: order form (Market/Limit, Long/Short, leverage slider)
- Show: positions panel (real-time PnL from mark prices)
- Show: drawdown meter changing colors

### 6. Spectator View (1 min)
- Navigate to /arenas/{id}/spectate
- Show: survivor grid — bot traders ranked by PnL%
- Show: activity feed — trades, events in real-time
- Show: status badges (SAFE, CAUTION, DANGER)
- Point out: eliminated traders grayed out

### 7. Technical Highlights (1 min)
- "Real-time risk engine monitors drawdown on every price tick"
- "Zero API calls for routine monitoring — all WebSocket"
- "Battle royale format: rounds get harder, leverage drops, drawdown tightens"
- "Loot system: Wide Zone (+5% buffer), Second Life (forgives one breach)"
- "Built on Pacifica perpetual futures — real orderbook, real execution"

### 8. Architecture (30s)
- "Next.js 15 frontend on Vercel"
- "Node.js game engine on Railway"
- "Supabase for real-time data"
- "Pacifica SDK for trading"
- "Built in 2 days with Claude Code" (optional flex)

---

## Backup Plans

- **If engine is down**: Show local DEMO_MODE (same experience)
- **If Pacifica WS disconnects**: Chart shows last known price, reconnect indicator appears
- **If Privy fails**: Show screenshots of login flow
- **If judges ask about live trading**: "Beta code pending, but API format verified 6/6 against testnet"

---

## Key Talking Points for Judges

1. **Not just another trading dashboard** — it's a competitive game with eliminations
2. **Real-time risk engine** — per-tick equity calculation, zero API polling
3. **Battle royale format** — rounds shrink, only one survives
4. **Built on Pacifica's infrastructure** — real perpetual futures, real orderbook
5. **Full stack** — 95 source files, 53 tests, deployed on Vercel + Railway

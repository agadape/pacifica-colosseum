# PACIFICA COLOSSEUM — Complete Project Blueprint

> **"The Last Trader Standing"**
> A funded trading arena where traders prove skill through adaptation, not just profit.
> Built on Pacifica's perpetuals infrastructure for the Pacifica Hackathon 2026.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Game Mechanics — Complete Rules](#3-game-mechanics--complete-rules)
4. [Trading Mechanics — What & How](#4-trading-mechanics--what--how)
5. [Loot System — Strategic Depth](#5-loot-system--strategic-depth)
6. [Spectator System](#6-spectator-system)
7. [Rewards & Prize Distribution](#7-rewards--prize-distribution)
8. [Technical Architecture](#8-technical-architecture)
9. [Pacifica API Integration Map](#9-pacifica-api-integration-map)
10. [Sponsor Tool Integration](#10-sponsor-tool-integration)
11. [Database Schema](#11-database-schema)
12. [Backend Logic & Services](#12-backend-logic--services)
13. [Frontend Architecture](#13-frontend-architecture)
14. [WebSocket Real-Time System](#14-websocket-real-time-system)
15. [API Endpoints (Our Backend)](#15-api-endpoints-our-backend)
16. [Authentication & Security](#16-authentication--security)
17. [Smart Contract Consideration](#17-smart-contract-consideration)
18. [Development Timeline](#18-development-timeline)
19. [Testing Strategy](#19-testing-strategy)
20. [Deployment & Infrastructure](#20-deployment--infrastructure)
21. [Demo Day Strategy](#21-demo-day-strategy)
22. [Risk & Mitigation](#22-risk--mitigation)
23. [Final Deliverables Checklist](#23-final-deliverables-checklist)

---

## 1. Project Overview

### What Is Pacifica Colosseum?

Pacifica Colosseum is a **funded trading challenge platform with a Battle Royale elimination format**. Traders enter an "arena" — each receiving an equal funded account on Pacifica — and compete through multiple rounds of progressively tightening conditions. The arena's "zone" shrinks each round: max leverage decreases, available trading pairs reduce, and maximum drawdown tolerance tightens. Traders who breach the rules or hit their drawdown limit are eliminated. The last traders standing win.

### Hackathon Track

**Track 3: Social & Gamification** — Leaderboards, copy trading, competitions.

Also touches:
- Track 1 (Trading Applications) — traders can connect bots via API
- Track 2 (Analytics & Data) — spectator analytics dashboard
- Track 4 (DeFi Composability) — subaccount vault architecture

### Tagline Options

- "Survive. Adapt. Trade."
- "Where Zone Shrinks and Legends Rise."
- "The Last Trader Standing."

### Primary User: THE TRADER

Colosseum is built for **one user first: the trader who wants to prove they can adapt.**
Everything else in the product exists to serve that trader's experience.

| User Type | Priority | Role | Why They Exist |
|---|---|---|---|
| **Traders** (aspiring + experienced) | **PRIMARY** | Participants | This is who we build for. The entire product serves them. |
| **Spectators** | Supporting | Viewers | Traders need an audience for social stakes. Spectators create pressure. |
| **Arena Creators** | Future (post-MVP) | Organizers | Scales the platform without us being the bottleneck. MVP: we host arenas. |
| **Bot Builders** | Passive | Participants via API | We don't block them, but we don't build features specifically for them in MVP. |

> **Positioning clarity:** If a feature doesn't make the trader's experience better,
> it doesn't belong in MVP. Spectator features exist because they CREATE stakes for
> traders (being watched = pressure = realistic conditions). Referrals exist because
> they bring MORE traders. AI commentary exists because it enriches the arena atmosphere.

---

## 2. Problem Statement

### The Problem

Crypto trading skill development is broken:

| Current Option | Problem |
|---|---|
| **Paper trading** | Zero consequences → zero pressure → builds bad habits |
| **Real trading** | Risk real capital → emotional decisions → beginners get rekt |
| **Prop firms (FTMO, etc.)** | Expensive ($100-$500 entry), solitary, one-dimensional evaluation |
| **Trading competitions** | "Highest PnL wins" = rewards gambling, not skill |
| **Social trading** | Copy trading ≠ learning; followers don't understand the "why" |

### The Core Insight

The problem with paper trading isn't "no money" — it's **no consequences**. Nobody cares
about a demo account because nothing happens when you fail. Real skill development requires
pressure, and pressure comes from consequences that matter to you: public elimination in
front of spectators, a permanent record on your profile, losing your rank on the leaderboard.

Real trading skill also isn't about one strategy in one market condition. It's about
**ADAPTABILITY** — the ability to adjust risk, strategy, and approach as conditions change.
No existing platform tests for this.

### Our Solution

A platform that creates **competitive consequences without financial risk**:

1. **Funded accounts** → no money at risk, but elimination is public and permanent
2. **Adaptive rounds** → conditions change each round, testing true adaptability
3. **Social spectating** → being watched creates psychological pressure (like ranked games)
4. **Permanent record** → your profile shows every arena: wins, eliminations, survival rate
5. **Graduated stakes** → prove yourself for free first, then compete for real money (future mainnet)

> **On testnet vs "real stakes":** Chess tournaments create intense pressure without
> betting money. Ranked games (League of Legends, Valorant) create more pressure than
> casual games despite being free. The elimination format + public spectating + permanent
> profile IS the stake. Testnet lets us prove the format works. Mainnet adds financial
> stakes on top for those who've proven their skill — like prop firms offering funded
> accounts after passing a free evaluation.

---

## 3. Game Mechanics — Complete Rules

### 3.1 Arena Concept

An **Arena** is a single competition instance. Think of it like a "match" or "lobby" in a game.

```
Arena = {
  id: unique identifier,
  name: "Monday Night Colosseum",
  creator: wallet address of organizer,
  status: "registration" | "round_1" | "round_2" | "round_3" | "sudden_death" | "completed",
  participants: [...traders],
  spectators: [...viewers],
  config: ArenaConfig,
  created_at: timestamp,
  starts_at: timestamp
}
```

### 3.2 Who Can Create an Arena?

**Anyone with a connected wallet** can create an arena. The creator becomes the "Arena Master" and configures:

- Arena name & description
- Start time (must be at least 1 hour in the future)
- Number of rounds (2, 3, or 4 — default: 4)
- Starting capital per trader (on testnet: $1,000 virtual USDC)
- Entry requirements (open to all, or invite-only via referral code)
- Arena duration preset (see Section 3.4)

**For hackathon MVP**: Arena creation will use pre-configured templates to simplify. The creator picks a preset:

| Preset | Total Duration | Rounds | Best For |
|---|---|---|---|
| **Blitz** | 5 minutes | 3 rounds (90s/90s/60s + 60s sudden death) | Demo day, quick tests |
| **Sprint** | 2 hours | 3 rounds (30m/30m/30m + 30m sudden death) | Quick matches |
| **Daily** | 24 hours | 4 rounds (6h/6h/6h/6h) | Daily competitions |
| **Weekly** | 7 days | 4 rounds (2d/2d/2d/1d) | Serious competitions |
| **Custom** | Configurable | 2-4 rounds | Advanced organizers |

> **NOTE:** For hackathon demo day, always use **Blitz** preset. Juri can watch the full lifecycle (start → trade → eliminate → winner) in 5 minutes without waiting.

### 3.3 Participants — Min & Max

| Parameter | Value | Rationale |
|---|---|---|
| **Minimum participants** | **4** | Need enough for meaningful elimination (at least 1 eliminated per round) |
| **Maximum participants** | **100** | Subaccount management + real-time monitoring scalability |
| **Recommended sweet spot** | **16-32** | Best spectator experience, meaningful competition |
| **Spectators** | **Unlimited** | Read-only, no subaccount needed |

**If minimum not met**: Arena auto-cancels 10 minutes before start time and funds are returned.

### 3.4 Round Structure — Detailed

Each arena has **4 phases** (3 main rounds + sudden death). Here's the complete breakdown using the **Sprint preset** as the reference example:

#### ROUND 1: "OPEN FIELD" — The Warm-Up

```
Duration:        30 minutes (Sprint) / 6 hours (Daily) / 2 days (Weekly)
Available Pairs: ALL pairs on Pacifica (BTC-PERP, ETH-PERP, SOL-PERP, etc.)
Max Leverage:    20x
Margin Mode:     Cross or Isolated (trader's choice)
Max Drawdown:    20% of starting capital ($200 on $1,000)
Elimination:     Bottom 30% of surviving traders BY PnL at round end
                 + anyone who hits 20% drawdown during the round (instant elimination)
                 + anyone with 0 trades at round end (inactivity elimination)
Min Activity:    Must execute >= 3 round-trip trades AND total volume >= 10% of capital
```

**Round 1 Goals for Traders:**
- Establish positions, test the waters
- Avoid reckless bets — drawdown elimination is real
- Secure a safe PnL ranking (don't need to be #1, just not bottom 30%)
- **You MUST trade** — AFK/camping with 0% PnL is not allowed (see Min Activity rule)

#### ROUND 2: "THE STORM" — Pressure Builds

```
Duration:        30 minutes (Sprint) / 6 hours (Daily) / 2 days (Weekly)
Available Pairs: TOP 3 pairs by 24h volume only (e.g., BTC-PERP, ETH-PERP, SOL-PERP)
Max Leverage:    10x (reduced from 20x)
Margin Mode:     Isolated only (forced)
Max Drawdown:    15% of CURRENT equity (not starting capital)
Elimination:     Bottom 40% of surviving traders BY PnL at round end
                 + anyone who hits 15% drawdown (instant)
                 + anyone with 0 trades at round end (inactivity elimination)
Min Activity:    Must execute >= 3 round-trip trades AND total volume >= 10% of capital
```

**Round 2 Forces Adaptation:**
- Can't rely on altcoin pairs for alpha — limited to major pairs
- Lower leverage = smaller position sizes, need precision
- Isolated margin = each position's risk is capped, no cross-margin safety net
- Drawdown calculated on CURRENT equity, not starting capital — if you entered Round 2 with $12,000, your drawdown limit is $1,800

#### ROUND 3: "FINAL CIRCLE" — High Stakes

```
Duration:        30 minutes (Sprint) / 6 hours (Daily) / 2 days (Weekly)
Available Pairs: BTC-PERP ONLY
Max Leverage:    5x
Margin Mode:     Isolated only
Max Drawdown:    10% of current equity
Elimination:     Only TOP 5 traders advance to Sudden Death
                 + anyone who hits 10% drawdown (instant)
```

**Round 3 Is Pure Skill:**
- Everyone trades the same pair — no informational edge from obscure pairs
- 5x leverage on BTC = very tight margin for error
- 10% drawdown = one bad trade and you're done
- Only the most skilled, disciplined traders survive

#### SUDDEN DEATH: "THE FINAL DUEL"

```
Duration:        30 minutes (Sprint) / 6 hours (Daily) / 1 day (Weekly)
Available Pairs: BTC-PERP ONLY
Max Leverage:    3x
Margin Mode:     Isolated only
Max Drawdown:    8% of current equity (tight but survivable)
Elimination:     ANY drawdown breach = instant elimination
                 Last trader standing wins
                 If multiple survive: highest PnL% wins
Safety Valve:    If ALL traders eliminated within first 60 seconds, round resets with 12% drawdown
```

**Sudden Death Rules:**
- 3x leverage on BTC with 8% drawdown limit = pure risk management
- No round-end elimination — it's purely survival
- If you hit -8% at ANY point, you're out immediately
- At 1x leverage, you need an 8% BTC move to die — reasonable
- At 3x leverage, you need a 2.66% BTC move — that's the risk YOU chose
- If time runs out and multiple traders survive, winner = highest PnL%
- If all traders get eliminated, the last one eliminated wins (latest timestamp)

### 3.5 Elimination Rules — Complete Logic

```
Elimination triggers (in order of priority):

1. DRAWDOWN BREACH (instant)
   - equity_current < equity_at_round_start * (1 - max_drawdown_percent)
   - Calculated LOCALLY using cached positions + WebSocket mark price stream
     (NOT by polling REST API — see Section 12.2 for Local PnL Engine)
   - Checked continuously (~every 1 second) as mark prices update
   - When triggered:
     a. Cancel all open orders (POST /orders/cancel_all)
     b. Close all positions via aggressive limit orders (NOT market orders)
        - Long: limit sell at (best_bid - 0.1%)
        - Short: limit buy at (best_ask + 0.1%)
        - If not filled in 5 seconds: fallback to market order
        - This mitigates testnet slippage vs pure market close
     c. Mark trader as "eliminated"
     d. Record elimination timestamp, round, and final equity
     e. Broadcast elimination event to all spectators

2. INACTIVITY ELIMINATION (checked at round end)
   - Each round requires Minimum Activity:
     - Open AND close at least 1 position during the round
     - OR total trading volume >= 5% of starting capital
   - If not met at round end → eliminated with reason "inactivity"
   - Prevents "AFK camping" exploit where traders survive with 0% PnL
     by never trading while others lose money

3. LEVERAGE VIOLATION (warning → then forced close)
   - If a trader somehow exceeds round's max leverage:
     a. First: send warning notification (10 second grace period)
     b. If not corrected: force-reduce position to comply
     c. If repeated (3x in same round): elimination

4. PAIR VIOLATION (prevented at order level)
   - Orders for non-allowed pairs in current round are REJECTED
   - Our backend validates before forwarding to Pacifica API
   - No elimination, just order rejection with error message

5. ROUND-END RANKING ELIMINATION
   - At round end, all surviving traders (who passed activity check) are ranked by PnL%
   - PnL% = (current_equity - equity_at_round_start) / equity_at_round_start * 100
   - Bottom X% are eliminated (30% Round 1, 40% Round 2, etc.)
   - Ties broken by: lowest max drawdown hit → then earliest profitable trade timestamp
```

### 3.5b Grace Period Rules (Round Transitions)

When a round transitions to the next, traders may need to adjust positions to comply
with tighter leverage/margin rules. This creates a **Death Spiral Risk**: the act of
reducing leverage (closing part of a losing position) could trigger the new round's
tighter drawdown limit.

```
GRACE PERIOD PROTOCOL:

1. Round N ends → "GRACE PERIOD" begins (2 minutes, 1 minute for Sudden Death)
2. During grace period:
   - Drawdown monitoring is PAUSED (no eliminations for drawdown)
   - Traders can ONLY reduce/close positions and cancel orders
   - No new positions can be opened
   - Leverage violations generate warnings but don't eliminate
3. Grace period ends → SNAPSHOT taken
   - Current equity becomes the NEW baseline for next round's drawdown
   - This means: if you lost equity while adjusting, you're NOT punished
   - Drawdown for Round N+1 is calculated from post-grace equity
4. Normal monitoring resumes with new baseline

EXAMPLE:
  Trader enters Round 2 with $11,000 equity
  Has 15x leveraged position (illegal in Round 2: max 10x)
  Grace period starts → trader closes part of position → equity drops to $10,500
  Grace period ends → $10,500 is now Round 2 baseline
  Round 2 drawdown limit = 15% → elimination at $10,500 * 0.85 = $8,925
  (NOT $11,000 * 0.85 = $9,350 — which would have been unfairly tight)
```

### 3.6 Drawdown Calculation — Precise Formula

```python
# Drawdown is calculated relative to equity at the END OF GRACE PERIOD
# For Round 1 (no grace period), baseline = starting capital
# This prevents the "Death Spiral" where adjusting positions to comply
# with new round rules triggers immediate elimination

# IMPORTANT: Equity is calculated LOCALLY, not by polling Pacifica REST API
# See Section 12.2 for Local PnL Engine architecture

equity_baseline = get_post_grace_equity(trader_id, round_number)
current_equity = calculate_equity_locally(trader_id)  # from cached positions + WS mark price

drawdown_percent = (equity_baseline - current_equity) / equity_baseline * 100

# Example:
# Round 2 grace period ends, trader has $10,500 equity (after adjusting leverage)
# Max drawdown for Round 2 = 15%
# Elimination threshold = $10,500 * 0.85 = $8,925
# If equity drops to $8,924 → ELIMINATED

max_drawdown_for_round = {
    "round_1": 0.20,  # 20%
    "round_2": 0.15,  # 15%
    "round_3": 0.10,  # 10%
    "sudden_death": 0.08  # 8% (adjusted from 5% for testnet liquidity safety)
}
```

### 3.7 What Happens When You're Eliminated?

1. All your open orders are cancelled
2. All your positions are closed via aggressive limit orders (with market fallback after 5s)
3. Your subaccount is frozen (no new orders accepted)
4. Your final equity is recorded
5. You become a **spectator** — can still watch the arena
6. Your profile shows elimination details (round, timestamp, final PnL)
7. Remaining funds in subaccount are transferred back to arena vault

### 3.8 What Happens When Arena Ends?

1. Winner is determined (last standing or highest PnL% if multiple survive)
2. All remaining positions are closed
3. All subaccounts are settled
4. Prize distribution is triggered (see Section 7)
5. Arena stats are finalized and published
6. Post-match replay data is saved

### 3.9 Edge Cases

| Scenario | Resolution |
|---|---|
| All traders eliminated in same round | Last eliminated (by timestamp) wins |
| All traders eliminated in sudden death simultaneously | Highest equity at elimination moment wins |
| Trader disconnects / goes inactive | Positions remain open, drawdown still monitored, can still be eliminated. If no trades at round end → inactivity elimination |
| Market halt / Pacifica API downtime | Arena pauses, timer stops, resumes when API is back. If downtime > 30min, round extends by downtime duration |
| Trader tries to transfer funds out of subaccount | Blocked — subaccount transfers disabled during active arena |
| 0 trades made by a trader in a round | **ELIMINATED** for inactivity at round end (anti-AFK rule). Cannot camp with 0% PnL |
| Exactly at drawdown limit (e.g., exactly -20.00%) | NOT eliminated. Must be strictly below threshold (< -20%) |
| All traders eliminated within 60s of Sudden Death | Round resets with 12% drawdown limit (testnet liquidity safety valve) |
| Trader loses equity during grace period adjustment | Grace period equity becomes new baseline — no punishment for compliance |
| Testnet slippage causes extreme loss on elimination close | Aggressive limit orders used instead of market orders. 5s timeout → market fallback |

---

## 4. Trading Mechanics — What & How

### 4.1 What Are Traders Trading?

**Perpetual futures (perps) on the Pacifica exchange.**

Perpetual futures are derivative contracts that:
- Track the price of an underlying asset (BTC, ETH, SOL, etc.)
- Have no expiry date (unlike traditional futures)
- Use a "funding rate" mechanism to keep price close to spot
- Allow leverage (trade with more than your capital)
- Can go long (bet price goes up) or short (bet price goes down)

### 4.2 Available Trading Pairs on Pacifica

Based on Pacifica's exchange, the following pairs are expected to be available:

| Pair | Asset | Notes |
|---|---|---|
| BTC-PERP | Bitcoin | Highest liquidity, always available |
| ETH-PERP | Ethereum | Second highest liquidity |
| SOL-PERP | Solana | High volatility |
| ARB-PERP | Arbitrum | Medium volatility |
| DOGE-PERP | Dogecoin | High volatility, meme |
| (others) | Various | As listed on Pacifica exchange |

**Note:** Exact pairs will be confirmed from Pacifica's market data API or WebSocket `prices` subscription. The arena engine dynamically reads available pairs from the API.

### 4.3 Starting Capital

| Environment | Starting Capital | Currency |
|---|---|---|
| **Testnet** (hackathon) | $1,000 | Virtual USDC (testnet faucet) |
| **Mainnet** (future) | Configurable by arena creator | Real USDC |

**For hackathon**: All trading happens on Pacifica **testnet** (`test-api.pacifica.fi`). This means:
- No real money at risk
- Free testnet USDC via faucet
- Same API, same order types, same mechanics
- Perfect for demo & competition

> **Why $1,000 instead of $10,000?** Testnet orderbooks are thin. Smaller capital = smaller
> positions = less market impact = less slippage. This prevents situations where a large
> market order moves the testnet price 5%+ and creates unrealistic conditions. On mainnet,
> starting capital can be set higher because of deeper liquidity.

### 4.4 How Traders Execute Trades

Traders have **two ways** to trade:

**Option A: Through Colosseum UI (recommended)**
```
Trader → Colosseum Frontend → Our Backend (validates rules) → Pacifica API → Exchange
```
- Our UI provides a simplified trading interface
- Backend validates: correct pair for current round, leverage within limits
- If valid, forwards order to Pacifica API
- If invalid, rejects with clear error message

**Option B: Direct API (for bot traders)**
```
Trader's Bot → Our API Gateway (validates rules) → Pacifica API → Exchange
```
- We provide API keys scoped to their subaccount
- Bot sends orders to our gateway, which validates round rules
- Allows algo traders to participate with their own strategies
- This is important because Track 1 traders may want to use the arena

### 4.5 Order Types Supported

All Pacifica order types are available (subject to round restrictions):

| Order Type | Description | Pacifica Endpoint |
|---|---|---|
| **Market Order** | Execute immediately at best price | `POST /orders/create_market` |
| **Limit Order** | Execute at specific price or better | `POST /orders/create` |
| **TWAP Order** | Time-weighted execution | `POST /orders/twap/create` |
| **Take Profit / Stop Loss** | TP/SL on existing positions | `POST /positions/tpsl` |
| **Batch Orders** | Multiple orders in one request | `POST /orders/batch` |

### 4.6 Leverage Rules Per Round

```
Round 1: Max 20x leverage
  - Trader can use 1x to 20x on any position
  - Cross or isolated margin

Round 2: Max 10x leverage
  - Any existing positions above 10x from Round 1 must be reduced
  - Grace period: 2 minutes at round start to adjust
  - Isolated margin only

Round 3: Max 5x leverage
  - Same reduction rule
  - Grace period: 2 minutes

Sudden Death: Max 3x leverage
  - Grace period: 1 minute
```

**Enforcement mechanism:**
- Our backend intercepts all order requests
- Calculates effective leverage: `position_notional / account_equity`
- If new order would push leverage above round limit → **rejected**
- Existing overleveraged positions: grace period → then forced reduction

### 4.7 Position Sizing Limits

```
Min position size: Pacifica's minimum lot size (per pair)
Max position size: Limited by leverage cap and available margin

Example (Round 2, 10x leverage, $12,000 equity):
  Max notional = $12,000 * 10 = $120,000
  So max BTC position at $60,000/BTC = 2 BTC
```

### 4.8 Fees

Pacifica's standard fee structure applies:
- Maker fee: ~0.02% (limit orders that add liquidity)
- Taker fee: ~0.05% (market orders that take liquidity)
- Funding rate: Variable, paid/received every 8 hours

Fees are deducted from the trader's subaccount equity and affect PnL calculation. This is realistic and part of the skill test — good traders account for fees.

---

## 5. Loot System — Strategic Depth

### 5.1 Concept

At the end of each round (except Sudden Death), surviving traders earn **Loot** based on specific performance metrics. Loot provides tactical advantages in the NEXT round, adding a strategic meta-game layer.

### 5.2 Loot Types (MVP — Simplified)

For hackathon MVP, we ship **2 loots** with simple, verifiable calculations.
Additional loots (Leverage Shield, Extra Pair) are post-hackathon enhancements.

| Loot | Effect | How to Earn | Duration |
|---|---|---|---|
| **Wide Zone** | +5% extra drawdown buffer (e.g., 15% → 20% in Round 2) | Lowest max drawdown hit during the round (most disciplined trader) | Next round only |
| **Second Life** | Survive ONE drawdown breach (resets drawdown counter once) | Top 1 PnL% trader in the round auto-earns it. **Enhanced (if spectator voting enabled):** spectators can vote, but ONLY traders in bottom 50% of rankings are eligible to receive votes | Next round only |

**Why simplified from 4 → 2 loots:**
- Wide Zone: trivially calculated (just track `min(drawdown)` per trader — 1 field)
- Second Life: auto-awarded to top performer (zero extra code) OR voted by spectators (social feature for Track 3)
- Leverage Shield & Extra Pair required changes across OrderValidator + RiskMonitor + multiple UI paths — too much complexity for the differentiation they add
- 2 loots still provide strategic depth: do you play safe for Wide Zone, or aggressive for Second Life?

### 5.3 Loot Calculation Logic

```python
# At end of each round, calculate loot recipients
# SIMPLIFIED — no Sharpe/Sortino needed for MVP

def calculate_loot(arena_id, round_number):
    survivors = get_surviving_traders(arena_id)

    # WIDE ZONE: Lowest max drawdown hit during the round
    # Just read max_drawdown_hit from each participant's record
    # This is already tracked by the risk monitor (it records the worst drawdown seen)
    drawdowns = {}
    for trader in survivors:
        drawdowns[trader.id] = trader.max_drawdown_hit_this_round  # simple field lookup
    wide_zone_winner = min(drawdowns, key=drawdowns.get)  # lowest = most disciplined

    # SECOND LIFE: Auto-awarded to top PnL% performer
    # (If spectator voting enabled, see 5.4 for hybrid approach)
    pnls = {}
    for trader in survivors:
        pnls[trader.id] = trader.pnl_percent_this_round
    second_life_winner = max(pnls, key=pnls.get)  # highest PnL = earned it

    return {
        "wide_zone": wide_zone_winner,
        "second_life": second_life_winner
    }
```

### 5.4 Loot Rules

- Loot ONLY lasts for the next round (not cumulative)
- **Max 1 loot per trader per round** (anti-snowball rule):
  - If a trader qualifies for both Wide Zone AND Second Life, they choose one
  - The other loot goes to the next eligible trader (runner-up)
  - This prevents dominant traders from compounding advantages
- Second Life can only be used ONCE — after the drawdown breach is forgiven, the trader's drawdown counter resets to current equity
- Loot is announced at the START of the next round with fanfare in the activity feed
- Spectators can see which traders have active loots (displayed as badges)
- Loots are EARNED through superior performance — they reward skill, not luck

### 5.5 Spectator Voting for "Second Life" (Enhanced — Nice-to-Have)

If time permits, Second Life can be switched from auto-award to spectator vote,
adding the social engagement layer that Track 3 judges look for.

```
Voting Rules:
  - Voting window: Last 5 minutes of each round (or last 30 seconds for Blitz)
  - Eligible voters: All connected spectators (1 vote per wallet)
  - Anti-sybil: Fuul's sybil resistance checks wallet legitimacy

  CRITICAL ANTI-POPULARITY RULE:
  - Only traders ranked in the BOTTOM 50% are eligible to receive votes
  - This prevents KOLs/streamers from using their audience to boost themselves
  - It turns Second Life into a "save the underdog" mechanic, not a popularity contest
  - If a KOL is ranked #1, their followers literally cannot vote for them

  - Display: Live vote tally shown to all spectators
  - Winner: Eligible trader with most votes
  - Ties broken by: lower current PnL (underdog priority)
  - If no votes cast: falls back to auto-award (top PnL% earns it)
```

---

## 6. Spectator System

### 6.1 What Spectators See

```
┌────────────────────────────────────────────────────────────┐
│  PACIFICA COLOSSEUM — Arena: "Monday Night Trades"         │
│  Round 2: THE STORM | 14:32 remaining | 18/32 alive       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─── SURVIVOR GRID ──────────────────────────────────┐   │
│  │  [1] CryptoKing    +8.2%  DD: 3.1/15%  🟢 SAFE    │   │
│  │  [2] AlgoMaster    +5.7%  DD: 1.2/15%  🟢 SAFE    │   │
│  │  [3] DeFiDegen     +4.1%  DD: 7.8/15%  🟡 CAUTION │   │
│  │  [4] SolTrader     +2.3%  DD: 2.0/15%  🟢 SAFE    │   │
│  │  [5] BTCMaxi       +1.1%  DD:11.2/15%  🔴 DANGER  │   │
│  │  ...                                                │   │
│  │  [18] NewbTrader   -3.2%  DD:13.9/15%  🔴 CRITICAL │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─── LIVE ACTIVITY FEED ─────────────────────────────┐   │
│  │  14:33 | CryptoKing opened LONG 2.5 BTC @ $62,450  │   │
│  │  14:32 | BTCMaxi closed SHORT ETH — locked +$340    │   │
│  │  14:31 | *** DeFiWhale ELIMINATED — hit 15% DD ***  │   │
│  │  14:30 | Round 2 loot active: AlgoMaster has        │   │
│  │         | [Wide Zone] (+5% DD buffer)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─── MARKET CONTEXT (Elfa AI) ───────────────────────┐   │
│  │  BTC: $62,500 | Funding: +0.018% | Sentiment: 72%  │   │
│  │  "Positive funding + bullish sentiment — longs are  │   │
│  │   paying a premium. Contrarian shorts could be the  │   │
│  │   smart play this round."                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─── VOTE: SECOND LIFE ─────────────────────────────┐   │
│  │  Who deserves a Second Life next round?             │   │
│  │  [BTCMaxi: 42 votes] [NewbTrader: 38 votes]        │   │
│  │  Voting closes in 4:58                              │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 6.1b Position Visibility & Fairness

To prevent copy-trading and position-spying between active competitors:

```
WHAT SPECTATORS AND OTHER TRADERS CAN SEE IN REAL-TIME:
  ✓ PnL% (percentage, not dollar amount)
  ✓ Drawdown meter (percentage)
  ✓ Status (SAFE/CAUTION/DANGER/CRITICAL)
  ✓ Total number of trades this round
  ✓ Active loot badges

WHAT IS HIDDEN DURING ACTIVE ROUNDS:
  ✗ Specific positions (symbol, side, size, entry price)
  ✗ Open orders
  ✗ Exact equity/balance amounts
  ✗ Trade history details

WHAT IS REVEALED AFTER EACH ROUND ENDS:
  ✓ Full position history for that round
  ✓ Trade-by-trade breakdown
  ✓ Equity curve
  → This enables post-round analysis without mid-round spying

WHAT IS REVEALED AFTER ARENA ENDS:
  ✓ Everything — full transparency for learning
```

This solves the "open data = copy-trading" problem. Competitors can't see what
each other are trading during a round, but spectators still see enough (PnL, drawdown,
eliminations) to have an engaging viewing experience.

### 6.2 Spectator Features

| Feature | Description |
|---|---|
| **Live Leaderboard** | Real-time PnL rankings with drawdown meters |
| **Activity Feed** | Every trade, elimination, loot event streamed live |
| **Trader Cards** | Click any trader to see: positions, trade history, equity curve |
| **Market Context** | AI-generated commentary (Elfa AI) with sentiment + funding data |
| **Second Life Voting** | Vote for favorite trader to earn drawdown protection |
| **Elimination Alerts** | Visual + sound notification when a trader gets eliminated |
| **Round Transition** | Countdown timer + parameter change announcement |
| **Post-Match Stats** | Final rankings, best trades, longest survival streaks |

### 6.3 Spectator Data Sources

```
Real-time via Pacifica WebSocket (PUBLIC — no rate limits):
  - WS: prices:{symbol} → mark prices → Local PnL Engine calculates equity
  - WS: trades:{symbol} → activity feed (filtered per arena subaccounts)
  - WS: bbo:{symbol} → best bid/offer for quick price display

Pacifica REST (INFREQUENT — rate-limit safe):
  - GET /account/info → equity verification sync every 30 seconds (not primary source)
  - GET /account/positions → position sync on trade events (not polled)

Supabase Realtime (our backend → frontend, throttled every 3 seconds):
  - Leaderboard updates (PnL%, drawdown, rank)
  - Elimination events
  - Loot awards
  - Vote updates
  - Round transitions
  - Activity feed events
```

---

## 7. Rewards & Prize Distribution

### 7.1 For Hackathon MVP (Testnet)

Since the hackathon uses testnet, prizes are **points-based and reputational**:

| Placement | Reward |
|---|---|
| **1st Place (Winner)** | "Champion" badge on profile, top of all-time leaderboard |
| **2nd Place** | "Gladiator" badge |
| **3rd Place** | "Warrior" badge |
| **Last Eliminated** | "Almost" badge (honor in nearly winning) |
| **Best Sharpe Ratio (overall)** | "Strategist" badge |
| **Most Second Life Votes** | "Fan Favorite" badge |
| **Survived All Rounds (even if not winner)** | "Survivor" badge |

### 7.2 Future Vision (Mainnet — Post-Hackathon)

```
Arena Creator sets:
  - Entry fee: X USDC per trader
  - Prize pool = entry fees * participant count
  - Platform fee: 5% of prize pool

Distribution:
  - 1st: 50% of prize pool
  - 2nd: 25%
  - 3rd: 15%
  - 4th-5th: 5% each

Example (32 traders, $10 entry):
  Prize pool = $320
  Platform fee = $16
  1st = $152, 2nd = $76, 3rd = $45.60, 4th-5th = $15.20 each
```

### 7.3 Referral Rewards (Fuul)

```
Referral chain:
  - Invite someone who JOINS an arena → 100 points to referrer
  - Invite someone who WINS an arena → 500 bonus points to referrer
  - Top 10 referrers per month → featured on leaderboard

Implemented via Fuul SDK:
  - Unique referral links per user
  - Event tracking: "arena_joined", "arena_won"
  - Sybil resistance: prevent self-referrals and bot abuse
```

---

## 8. Technical Architecture

### 8.1 High-Level Architecture Diagram

```
                         ┌──────────────────┐
                         │   USERS           │
                         │  (Traders +       │
                         │   Spectators)     │
                         └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                                   │
     ┌──────────▼──────────┐             ┌──────────▼──────────┐
     │   FRONTEND (Vercel)  │             │  Pacifica Public WS  │
     │   Next.js 15         │             │  (prices, orderbook, │
     │   React 19           │             │   candles — direct    │
     │   Tailwind CSS v4    │             │   to frontend)       │
     │   Zustand            │             └──────────────────────┘
     │   TanStack Query     │
     └──────────┬───────────┘
                │
     ┌──────────▼──────────────────────────────────┐
     │   GAME ENGINE (Railway/Fly.io — PERSISTENT)  │
     │   Long-running Node.js process               │
     │   ┌──────────────────────────────────────┐   │
     │   │  In-Memory State:                    │   │
     │   │  - Arena states (positions, equity)  │   │
     │   │  - Mark price cache (from WS)        │   │
     │   │  - Local PnL Engine                  │   │
     │   │  - Round timers (setInterval)        │   │
     │   ├──────────────────────────────────────┤   │
     │   │  Services:                           │   │
     │   │  - Arena Manager                     │   │
     │   │  - Round Engine + Grace Period       │   │
     │   │  - Risk Monitor (local PnL calc)     │   │
     │   │  - Elimination Engine                │   │
     │   │  - Order Validator                   │   │
     │   │  - Loot Calculator                   │   │
     │   │  - Mock Engine (DEMO_MODE)           │   │
     │   └──────────────────────────────────────┘   │
     │   Exposes: REST API + WebSocket for frontend  │
     └──────┬────────────────┬─────────────────────┘
            │                │
   ┌────────▼────────┐  ┌───▼──────────────┐
   │  Supabase        │  │  Pacifica API    │
   │  (PostgreSQL     │  │  (REST + WS)     │
   │   + Realtime)    │  │  (testnet)       │
   └────────┬─────────┘  └────────────────┘
            │
   ┌────────▼─────────────┐
   │  SPONSOR SERVICES    │
   │  ├── Privy (auth)    │
   │  ├── Fuul (referral) │
   │  └── Elfa AI (sent.) │
   └──────────────────────┘

KEY ARCHITECTURE DECISION (v2):
  The Game Engine runs as a PERSISTENT process (not serverless).
  This is critical because:
  1. In-memory state (arena positions, mark prices) must survive between requests
  2. WebSocket connections to Pacifica must stay alive continuously
  3. Round timers (setInterval) need a long-running process
  4. Serverless (Vercel Functions) would lose state on cold starts

  Frontend (Vercel) handles: SSR, static pages, Privy auth
  Engine (Railway) handles: game logic, Pacifica API, WebSocket, real-time state
  Supabase handles: persistence, Realtime broadcasts to frontend
```

### 8.2 Tech Stack — Complete

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, easy deployment |
| **UI Library** | React 19 | Latest features, concurrent rendering |
| **Styling** | Tailwind CSS v4 | Rapid UI development, dark theme |
| **State Management** | Zustand | Lightweight, perfect for WebSocket state |
| **Data Fetching** | TanStack React Query v5 | Caching, real-time refetch, optimistic updates |
| **Charts** | Lightweight Charts (TradingView) | Professional candlestick charts, free |
| **Database** | Supabase (PostgreSQL) | Free tier, realtime subscriptions, auth helpers |
| **Authentication** | Privy | Embedded wallets, social login, web3 native |
| **Real-time** | Supabase Realtime + custom WebSocket | Database changes + Pacifica price streams |
| **Deployment (Frontend)** | Vercel | Next.js native, free tier, SSR |
| **Deployment (Engine)** | Railway / Fly.io | Persistent process for in-memory state + WebSocket |
| **API Client** | Custom Pacifica SDK wrapper (TypeScript) | Type-safe API calls |
| **Cron Jobs** | Engine process internal timers | Round transitions, periodic sync (no serverless cron needed) |
| **Monitoring** | Sentry (free tier) | Error tracking |

### 8.3 Monorepo Structure

```
pacifica-colosseum/
├── COLOSSEUM_BLUEPRINT.md          # This file
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                       # Environment variables (gitignored)
├── .env.example                     # Template
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (Privy provider, dark theme)
│   │   ├── page.tsx                 # Landing page
│   │   ├── arenas/
│   │   │   ├── page.tsx             # Arena list (browse/create)
│   │   │   ├── create/
│   │   │   │   └── page.tsx         # Create arena form
│   │   │   └── [arenaId]/
│   │   │       ├── page.tsx         # Arena detail / live dashboard
│   │   │       ├── trade/
│   │   │       │   └── page.tsx     # Trading interface (for participants)
│   │   │       └── spectate/
│   │   │           └── page.tsx     # Spectator view
│   │   ├── profile/
│   │   │   └── [address]/
│   │   │       └── page.tsx         # User profile + stats
│   │   ├── leaderboard/
│   │   │   └── page.tsx             # Global leaderboard
│   │   └── api/                     # API Routes (backend)
│   │       ├── arenas/
│   │       │   ├── route.ts         # GET (list) / POST (create)
│   │       │   └── [arenaId]/
│   │       │       ├── route.ts     # GET (detail) / PATCH (update)
│   │       │       ├── join/
│   │       │       │   └── route.ts # POST (join arena)
│   │       │       ├── trade/
│   │       │       │   └── route.ts # POST (execute trade)
│   │       │       ├── vote/
│   │       │       │   └── route.ts # POST (spectator vote)
│   │       │       └── rounds/
│   │       │           └── route.ts # POST (advance round — admin)
│   │       ├── cron/
│   │       │   ├── risk-monitor/
│   │       │   │   └── route.ts     # Periodic drawdown check
│   │       │   └── round-advance/
│   │       │       └── route.ts     # Auto round progression
│   │       ├── webhooks/
│   │       │   └── fuul/
│   │       │       └── route.ts     # Fuul referral webhooks
│   │       └── health/
│   │           └── route.ts         # Health check
│   │
│   ├── lib/                         # Core libraries
│   │   ├── pacifica/
│   │   │   ├── client.ts            # Pacifica REST API client
│   │   │   ├── websocket.ts         # Pacifica WebSocket client
│   │   │   ├── types.ts             # Pacifica API types
│   │   │   └── auth.ts              # Ed25519 signature generation
│   │   ├── supabase/
│   │   │   ├── client.ts            # Supabase client (browser)
│   │   │   ├── server.ts            # Supabase client (server)
│   │   │   └── types.ts             # Database types (generated)
│   │   ├── privy/
│   │   │   └── config.ts            # Privy configuration
│   │   ├── fuul/
│   │   │   └── client.ts            # Fuul SDK client
│   │   ├── elfa/
│   │   │   └── client.ts            # Elfa AI API client
│   │   └── utils/
│   │       ├── calculations.ts      # PnL, drawdown, loot eligibility
│   │       ├── constants.ts         # Round configs, loot definitions
│   │       └── formatters.ts        # Number, date, address formatters
│   │
│   ├── engine/                      # Game engine (server-side only)
│   │   ├── arena-manager.ts         # Create, start, end arenas
│   │   ├── round-engine.ts          # Round progression logic
│   │   ├── risk-monitor.ts          # Local PnL engine + drawdown monitoring
│   │   ├── elimination-engine.ts    # Elimination triggers & execution
│   │   ├── loot-calculator.ts       # Loot award computation (simplified: 2 loots)
│   │   ├── order-validator.ts       # Validate orders against round rules
│   │   ├── settlement.ts            # End-of-arena settlement
│   │   └── mock-engine.ts           # DEMO MODE: simulated traders & price data
│   │
│   ├── hooks/                       # React hooks
│   │   ├── use-arena.ts             # Arena data + realtime updates
│   │   ├── use-trading.ts           # Trade execution
│   │   ├── use-positions.ts         # Position tracking
│   │   ├── use-websocket.ts         # WebSocket connection management
│   │   ├── use-leaderboard.ts       # Leaderboard data
│   │   └── use-countdown.ts         # Round timer
│   │
│   ├── components/                  # UI components
│   │   ├── arena/
│   │   │   ├── ArenaCard.tsx        # Arena preview card
│   │   │   ├── ArenaGrid.tsx        # Grid of arena cards
│   │   │   ├── CreateArenaForm.tsx  # Arena creation wizard
│   │   │   ├── RoundIndicator.tsx   # Current round + zone visual
│   │   │   └── RoundTransition.tsx  # Round change animation
│   │   ├── trading/
│   │   │   ├── OrderForm.tsx        # Place order UI
│   │   │   ├── PositionList.tsx     # Open positions
│   │   │   ├── OrderBook.tsx        # Orderbook visualization
│   │   │   └── Chart.tsx            # TradingView Lightweight Chart
│   │   ├── spectator/
│   │   │   ├── SurvivorGrid.tsx     # All traders with status
│   │   │   ├── ActivityFeed.tsx     # Live event stream
│   │   │   ├── TraderCard.tsx       # Individual trader detail
│   │   │   ├── EliminationBanner.tsx# Elimination announcement
│   │   │   ├── VotePanel.tsx        # Second Life voting
│   │   │   └── MarketContext.tsx    # Elfa AI commentary
│   │   ├── leaderboard/
│   │   │   ├── Leaderboard.tsx      # Rankings table
│   │   │   └── DrawdownMeter.tsx    # Visual drawdown bar
│   │   ├── profile/
│   │   │   ├── ProfileHeader.tsx    # Avatar, badges, stats
│   │   │   ├── MatchHistory.tsx     # Past arenas
│   │   │   └── BadgeGrid.tsx        # Earned badges
│   │   └── shared/
│   │       ├── Navbar.tsx           # Top navigation
│   │       ├── ConnectButton.tsx    # Privy wallet connect
│   │       ├── Timer.tsx            # Countdown component
│   │       ├── StatusBadge.tsx      # SAFE/CAUTION/DANGER/CRITICAL
│   │       └── Modal.tsx            # Reusable modal
│   │
│   ├── stores/                      # Zustand stores
│   │   ├── arena-store.ts           # Current arena state
│   │   ├── trading-store.ts         # Order form state
│   │   └── ws-store.ts              # WebSocket connection state
│   │
│   └── styles/
│       └── globals.css              # Tailwind base + custom theme
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_tables.sql    # All table definitions
│   │   ├── 002_create_functions.sql # Database functions
│   │   └── 003_create_policies.sql  # RLS policies
│   └── seed.sql                     # Test data
│
├── public/
│   ├── logo.svg
│   ├── og-image.png                 # Open Graph image
│   └── sounds/
│       ├── elimination.mp3          # Elimination sound effect
│       └── round-start.mp3          # Round transition sound
│
└── tests/
    ├── engine/
    │   ├── risk-monitor.test.ts
    │   ├── elimination.test.ts
    │   ├── loot-calculator.test.ts
    │   └── order-validator.test.ts
    ├── api/
    │   ├── arenas.test.ts
    │   └── trade.test.ts
    └── lib/
        └── calculations.test.ts
```

---

## 9. Pacifica API Integration Map

### 9.1 Complete Endpoint Usage

```
PACIFICA REST API (test-api.pacifica.fi/api/v1)
NOTE: Endpoint paths confirmed from official Python SDK (github.com/pacifica-fi/python-sdk)
Authentication: Solana keypair signatures (Ed25519 via solders library, base58 encoded)
│
├── ORDERS (confirmed from SDK)
│   ├── POST /orders/create_market
│   │   └── Used: Execute market orders (through our validator)
│   │
│   ├── POST /orders/create
│   │   └── Used: Execute limit orders (through our validator)
│   │
│   ├── POST /orders/batch
│   │   └── Used: CRITICAL — force close all positions on elimination
│   │          Also for opening multiple orders in one request
│   │
│   ├── POST /orders/cancel
│   │   └── Used: Cancel specific order
│   │
│   ├── POST /orders/cancel_all
│   │   └── Used: CRITICAL — cancel all orders on elimination
│   │
│   ├── POST /orders/twap/create
│   │   └── Used: TWAP orders for gradual position building
│   │
│   ├── POST /orders/twap/cancel
│   │   └── Used: Cancel TWAP orders
│   │
│   ├── GET /orders/twap
│   │   └── Used: Query open TWAP orders (param: account)
│   │
│   └── GET /orders/twap/history
│       └── Used: TWAP order history
│
├── POSITIONS (confirmed from SDK)
│   └── POST /positions/tpsl
│       └── Used: Set take profit / stop loss on existing positions
│
├── ACCOUNT (confirmed from SDK)
│   ├── POST /account/leverage
│   │   └── Used: CRITICAL — enforce round leverage limits
│   │          Called at round transitions to cap leverage
│   │
│   ├── POST /account/api_keys/create
│   │   └── Used: Create API config keys for rate limit management
│   │
│   ├── POST /account/api_keys
│   │   └── Used: List API keys
│   │
│   └── POST /account/api_keys/revoke
│       └── Used: Revoke API key
│
├── SUBACCOUNTS (confirmed from SDK — CRITICAL for our architecture)
│   ├── POST /account/subaccount/create
│   │   └── Used: CRITICAL — create funded account for each arena participant
│   │          Requires dual-signature: main_signature + sub_signature
│   │          Both generated server-side (we hold both keypairs)
│   │
│   ├── POST /account/subaccount/list
│   │   └── Used: Monitor all participants in an arena
│   │
│   └── POST /account/subaccount/transfer
│       └── Used: CRITICAL — fund subaccounts on arena start
│              Transfer remaining funds back on elimination/arena end
│
├── AGENT WALLETS (confirmed from SDK)
│   ├── POST /agent/bind
│   │   └── Used: Bind agent wallet to account (alternative auth method)
│   │
│   ├── GET /agent/list
│   │   └── Used: List bound agent wallets
│   │
│   └── POST /agent/revoke
│       └── Used: Revoke agent wallet
│
├── LIQUIDITY LAKE (confirmed from SDK — potential future use)
│   ├── POST /lake/create
│   ├── POST /lake/deposit
│   └── POST /lake/withdraw
│
└── DEPOSIT/WITHDRAW (confirmed from SDK)
    └── POST /deposit
        └── Used: Deposit funds to Pacifica account

WEBSOCKET: wss://test-ws.pacifica.fi/ws
  ├── Subscribe: {"method": "subscribe", "params": {"source": "prices"}}
  ├── Subscribe: {"method": "subscribe", "params": {"source": "orderbook", "symbol": "BTC-PERP"}}
  └── Trading: {"id": "uuid", "params": {"create_market_order": {...}}}

NOTE: Some endpoints from gitbook docs (GET /markets/info, GET /account/info,
GET /account/positions, etc.) may exist but are NOT in the SDK examples.
These need to be discovered via API exploration or Discord support.
We use WebSocket for real-time data, so REST market data is less critical.
```
```

### 9.2 WebSocket Subscriptions

```
PACIFICA WEBSOCKET (wss://test-ws.pacifica.fi/ws)
Confirmed from SDK: JSON message format

SUBSCRIBE FORMAT:
  {"method": "subscribe", "params": {"source": "<channel>", "symbol": "<pair>"}}

TRADING FORMAT:
  {"id": "<uuid>", "params": {"create_market_order": {...}}}

│
├── PUBLIC CHANNELS (no auth, subscribe freely)
│   ├── source: "prices"
│   │   └── Real-time mark prices — CRITICAL for Local PnL Engine
│   │
│   ├── source: "orderbook", symbol: "BTC-PERP"
│   │   └── Live orderbook for trading UI + elimination close pricing
│   │
│   ├── source: "trades", symbol: "BTC-PERP"
│   │   └── Recent trades feed (spectator activity stream)
│   │
│   └── source: "candles", symbol: "BTC-PERP"
│       └── Live candle updates for charts
│
├── PRIVATE CHANNELS (requires auth signature)
│   └── Account-specific updates (positions, orders, fills)
│       └── Exact subscription format TBD — needs API exploration
│
└── TRADING VIA WEBSOCKET
    ├── create_market_order → execute market orders directly via WS
    └── (Other order types likely available — needs testing)

NOTE: Exact channel names and private subscription format need to be
confirmed via testing or Discord support. The SDK examples primarily
show REST usage; WS examples show order creation and price subscription.
```

### 9.3 Authentication with Pacifica API

Confirmed from SDK (`common/utils.py`). Pacifica uses **Solana keypair signatures**,
NOT HTTP headers. The signature is sent IN the request body.

```typescript
// TypeScript equivalent of SDK's sign_message function
// Uses @solana/web3.js or tweetnacl for Ed25519 signing

import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

interface SignedRequest {
  account: string;          // public key (base58)
  signature: string;        // base58-encoded Ed25519 signature
  timestamp: number;        // milliseconds since epoch
  expiry_window: number;    // typically 5000 (5 seconds)
  [key: string]: any;       // additional payload fields
}

function signMessage(
  header: { type: string; timestamp: number; expiry_window: number },
  payload: Record<string, any>,
  keypair: Keypair
): { message: string; signature: string } {
  // 1. Merge header + payload with sorted keys (CRITICAL — must match server expectation)
  const data = sortKeys({ ...header, data: payload });

  // 2. Compact JSON — separators must be (",", ":") with no spaces
  const message = JSON.stringify(data);

  // 3. Sign the message bytes with Ed25519
  const messageBytes = new TextEncoder().encode(message);
  const sig = nacl.sign.detached(messageBytes, keypair.secretKey);

  // 4. Base58-encode the signature (NOT hex, NOT base64)
  return { message, signature: bs58.encode(sig) };
}

function sortKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortKeys(obj[key]);
    return acc;
  }, {} as any);
}

// Example: Creating a market order
const header = {
  type: "create_market_order",
  timestamp: Date.now(),
  expiry_window: 5000,
};
const payload = { symbol: "BTC-PERP", side: "buy", size: "0.01" };
const { message, signature } = signMessage(header, payload, keypair);

const request = {
  account: keypair.publicKey.toBase58(),
  signature,
  timestamp: header.timestamp,
  expiry_window: header.expiry_window,
  ...payload,
};
// POST to https://test-api.pacifica.fi/api/v1/orders/create_market
```

**Key differences from original blueprint (v1):**
- Signatures are **base58-encoded** (not hex)
- Signatures go in the **request body** (not HTTP headers)
- JSON keys must be **sorted recursively** before signing
- JSON must use **compact separators** (`","` and `":"`)
- Uses **Solana keypairs** (`@solana/web3.js`), not generic Ed25519

---

## 10. Sponsor Tool Integration

### 10.1 Privy — Authentication & Wallet

**Role:** User onboarding and wallet management.

```
User Flow:
1. User visits Colosseum
2. Clicks "Enter the Arena"
3. Privy modal appears:
   - Email login → embedded wallet auto-created
   - Social login (Google, Twitter) → embedded wallet auto-created
   - Connect existing wallet (MetaMask, Phantom, etc.)
4. User gets a wallet address = their Colosseum identity
5. Wallet address used to create Pacifica subaccounts
```

**Integration Points:**
- `@privy-io/react-auth` — React SDK for login modal
- `usePrivy()` hook — get user, wallet, authentication state
- `useWallets()` hook — access embedded wallet for signing
- Server-side: verify Privy JWT tokens on API routes

**Why Privy (not just wallet connect):**
- Non-crypto users can join via email/social → wider adoption
- Embedded wallets = no MetaMask needed
- Privy handles key management securely

### 10.2 Fuul — Referrals, Leaderboard, Sybil Resistance

**Role:** Viral growth, fair competition, global leaderboard.

```
Integration Points:

1. REFERRAL SYSTEM
   - Each user gets a unique referral link: colosseum.gg/ref/{code}
   - When referred user joins an arena, event fires to Fuul
   - Fuul tracks: referrer → referee relationship
   - Points awarded to referrer

2. LEADERBOARD API
   - Global leaderboard pulled from Fuul's leaderboard API
   - Rankings: all-time wins, total PnL, arenas survived
   - White-label leaderboard embedded in our UI

3. SYBIL RESISTANCE
   - On arena join, Fuul checks wallet legitimacy
   - Prevents: same person entering with multiple wallets
   - Prevents: bot accounts farming rewards
   - We pass wallet address to Fuul's sybil check endpoint
   - If flagged → blocked from joining arena

4. EVENTS API
   - Track custom events:
     - "arena_joined" — user joins an arena
     - "arena_won" — user wins an arena
     - "round_survived" — user survives a round
     - "elimination" — user gets eliminated
   - These events feed into referral attribution and leaderboard
```

### 10.3 Elfa AI — Social Intelligence & Commentary

**Role:** AI-powered market context and commentary during matches.

```
Integration Points:

1. MARKET SENTIMENT
   - Fetch social sentiment scores per asset (BTC, ETH, SOL)
   - Display in spectator dashboard: "BTC Sentiment: 72% Bullish"
   - Updated every 5 minutes during active rounds

2. AI COMMENTARY
   - At round start: generate context message
     "Round 2 begins with BTC funding rate at +0.03%. Longs are paying shorts.
      Social sentiment is mixed — Twitter volume up 40% in the last hour.
      The Storm favors traders who can read the crowd."
   - On major events: generate reactive commentary
     "CryptoKing just opened a massive 10x short on ETH while sentiment is 80% bullish.
      Contrarian play or suicide mission?"

3. SMART ALERTS
   - When social sentiment diverges from price action → alert spectators
   - "Warning: SOL sentiment just flipped bearish (-15% in 1hr) but price hasn't moved.
      Potential incoming volatility."
```

**Elfa AI API Integration:**
```typescript
// Elfa AI API client
const elfaClient = {
  getSentiment: async (symbol: string) => {
    const response = await fetch(`https://api.elfa.ai/v1/sentiment?asset=${symbol}`, {
      headers: { 'Authorization': `Bearer ${ELFA_API_KEY}` }
    });
    return response.json();
    // Returns: { asset: "BTC", score: 72, trend: "bullish", volume_change: "+40%" }
  },

  generateCommentary: async (context: object) => {
    const response = await fetch('https://api.elfa.ai/v1/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ELFA_API_KEY}` },
      body: JSON.stringify(context)
    });
    return response.json();
    // Returns: { commentary: "..." }
  }
};
```

### 10.4 Rhinofi — Cross-Chain Deposits (Nice-to-Have)

**Role:** Allow users from any chain to deposit into Colosseum.

```
Integration (if time permits):
- Users on Ethereum, Arbitrum, Polygon, etc. can bridge funds
- Rhinofi handles cross-chain transfer to Pacifica's chain
- Seamless deposit flow in our UI
- Priority: LOW for hackathon MVP (testnet uses faucet)
```

---

## 11. Database Schema

### 11.1 Complete Schema (Supabase PostgreSQL)

```sql
-- ============================================================
-- USERS TABLE
-- Stores all registered users (traders + spectators)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,          -- From Privy
    privy_user_id TEXT UNIQUE,                    -- Privy internal ID
    username TEXT UNIQUE,                         -- Optional display name
    avatar_url TEXT,                              -- Profile picture
    referral_code TEXT UNIQUE NOT NULL,           -- For Fuul referral system
    referred_by UUID REFERENCES users(id),       -- Who referred them

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
-- ARENAS TABLE
-- Each row = one competition instance
-- ============================================================
CREATE TABLE arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'registration',
    -- Possible statuses:
    -- 'registration' → accepting participants
    -- 'starting' → countdown to start
    -- 'round_1' → Round 1 active
    -- 'round_1_elimination' → Processing Round 1 eliminations
    -- 'round_2' → Round 2 active
    -- 'round_2_elimination' → Processing Round 2 eliminations
    -- 'round_3' → Round 3 active
    -- 'round_3_elimination' → Processing Round 3 eliminations
    -- 'sudden_death' → Final round
    -- 'settling' → Closing all positions, calculating results
    -- 'completed' → Done, results finalized
    -- 'cancelled' → Not enough participants / creator cancelled

    -- Configuration
    preset TEXT NOT NULL DEFAULT 'sprint',          -- 'sprint', 'daily', 'weekly', 'custom'
    starting_capital DECIMAL(12,2) NOT NULL DEFAULT 1000.00,   -- $1K for testnet (less slippage)
    min_participants INTEGER NOT NULL DEFAULT 4,
    max_participants INTEGER NOT NULL DEFAULT 100,
    is_invite_only BOOLEAN DEFAULT FALSE,
    invite_code TEXT,                                -- For invite-only arenas

    -- Timing
    registration_deadline TIMESTAMPTZ NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    current_round INTEGER DEFAULT 0,                 -- 0 = not started, 1-4
    current_round_ends_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Round durations (in seconds)
    round_1_duration INTEGER NOT NULL,
    round_2_duration INTEGER NOT NULL,
    round_3_duration INTEGER NOT NULL,
    sudden_death_duration INTEGER NOT NULL,

    -- Pacifica integration
    master_wallet_address TEXT,                       -- Vault wallet for this arena
    master_private_key_encrypted TEXT,                -- Encrypted, for subaccount operations

    -- Results
    winner_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ARENA PARTICIPANTS TABLE
-- Junction table: users ↔ arenas + per-participant state
-- ============================================================
CREATE TABLE arena_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    -- Pacifica subaccount
    subaccount_address TEXT,                          -- Pacifica subaccount wallet
    subaccount_private_key_encrypted TEXT,            -- Encrypted

    -- Status
    status TEXT NOT NULL DEFAULT 'registered',
    -- 'registered' → signed up, waiting for arena start
    -- 'active' → currently trading
    -- 'eliminated' → eliminated from competition
    -- 'survived' → survived all rounds (winner contender)
    -- 'winner' → won the arena

    -- Elimination details
    eliminated_at TIMESTAMPTZ,
    eliminated_in_round INTEGER,
    elimination_reason TEXT,                           -- 'drawdown_breach', 'ranking', 'leverage_violation'
    elimination_equity DECIMAL(12,4),

    -- Per-round equity snapshots (updated at round boundaries)
    equity_round_1_start DECIMAL(12,4),
    equity_round_1_end DECIMAL(12,4),
    equity_round_2_start DECIMAL(12,4),
    equity_round_2_end DECIMAL(12,4),
    equity_round_3_start DECIMAL(12,4),
    equity_round_3_end DECIMAL(12,4),
    equity_sudden_death_start DECIMAL(12,4),
    equity_final DECIMAL(12,4),

    -- Active loots for current round (simplified: 2 loots for MVP)
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

    UNIQUE(arena_id, user_id)                        -- Can't join same arena twice
);

-- ============================================================
-- ROUNDS TABLE
-- Configuration and state for each round in an arena
-- ============================================================
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,                    -- 1, 2, 3, 4 (4 = sudden death)

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    actual_ended_at TIMESTAMPTZ,                      -- May differ if paused

    -- Parameters
    name TEXT NOT NULL,                               -- "OPEN FIELD", "THE STORM", etc.
    max_leverage INTEGER NOT NULL,
    margin_mode TEXT NOT NULL,                         -- 'any', 'isolated'
    max_drawdown_percent DECIMAL(5,2) NOT NULL,
    elimination_percent DECIMAL(5,2) NOT NULL,        -- Bottom X% eliminated (0 for sudden death)
    allowed_pairs TEXT[] NOT NULL,                     -- Array of allowed pair symbols

    -- Loot recipients (set after round ends, simplified: 2 loots for MVP)
    wide_zone_winner_id UUID REFERENCES users(id),
    second_life_winner_id UUID REFERENCES users(id),

    -- Stats
    traders_at_start INTEGER,
    traders_at_end INTEGER,
    traders_eliminated INTEGER,

    status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'active', 'eliminating', 'completed'

    UNIQUE(arena_id, round_number)
);

-- ============================================================
-- EQUITY SNAPSHOTS TABLE
-- Periodic equity records for drawdown calculation & charts
-- ============================================================
CREATE TABLE equity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,

    equity DECIMAL(12,4) NOT NULL,
    balance DECIMAL(12,4) NOT NULL,
    unrealized_pnl DECIMAL(12,4) NOT NULL,
    drawdown_percent DECIMAL(10,4) NOT NULL,          -- Current drawdown from round start

    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast drawdown queries
CREATE INDEX idx_equity_snapshots_participant_round
    ON equity_snapshots(participant_id, round_number, recorded_at DESC);

-- ============================================================
-- TRADES TABLE
-- Record of all trades for activity feed & analytics
-- ============================================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,

    -- Trade details
    symbol TEXT NOT NULL,                             -- "BTC-PERP"
    side TEXT NOT NULL,                               -- "buy" or "sell"
    order_type TEXT NOT NULL,                         -- "market", "limit", "stop"
    size DECIMAL(16,8) NOT NULL,
    price DECIMAL(16,4) NOT NULL,
    leverage DECIMAL(5,1),
    realized_pnl DECIMAL(12,4),
    fee DECIMAL(12,4),

    -- Pacifica reference
    pacifica_order_id TEXT,
    pacifica_trade_id TEXT,

    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_arena_round ON trades(arena_id, round_number, executed_at DESC);

-- ============================================================
-- ELIMINATIONS TABLE
-- Detailed elimination records
-- ============================================================
CREATE TABLE eliminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,

    reason TEXT NOT NULL,                              -- 'drawdown_breach', 'ranking', 'leverage_violation'
    equity_at_elimination DECIMAL(12,4) NOT NULL,
    drawdown_at_elimination DECIMAL(10,4),
    rank_at_elimination INTEGER,
    total_traders_at_elimination INTEGER,

    -- Positions at elimination (JSON snapshot)
    positions_snapshot JSONB,

    eliminated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SPECTATOR VOTES TABLE
-- Second Life voting
-- ============================================================
CREATE TABLE spectator_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    voter_id UUID NOT NULL REFERENCES users(id),       -- Spectator who voted
    voted_for_id UUID NOT NULL REFERENCES arena_participants(id), -- Trader voted for

    voted_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(arena_id, round_number, voter_id)           -- 1 vote per spectator per round
);

-- ============================================================
-- BADGES TABLE
-- Achievement/badge definitions
-- ============================================================
CREATE TABLE badges (
    id TEXT PRIMARY KEY,                               -- 'champion', 'gladiator', etc.
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    rarity TEXT NOT NULL                               -- 'common', 'rare', 'epic', 'legendary'
);

-- ============================================================
-- USER BADGES TABLE
-- Badges earned by users
-- ============================================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id TEXT NOT NULL REFERENCES badges(id),
    arena_id UUID REFERENCES arenas(id),               -- Which arena earned it in
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, badge_id, arena_id)                -- Can't earn same badge twice per arena
);

-- ============================================================
-- EVENTS TABLE
-- Activity feed events (denormalized for fast reads)
-- ============================================================
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
    round_number INTEGER,

    event_type TEXT NOT NULL,
    -- 'trade_opened', 'trade_closed', 'elimination', 'round_start',
    -- 'round_end', 'loot_awarded', 'vote_cast', 'arena_start',
    -- 'arena_end', 'second_life_used', 'leverage_warning'

    actor_id UUID REFERENCES users(id),                -- Who triggered it
    target_id UUID REFERENCES users(id),               -- Who it affects (if different)

    data JSONB NOT NULL DEFAULT '{}',                  -- Event-specific data
    -- Examples:
    -- trade_opened: { symbol: "BTC-PERP", side: "long", size: 1.5, leverage: 5 }
    -- elimination: { reason: "drawdown_breach", equity: 8200, drawdown: "18.5%" }
    -- loot_awarded: { loot_type: "leverage_shield", round: 2 }

    message TEXT NOT NULL,                             -- Human-readable event description

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_arena ON events(arena_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectator_votes ENABLE ROW LEVEL SECURITY;

-- Users: public read, own write
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = privy_user_id);

-- Arenas: public read
CREATE POLICY "Arenas are viewable by everyone" ON arenas FOR SELECT USING (true);

-- Participants: public read (needed for leaderboard/spectating)
CREATE POLICY "Participants are viewable by everyone" ON arena_participants FOR SELECT USING (true);

-- Events: public read (activity feed)
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);

-- Trades: public read (transparency)
CREATE POLICY "Trades are viewable by everyone" ON trades FOR SELECT USING (true);

-- Votes: public read, authenticated write
CREATE POLICY "Votes are viewable by everyone" ON spectator_votes FOR SELECT USING (true);

-- Snapshots: public read
CREATE POLICY "Snapshots are viewable by everyone" ON equity_snapshots FOR SELECT USING (true);

-- ============================================================
-- SEED DATA — Badge Definitions
-- ============================================================
INSERT INTO badges (id, name, description, rarity) VALUES
    ('champion', 'Champion', 'Won an arena', 'legendary'),
    ('gladiator', 'Gladiator', 'Finished 2nd in an arena', 'epic'),
    ('warrior', 'Warrior', 'Finished 3rd in an arena', 'epic'),
    ('survivor', 'Survivor', 'Survived all rounds', 'rare'),
    ('almost', 'Almost!', 'Last trader eliminated before finals', 'rare'),
    ('strategist', 'Strategist', 'Highest Sharpe Ratio in an arena', 'epic'),
    ('fan_favorite', 'Fan Favorite', 'Most Second Life votes in an arena', 'rare'),
    ('first_blood', 'First Blood', 'First elimination in an arena', 'common'),
    ('iron_will', 'Iron Will', 'Used Second Life and still survived the round', 'epic'),
    ('streak_3', 'Hot Streak', 'Won 3 arenas in a row', 'legendary'),
    ('veteran_10', 'Veteran', 'Entered 10 arenas', 'common'),
    ('veteran_50', 'Gladiator Veteran', 'Entered 50 arenas', 'rare'),
    ('zero_dd', 'Untouchable', 'Won a round with 0% drawdown', 'legendary');
```

### 11.2 Supabase Realtime Subscriptions

```typescript
// Frontend subscribes to these channels for live updates:

// 1. Arena status changes
supabase
  .channel('arena-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'arenas',
    filter: `id=eq.${arenaId}`
  }, (payload) => {
    // Arena status changed (round transition, completion, etc.)
    updateArenaState(payload.new);
  })
  .subscribe();

// 2. New events (activity feed)
supabase
  .channel('arena-events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'events',
    filter: `arena_id=eq.${arenaId}`
  }, (payload) => {
    // New event: trade, elimination, loot, etc.
    addToActivityFeed(payload.new);
  })
  .subscribe();

// 3. Participant updates (eliminations, equity changes)
supabase
  .channel('participant-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'arena_participants',
    filter: `arena_id=eq.${arenaId}`
  }, (payload) => {
    // Trader eliminated, loot awarded, equity updated
    updateParticipant(payload.new);
  })
  .subscribe();

// 4. New votes
supabase
  .channel('votes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'spectator_votes',
    filter: `arena_id=eq.${arenaId}`
  }, (payload) => {
    incrementVoteCount(payload.new.voted_for_id);
  })
  .subscribe();
```

---

## 12. Backend Logic & Services

### 12.1 Arena Manager

```typescript
// engine/arena-manager.ts

class ArenaManager {

  /**
   * Create a new arena
   * 1. Validate creator is authenticated
   * 2. Generate master wallet for this arena (keypair)
   * 3. Store arena config in database
   * 4. Return arena ID for sharing
   */
  async createArena(config: CreateArenaInput): Promise<Arena> {
    // Generate master wallet keypair
    const { publicKey, privateKey } = generateEd25519Keypair();

    // Calculate round timings based on preset
    const timings = calculateRoundTimings(config.preset, config.startsAt);

    // Insert into database
    const arena = await supabase.from('arenas').insert({
      creator_id: config.creatorId,
      name: config.name,
      description: config.description,
      preset: config.preset,
      starting_capital: config.startingCapital || 10000,
      min_participants: config.minParticipants || 4,
      max_participants: config.maxParticipants || 100,
      is_invite_only: config.isInviteOnly || false,
      invite_code: config.isInviteOnly ? generateInviteCode() : null,
      registration_deadline: timings.registrationDeadline,
      starts_at: timings.startsAt,
      round_1_duration: timings.round1Duration,
      round_2_duration: timings.round2Duration,
      round_3_duration: timings.round3Duration,
      sudden_death_duration: timings.suddenDeathDuration,
      master_wallet_address: publicKey,
      master_private_key_encrypted: encrypt(privateKey),
    }).select().single();

    // Create round records
    await createRoundRecords(arena.id, timings);

    return arena;
  }

  /**
   * Join an arena
   * 1. Validate arena is in registration status
   * 2. Check max participants not exceeded
   * 3. Sybil check via Fuul
   * 4. Create Pacifica subaccount for trader
   * 5. Fund subaccount with starting capital
   */
  async joinArena(arenaId: string, userId: string): Promise<ArenaParticipant> {
    const arena = await getArena(arenaId);

    // Validations
    if (arena.status !== 'registration') throw new Error('Arena not accepting registrations');
    if (await getParticipantCount(arenaId) >= arena.max_participants) throw new Error('Arena full');
    if (await isAlreadyParticipant(arenaId, userId)) throw new Error('Already joined');

    // Sybil check via Fuul
    const user = await getUser(userId);
    const sybilCheck = await fuulClient.checkSybil(user.wallet_address);
    if (sybilCheck.flagged) throw new Error('Account flagged by sybil detection');

    // Generate subaccount keypair
    const { publicKey, privateKey } = generateEd25519Keypair();

    // Create Pacifica subaccount
    await pacificaClient.createSubaccount({
      parentAddress: arena.master_wallet_address,
      childAddress: publicKey,
      // Both parent and child sign to confirm relationship
    });

    // Store participant
    const participant = await supabase.from('arena_participants').insert({
      arena_id: arenaId,
      user_id: userId,
      subaccount_address: publicKey,
      subaccount_private_key_encrypted: encrypt(privateKey),
    }).select().single();

    // Track event in Fuul
    await fuulClient.trackEvent('arena_joined', {
      userId: user.wallet_address,
      arenaId
    });

    return participant;
  }

  /**
   * Start an arena
   * Called by cron when starts_at is reached
   * 1. Verify minimum participants met
   * 2. Fund all subaccounts
   * 3. Set leverage limits
   * 4. Transition to round_1
   */
  async startArena(arenaId: string): Promise<void> {
    const arena = await getArena(arenaId);
    const participants = await getParticipants(arenaId);

    if (participants.length < arena.min_participants) {
      await cancelArena(arenaId, 'Minimum participants not met');
      return;
    }

    // Fund all subaccounts via Pacifica transfer
    for (const participant of participants) {
      await pacificaClient.transferToSubaccount({
        fromAddress: arena.master_wallet_address,
        toAddress: participant.subaccount_address,
        amount: arena.starting_capital,
      });

      // Snapshot starting equity
      await supabase.from('arena_participants').update({
        status: 'active',
        equity_round_1_start: arena.starting_capital,
      }).eq('id', participant.id);
    }

    // Set Round 1 leverage limits for all subaccounts
    for (const participant of participants) {
      await pacificaClient.updateLeverage({
        address: participant.subaccount_address,
        maxLeverage: 20, // Round 1 limit
      });
    }

    // Transition arena to round_1
    await supabase.from('arenas').update({
      status: 'round_1',
      current_round: 1,
      current_round_ends_at: calculateRoundEnd(arena, 1),
    }).eq('id', arenaId);

    // Create start event
    await createEvent(arenaId, 1, 'arena_start', null, null, {},
      `Arena "${arena.name}" has begun! ${participants.length} traders enter the Colosseum. Round 1: OPEN FIELD.`
    );

    // Start risk monitoring
    await startRiskMonitor(arenaId);
  }
}
```

### 12.2 Risk Monitor (Local PnL Engine)

> **CRITICAL ARCHITECTURE CHANGE (v2):** The original blueprint polled Pacifica REST API
> `GET /account/info` every 3 seconds per trader. With 32 traders = ~640 requests/minute,
> this would INSTANTLY hit Pacifica's rate limits. The fix: calculate equity LOCALLY using
> cached positions + WebSocket mark price stream. REST API is only used for periodic sync.

```typescript
// engine/risk-monitor.ts

/**
 * LOCAL PNL ENGINE
 *
 * Instead of polling Pacifica REST API for equity (rate limit suicide),
 * we maintain an in-memory state of each trader's positions and calculate
 * equity locally using real-time mark prices from Pacifica PUBLIC WebSocket.
 *
 * Data flow:
 *   1. On round start: GET /account/info ONCE per trader → cache balance + positions
 *   2. On trade event (from our order relay): update local position cache
 *   3. Pacifica WS prices:{symbol} → mark price updates streaming every ~1 second
 *   4. On each price update: recalculate equity for ALL traders locally
 *   5. REST sync every 30 seconds: GET /account/info to reconcile (catch funding payments, etc.)
 *
 * Pacifica API calls: ~2/minute per trader (sync only) vs ~20/minute per trader (old polling)
 * Mark price updates: unlimited via public WebSocket (no rate limit)
 */

// In-memory state per arena
interface TraderState {
  participantId: string;
  subaccountAddress: string;
  balance: number;                    // Last known settled balance
  positions: Map<string, Position>;   // symbol → position
  equityBaseline: number;             // Round start equity (post-grace)
  maxDrawdownHit: number;             // Worst drawdown this round
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
  isGracePeriod: boolean;
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  leverage: number;
}

// Mark prices from WebSocket (shared across all traders)
const markPrices: Map<string, number> = new Map();  // symbol → current mark price
const arenaStates: Map<string, Map<string, TraderState>> = new Map(); // arenaId → traders

class RiskMonitor {

  /**
   * Initialize monitoring for an arena
   * Called once when arena starts
   */
  async initArena(arenaId: string): Promise<void> {
    const participants = await getActiveParticipants(arenaId);
    const traderStates = new Map<string, TraderState>();

    // Fetch initial state for each trader (ONE REST call each — acceptable)
    for (const p of participants) {
      const accountInfo = await pacificaClient.getAccountInfo({ address: p.subaccount_address });
      const positions = await pacificaClient.getPositions({ address: p.subaccount_address });

      const posMap = new Map();
      for (const pos of positions) {
        posMap.set(pos.symbol, {
          symbol: pos.symbol,
          side: pos.side,
          size: parseFloat(pos.size),
          entryPrice: parseFloat(pos.entry_price),
          leverage: parseFloat(pos.leverage),
        });
      }

      traderStates.set(p.id, {
        participantId: p.id,
        subaccountAddress: p.subaccount_address,
        balance: parseFloat(accountInfo.balance),
        positions: posMap,
        equityBaseline: parseFloat(accountInfo.equity),
        maxDrawdownHit: 0,
        hasWideZone: p.has_wide_zone,
        hasSecondLife: p.has_second_life,
        secondLifeUsed: p.second_life_used,
        isGracePeriod: false,
      });
    }

    arenaStates.set(arenaId, traderStates);

    // Subscribe to relevant price channels
    const round = await getCurrentRound(arenaId);
    for (const symbol of round.allowed_pairs) {
      pacificaWS.subscribe(`prices:${symbol}`, (data) => {
        markPrices.set(symbol, parseFloat(data.mark_price));
        // Recalculate equity for all traders on every price update
        this.onPriceUpdate(arenaId, symbol);
      });
    }

    // Start periodic REST sync (every 30 seconds)
    this.startPeriodicSync(arenaId);
  }

  /**
   * Called on EVERY WebSocket price update (~1/second per symbol)
   * This is the core monitoring loop — runs in-memory, zero API calls
   */
  onPriceUpdate(arenaId: string, updatedSymbol: string): void {
    const traders = arenaStates.get(arenaId);
    if (!traders) return;

    const round = getCurrentRoundCached(arenaId); // from memory, not DB

    for (const [traderId, state] of traders) {
      if (state.isGracePeriod) continue; // Skip during grace period

      // Calculate equity locally
      const equity = this.calculateEquityLocally(state);
      const drawdownPercent = ((state.equityBaseline - equity) / state.equityBaseline) * 100;

      // Track worst drawdown
      if (drawdownPercent > state.maxDrawdownHit) {
        state.maxDrawdownHit = drawdownPercent;
      }

      // Get effective max drawdown (accounting for loot)
      let maxDrawdown = round.max_drawdown_percent;
      if (state.hasWideZone) {
        maxDrawdown += 5; // +5% buffer from loot
      }

      // CHECK: Drawdown breach
      if (drawdownPercent > maxDrawdown) {
        if (state.hasSecondLife && !state.secondLifeUsed) {
          this.useSecondLife(arenaId, traderId, equity, round.round_number);
        } else {
          // Async elimination — don't block the price update loop
          this.triggerElimination(arenaId, traderId, round.round_number, drawdownPercent, maxDrawdown);
        }
      }
    }
  }

  /**
   * Calculate equity from cached state — ZERO API calls
   */
  calculateEquityLocally(state: TraderState): number {
    let unrealizedPnl = 0;
    for (const [symbol, pos] of state.positions) {
      const markPrice = markPrices.get(symbol);
      if (!markPrice) continue;

      const direction = pos.side === 'long' ? 1 : -1;
      const pnl = (markPrice - pos.entryPrice) * pos.size * direction;
      unrealizedPnl += pnl;
    }
    return state.balance + unrealizedPnl;
  }

  /**
   * Periodic REST sync — reconcile local state with Pacifica
   * Catches: funding payments, fee deductions, liquidations, etc.
   * Runs every 30 seconds — well within rate limits
   */
  async periodicSync(arenaId: string): Promise<void> {
    const traders = arenaStates.get(arenaId);
    if (!traders) return;

    for (const [traderId, state] of traders) {
      const accountInfo = await pacificaClient.getAccountInfo({ address: state.subaccountAddress });
      const positions = await pacificaClient.getPositions({ address: state.subaccountAddress });

      // Reconcile balance (catches funding payments)
      state.balance = parseFloat(accountInfo.balance);

      // Reconcile positions (catches fills we might have missed)
      state.positions.clear();
      for (const pos of positions) {
        state.positions.set(pos.symbol, {
          symbol: pos.symbol,
          side: pos.side,
          size: parseFloat(pos.size),
          entryPrice: parseFloat(pos.entry_price),
          leverage: parseFloat(pos.leverage),
        });
      }

      // Record snapshot to DB (for charts and post-match analytics)
      const equity = this.calculateEquityLocally(state);
      await supabase.from('equity_snapshots').insert({
        arena_id: arenaId,
        participant_id: traderId,
        round_number: getCurrentRoundNumber(arenaId),
        equity,
        balance: state.balance,
        unrealized_pnl: equity - state.balance,
        drawdown_percent: ((state.equityBaseline - equity) / state.equityBaseline) * 100,
      });
    }
  }

  /**
   * Update local cache when a trade is executed through our system
   * Called by OrderValidator after successful order relay to Pacifica
   */
  onTradeExecuted(arenaId: string, traderId: string, trade: TradeEvent): void {
    const state = arenaStates.get(arenaId)?.get(traderId);
    if (!state) return;

    // Update position in cache
    // (simplified — full logic handles partial fills, reduces, etc.)
    if (trade.reduceOnly) {
      state.positions.delete(trade.symbol);
    } else {
      state.positions.set(trade.symbol, {
        symbol: trade.symbol,
        side: trade.side === 'buy' ? 'long' : 'short',
        size: trade.size,
        entryPrice: trade.price,
        leverage: trade.leverage,
      });
    }
  }

  /**
   * Use Second Life loot
   */
  async useSecondLife(arenaId: string, traderId: string, currentEquity: number, roundNumber: number): Promise<void> {
    const state = arenaStates.get(arenaId)?.get(traderId);
    if (!state) return;

    state.secondLifeUsed = true;
    state.equityBaseline = currentEquity; // Reset drawdown baseline

    await supabase.from('arena_participants').update({
      second_life_used: true,
    }).eq('id', traderId);

    await createEvent(arenaId, roundNumber, 'second_life_used',
      state.participantId, null, { equity: currentEquity },
      `SECOND LIFE activated! Drawdown counter reset. One chance remaining.`
    );
  }
}

/*
 * RATE LIMIT COMPARISON:
 *
 * OLD (v1 — polling):
 *   32 traders × GET /account/info every 3s = 640 requests/min  → RATE LIMITED
 *   32 traders × GET /account/positions every 3s = 640 req/min  → RATE LIMITED
 *   Total: ~1,280 requests/min                                  → DEAD
 *
 * NEW (v2 — local PnL engine):
 *   Mark prices: via PUBLIC WebSocket (0 REST calls)            → UNLIMITED
 *   Periodic sync: 32 traders × 2 calls / 30s = ~128 req/min   → SAFE
 *   Order execution: ~1-5 req/min per active trader             → SAFE
 *   Total: ~150-200 requests/min                                → WELL WITHIN LIMITS
 */
```

### 12.3 Elimination Engine

```typescript
// engine/elimination-engine.ts

class EliminationEngine {

  /**
   * Eliminate a single trader (drawdown or violation)
   */
  async eliminateTrader(
    arenaId: string,
    participant: ArenaParticipant,
    roundNumber: number,
    reason: string,
    details: object
  ): Promise<void> {
    // 1. Cancel all open orders
    await pacificaClient.cancelAllOrders({
      address: participant.subaccount_address,
    });

    // 2. Close all positions via AGGRESSIVE LIMIT ORDERS (not market — avoids testnet slippage)
    const positions = await pacificaClient.getPositions({
      address: participant.subaccount_address,
    });

    if (positions.length > 0) {
      // Step A: Try aggressive limit orders first (0.1% worse than best bid/ask)
      const orderbook = {};
      for (const pos of positions) {
        const ob = await pacificaClient.getOrderbook({ symbol: pos.symbol });
        orderbook[pos.symbol] = ob;
      }

      const closeOrders = positions.map(pos => {
        const ob = orderbook[pos.symbol];
        const isLong = pos.side === 'long';
        // Price slightly worse than best bid/ask to ensure fill
        const closePrice = isLong
          ? parseFloat(ob.best_bid) * 0.999   // sell 0.1% below best bid
          : parseFloat(ob.best_ask) * 1.001;  // buy 0.1% above best ask
        return {
          type: 'limit',
          symbol: pos.symbol,
          side: isLong ? 'sell' : 'buy',
          size: pos.size,
          price: closePrice,
          reduceOnly: true,
        };
      });

      await pacificaClient.batchOrders({
        address: participant.subaccount_address,
        orders: closeOrders,
      });

      // Step B: After 5 seconds, check if any positions remain unfilled → market close fallback
      await sleep(5000);
      const remaining = await pacificaClient.getPositions({ address: participant.subaccount_address });
      if (remaining.length > 0) {
        const fallbackOrders = remaining.map(pos => ({
          type: 'market',
          symbol: pos.symbol,
          side: pos.side === 'long' ? 'sell' : 'buy',
          size: pos.size,
          reduceOnly: true,
        }));
        await pacificaClient.batchOrders({
          address: participant.subaccount_address,
          orders: fallbackOrders,
        });
      }
    }

    // 3. Get final equity after closing
    const finalAccount = await pacificaClient.getAccountInfo({
      address: participant.subaccount_address,
    });
    const finalEquity = parseFloat(finalAccount.equity);

    // 4. Transfer remaining funds back to arena vault
    if (finalEquity > 0) {
      await pacificaClient.transferToSubaccount({
        fromAddress: participant.subaccount_address,
        toAddress: arena.master_wallet_address,
        amount: finalEquity,
      });
    }

    // 5. Update participant status
    await supabase.from('arena_participants').update({
      status: 'eliminated',
      eliminated_at: new Date().toISOString(),
      eliminated_in_round: roundNumber,
      elimination_reason: reason,
      elimination_equity: finalEquity,
    }).eq('id', participant.id);

    // 6. Record elimination
    await supabase.from('eliminations').insert({
      arena_id: arenaId,
      participant_id: participant.id,
      round_number: roundNumber,
      reason,
      equity_at_elimination: finalEquity,
      drawdown_at_elimination: details.drawdown,
      positions_snapshot: positions,
    });

    // 7. Broadcast elimination event
    await createEvent(arenaId, roundNumber, 'elimination',
      participant.user_id, null, details,
      `${participant.username} has been ELIMINATED! Reason: ${formatReason(reason)}. Final equity: $${finalEquity.toFixed(2)}`
    );

    // 8. Update user stats
    await supabase.rpc('increment_user_stat', {
      user_id: participant.user_id,
      stat_name: 'total_eliminations',
      increment_by: 1,
    });
  }

  /**
   * Process end-of-round ranking elimination
   * Called when round timer expires
   */
  async processRoundElimination(arenaId: string, roundNumber: number): Promise<void> {
    const round = await getRound(arenaId, roundNumber);
    const activeParticipants = await getActiveParticipants(arenaId);

    // Calculate PnL% for each trader this round
    const rankings = [];
    for (const participant of activeParticipants) {
      const account = await pacificaClient.getAccountInfo({
        address: participant.subaccount_address,
      });
      const currentEquity = parseFloat(account.equity);
      const startEquity = getRoundStartEquity(participant, roundNumber);
      const pnlPercent = ((currentEquity - startEquity) / startEquity) * 100;

      rankings.push({ participant, pnlPercent, currentEquity });
    }

    // Sort by PnL% ascending (worst first)
    rankings.sort((a, b) => a.pnlPercent - b.pnlPercent);

    // Calculate how many to eliminate
    const eliminationCount = Math.floor(rankings.length * (round.elimination_percent / 100));

    // Eliminate bottom performers
    const toEliminate = rankings.slice(0, eliminationCount);

    for (const { participant, pnlPercent, currentEquity } of toEliminate) {
      await this.eliminateTrader(arenaId, participant, roundNumber, 'ranking', {
        pnl_percent: pnlPercent,
        rank: rankings.indexOf({ participant }) + 1,
        total: rankings.length,
      });
    }

    // Snapshot equity for survivors (round end = next round start)
    const survivors = rankings.slice(eliminationCount);
    for (const { participant, currentEquity } of survivors) {
      const nextRound = roundNumber + 1;
      await supabase.from('arena_participants').update({
        [`equity_round_${roundNumber}_end`]: currentEquity,
        [`equity_round_${nextRound}_start`]: currentEquity,
      }).eq('id', participant.id);
    }

    // Calculate and award loot
    await lootCalculator.calculateAndAwardLoot(arenaId, roundNumber, survivors);
  }
}
```

### 12.4 Order Validator

```typescript
// engine/order-validator.ts

class OrderValidator {

  /**
   * Validate an order against current round rules before sending to Pacifica
   * Returns { valid: boolean, error?: string }
   */
  async validateOrder(
    arenaId: string,
    participantId: string,
    order: OrderRequest
  ): Promise<ValidationResult> {
    const arena = await getArena(arenaId);
    const round = await getCurrentRound(arenaId);
    const participant = await getParticipant(participantId);

    // 1. Check participant is still active
    if (participant.status !== 'active') {
      return { valid: false, error: 'You have been eliminated from this arena.' };
    }

    // 2. Check pair is allowed in current round
    const allowedPairs = round.allowed_pairs;

    if (!allowedPairs.includes(order.symbol)) {
      return {
        valid: false,
        error: `${order.symbol} is not available in ${round.name}. Allowed: ${allowedPairs.join(', ')}`
      };
    }

    // 3. Check leverage limit
    const maxLeverage = round.max_leverage;

    // Calculate effective leverage after this order
    const account = await pacificaClient.getAccountInfo({
      address: participant.subaccount_address,
    });
    const positions = await pacificaClient.getPositions({
      address: participant.subaccount_address,
    });

    const currentNotional = positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
    const orderNotional = order.size * (order.price || await getCurrentPrice(order.symbol));
    const newTotalNotional = currentNotional + orderNotional;
    const effectiveLeverage = newTotalNotional / parseFloat(account.equity);

    if (effectiveLeverage > maxLeverage) {
      return {
        valid: false,
        error: `Order would exceed max leverage (${maxLeverage}x). Current: ${effectiveLeverage.toFixed(1)}x.`
      };
    }

    // 4. Check margin mode (Round 2+ requires isolated)
    if (round.margin_mode === 'isolated') {
      const settings = await pacificaClient.getAccountSettings({
        address: participant.subaccount_address,
        symbol: order.symbol,
      });
      if (settings.marginMode !== 'isolated') {
        // Auto-switch to isolated
        await pacificaClient.updateMarginMode({
          address: participant.subaccount_address,
          symbol: order.symbol,
          mode: 'isolated',
        });
      }
    }

    // All checks passed
    return { valid: true };
  }
}
```

### 12.5 Round Engine

```typescript
// engine/round-engine.ts

class RoundEngine {

  /**
   * Advance to next round
   * Called by cron when current_round_ends_at is reached
   */
  async advanceRound(arenaId: string): Promise<void> {
    const arena = await getArena(arenaId);
    const currentRound = arena.current_round;

    // 1. Process ranking elimination for current round
    await eliminationEngine.processRoundElimination(arenaId, currentRound);

    // 2. Check if arena should end
    const survivors = await getActiveParticipants(arenaId);

    if (currentRound >= 4 || survivors.length <= 1) {
      // Arena is over
      await this.endArena(arenaId);
      return;
    }

    // For Round 3 → Sudden Death: only top 5 advance
    if (currentRound === 3 && survivors.length > 5) {
      // Additional elimination to get to 5
      // Already handled by elimination_percent in round config
    }

    const nextRound = currentRound + 1;
    const nextRoundConfig = await getRound(arenaId, nextRound);

    // 3. Enforce new leverage limits
    for (const survivor of survivors) {
      const maxLev = nextRoundConfig.max_leverage;

      await pacificaClient.updateLeverage({
        address: survivor.subaccount_address,
        maxLeverage: maxLev,
      });

      // Force isolated margin if required
      if (nextRoundConfig.margin_mode === 'isolated') {
        const positions = await pacificaClient.getPositions({
          address: survivor.subaccount_address,
        });
        for (const pos of positions) {
          await pacificaClient.updateMarginMode({
            address: survivor.subaccount_address,
            symbol: pos.symbol,
            mode: 'isolated',
          });
        }
      }
    }

    // 4. Grace period for overleveraged positions (2 minutes)
    // Create warning event
    await createEvent(arenaId, nextRound, 'round_start', null, null, {
      name: nextRoundConfig.name,
      max_leverage: nextRoundConfig.max_leverage,
      max_drawdown: nextRoundConfig.max_drawdown_percent,
      allowed_pairs: nextRoundConfig.allowed_pairs,
      grace_period: '2 minutes',
    }, `${nextRoundConfig.name} begins! Max leverage: ${nextRoundConfig.max_leverage}x | Max drawdown: ${nextRoundConfig.max_drawdown_percent}% | Pairs: ${nextRoundConfig.allowed_pairs.join(', ')}. You have 2 minutes to adjust positions.`);

    // 5. Update arena state
    await supabase.from('arenas').update({
      status: `round_${nextRound}`,
      current_round: nextRound,
      current_round_ends_at: new Date(Date.now() + nextRoundConfig.duration * 1000).toISOString(),
    }).eq('id', arenaId);

    // 6. After grace period, start strict enforcement
    setTimeout(async () => {
      await this.enforceRoundRulesStrictly(arenaId, nextRound);
    }, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * End arena — determine winner and settle
   */
  async endArena(arenaId: string): Promise<void> {
    const survivors = await getActiveParticipants(arenaId);

    let winner;
    if (survivors.length === 1) {
      winner = survivors[0];
    } else if (survivors.length > 1) {
      // Multiple survivors: highest PnL% wins
      let bestPnl = -Infinity;
      for (const s of survivors) {
        const account = await pacificaClient.getAccountInfo({ address: s.subaccount_address });
        const pnl = ((parseFloat(account.equity) - s.equity_round_1_start) / s.equity_round_1_start) * 100;
        if (pnl > bestPnl) {
          bestPnl = pnl;
          winner = s;
        }
      }
    } else {
      // All eliminated — last eliminated wins
      const lastEliminated = await supabase
        .from('eliminations')
        .select('participant_id')
        .eq('arena_id', arenaId)
        .order('eliminated_at', { ascending: false })
        .limit(1)
        .single();
      winner = await getParticipant(lastEliminated.participant_id);
    }

    // Close all remaining positions
    for (const s of survivors) {
      await pacificaClient.cancelAllOrders({ address: s.subaccount_address });
      const positions = await pacificaClient.getPositions({ address: s.subaccount_address });
      if (positions.length > 0) {
        const closeOrders = positions.map(p => ({
          type: 'market',
          symbol: p.symbol,
          side: p.side === 'long' ? 'sell' : 'buy',
          size: p.size,
          reduceOnly: true,
        }));
        await pacificaClient.batchOrders({ address: s.subaccount_address, orders: closeOrders });
      }
    }

    // Record final equity for all
    for (const s of survivors) {
      const account = await pacificaClient.getAccountInfo({ address: s.subaccount_address });
      await supabase.from('arena_participants').update({
        status: s.id === winner.id ? 'winner' : 'survived',
        equity_final: parseFloat(account.equity),
        total_pnl: parseFloat(account.equity) - s.equity_round_1_start,
        total_pnl_percent: ((parseFloat(account.equity) - s.equity_round_1_start) / s.equity_round_1_start) * 100,
      }).eq('id', s.id);
    }

    // Award badges
    await awardBadge(winner.user_id, 'champion', arenaId);
    // ... award other badges

    // Update arena
    await supabase.from('arenas').update({
      status: 'completed',
      winner_id: winner.user_id,
      ended_at: new Date().toISOString(),
    }).eq('id', arenaId);

    // Track in Fuul
    await fuulClient.trackEvent('arena_won', { userId: winner.wallet_address, arenaId });

    // Final event
    await createEvent(arenaId, null, 'arena_end', winner.user_id, null, {},
      `The arena has ended! ${winner.username} is the CHAMPION! Final PnL: +${winner.total_pnl_percent.toFixed(2)}%`
    );
  }
}
```

---

## 13. Frontend Architecture

### 13.1 Page Flow

```
Landing Page (/)
  │
  ├── [Connect Wallet via Privy]
  │
  ├── Arena List (/arenas)
  │   ├── Browse active arenas
  │   ├── Filter: status, preset, participants
  │   └── "Create Arena" button → /arenas/create
  │
  ├── Create Arena (/arenas/create)
  │   ├── Arena name, description
  │   ├── Select preset (Sprint/Daily/Weekly)
  │   ├── Set start time
  │   ├── Min/max participants
  │   ├── Invite-only toggle
  │   └── Confirm → redirects to arena page
  │
  ├── Arena Page (/arenas/[id])
  │   ├── Registration phase: participant list, countdown, "Join" button
  │   ├── Active phase (auto-routes based on role):
  │   │   ├── Trader → /arenas/[id]/trade
  │   │   └── Spectator → /arenas/[id]/spectate
  │   └── Completed phase: final results, stats, badges
  │
  ├── Trading View (/arenas/[id]/trade)
  │   ├── Chart (TradingView Lightweight Charts)
  │   ├── Order form (market/limit/stop)
  │   ├── Positions list
  │   ├── Open orders
  │   ├── Account info (equity, drawdown meter, leverage)
  │   ├── Round info (timer, zone parameters)
  │   ├── Mini leaderboard (your rank + nearby)
  │   └── Activity feed (compact)
  │
  ├── Spectator View (/arenas/[id]/spectate)
  │   ├── Survivor grid (all traders, PnL, drawdown bars)
  │   ├── Full activity feed
  │   ├── Market context (Elfa AI)
  │   ├── Vote panel (Second Life)
  │   ├── Round info + timer
  │   └── Click trader → expanded card (positions, equity curve)
  │
  ├── Profile (/profile/[address])
  │   ├── User stats (arenas, wins, survival rate)
  │   ├── Badge collection
  │   ├── Match history
  │   └── Referral link + stats
  │
  └── Leaderboard (/leaderboard)
      ├── Global rankings (all-time wins, PnL, survival rate)
      ├── Season rankings (if implemented)
      └── Powered by Fuul leaderboard API
```

### 13.2 Key UI Components Detail

#### DrawdownMeter Component

```
Visual: Horizontal bar showing current drawdown vs max allowed

[████████████░░░░░░░░] 12.3% / 20% — CAUTION (yellow)
[██████████████████░░] 17.8% / 20% — DANGER (red, pulsing)
[████░░░░░░░░░░░░░░░░]  3.1% / 20% — SAFE (green)
[████████████████████] 20.1% / 20% — ELIMINATED (grey, strike-through)

Color thresholds:
  0-50% of max  → green  (#22c55e)
  50-75% of max → yellow (#eab308)
  75-90% of max → orange (#f97316)
  90-100% of max → red   (#ef4444) + pulse animation
  >100%         → grey   (#6b7280) + "ELIMINATED" overlay
```

#### Round Transition Animation

```
When round changes:
1. Full-screen overlay fades in (dark, 0.8 opacity)
2. Current round name fades out: "THE STORM"
3. Zone shrinking animation (concentric circles tightening)
4. New parameters appear one by one:
   - "Max Leverage: 10x → 5x" (red flash)
   - "Max Drawdown: 15% → 10%" (red flash)
   - "Pairs: BTC, ETH, SOL → BTC only" (red flash)
5. New round name fades in: "FINAL CIRCLE"
6. 3-2-1 countdown
7. Overlay fades out, trading resumes
8. Sound effect: round-start.mp3
```

### 13.3 Design System

```
Theme: Dark Indigo

Colors:
  --bg-primary:     #0a0a1a    (deep dark)
  --bg-secondary:   #111128    (card backgrounds)
  --bg-tertiary:    #1a1a3e    (hover states)
  --accent-primary: #6366f1    (indigo — primary actions)
  --accent-gold:    #f59e0b    (loot, achievements)
  --text-primary:   #f8fafc    (white text)
  --text-secondary: #94a3b8    (muted text)
  --success:        #22c55e    (green — profit, safe)
  --danger:         #ef4444    (red — loss, danger)
  --warning:        #eab308    (yellow — caution)
  --elimination:    #dc2626    (dark red — elimination events)

Typography:
  Font: Inter (body) + JetBrains Mono (numbers, prices)
  Sizes: Follow Tailwind defaults

Border Radius:
  Cards: rounded-xl (12px)
  Buttons: rounded-lg (8px)
  Badges: rounded-full

Shadows:
  Cards: shadow-lg shadow-indigo-500/5
  Active elements: ring-2 ring-indigo-500/50
```

---

## 14. WebSocket Real-Time System

### 14.1 Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Pacifica    │────▶│  Our Backend     │────▶│  Frontend    │
│  WebSocket   │     │  (WS Aggregator) │     │  (Client WS) │
│  Server      │     │                  │     │              │
│              │     │  Subscribes to:  │     │  Receives:   │
│  Streams:    │     │  - All arena     │     │  - Processed │
│  - prices    │     │    subaccount    │     │    events    │
│  - positions │     │    updates       │     │  - PnL data  │
│  - orders    │     │  - Price feeds   │     │  - Drawdown  │
│  - trades    │     │                  │     │  - Activity  │
│              │     │  Processes:      │     │    feed      │
│              │     │  - PnL calc      │     │              │
│              │     │  - Drawdown check│     │              │
│              │     │  - Event creation│     │              │
└─────────────┘     └──────────────────┘     └──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Supabase         │
                    │  Realtime         │
                    │  (DB change       │
                    │   broadcasts)     │
                    └───────────────────┘
```

### 14.2 Client-Side WebSocket Manager

```typescript
// hooks/use-websocket.ts

// We use TWO WebSocket connections:
// 1. Supabase Realtime — for database change events (events, eliminations, votes)
// 2. Direct Pacifica WS — for price data (mark prices, orderbook)

// The backend acts as a proxy for private Pacifica channels (positions, orders)
// since those require subaccount authentication

// Frontend receives aggregated data via Supabase Realtime channels
// This avoids exposing Pacifica private keys to the client
```

### 14.3 Data Flow Per Feature

```
LIVE LEADERBOARD:
  Backend Local PnL Engine calculates equity from cached positions + WS mark prices
  → On each price update: recalculates PnL%, drawdown for all traders
  → Throttled: updates arena_participants table every 3 seconds (batched)
  → Supabase Realtime broadcasts to all clients
  → Frontend re-renders leaderboard
  → ZERO REST API polling for this feature

ACTIVITY FEED:
  Backend listens to Pacifica WS: trades channel per subaccount
  → On trade event: inserts into trades + events tables
  → Supabase Realtime broadcasts new event
  → Frontend appends to activity feed

ELIMINATION:
  Backend risk monitor detects drawdown breach
  → Executes elimination (cancel orders, close positions)
  → Inserts into eliminations + events tables
  → Updates arena_participants.status = 'eliminated'
  → Supabase Realtime broadcasts
  → Frontend shows elimination banner + sound effect

PRICE CHARTS:
  Frontend directly subscribes to Pacifica public WS: candles:{symbol}
  → Updates TradingView Lightweight Charts in real-time
  → No backend involvement (public data)

ORDER BOOK:
  Frontend directly subscribes to Pacifica public WS: orderbook:{symbol}
  → Updates orderbook visualization
  → No backend involvement (public data)
```

---

## 15. API Endpoints (Our Backend)

### 15.1 Complete API Route List

```
BASE: /api

AUTH (all routes require Privy JWT except noted)

=== ARENAS ===

GET    /api/arenas
  Query: ?status=registration|active|completed&preset=sprint|daily|weekly&page=1&limit=20
  Response: { arenas: Arena[], total: number, page: number }
  Auth: Public (no auth needed)

POST   /api/arenas
  Body: { name, description, preset, startsAt, minParticipants, maxParticipants, isInviteOnly }
  Response: { arena: Arena }
  Auth: Required

GET    /api/arenas/:arenaId
  Response: { arena: Arena, participants: Participant[], currentRound: Round }
  Auth: Public

POST   /api/arenas/:arenaId/join
  Body: { inviteCode? }
  Response: { participant: Participant }
  Auth: Required
  Side effects: Creates Pacifica subaccount, Fuul event tracking

DELETE  /api/arenas/:arenaId/leave
  Response: { success: boolean }
  Auth: Required (only during registration phase)

=== TRADING ===

POST   /api/arenas/:arenaId/trade
  Body: {
    type: 'market' | 'limit' | 'stop',
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    price?: number,        // for limit/stop
    leverage?: number,
    takeProfit?: number,
    stopLoss?: number,
    reduceOnly?: boolean
  }
  Response: { order: Order } | { error: string }
  Auth: Required (must be active participant)
  Logic: Validates → forwards to Pacifica API

DELETE  /api/arenas/:arenaId/trade/:orderId
  Response: { success: boolean }
  Auth: Required

PATCH  /api/arenas/:arenaId/trade/:orderId
  Body: { size?: number, price?: number }
  Response: { order: Order }
  Auth: Required

GET    /api/arenas/:arenaId/positions
  Response: { positions: Position[] }
  Auth: Required (own positions only)

GET    /api/arenas/:arenaId/orders
  Response: { orders: Order[] }
  Auth: Required (own orders only)

=== SPECTATOR ===

GET    /api/arenas/:arenaId/leaderboard
  Response: { rankings: { participant, pnl, drawdown, rank }[] }
  Auth: Public

GET    /api/arenas/:arenaId/events
  Query: ?limit=50&before=timestamp
  Response: { events: Event[] }
  Auth: Public

GET    /api/arenas/:arenaId/trader/:participantId
  Response: { participant, positions, equityCurve, trades }
  Auth: Public (spectator view)

POST   /api/arenas/:arenaId/vote
  Body: { votedForParticipantId: string }
  Response: { vote: Vote }
  Auth: Required (spectators only, 1 vote per round)

GET    /api/arenas/:arenaId/votes
  Response: { votes: { participantId, voteCount }[] }
  Auth: Public

=== MARKET DATA ===

GET    /api/markets/info
  Response: { markets: MarketInfo[] }
  Auth: Public
  Source: Proxied from Pacifica GET /markets/info

GET    /api/markets/prices
  Response: { prices: PriceData[] }
  Auth: Public

GET    /api/markets/sentiment/:symbol
  Response: { sentiment: SentimentData }
  Auth: Public
  Source: Elfa AI API

GET    /api/markets/commentary/:arenaId
  Response: { commentary: string }
  Auth: Public
  Source: Elfa AI generated

=== USER ===

GET    /api/users/me
  Response: { user: User }
  Auth: Required

PATCH  /api/users/me
  Body: { username?: string, avatarUrl?: string }
  Response: { user: User }
  Auth: Required

GET    /api/users/:address
  Response: { user: User, stats, badges, recentArenas }
  Auth: Public

GET    /api/users/me/referral
  Response: { referralCode, referralLink, referralCount, referralPoints }
  Auth: Required

=== LEADERBOARD ===

GET    /api/leaderboard
  Query: ?sortBy=wins|pnl|survival_rate&page=1&limit=50
  Response: { rankings: UserRanking[] }
  Auth: Public
  Source: Fuul leaderboard API + our stats

=== ADMIN / CRON (internal) ===

POST   /api/cron/risk-monitor
  Auth: Internal engine call (not exposed publicly)
  Logic: Runs drawdown check for all active arenas

POST   /api/cron/round-advance
  Auth: Internal engine call (not exposed publicly)
  Logic: Checks if any arena's current round has expired, triggers advancement

POST   /api/cron/arena-start
  Auth: Internal engine call (not exposed publicly)
  Logic: Checks if any arena's starts_at has passed, triggers arena start
```

---

## 16. Authentication & Security

### 16.1 Auth Flow

```
1. User clicks "Enter the Arena"
2. Privy modal opens → user chooses login method
3. Privy returns: { user, wallet, accessToken }
4. Frontend stores accessToken in memory (not localStorage)
5. Every API request includes: Authorization: Bearer {accessToken}
6. Backend verifies token with Privy SDK:
   const { userId } = await privy.verifyAuthToken(token);
7. If first login → create user record in database
8. If returning → fetch existing user
```

### 16.2 Security Measures

```
PRIVATE KEY MANAGEMENT:
  - Master arena wallet keys: encrypted at rest in database (AES-256-GCM)
  - Encryption key: stored as environment variable, never in code
  - Subaccount keys: same encryption
  - Keys NEVER sent to frontend
  - All Pacifica API calls happen server-side only

API SECURITY:
  - Rate limiting: 60 requests/min per user (trade endpoints)
  - Rate limiting: 200 requests/min per user (read endpoints)
  - CORS: restricted to our domain
  - Input validation: Zod schemas on all API routes
  - SQL injection: prevented by Supabase parameterized queries

ANTI-CHEAT:
  - Fuul sybil detection on arena join
  - One wallet = one participant per arena
  - No self-referrals (Fuul tracks)
  - Order validation server-side (can't bypass round rules)
  - All trades go through our backend → Pacifica (no direct access)

WEBSOCKET SECURITY:
  - Pacifica private channels: authenticated server-side only
  - Supabase Realtime: RLS policies enforce read-only for public data
  - No write access via WebSocket from client
```

---

## 17. Smart Contract Consideration

### 17.1 Do We Need Smart Contracts?

**For Hackathon MVP: NO.**

Rationale:
- Pacifica handles all trading infrastructure (orders, positions, settlement)
- Supabase handles game state (rounds, eliminations, loot)
- Privy handles wallet authentication
- Fuul handles referrals and sybil resistance
- No on-chain prize pool needed (testnet = virtual money)

### 17.2 Future (Post-Hackathon) Smart Contract Use Cases

If Colosseum goes to mainnet, smart contracts would be useful for:

```
1. PRIZE VAULT CONTRACT
   - Trustless prize pool: entry fees locked in contract
   - Automatic distribution to winner based on our backend's oracle call
   - Users don't need to trust us with their money

2. ARENA NFT
   - Mint NFT for arena winners (proof of victory)
   - Badge NFTs for achievements
   - Tradeable on secondary markets

3. GOVERNANCE
   - Token holders vote on: new loot types, rule changes, featured arenas
   - Staking for arena creation rights

But for hackathon: SKIP ALL OF THIS.
Focus on the core experience with off-chain infrastructure.
```

---

## 18. Development Timeline

### 18.1 Overview (March 16 — April 16, 2026)

```
WEEK 1 (Mar 16-22): Foundation & Core Setup
WEEK 2 (Mar 23-29): Game Engine & Trading
WEEK 3 (Mar 30-Apr 5): Experience Layer & Integrations
WEEK 4 (Apr 6-16): Polish, Testing & Demo Prep
```

### 18.2 Detailed Day-by-Day

#### WEEK 1: Foundation (Mar 16-22)

```
Day 1 (Mar 16) — Project Setup
  ├── Initialize Next.js 15 project with TypeScript
  ├── Configure Tailwind CSS v4 with dark theme
  ├── Set up Supabase project + database
  ├── Run initial migration (all tables from Section 11)
  ├── Set up environment variables
  ├── Deploy empty app to Vercel
  └── Deliverable: Empty app deployed, DB ready

Day 2 (Mar 17) — Authentication
  ├── Integrate Privy SDK
  ├── Create ConnectButton component
  ├── Implement auth middleware for API routes
  ├── Create user auto-registration on first login
  ├── Test: login via email, social, wallet
  └── Deliverable: Users can login and see their profile

Day 3 (Mar 18) — Pacifica API Client
  ├── Build TypeScript wrapper for Pacifica REST API
  ├── Implement Ed25519 authentication
  ├── Test all Market endpoints (info, prices, candles, orderbook)
  ├── Test Account endpoints (info, positions, equity history)
  ├── Test Order endpoints (market, limit, cancel)
  ├── Test Subaccount endpoints (create, list, transfer)
  └── Deliverable: Full Pacifica API client, tested on testnet

Day 4 (Mar 19) — Arena CRUD
  ├── Build arena creation form UI
  ├── Implement POST /api/arenas (create)
  ├── Implement GET /api/arenas (list)
  ├── Build arena list page with cards
  ├── Build arena detail page (registration phase)
  └── Deliverable: Users can create and browse arenas

Day 5 (Mar 20) — Arena Join Flow
  ├── Implement POST /api/arenas/:id/join
  ├── Subaccount creation on Pacifica
  ├── Join button + participant list UI
  ├── Implement Fuul sybil check on join
  ├── Handle edge cases (full, already joined, invite-only)
  └── Deliverable: Users can join arenas, subaccounts created

Day 6-7 (Mar 21-22) — Arena Lifecycle
  ├── Implement arena start logic (fund subaccounts)
  ├── Implement round transition logic
  ├── Set up cron jobs (arena-start, round-advance)
  ├── Create round records with correct parameters per preset
  ├── Test full lifecycle: create → register → start → advance rounds
  └── Deliverable: Arena can start and progress through rounds automatically
```

#### WEEK 2: Game Engine & Trading (Mar 23-29)

```
Day 8 (Mar 23) — Order Validator
  ├── Build OrderValidator class
  ├── Pair restriction enforcement
  ├── Leverage limit enforcement
  ├── Margin mode enforcement
  ├── Write unit tests for all validation cases
  └── Deliverable: Orders are validated against round rules

Day 9 (Mar 24) — Trading UI
  ├── Build order form component (market/limit/stop)
  ├── Implement POST /api/arenas/:id/trade
  ├── Build position list component
  ├── Build open orders component
  ├── Connect to Pacifica: place and cancel orders
  └── Deliverable: Traders can place orders through our UI

Day 10 (Mar 25) — Local PnL Engine + Risk Monitor
  ├── Build Local PnL Engine (in-memory position cache + mark price WS)
  ├── Subscribe to Pacifica public WS: prices:{symbol}
  ├── Implement local equity calculation (balance + unrealized PnL)
  ├── Implement drawdown monitoring on every price update
  ├── Periodic REST sync (every 30s) for reconciliation
  ├── Equity snapshot recording (throttled, every 10s to DB)
  ├── Grace period logic (pause monitoring, recalculate baseline)
  └── Deliverable: Drawdown monitoring that stays within API rate limits

Day 11 (Mar 26) — Elimination Engine
  ├── Build EliminationEngine class
  ├── Drawdown breach → instant elimination flow
  ├── Aggressive limit order close (with 5s market fallback)
  ├── Inactivity check at round end (anti-AFK)
  ├── Round-end ranking elimination
  ├── Transfer funds back to vault
  ├── Test: manually trigger elimination, verify all steps
  └── Deliverable: Traders get eliminated correctly

Day 12 (Mar 27) — Loot System (Simplified) + Mock Mode
  ├── Build LootCalculator (simplified: Wide Zone + Second Life only)
  ├── Wide Zone: track lowest max drawdown per trader (already in risk monitor)
  ├── Second Life: auto-award to top PnL% (trivial)
  ├── Apply loot effects in RiskMonitor (+5% drawdown buffer for Wide Zone)
  ├── Build Mock Engine for demo safety:
  │   ├── Simulated price data (random walk)
  │   ├── 4 pre-scripted bot traders with different behaviors
  │   ├── Same game logic, just different data source
  │   └── Toggled via DEMO_MODE=true env var
  └── Deliverable: Loot works + demo mode as safety net

Day 13-14 (Mar 28-29) — Integration Testing
  ├── Full arena lifecycle test (create → join → trade → eliminate → advance → win)
  ├── Test with multiple simultaneous traders
  ├── Test Blitz preset end-to-end (5 minute match)
  ├── Test all edge cases from Section 3.9 (including AFK, grace period, Sudden Death reset)
  ├── Test Mock Mode independently
  ├── Fix bugs discovered
  ├── Performance optimization (batch DB writes where possible)
  └── Deliverable: Core game engine works end-to-end
```

#### WEEK 3: Experience Layer (Mar 30 — Apr 5)

```
Day 15 (Mar 30) — TradingView Chart
  ├── Integrate Lightweight Charts library
  ├── Connect to Pacifica candle data (REST + WebSocket)
  ├── Candlestick chart with volume
  ├── Mark price overlay
  └── Deliverable: Live charts in trading view

Day 16 (Mar 31) — Spectator Dashboard
  ├── Build SurvivorGrid component
  ├── Build DrawdownMeter component
  ├── Build StatusBadge component (SAFE/CAUTION/DANGER/CRITICAL)
  ├── Leaderboard with real-time updates
  ├── Click-to-expand trader cards
  └── Deliverable: Spectators can watch the arena live

Day 17 (Apr 1) — Activity Feed & Events
  ├── Build ActivityFeed component
  ├── Implement event creation for all event types
  ├── Supabase Realtime subscription for new events
  ├── EliminationBanner component (full-width alert)
  ├── Sound effects on elimination
  └── Deliverable: Real-time activity feed with elimination alerts

Day 18 (Apr 2) — Voting & Round Transitions
  ├── Build VotePanel component (Second Life voting)
  ├── Implement POST /api/arenas/:id/vote
  ├── Live vote tallies via Supabase Realtime
  ├── Build RoundTransition animation component
  ├── Round countdown timer
  └── Deliverable: Spectator voting works, round transitions are visual

Day 19 (Apr 3) — Profile & Badges
  ├── Build profile page (stats, badges, match history)
  ├── Badge award logic (post-arena)
  ├── BadgeGrid component
  ├── Match history list with results
  └── Deliverable: User profiles with achievements

Day 20 (Apr 4) — Sponsor Integrations
  ├── Fuul referral link generation
  ├── Fuul event tracking (arena_joined, arena_won)
  ├── Fuul leaderboard API → global leaderboard page
  ├── Elfa AI sentiment endpoint integration
  ├── MarketContext component (AI commentary)
  └── Deliverable: All sponsor tools integrated

Day 21 (Apr 5) — Orderbook & Account UI
  ├── Orderbook visualization component
  ├── Account info panel (equity, balance, unrealized PnL)
  ├── Equity curve chart (per trader, per arena)
  ├── Funding rate display
  └── Deliverable: Complete trading UI
```

#### WEEK 4: Polish & Demo (Apr 6-16)

```
Day 22-23 (Apr 6-7) — UI Polish
  ├── Responsive design (desktop priority, mobile acceptable)
  ├── Loading states and skeletons
  ├── Error states and empty states
  ├── Animations (Framer Motion for key interactions)
  ├── Dark theme refinement
  ├── Typography and spacing consistency
  └── Deliverable: Polished, professional UI

Day 24-25 (Apr 8-9) — Testing & Bug Fixes
  ├── End-to-end testing with real Pacifica testnet
  ├── Multi-user testing (open in multiple browsers)
  ├── Stress test: 20+ traders in one arena
  ├── Edge case testing (all from Section 3.9)
  ├── Performance audit (Lighthouse, WebSocket memory leaks)
  ├── Fix all discovered bugs
  └── Deliverable: Stable, tested application

Day 26-27 (Apr 10-11) — Landing Page & Documentation
  ├── Design landing page (hero, features, how it works)
  ├── "How to Play" guide section
  ├── FAQ section
  ├── Code documentation (JSDoc on key functions)
  ├── README.md with setup instructions
  └── Deliverable: Complete, presentable website

Day 28-29 (Apr 12-13) — Demo Video
  ├── Script the demo flow:
  │   1. Show landing page, explain concept (30s)
  │   2. Create an arena, show config (30s)
  │   3. Join with 3-4 test wallets (30s)
  │   4. Show live trading in Round 1 (60s)
  │   5. Show elimination happening (30s)
  │   6. Show zone shrinking + Round 2 (30s)
  │   7. Show spectator view + voting (30s)
  │   8. Show loot award (20s)
  │   9. Show final results + badges (20s)
  │   10. Technical architecture overview (30s)
  ├── Record demo video (target: 4-5 minutes)
  ├── Edit with voiceover
  └── Deliverable: Demo video ready

Day 30-31 (Apr 14-15) — Final Submission Prep
  ├── Final bug fixes
  ├── Verify deployment on Vercel is stable
  ├── Write submission documentation:
  │   - Project description
  │   - Technical stack
  │   - Pacifica API usage list
  │   - Sponsor tool usage
  │   - Future roadmap
  ├── Prepare demo day presentation slides
  ├── Test demo flow end-to-end one more time
  └── Deliverable: Everything ready for submission

Day 32 (Apr 16) — SUBMISSION DAY
  ├── Final review of all materials
  ├── Submit via: https://forms.gle/zYm9ZBH1SoUE9t9o7
  ├── Submit: code repo, demo video, documentation
  ├── Celebrate!
  └── Deliverable: SUBMITTED
```

---

## 19. Testing Strategy

### 19.1 Unit Tests

```
Location: /tests/engine/

risk-monitor.test.ts:
  ✓ Correctly calculates drawdown percentage
  ✓ Triggers elimination when drawdown exceeds threshold
  ✓ Wide Zone loot adds 5% buffer
  ✓ Second Life prevents first elimination
  ✓ Second Life only works once
  ✓ Handles edge case: equity exactly at threshold (not eliminated)

elimination.test.ts:
  ✓ Cancels all orders on elimination
  ✓ Closes all positions on elimination
  ✓ Transfers funds back to vault
  ✓ Records elimination in database
  ✓ Broadcasts elimination event
  ✓ Round-end ranking correctly eliminates bottom X%
  ✓ Tie-breaking by lowest max drawdown hit works
  ✓ Inactivity elimination at round end (0 trades = eliminated)
  ✓ Aggressive limit order close (with 5s market fallback)

loot-calculator.test.ts:
  ✓ Correctly identifies lowest max drawdown (Wide Zone winner)
  ✓ Correctly identifies highest PnL% (Second Life auto-award)
  ✓ Handles edge cases (0 trades, equal values)
  ✓ A trader can earn both loots simultaneously

order-validator.test.ts:
  ✓ Rejects orders for disallowed pairs
  ✓ Rejects orders exceeding leverage limit
  ✓ Rejects orders from eliminated traders
  ✓ Correctly calculates effective leverage with existing positions
  ✓ Allows orders during grace period only for reduce/close
```

### 19.2 Integration Tests

```
Location: /tests/api/

arenas.test.ts:
  ✓ Create arena with valid config
  ✓ Reject creation with invalid config
  ✓ List arenas with filters
  ✓ Join arena creates subaccount
  ✓ Can't join full arena
  ✓ Can't join twice

trade.test.ts:
  ✓ Execute market order through our API → Pacifica
  ✓ Execute limit order
  ✓ Cancel order
  ✓ Order rejected for wrong pair
  ✓ Order rejected for excess leverage
```

### 19.3 End-to-End Test Scenarios

```
SCENARIO 1: Happy Path
  1. Create Sprint arena
  2. 8 users join
  3. Arena starts, subaccounts funded
  4. Round 1: users trade, bottom 2 eliminated by drawdown
  5. Round 1 ends: bottom 30% of remaining eliminated by ranking
  6. Loot awarded to top performers
  7. Round 2: tighter rules, more eliminations
  8. Round 3: BTC only, very tight
  9. Sudden Death: last trader standing wins
  10. Arena settles, badges awarded
  Expected: Full flow completes, winner determined, stats recorded

SCENARIO 2: All Eliminated
  1. Create Sprint arena with 4 users
  2. All 4 hit drawdown limit in Round 1
  3. Last one eliminated (by timestamp) wins
  Expected: Winner is last timestamp, arena completed

SCENARIO 3: Loot Effects
  1. Arena with 8 users
  2. After Round 1: verify Wide Zone (+5% DD buffer) awarded to lowest drawdown trader
  3. After Round 1: verify Second Life auto-awarded to top PnL% trader
  4. In Round 2: verify Wide Zone holder has 20% drawdown limit (15% + 5% bonus)
  5. In Round 3: verify loot from Round 2 is gone (not cumulative)
  Expected: Loot applies correctly for one round only

SCENARIO 4: Second Life
  1. Arena running, spectators vote for a trader
  2. That trader hits drawdown limit
  3. Second Life triggers: drawdown resets, not eliminated
  4. Trader hits drawdown AGAIN
  5. This time, eliminated (Second Life used)
  Expected: First breach forgiven, second breach eliminates

SCENARIO 5: Bot Trader
  1. User joins arena
  2. Instead of UI, sends orders via our API programmatically
  3. Verify all validation still applies
  4. Verify order execution works
  Expected: API trading works identically to UI trading
```

### 19.4 Manual QA Checklist

```
[ ] Landing page loads, displays correctly
[ ] Privy login works (email, Google, wallet)
[ ] Arena creation: all presets work
[ ] Arena list: filters work, cards display correctly
[ ] Arena join: subaccount created, participant listed
[ ] Arena join: sybil check blocks flagged wallets
[ ] Trading: market order executes
[ ] Trading: limit order places and fills
[ ] Trading: stop order triggers correctly
[ ] Trading: TP/SL works
[ ] Trading: order rejected for wrong pair (correct error message)
[ ] Trading: order rejected for excess leverage (correct error message)
[ ] Positions: display correctly with real-time PnL
[ ] Drawdown meter: updates in real-time, correct colors
[ ] Elimination: banner appears, sound plays
[ ] Elimination: trader becomes spectator, can't trade
[ ] Round transition: animation plays, new parameters displayed
[ ] Loot: calculated and awarded correctly
[ ] Loot: effects apply in next round
[ ] Spectator view: all traders visible with stats
[ ] Activity feed: all events stream in real-time
[ ] Voting: can vote, can't vote twice, tally updates live
[ ] Market context: Elfa AI sentiment displays
[ ] Profile: stats correct, badges display
[ ] Leaderboard: global rankings correct
[ ] Referral: link generates, Fuul tracks events
[ ] Charts: candles update in real-time
[ ] Orderbook: updates in real-time
[ ] Responsive: works on 1920px, 1440px, 1024px screens
[ ] Performance: no memory leaks after 30min session
[ ] Error states: network error, API error handled gracefully
```

---

## 20. Deployment & Infrastructure

### 20.1 Services

| Service | Provider | Tier | Purpose |
|---|---|---|---|
| Frontend (SSR + static) | Vercel | Free/Pro | Next.js hosting, pages, Privy auth |
| **Game Engine** | **Railway** | **Free ($5 credit)** | **Persistent Node.js process: risk monitor, WS, in-memory state, timers** |
| Database | Supabase | Free | PostgreSQL + Realtime broadcasts |
| Authentication | Privy | Free tier | Wallet + social login |
| Domain | (Optional) | - | colosseum.gg or similar |
| Monitoring | Sentry | Free | Error tracking |

> **Why Railway for Game Engine (not Vercel)?** The game engine needs persistent state
> (in-memory position cache), long-lived WebSocket connections to Pacifica, and continuous
> timers (round progression, risk monitoring). Serverless functions (Vercel) are stateless
> and ephemeral — they'd lose all state on cold start. Railway runs a persistent Node.js
> process that stays alive, keeping WebSocket connections and in-memory state intact.
> Free tier ($5/month credit) is more than enough for hackathon.

### 20.2 Environment Variables

```bash
# .env.local

# Pacifica
PACIFICA_API_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_WS_URL=wss://test-ws.pacifica.fi
PACIFICA_MASTER_PRIVATE_KEY=           # For initial testnet funding

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx          # Server-side only

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=xxx
PRIVY_APP_SECRET=xxx

# Fuul
FUUL_API_KEY=xxx
FUUL_PROJECT_ID=xxx

# Elfa AI
ELFA_API_KEY=xxx

# Security
ENCRYPTION_KEY=xxx                     # AES-256 key for wallet encryption
CRON_SECRET=xxx                        # Verify cron job authenticity
```

### 20.3 Deployment Flow

```
Frontend (Vercel):
  git push → Vercel auto-deploys preview
  Production: git push main → colosseum.vercel.app

Game Engine (Railway):
  git push → Railway auto-deploys from /engine directory (or Dockerfile)
  Production: engine.colosseum.railway.app
  Always-on: Railway keeps the process running 24/7
  Health check: GET /health endpoint monitored by Railway

Database:
  Supabase migrations run via CLI:
  npx supabase db push

Communication:
  Frontend → Engine: REST API calls (create arena, execute trade, etc.)
  Engine → Frontend: Supabase Realtime (DB change broadcasts)
  Engine → Pacifica: REST API + WebSocket (trading, price feeds)
```

---

## 21. Demo Day Strategy

### 21.1 Demo Flow (5 minutes max)

```
[0:00-0:30] HOOK
  "What if trading competitions were as exciting as Battle Royale games?
   I'm going to show you how Pacifica Colosseum turns perpetual futures
   trading into the most engaging competition in DeFi."

[0:30-1:30] LIVE DEMO — Create & Join
  - Show landing page
  - Create a Blitz arena (5-minute preset)
  - Show 4 pre-joined test traders
  - Start the arena
  - Show subaccounts being funded on Pacifica

[1:30-3:00] LIVE DEMO — The Battle
  - Show Round 1: traders placing orders
  - Show live leaderboard updating
  - Show drawdown meters changing color
  - TRIGGER an elimination (pre-staged trader at drawdown limit)
  - Show elimination banner + activity feed
  - Show zone shrinking → Round 2 parameters tighten
  - Show spectator voting for Second Life
  - Show Elfa AI market commentary

[3:00-3:30] LIVE DEMO — Victory
  - Show Sudden Death with 2 remaining traders
  - Winner announcement
  - Profile with badges earned

[3:30-4:30] TECHNICAL DEPTH
  - Show Pacifica API integration (24+ endpoints)
  - Show subaccount architecture diagram
  - Highlight: real trading on Pacifica, not simulated
  - Show sponsor integrations (Privy, Fuul, Elfa AI)
  - Show code quality (TypeScript, tests, clean architecture)

[4:30-5:00] VISION
  "Colosseum makes Pacifica the home of competitive trading.
   Every elimination, every clutch trade, every zone shrink
   creates content, creates community, creates traders.
   This is how you turn a perpetuals exchange into a spectator sport."
```

### 21.2 Pre-Demo Preparation

```
1 day before demo:
  - Set up 6 test wallets with testnet funds
  - Pre-create arena, pre-join 4-5 traders
  - Pre-execute some trades so there's history
  - Have one trader near drawdown limit (ready to be eliminated live)
  - Test the full demo flow 3 times
  - Have backup recording in case of live issues
```

---

## 22. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pacifica API downtime | Medium | High | **Mock Mode** built in — switch to DEMO_MODE=true for simulated data. Also: retry with exponential backoff for transient failures. |
| Scope creep | High | High | Strictly follow this blueprint. Cut features bottom-up: Rhinofi → Elfa AI → voting → badges before touching core. |
| WebSocket disconnects | Medium | Medium | Auto-reconnect logic with exponential backoff. Local PnL Engine holds last known state — no data loss on brief disconnect. |
| Subaccount creation issues | Low | High | Test thoroughly in Week 1. Have manual process as backup. Dual-signature requirement may need user interaction — test early. |
| Pacifica testnet rate limits | **LOW (fixed)** | Medium | **Local PnL Engine** calculates equity from WS mark prices. REST only used for order execution + periodic sync (30s). Total: ~150 req/min vs old ~1,280 req/min. |
| Demo day technical failure | Low | Critical | **Mock Mode** as primary fallback. Pre-recorded backup video. Blitz preset (5min) for live demo. |
| Testnet thin liquidity | Medium | Medium | Starting capital reduced to $1,000. Elimination uses aggressive limit orders (not market). Sudden Death drawdown widened to 8%. |
| AFK/camping exploit | **ELIMINATED** | N/A | Minimum activity requirement per round (1 trade or 5% volume). Inactivity = elimination. |
| Grace period death spiral | **ELIMINATED** | N/A | Drawdown monitoring paused during grace period. Baseline recalculated post-grace. |
| Not enough time | Medium | High | Priority order below. Each layer is independently valuable. Blitz preset allows demo even with minimal features. |
| Multi-user concurrency bugs | Medium | Medium | Use database transactions for critical operations (elimination, round advance). Implement optimistic locking. |

### Feature Priority (Cut List — If Running Out of Time)

```
MUST HAVE (core — without these, no project):
  ✓ Arena creation + join
  ✓ Subaccount funding
  ✓ Order execution via Pacifica
  ✓ Local PnL Engine (drawdown monitoring via WS mark prices)
  ✓ Drawdown-based elimination
  ✓ Round progression with parameter changes + grace period
  ✓ Inactivity elimination (anti-AFK)
  ✓ Live leaderboard
  ✓ Privy authentication
  ✓ Blitz preset (5-minute matches for demo)
  ✓ Mock Mode (demo safety net)

SHOULD HAVE (major differentiators):
  ○ Spectator dashboard
  ○ Activity feed
  ○ Ranking elimination at round end
  ○ Trading UI with charts
  ○ Fuul referral integration
  ○ Wide Zone loot (simplified)
  ○ Second Life loot (auto-award to top performer)

NICE TO HAVE (polish):
  ○ Spectator voting for Second Life
  ○ Elfa AI commentary
  ○ Badges and achievements
  ○ Profile page
  ○ Round transition animation
  ○ Sound effects
  ○ Sprint/Daily/Weekly presets

ALREADY CUT from MVP (post-hackathon enhancements):
  ✗ Leverage Shield loot (cut: too much cross-system complexity)
  ✗ Extra Pair loot (cut: too much cross-system complexity)
  ✗ Rhinofi cross-chain (cut: testnet uses faucet)
  ✗ Team/alliance mode (cut: scope)
  ✗ Post-match replay (cut: scope)
  ✗ Custom arena presets (cut: scope)
```

---

## 23. Final Deliverables Checklist

```
SUBMISSION (April 16, 2026):

CODE:
  [ ] GitHub repository (public or shared with judges)
  [ ] Clean commit history showing development progression
  [ ] README.md with:
      [ ] Project description
      [ ] Setup instructions (clone, install, env vars, run)
      [ ] Tech stack list
      [ ] Pacifica API endpoints used
      [ ] Sponsor tools integrated
      [ ] Architecture diagram
  [ ] Working deployment on Vercel

DEMO:
  [ ] Demo video (4-5 minutes)
  [ ] Uploaded to YouTube/Loom (public or unlisted)
  [ ] Covers: concept, live demo, technical depth, vision

DOCUMENTATION:
  [ ] Project description document
  [ ] Technical architecture overview
  [ ] Pacifica integration details (which endpoints, how they're used)
  [ ] Sponsor integration details
  [ ] Future roadmap

SUBMIT VIA:
  https://forms.gle/zYm9ZBH1SoUE9t9o7
```

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Arena** | A single competition instance/lobby |
| **Round** | A phase within an arena with specific rules |
| **Zone** | The set of trading parameters (leverage, pairs, drawdown) |
| **Zone Shrinking** | Parameters tightening each round |
| **Elimination** | Removal of a trader from the arena |
| **Drawdown** | Percentage decline from round-start equity |
| **Loot** | Tactical advantage earned by top performers |
| **Second Life** | Loot that forgives one drawdown breach |
| **Spectator** | Non-trading viewer who can watch and vote |
| **Subaccount** | Pacifica child account linked to arena vault |
| **Mark Price** | Pacifica's fair price used for PnL calculation |
| **Funding Rate** | Periodic payment between long/short traders |
| **Perpetual (Perp)** | Derivative contract with no expiry |

## Appendix B: Quick Reference — Round Parameters

| Parameter | Round 1 | Round 2 | Round 3 | Sudden Death |
|---|---|---|---|---|
| Name | Open Field | The Storm | Final Circle | Sudden Death |
| Max Leverage | 20x | 10x | 5x | 3x |
| Margin Mode | Any | Isolated | Isolated | Isolated |
| Max Drawdown | 20% | 15% | 10% | 8% |
| Pairs | All | Top 3 | BTC only | BTC only |
| Elimination % | Bottom 30% | Bottom 40% | Top 5 survive | Any breach |
| Min Activity | 3 trades + 10% vol | 3 trades + 10% vol | 3 trades + 10% vol | N/A |
| Grace Period | N/A (first round) | 2 min | 2 min | 1 min |
| Blitz Duration | 90 sec | 90 sec | 60 sec | 60 sec |
| Sprint Duration | 30 min | 30 min | 30 min | 30 min |
| Daily Duration | 6 hours | 6 hours | 6 hours | 6 hours |
| Weekly Duration | 2 days | 2 days | 2 days | 1 day |
| Safety Valve | N/A | N/A | N/A | All dead in 60s → reset with 12% DD |

---

## Appendix C: Changelog (v1 → v2)

| Change | Reason | Section |
|---|---|---|
| Added Blitz preset (5 min) | Demo day: juri can watch full match in 5 minutes | 3.2 |
| Added Minimum Activity rule | Prevents AFK/camping exploit (0% PnL survival) | 3.4, 3.5 |
| Added Grace Period protocol | Prevents Death Spiral when adjusting leverage between rounds | 3.5b |
| Sudden Death drawdown 5% → 8% | 5% + 3x leverage = 1.66% price move = instant death on testnet. 8% is tight but survivable | 3.4 |
| Added Sudden Death safety valve | If ALL traders die in 60s, round resets with 12% DD (testnet liquidity protection) | 3.4, 3.9 |
| Simplified Loot System (4 → 2) | Leverage Shield + Extra Pair added too much cross-system complexity for MVP. Wide Zone + Second Life sufficient | 5.2 |
| Second Life: voting limited to bottom 50% | Prevents KOL/popularity bias. Only underdogs can receive votes | 5.5 |
| Risk Monitor → Local PnL Engine | Old: REST polling 640 req/min → rate limited. New: WS mark prices + local calc → ~150 req/min | 12.2 |
| Elimination: market close → aggressive limit | Testnet orderbooks are thin. Market orders cause extreme slippage. Limit with 5s fallback | 12.3 |
| Starting capital $10,000 → $1,000 | Smaller positions = less testnet market impact = less slippage | 4.3 |
| Added Mock Mode (engine/mock-engine.ts) | Demo safety net if Pacifica testnet is down during demo day | 8.3, 22 |
| Supabase Realtime throttled to 3s | Prevents quota exhaustion on free tier with many spectators | 6.3 |
| Game Engine split to persistent server (Railway) | In-memory state + WS + timers incompatible with serverless (Vercel Functions) | 8.1, 8.2 |
| Position data hidden during active rounds | Prevents copy-trading/spying between competitors. Only PnL% and drawdown visible | 6.1b |
| Anti-AFK strengthened: 1 trade → 3 trades + 10% vol | 1 trade was trivially gameable. 3 round-trips at 10% volume forces real engagement | 3.4, 3.5 |
| Fixed all doc inconsistencies (v1 remnants) | $10K→$1K, Leverage Shield/Extra Pair removed from code/tests/UI, Sprint→Blitz in demo | Throughout |
| Sharpened user positioning: trader is PRIMARY | 6 equal user types → clear hierarchy. Trader first, spectator supports, rest is future | 1 |
| Reframed problem statement: consequences, not money | "Zero stakes" → "zero consequences." Testnet has competitive consequences. Ranked game analogy | 2 |
| Max 1 loot per trader per round (anti-snowball) | Prevents dominant trader from compounding advantages with multiple loots | 5.4 |
| Deployment: Vercel + Railway split | Frontend on Vercel, Game Engine on Railway (persistent process for state/WS/timers) | 8.1, 20 |

---

*Last updated: March 25, 2026*
*Version: 2.2 — SDK-verified endpoints, corrected auth flow, all paths confirmed from python-sdk*
*Status: READY FOR DEVELOPMENT*

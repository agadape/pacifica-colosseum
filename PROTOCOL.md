# Pacifica Colosseum Protocol

> **Version:** 1.0
> **Last Updated:** March 25, 2026
> **Status:** Final Draft

---

## 1. Overview

Pacifica Colosseum is a competitive trading protocol built on Pacifica's perpetual futures infrastructure. It organizes traders into time-bound arenas where they compete through progressive elimination rounds. Each round tightens trading constraints — reducing leverage limits, restricting available pairs, and narrowing drawdown thresholds. Traders who breach the rules or underperform are eliminated. The last trader standing wins.

The protocol creates competitive consequences without financial risk by leveraging Pacifica's testnet and subaccount architecture.

---

## 2. Actors

| Actor | Description |
|---|---|
| **Trader** | Participant who trades in an arena using a funded subaccount |
| **Spectator** | Observer who watches live arena data and can vote on Second Life |
| **Engine** | Server-side process that enforces rules, monitors risk, and manages rounds |
| **Vault** | Master Pacifica account that holds arena funds and spawns subaccounts |

---

## 3. Arena Lifecycle

```
 [1] CREATION        [2] REGISTRATION       [3] FUNDING
  Engine creates  →   Traders join via   →   Vault creates
  arena config        wallet connect         subaccounts &
  + vault wallet      (Privy auth)           transfers capital

       ↓                    ↓                      ↓

 [4] ROUND 1         [5] ROUND 2...N        [6] SUDDEN DEATH
  Trading begins  →   Zone shrinks:      →   Final survivors
  Drawdown            leverage ↓              compete under
  monitored           pairs ↓                 extreme constraints
  Eliminations        drawdown ↓              Any breach = out
  at round end        More eliminations

       ↓                    ↓                      ↓

 [7] SETTLEMENT
  Winner determined
  All positions closed
  Subaccounts settled
  Funds returned to vault
  Badges awarded
```

### 3.1 Phase Details

**CREATION** — Anyone with a connected wallet creates an arena by selecting a preset (Blitz/Sprint/Daily/Weekly). The engine generates a vault keypair and stores the encrypted private key.

**REGISTRATION** — Traders connect via Privy (email, social, or wallet). On join, the engine generates a subaccount keypair and calls Pacifica's `POST /account/subaccount/create` with dual signatures (both generated server-side since we hold both keys). Anti-sybil check via Fuul. Arena requires minimum 4 traders to start.

**FUNDING** — When start time is reached, the vault transfers starting capital ($1,000 testnet USDC) to each subaccount via `POST /account/subaccount/transfer`. Equity snapshots are taken as baseline.

**ROUNDS** — Each round runs for a defined duration. The engine monitors drawdown continuously via the Local PnL Engine (WebSocket mark prices + cached positions). At round end: inactivity check, ranking elimination, loot award, grace period, then next round.

**SETTLEMENT** — All remaining positions are closed (aggressive limit orders with market fallback). Remaining funds transferred back to vault. Winner recorded. Badges distributed.

---

## 4. Round Protocol

### 4.1 Parameter Progression

| Parameter | Round 1: Open Field | Round 2: The Storm | Round 3: Final Circle | Sudden Death |
|---|---|---|---|---|
| Max Leverage | 20x | 10x | 5x | 3x |
| Margin Mode | Any | Isolated only | Isolated only | Isolated only |
| Max Drawdown | 20% | 15% | 10% | 8% |
| Available Pairs | All | Top 3 by volume | BTC-PERP only | BTC-PERP only |
| Elimination | Bottom 30% by PnL | Bottom 40% by PnL | Top 5 advance | Any drawdown breach |
| Min Activity | 3 trades + 10% vol | 3 trades + 10% vol | 3 trades + 10% vol | N/A |

### 4.2 Round Transition Protocol

```
Round N ends
    │
    ▼
┌─────────────────────────────┐
│  GRACE PERIOD (2 min)       │
│  • Drawdown monitoring OFF  │
│  • Only reduce/close orders │
│  • No new positions         │
│  • Adjust leverage to comply│
└─────────────┬───────────────┘
              │
              ▼
    Equity snapshot taken
    (new baseline for Round N+1)
              │
              ▼
    Round N+1 parameters enforced
    Loot announced
    Trading resumes
    Drawdown monitoring ON
```

### 4.3 Preset Durations

| Preset | Round 1 | Round 2 | Round 3 | Sudden Death | Total |
|---|---|---|---|---|---|
| Blitz | 90s | 90s | 60s | 60s | 5 min |
| Sprint | 30m | 30m | 30m | 30m | 2 hours |
| Daily | 6h | 6h | 6h | 6h | 24 hours |
| Weekly | 2d | 2d | 2d | 1d | 7 days |

---

## 5. Elimination Protocol

Traders are eliminated through four mechanisms, checked in priority order:

### 5.1 Drawdown Breach (Instant)

```
IF equity < baseline * (1 - max_drawdown_percent):
    → Eliminate immediately

Equity calculated locally:
    equity = cached_balance + sum(unrealized_pnl_per_position)
    unrealized_pnl = (mark_price - entry_price) * size * direction
    mark_price sourced from Pacifica WebSocket (real-time, no rate limits)

Baseline = equity at end of grace period (NOT start of previous round)
```

**Wide Zone loot exception:** If trader has Wide Zone, max drawdown is increased by +5%.

**Second Life loot exception:** If trader has unused Second Life, drawdown breach is forgiven once. Baseline resets to current equity. Second Life is then consumed.

### 5.2 Inactivity (Round End)

```
IF trades_this_round < 3 OR volume_this_round < 10% of starting_capital:
    → Eliminate at round end with reason "inactivity"
```

Prevents AFK/camping strategy where traders survive with 0% PnL by never trading.

### 5.3 Leverage Violation (Warning + Force)

```
IF effective_leverage > round_max_leverage:
    → Warning notification (10 second grace)
    → If not corrected: force-reduce position
    → If repeated 3x in same round: eliminate
```

### 5.4 Ranking (Round End)

```
After inactivity eliminations are processed:
    → Rank all surviving traders by PnL%
    → PnL% = (current_equity - baseline) / baseline * 100
    → Eliminate bottom X% (30% R1, 40% R2, top 5 survive R3)
    → Ties broken by: lowest max drawdown hit
```

### 5.5 Elimination Execution

When a trader is eliminated, the following sequence executes atomically:

```
1. POST /orders/cancel_all         → Cancel all open orders
2. POST /orders/create (limit)     → Close positions via aggressive limit orders
                                      Long: sell at best_bid * 0.999
                                      Short: buy at best_ask * 1.001
3. Wait 5 seconds
4. IF positions remain:
     POST /orders/create_market    → Market close fallback
5. POST /account/subaccount/transfer → Return funds to vault
6. Record elimination in database
7. Broadcast elimination event to all connected clients
```

---

## 6. Loot Protocol

At the end of each round (except Sudden Death), two loots are awarded to surviving traders.

### 6.1 Loot Types

| Loot | Effect | Eligibility | Duration |
|---|---|---|---|
| **Wide Zone** | +5% drawdown buffer added to round limit | Trader with lowest max drawdown hit during the round | Next round only |
| **Second Life** | Survive one drawdown breach (baseline resets) | Trader with highest PnL% during the round | Next round only |

### 6.2 Loot Rules

- **Max 1 loot per trader per round.** If a trader qualifies for both, they choose one. The other goes to the runner-up.
- Loots do not stack across rounds. A loot earned in Round 1 expires when Round 2 ends.
- Second Life can only trigger once. After use, the trader's drawdown baseline resets to current equity but no further forgiveness is granted.
- Loot effects are enforced server-side. Traders cannot manipulate their own loot status.

### 6.3 Spectator Voting (Enhanced — Optional)

If spectator voting is enabled, Second Life is awarded by vote instead of auto-award:

```
Voting Rules:
  • Window: last 5 minutes of round (last 30 seconds for Blitz)
  • 1 vote per wallet (Fuul sybil check)
  • ONLY traders ranked in bottom 50% are eligible to receive votes
  • This prevents popularity/KOL bias
  • Fallback: if no votes cast, auto-awards to top PnL%
```

---

## 7. Trading Protocol

### 7.1 Order Flow

```
Trader submits order (via Colosseum UI or API)
    │
    ▼
┌─────────────────────────────┐
│  ORDER VALIDATOR (Engine)   │
│  Check:                     │
│  ├── Trader status = active │
│  ├── Pair allowed this round│
│  ├── Leverage within limit  │
│  ├── Not in grace period    │
│  │   (unless reduce/close)  │
│  └── Margin sufficient      │
└─────────────┬───────────────┘
              │
         Valid? ──No──→ Reject with error message
              │
             Yes
              │
              ▼
┌─────────────────────────────┐
│  PACIFICA API               │
│  POST /orders/create_market │
│  or POST /orders/create     │
│  (signed with subaccount    │
│   keypair, server-side)     │
└─────────────┬───────────────┘
              │
              ▼
    Order executed on Pacifica
    Engine updates local position cache
    Event broadcast to spectators
```

### 7.2 Supported Order Types

| Type | Pacifica Endpoint | Notes |
|---|---|---|
| Market | `POST /orders/create_market` | Immediate execution at best price |
| Limit | `POST /orders/create` | Execute at specified price or better |
| TWAP | `POST /orders/twap/create` | Time-weighted average execution |
| TP/SL | `POST /positions/tpsl` | Attached to existing position |
| Batch | `POST /orders/batch` | Multiple operations in one request |

### 7.3 Position Visibility

During active rounds, trader data is partially hidden to prevent copy-trading:

| Data | Visible to Others? | When Revealed? |
|---|---|---|
| PnL% | Yes (real-time) | Always |
| Drawdown % | Yes (real-time) | Always |
| Status (SAFE/DANGER) | Yes (real-time) | Always |
| Trade count | Yes (real-time) | Always |
| Active loots | Yes (badges) | Always |
| Specific positions | **No** | After round ends |
| Open orders | **No** | After round ends |
| Exact equity | **No** | After round ends |
| Trade history | **No** | After arena ends |

---

## 8. Subaccount Architecture

The protocol uses Pacifica's subaccount system to isolate trader funds.

```
┌──────────────────────────────────────────┐
│  VAULT (Master Account)                  │
│  Generated per arena                     │
│  Holds total arena capital               │
│  Private key: encrypted, server-side     │
│                                          │
│  ├── Subaccount: Trader A ($1,000)       │
│  │   └── Independent positions & orders  │
│  │                                       │
│  ├── Subaccount: Trader B ($1,000)       │
│  │   └── Independent positions & orders  │
│  │                                       │
│  ├── Subaccount: Trader C ($1,000)       │
│  │   └── Independent positions & orders  │
│  │                                       │
│  └── ... (up to 100 subaccounts)         │
└──────────────────────────────────────────┘
```

### 8.1 Subaccount Creation (Dual-Signature)

```
1. Engine generates NEW Solana keypair for subaccount
2. Subaccount keypair signs vault's public key
   → sub_signature (proves subaccount consents)
3. Vault keypair signs sub_signature
   → main_signature (proves vault consents)
4. Both signatures sent to POST /account/subaccount/create
5. Pacifica verifies both → relationship established

Since engine holds BOTH private keys, this is fully automated.
Trader never needs to sign anything for subaccount creation.
```

### 8.2 Fund Flow

```
Arena Start:
  Vault ──[$1,000]──→ Subaccount A
  Vault ──[$1,000]──→ Subaccount B
  Vault ──[$1,000]──→ Subaccount C

During Arena:
  Subaccount A trades on Pacifica (equity fluctuates)
  Subaccount B trades on Pacifica (equity fluctuates)

On Elimination:
  Subaccount B ──[remaining $]──→ Vault (funds reclaimed)

On Arena End:
  Subaccount A ──[remaining $]──→ Vault
  Subaccount C ──[remaining $]──→ Vault
```

---

## 9. Risk Engine

### 9.1 Local PnL Engine

The engine does NOT poll Pacifica REST API for equity (rate limit constraint). Instead:

```
DATA SOURCE:
  • Balance: cached on round start, updated on trade + every 30s REST sync
  • Positions: cached on trade events, reconciled every 30s via REST
  • Mark prices: Pacifica public WebSocket (real-time, unlimited)

CALCULATION (runs on every price update, ~1/second):
  equity = balance + sum(unrealized_pnl)
  unrealized_pnl = (mark_price - entry_price) * size * direction
  drawdown% = (baseline - equity) / baseline * 100

RATE LIMIT IMPACT:
  • WebSocket price feed: 0 REST calls (unlimited)
  • Periodic sync: ~4 REST calls per trader per 30 seconds
  • 32 traders: ~128 requests/min (well within limits)
```

### 9.2 Sudden Death Safety Valve

```
IF all traders eliminated within 60 seconds of Sudden Death start:
    → Signal: testnet liquidity too thin
    → Round resets with 12% drawdown limit (instead of 8%)
    → Traders restored to pre-elimination state
```

---

## 10. Authentication

### 10.1 User Authentication

Users authenticate via **Privy**:
- Email login (embedded wallet auto-created)
- Social login — Google, Twitter (embedded wallet auto-created)
- Direct wallet connect — Phantom, Solflare, etc.

Privy JWT token used for all Colosseum API requests.

### 10.2 Pacifica API Authentication

All Pacifica API calls are signed server-side using Solana keypairs:

```
Message format:
  {
    "data": { <payload> },
    "expiry_window": 5000,
    "timestamp": <epoch_ms>,
    "type": "<operation_type>"
  }

Keys sorted recursively. JSON compact (no spaces).
Signature: Ed25519 sign(message_bytes, keypair.secret_key)
Encoding: base58
```

Trader's subaccount private keys are **never exposed to the client**. All trading happens server-side through the engine.

---

## 11. Trust Model

| Component | Trust Assumption |
|---|---|
| **Pacifica Exchange** | Trusted — executes orders honestly, provides accurate mark prices |
| **Colosseum Engine** | Semi-trusted — enforces rules, holds subaccount keys. Auditable via open-source code + Supabase data |
| **Privy** | Trusted — manages user authentication and embedded wallets |
| **Fuul** | Trusted — provides sybil resistance and referral tracking |
| **Supabase** | Trusted — stores game state. All writes are server-side only (RLS enforced) |

### 11.1 What the Engine Controls

- Subaccount private keys (encrypted at rest)
- Order validation (can reject orders)
- Elimination execution (can close positions)
- Round progression (can change parameters)
- Loot distribution

### 11.2 What the Engine Cannot Do

- Move funds outside the vault ↔ subaccount relationship
- Trade on behalf of a trader without validator approval
- Alter Pacifica's mark price or orderbook
- Bypass Pacifica's on-chain settlement

### 11.3 Transparency Guarantees

- All elimination events are recorded in Supabase with timestamps
- Equity snapshots stored every 10 seconds (auditable)
- Round parameters are immutable once arena starts
- Event log is publicly readable (spectators can verify)

---

## 12. Failure Modes

| Failure | Detection | Response |
|---|---|---|
| Pacifica API down | Health check fails | Arena pauses. Timer stops. Resumes on recovery. If >30min, round extends. |
| Pacifica WS disconnects | Heartbeat timeout | Auto-reconnect with exponential backoff. Fall back to REST polling (30s). |
| Engine process crash | Railway health check | Auto-restart. In-memory state rebuilt from Supabase + Pacifica REST sync. |
| Supabase down | Write failure | Engine continues monitoring in-memory. Queues DB writes. Retries on recovery. |
| All traders eliminated in <60s | Sudden Death safety valve | Round resets with wider drawdown (12%). |
| Testnet faucet empty | Balance check on arena start | Arena creation blocked until faucet replenished. |

---

## 13. Protocol Constants

```
MIN_PARTICIPANTS          = 4
MAX_PARTICIPANTS          = 100
STARTING_CAPITAL          = 1,000 USDC (testnet)
GRACE_PERIOD_DURATION     = 120 seconds (60s for Sudden Death)
MIN_TRADES_PER_ROUND      = 3
MIN_VOLUME_PERCENT        = 10%
WIDE_ZONE_BONUS           = 5%
EQUITY_SYNC_INTERVAL      = 30 seconds
EQUITY_SNAPSHOT_INTERVAL   = 10 seconds
ELIMINATION_CLOSE_TIMEOUT  = 5 seconds (limit → market fallback)
SUDDEN_DEATH_SAFETY_VALVE  = 60 seconds
SUDDEN_DEATH_RESET_DD      = 12%
MAX_LOOTS_PER_TRADER       = 1 per round
SUBACCOUNT_SIGNATURE_EXPIRY = 5,000 ms
```

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Arena** | A single competition instance with fixed rules, participants, and timeline |
| **Round** | A phase within an arena. Each round has specific leverage, pair, and drawdown parameters |
| **Zone** | The set of active trading constraints. "Zone shrinks" = parameters tighten |
| **Baseline** | The equity reference point for drawdown calculation. Set at end of grace period |
| **Drawdown** | Percentage decline in equity from baseline. Breach = elimination |
| **Elimination** | Permanent removal of a trader from the arena. Positions closed, funds returned |
| **Grace Period** | Buffer time between rounds where drawdown monitoring is paused for adjustment |
| **Vault** | Master Pacifica account that funds and manages all subaccounts in an arena |
| **Subaccount** | Pacifica child account created per trader. Isolated funds and positions |
| **Wide Zone** | Loot that grants +5% drawdown buffer for one round |
| **Second Life** | Loot that forgives one drawdown breach and resets baseline |
| **Blitz** | 5-minute arena preset designed for demos and quick matches |
| **Local PnL Engine** | Server-side equity calculator using WebSocket prices instead of REST polling |
| **Safety Valve** | Auto-reset mechanism if Sudden Death eliminates everyone too quickly |

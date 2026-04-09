# Pacifica Colosseum — Detailed Mechanical Specifications

**Purpose:** Deep-dive implementation specs for each mechanical idea. Every idea includes exact database schemas, algorithm pseudocode, API endpoints, edge cases, and integration points with existing code.

**Last Updated:** April 9, 2026

---

## Implementation Status

| Idea | Status | Notes |
|------|--------|-------|
| 1 — Territorial Trading | ✅ Done | All 4 phases complete (DB, engine, frontend) |
| 2 — Ability System | ✅ Done | DB migration, engine wiring, API routes, AbilityCard/AbilityPanel, trade page |
| 3 — Alliance System | 🔴 Not Started | — |
| 4 — Hazard Events | 🟡 In Progress | Plan written, see HAZARD_EVENTS_PROGRESS.md |
| 5+ | 🔴 Not Started | — |

---

# MECHANICAL IDEA 1: TERRITORIAL TRADING

## Overview

Traders compete for positions on a grid board. Each cell provides different trading modifiers. Higher rows = better bonuses. Lower rows = penalties or elimination risk. Traders can "steal" territories from weaker performers. Bottom row eliminated each round.

**Chess Parallel:** Like controlling the center of the board — position matters as much as performance.

---

## Database Schema

### Table: `territories`

Defines the grid structure for each arena.

```sql
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  
  -- Grid position
  row_index INT NOT NULL,          -- 0 = top (best), increases downward
  col_index INT NOT NULL,          -- 0 = left, increases rightward
  cell_label TEXT NOT NULL,        -- Human-readable: "A1", "B2", "C3"
  
  -- Modifiers applied to territory holder
  pnl_bonus_percent DECIMAL DEFAULT 0,      -- +5% means PnL calculated as 105% of actual
  drawdown_buffer_percent DECIMAL DEFAULT 0, -- +3% means max drawdown increased by 3
  leverage_override INT DEFAULT NULL,       -- If set, overrides round's max leverage
  max_position_size DECIMAL DEFAULT NULL,   -- If set, caps position size in USD
  
  -- Elimination risk
  is_elimination_zone BOOLEAN DEFAULT FALSE, -- If true, holder eliminated at round end
  elimination_priority INT DEFAULT 99,       -- Order of elimination (lower = first to die)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(arena_id, row_index, col_index),
  UNIQUE(arena_id, cell_label)
);

CREATE INDEX idx_territories_arena ON territories(arena_id);
CREATE INDEX idx_territories_row ON territories(arena_id, row_index);
```

### Table: `participant_territories`

Tracks who owns which territory and their movement history.

```sql
CREATE TABLE participant_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  
  -- Ownership state
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_via TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'skirmish', 'swap', 'initial'
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Performance while holding this territory
  pnl_at_acquisition DECIMAL DEFAULT 0,      -- PnL% when territory was acquired
  pnl_at_release DECIMAL DEFAULT NULL,       -- PnL% when territory was lost
  round_acquired INT NOT NULL,               -- Which round this territory was acquired in
  
  -- Skirmish tracking
  skirmishes_won INT DEFAULT 0,              -- Times successfully defended against attackers
  skirmishes_lost INT DEFAULT 0,             -- Times territory was stolen
  
  -- NOTE: No plain UNIQUE constraint. Use partial unique index below instead.
  -- A plain UNIQUE(arena_id, participant_id, round_acquired) crashes in swapTerritories:
  -- that function sets is_active=false then INSERTs a new row with the same composite key,
  -- which violates a plain UNIQUE. The partial index (WHERE is_active=true) allows this.
);

CREATE INDEX idx_pt_arena ON participant_territories(arena_id);
CREATE INDEX idx_pt_participant ON participant_territories(participant_id);
CREATE INDEX idx_pt_territory ON participant_territories(territory_id);
-- Partial unique index: one ACTIVE territory per participant per round (not a plain UNIQUE).
CREATE UNIQUE INDEX idx_pt_one_active_per_round
  ON participant_territories(arena_id, participant_id, round_acquired)
  WHERE is_active = true;
CREATE INDEX idx_pt_active ON participant_territories(arena_id, is_active) WHERE is_active = true;
```

### Table: `territory_skirmishes`

Logs all territory battles for transparency and replay.

```sql
CREATE TABLE territory_skirmishes (
  id BIGSERIAL PRIMARY KEY,
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  -- The conflict
  attacker_id UUID NOT NULL REFERENCES arena_participants(id),
  defender_id UUID NOT NULL REFERENCES arena_participants(id),
  territory_id UUID NOT NULL REFERENCES territories(id),
  
  -- Results
  attacker_pnl_percent DECIMAL NOT NULL,
  defender_pnl_percent DECIMAL NOT NULL,
  pnl_difference DECIMAL NOT NULL,
  skirmish_won_by TEXT NOT NULL, -- 'attacker' or 'defender'
  
  -- Threshold check
  required_pnl_lead DECIMAL NOT NULL, -- How much attacker needed to win
  met_threshold BOOLEAN NOT NULL,
  
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skirmishes_arena_round ON territory_skirmishes(arena_id, round_number);
CREATE INDEX idx_skirmishes_attacker ON territory_skirmishes(attacker_id);
CREATE INDEX idx_skirmishes_defender ON territory_skirmishes(defender_id);
```

---

## Territory Grid Configuration

### Dynamic Grid Sizing

Grid size scales with participant count:

| Participants | Grid Size | Rows | Cols | Elimination Zones |
|-------------|-----------|------|------|-------------------|
| 4-6 | 2x3 | 2 | 3 | Bottom row (3 cells) |
| 7-12 | 3x4 | 3 | 4 | Bottom row (4 cells) |
| 13-20 | 4x5 | 4 | 5 | Bottom 2 rows (10 cells) |
| 21-50 | 5x6 | 5 | 6 | Bottom 2 rows (12 cells) |
| 51-100 | 6x8 | 6 | 8 | Bottom 3 rows (24 cells) |

### Territory Modifier Calculation

Modifiers scale based on row position and participant count.

**Formula:**
```typescript
function calculateTerritoryModifiers(
  rowIndex: number,
  totalRows: number,
  participantCount: number
): TerritoryModifiers {
  // Top row always has best bonuses
  // Bottom row always has penalties or elimination
  
  const rowRatio = rowIndex / (totalRows - 1); // 0.0 (top) to 1.0 (bottom)
  
  // PnL bonus: +8% at top, -5% at bottom
  const pnlBonus = Math.round((1 - rowRatio * 1.5) * 100) / 100 * 8;
  
  // Drawdown buffer: +5% at top, -3% at bottom
  const drawdownBuffer = Math.round((1 - rowRatio * 1.6) * 100) / 100 * 5;
  
  // Leverage: round max at top, 50% at bottom
  const leverageMultiplier = 1 - (rowRatio * 0.5);
  
  // Position size: $500 at top, $150 at bottom (scaled)
  const maxPositionSize = Math.round(500 - (rowRatio * 350));
  
  // Elimination zone: bottom 1-3 rows
  const isEliminationZone = rowIndex >= totalRows - Math.ceil(totalRows / 3);
  
  return {
    pnlBonus,           // +8% to -5%
    drawdownBuffer,     // +5% to -3%
    leverageMultiplier, // 1.0 to 0.5
    maxPositionSize,    // $500 to $150
    isEliminationZone,
  };
}
```

**Example (8 traders, 3x3 grid, bottom row eliminated):**

| Cell | Label | PnL Bonus | DD Buffer | Leverage Mult | Max Size | Elim Zone |
|------|-------|-----------|-----------|---------------|----------|-----------|
| Top-Left | A1 | +8% | +5% | 1.0x | $500 | No |
| Top-Center | B1 | +6% | +4% | 0.9x | $450 | No |
| Top-Right | C1 | +5% | +3% | 0.85x | $400 | No |
| Mid-Left | A2 | +2% | +1% | 0.75x | $300 | No |
| Mid-Center | B2 | 0% | 0% | 0.7x | $250 | No |
| Mid-Right | C2 | -1% | -1% | 0.65x | $200 | No |
| Bot-Left | A3 ❌ | -5% | -3% | 0.5x | $150 | **YES** |
| Bot-Center | B3 ❌ | -5% | -3% | 0.5x | $150 | **YES** |
| Bot-Right | C3 ❌ | -5% | -3% | 0.5x | $150 | **YES** |

---

## Game Flow

### Phase 1: Territory Generation (Arena Start)

**When:** Arena transitions from `registration` → `round_1`

**Engine Logic:**
```typescript
// engine/src/services/territory-manager.ts

async function generateTerritories(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  
  // Get arena and participant count
  const { data: arena } = await supabase
    .from('arenas')
    .select('*, arena_participants(count)')
    .eq('id', arenaId)
    .single();
  
  const participantCount = arena.arena_participants[0].count;
  const { rows, cols, elimRows } = calculateGridSize(participantCount);
  
  // Generate territory cells
  const territories = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const modifiers = calculateTerritoryModifiers(row, rows, participantCount);
      const cellLabel = `${String.fromCharCode(65 + col)}${row + 1}`;
      
      territories.push({
        arena_id: arenaId,
        row_index: row,
        col_index: col,
        cell_label: cellLabel,
        pnl_bonus_percent: modifiers.pnlBonus,
        drawdown_buffer_percent: modifiers.drawdownBuffer,
        leverage_override: modifiers.leverageMultiplier > 0 
          ? Math.round(arena.round_1_max_leverage * modifiers.leverageMultiplier)
          : null,
        max_position_size: modifiers.maxPositionSize,
        is_elimination_zone: row >= rows - elimRows,
        elimination_priority: row * cols + col,
      });
    }
  }
  
  await supabase.from('territories').insert(territories);
}
```

### Phase 2: Territory Draft (Round 1 Start)

**When:** Round 1 begins, before trading starts

**Draft Order:** Snake draft based on initial capital (all equal in Round 1, so random)

**Draft Process:**
```
Round 1 Draft Order (random since all start equal):
Pick 1: Trader A (1st pick)
Pick 2: Trader B
Pick 3: Trader C
Pick 4: Trader D
Pick 5: Trader D (snake - last picks twice)
Pick 6: Trader C
Pick 7: Trader B
Pick 8: Trader A
```

**Draft Timer:** 15 seconds per pick (auto-pick best available if timeout)

**Engine Logic:**
```typescript
async function executeTerritoryDraft(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();
  
  // Get active participants
  const { data: participants } = await supabase
    .from('arena_participants')
    .select('id, user_id, total_pnl_percent')
    .eq('arena_id', arenaId)
    .eq('status', 'active')
    .order('total_pnl_percent', { ascending: false });
  
  // Get available territories (ordered by pnl_bonus_percent descending)
  const { data: territories } = await supabase
    .from('territories')
    .select('*')
    .eq('arena_id', arenaId)
    .order('pnl_bonus_percent', { ascending: false });
  
  // Snake draft order
  const draftOrder = generateSnakeOrder(participants);
  const assignedTerritories = new Set<string>();
  
  for (const pick of draftOrder) {
    const participantId = pick.participantId;
    
    // Find best available territory
    const bestAvailable = territories.find(t => !assignedTerritories.has(t.id));
    
    if (bestAvailable) {
      // Assign territory
      await supabase.from('participant_territories').insert({
        arena_id: arenaId,
        participant_id: participantId,
        territory_id: bestAvailable.id,
        acquired_via: 'draft',
        pnl_at_acquisition: 0, // Round 1 starts at 0
        round_acquired: roundNumber,
      });
      
      assignedTerritories.add(bestAvailable.id);
    }
  }
}

function generateSnakeOrder(participants: Participant[]): DraftPick[] {
  const order: DraftPick[] = [];
  const forward = [...participants];
  const reverse = [...participants].reverse();
  
  let pickNumber = 1;
  for (let i = 0; i < forward.length; i++) {
    order.push({ pick: pickNumber++, participantId: forward[i].id });
    if (i < reverse.length) {
      order.push({ pick: pickNumber++, participantId: reverse[i].id });
    }
  }
  
  return order.slice(0, participants.length); // Trim to exact participant count
}
```

**Subsequent Rounds Draft:**
- Round 2+: Draft order based on previous round's PnL% ranking
- Round 1 winner picks first
- Round 1 loser picks last

### Phase 3: Territory Skirmishes (Every 60s)

**When:** Every 60 seconds during active round

**Skirmish Rules:**
1. Only adjacent territories can skirmish (up/down/left/right, NOT diagonal)
2. Attacker must have **15% higher PnL%** than defender to steal
3. Attacker chooses which adjacent territory to attack (not automatic)
4. If attacker wins: territories swap, defender gets attacker's old territory
5. If attacker loses: no change, attacker gets 30s cooldown before next attack
6. Each trader can initiate max 1 skirmish per 60s cycle
7. Elimination zone traders CANNOT attack (only defend)

**Skirmish Flow:**
```
1. System broadcasts "Skirmish Phase Open — 30s to declare attacks"
2. Traders submit attack targets via API (optional)
3. After 30s, system resolves all declared skirmishes
4. Compare PnL%:
   - If attacker_pnl >= defender_pnl * 1.15 → attacker wins
   - Else → defender wins
5. Swap territories if attacker wins
6. Broadcast results to all spectators
7. 30s cooldown before next skirmish phase
```

**Engine Logic:**
```typescript
async function resolveSkirmish(
  arenaId: string,
  roundNumber: number,
  attackerId: string,
  defenderId: string
): Promise<SkirmishResult> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  
  // Get current PnL for both traders
  const attackerState = state.traders.get(attackerId);
  const defenderState = state.traders.get(defenderId);
  
  const attackerPnl = calcEquity(attackerState, prices) / attackerState.equityBaseline - 1;
  const defenderPnl = calcEquity(defenderState, prices) / defenderState.equityBaseline - 1;
  
  // Check threshold (15% lead required)
  const requiredLead = defenderPnl * 1.15;
  const attackerWins = attackerPnl >= requiredLead;
  
  if (attackerWins) {
    // Swap territories
    await swapTerritories(arenaId, attackerId, defenderId, roundNumber);
    
    // Log skirmish
    await supabase.from('territory_skirmishes').insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: attackerState.territoryId,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: 'attacker',
      required_pnl_lead: requiredLead,
      met_threshold: true,
    });
    
    return { winner: 'attacker', territoriesSwapped: true };
  } else {
    // Defender wins, no swap
    await supabase.from('territory_skirmishes').insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: attackerState.territoryId,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: 'defender',
      required_pnl_lead: requiredLead,
      met_threshold: false,
    });
    
    return { winner: 'defender', territoriesSwapped: false };
  }
}
```

### Phase 4: End-of-Round Elimination

**When:** Round timer expires

**Elimination Rules:**
1. All traders in elimination zone cells → eliminated
2. If more traders in elimination zone than elimination count needed:
   - Eliminate those with lowest PnL% first (by elimination_priority)
3. If fewer traders in elimination zone than needed:
   - Eliminate all in zone
   - Then eliminate next-lowest PnL% traders outside zone
4. Survivors keep their territories for next round's draft (but draft order reshuffles)

**Engine Logic:**
```typescript
async function processTerritoryElimination(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();
  
  // Get all active participants with their territories
  const { data: participantTerritories } = await supabase
    .from('participant_territories')
    .select(`
      participant_id,
      territory_id,
      territories!inner (
        is_elimination_zone,
        elimination_priority,
        pnl_bonus_percent
      )
    `)
    .eq('arena_id', arenaId)
    .eq('is_active', true);
  
  // Get current PnL for all
  const state = getArenaState(arenaId);
  const rankings = participantTerritories.map(pt => {
    const trader = state.traders.get(pt.participant_id);
    const pnl = calcEquity(trader, prices) / trader.equityBaseline - 1;
    
    return {
      participantId: pt.participant_id,
      pnl,
      isEliminationZone: pt.territories.is_elimination_zone,
      eliminationPriority: pt.territories.elimination_priority,
    };
  });
  
  // Sort: elimination zone first, then by PnL ascending
  rankings.sort((a, b) => {
    if (a.isEliminationZone !== b.isEliminationZone) {
      return a.isEliminationZone ? -1 : 1;
    }
    if (a.pnl !== b.pnl) return a.pnl - b.pnl;
    return a.eliminationPriority - b.eliminationPriority;
  });
  
  // Eliminate bottom X%
  const roundParams = ROUND_PARAMS[roundNumber - 1];
  const eliminateCount = Math.ceil(rankings.length * (roundParams.eliminationPercent / 100));
  const toEliminate = rankings.slice(0, eliminateCount);
  
  for (const entry of toEliminate) {
    await eliminateTrader(
      arenaId,
      entry.participantId,
      roundNumber,
      'territory_elimination',
      { equity: /* ... */, drawdown: /* ... */ }
    );
  }
}
```

### Phase 5: PnL Bonus Application

**When:** Calculated at end of round, applied before elimination ranking

**Bonus Formula:**
```typescript
function calculateAdjustedPnl(
  rawPnl: number,
  territory: Territory
): number {
  // Apply PnL bonus/penalty
  const adjustedPnl = rawPnl * (1 + territory.pnl_bonus_percent / 100);
  
  // Apply drawdown buffer to drawdown calculation
  const adjustedMaxDrawdown = Math.max(0, 
    trader.maxDrawdownHit - territory.drawdown_buffer_percent
  );
  
  return {
    adjustedPnl,
    adjustedMaxDrawdown,
  };
}
```

**Example:**
- Trader A raw PnL: +20%
- Territory A1 bonus: +8%
- **Adjusted PnL:** 20 * 1.08 = **+21.6%**

- Trader B raw PnL: +18%
- Territory A3 penalty: -5%
- **Adjusted PnL:** 18 * 0.95 = **+17.1%**

Trader A wins ranking despite only 2% raw lead because of territory bonus.

---

## API Endpoints

### GET `/api/arenas/:id/territories`

Get current territory board state.

**Response:**
```json
{
  "data": {
    "grid": {
      "rows": 3,
      "cols": 3,
      "cells": [
        {
          "id": "territory-uuid",
          "label": "A1",
          "row": 0,
          "col": 0,
          "pnl_bonus_percent": 8,
          "drawdown_buffer_percent": 5,
          "leverage_override": null,
          "max_position_size": 500,
          "is_elimination_zone": false,
          "holder": {
            "participant_id": "uuid",
            "user_id": "uuid",
            "username": "Alice",
            "current_pnl_percent": 21.6,
            "avatar_url": "..."
          }
        },
        // ... more cells
      ]
    },
    "next_skirmish_at": "2026-04-08T10:15:00Z",
    "skirmish_cooldown_until": null
  }
}
```

### POST `/api/arenas/:id/territories/attack`

Declare attack on adjacent territory.

**Request:**
```json
{
  "attacker_territory_id": "uuid",
  "defender_territory_id": "uuid"
}
```

**Validation:**
- Attacker must own `attacker_territory_id`
- Territories must be adjacent (not diagonal)
- Defender must NOT be in elimination zone
- Attacker not in skirmish cooldown (30s)
- Round must be active (not grace period)

**Response:**
```json
{
  "data": {
    "skirmish_id": "uuid",
    "attacker_pnl_percent": 25.3,
    "defender_pnl_percent": 18.7,
    "required_lead_percent": 21.5,
    "result": "attacker_won",
    "territories_swapped": true
  }
}
```

### POST `/api/arenas/:id/territories/swap`

Voluntary territory swap with another trader (both must agree).

**Request:**
```json
{
  "my_territory_id": "uuid",
  "target_participant_id": "uuid",
  "target_territory_id": "uuid"
}
```

**Validation:**
- Both traders must own their respective territories
- Neither in elimination zone
- Target participant must accept within 15s
- Only 1 swap per trader per round

---

## Frontend Components

### Component: `TerritoryBoard`

**Props:**
```typescript
interface TerritoryBoardProps {
  arenaId: string;
  grid: TerritoryGrid;
  currentRound: number;
  nextSkirmishAt: Date | null;
  myParticipantId: string | null;
  onAttack: (attackerTerritoryId: string, defenderTerritoryId: string) => void;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  TERRITORY BOARD — Round 2  |  Next Skirmish: 45s       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ╔══════════════╗╔══════════════╗╔══════════════╗      │
│  ║  A1 [+8%]    ║║  B1 [+6%]    ║║  C1 [+5%]    ║      │
│  ║  👑 Alice    ║║  🤖 Bob      ║║  Carol       ║      │
│  ║  +21.6%      ║║  +12.8%      ║║  -5.3%       ║      │
│  ║  🛡️ +5% DD   ║║  🛡️ +4% DD   ║║  🛡️ +3% DD   ║      │
│  ╚══════════════╝╚══════════════╝╚══════════════╝      │
│        │  ATTACK  │         │  ATTACK  │                │
│  ╔══════════════╗╔══════════════╗╔══════════════╗      │
│  ║  A2 [+2%]    ║║  B2 [0%]    ║║  C2 [-1%]    ║      │
│  ║  Dave        ║║  ⚠️ YOU     ║║  Frank       ║      │
│  ║  +8.1%       ║║  +5.2%      ║║  -12.7%      ║      │
│  ║  🛡️ +1% DD   ║║  🛡️ 0% DD   ║║  🛡️ -1% DD   ║      │
│  ╚══════════════╝╚══════════════╝╚══════════════╝      │
│        │  ATTACK  │         │  ATTACK  │                │
│  ╔══════════════╗╔══════════════╗╔══════════════╗      │
│  ║  A3 ❌ [-5%] ║║  B3 ❌ [-5%] ║║  C3 ❌ [-5%] ║      │
│  ║  💀 Grace    ║║  [EMPTY]    ║║  [EMPTY]    ║      │
│  ║  -18.9%      ║║             ║║             ║      │
│  ║  ELIM ZONE   ║║  ELIM ZONE  ║║  ELIM ZONE  ║      │
│  ╚══════════════╝╚══════════════╝╚══════════════╝      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click your territory → "Attack" button appears on adjacent enemies
- Click attack → confirmation modal shows required PnL lead
- Skirmish result → animated territory swap with slide animation
- Elimination zone cells → red pulsing border, skull icon

### Component: `TerritoryInfoCard`

Shown in trader's trade page (right sidebar).

**Props:**
```typescript
interface TerritoryInfoCardProps {
  territory: Territory;
  myPnl: number;
  adjustedPnl: number;
  skirmishCooldown: Date | null;
  adjacentEnemies: EnemyInfo[];
  canAttack: boolean;
  onAttack: (enemyTerritoryId: string) => void;
}
```

**Visual Layout:**
```
┌──────────────────────────┐
│  YOUR TERRITORY: B2      │
├──────────────────────────┤
│  PnL Bonus: 0%           │
│  DD Buffer: 0%           │
│  Max Position: $250      │
│                          │
│  Raw PnL: +5.2%          │
│  Adjusted: +5.2%         │
│                          │
│  ── Adjacent Enemies ──  │
│  👑 Alice (A1) +21.6%    │
│    Need: +24.8% to steal │
│    [ATTACK] (disabled)   │
│                          │
│  Frank (C2) -12.7%       │
│    Need: -14.6% to steal │
│    [ATTACK] ✅           │
│                          │
│  ⏱️ Skirmish Cooldown:   │
│     Ready                 │
└──────────────────────────┘
```

---

## Edge Cases & Error Handling

### Edge Case 1: Trader Eliminated Mid-Skirmish
**Scenario:** Trader A declares attack on Trader B, but Trader B gets eliminated by drawdown breach before skirmish resolves.

**Handling:**
- Skirmish cancelled
- Trader A's attack cooldown reset
- Trader A can declare new attack on different target
- Event logged: "Skirmish cancelled — defender eliminated"

### Edge Case 2: All Traders in Elimination Zone
**Scenario:** Due to previous swaps, more traders ended up in elimination zones than should be eliminated.

**Handling:**
- Eliminate traders in zones with lowest PnL first
- If tied, use elimination_priority (cell position)
- If still tied, use max drawdown hit (worse trader eliminated)
- Never eliminate more than round's eliminationPercent allows

### Edge Case 3: Trader Disconnects During Draft
**Scenario:** Trader's websocket disconnects during territory draft phase.

**Handling:**
- Auto-pick best available territory for disconnected trader
- 15s timeout still applies
- Trader reconnects → sees assigned territory
- No re-draft allowed

### Edge Case 4: Territory Swap Creates Invalid State
**Scenario:** Voluntary swap results in both traders in elimination zones.

**Handling:**
- Validation prevents swap if either trader would enter elimination zone
- Exception: If both already in elimination zone, swap allowed (doesn't change outcome)

### Edge Case 5: Round 1 Has No Previous PnL
**Scenario:** Draft order for Round 1 can't be based on PnL since everyone starts at 0.

**Handling:**
- Random shuffle for Round 1 draft order
- Use `crypto.randomBytes()` for fair randomization
- Broadcast draft order to all participants before draft starts

---

## Integration with Existing Systems

### Drawdown Monitoring
- Territory's `drawdown_buffer_percent` added to round's `max_drawdown_percent`
- Example: Round max = 15%, territory buffer = +3% → effective max = 18%
- Risk monitor checks adjusted threshold

### Elimination Engine
- Territory elimination checked BEFORE ranking elimination
- Two-phase elimination:
  1. Territory-based (elimination zone holders)
  2. Ranking-based (bottom X% of survivors)

### Loot System
- Territory control doesn't affect loot calculation
- Loot still based on raw PnL% (not adjusted)
- Prevents "win territory → win loot → stack bonuses" feedback loop

### Spectator Voting
- Territory board shown prominently in spectate page
- Spectators can see who's in danger zones
- Voting UI enhanced: "Vote to save [Trader] from elimination zone"

---

## Testing Strategy

### Unit Tests
1. Territory generation with various participant counts
2. Snake draft order correctness
3. Skirmish resolution (attacker wins, defender wins, tie)
4. PnL bonus calculation accuracy
5. Elimination zone identification
6. Adjacency validation (diagonal not allowed)

### Integration Tests
1. Full round flow: draft → skirmish → elimination
2. Territory swap API with mutual consent
3. Drawdown check with territory buffer applied
4. Multiple skirmishes in single round
5. Draft timeout handling

### Edge Case Tests
1. Trader eliminated mid-skirmish
2. All traders in elimination zones
3. Disconnect during draft
4. Invalid swap prevention
5. Round 1 random draft fairness

---

## Migration Script

```sql
-- 005_create_territories.sql

-- Create tables (see schema above)
CREATE TABLE territories (...);
CREATE TABLE participant_territories (...);
CREATE TABLE territory_skirmishes (...);

-- Indexes
CREATE INDEX idx_territories_arena ON territories(arena_id);
CREATE INDEX idx_territories_row ON territories(arena_id, row_index);
CREATE INDEX idx_pt_arena ON participant_territories(arena_id);
CREATE INDEX idx_pt_participant ON participant_territories(participant_id);
CREATE INDEX idx_pt_territory ON participant_territories(territory_id);
CREATE INDEX idx_pt_active ON participant_territories(arena_id, is_active) WHERE is_active = true;
CREATE INDEX idx_skirmishes_arena_round ON territory_skirmishes(arena_id, round_number);

-- RLS Policies
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_skirmishes ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "Anyone can view territories" ON territories FOR SELECT USING (true);
CREATE POLICY "Anyone can view participant territories" ON participant_territories FOR SELECT USING (true);
CREATE POLICY "Anyone can view skirmishes" ON territory_skirmishes FOR SELECT USING (true);

-- Service role writes only
-- (No additional policies needed — service_role bypasses RLS)
```

---

# MECHANICAL IDEA 2: ABILITY SYSTEM ✅ IMPLEMENTED

## Overview

Traders earn ability cards through achievements. Abilities provide temporary gameplay advantages. Creates strategic layer beyond pure trading skill.

**Chess Parallel:** Like different piece types — each has unique power and usage.

**Implementation:** `supabase/migrations/006_create_abilities.sql`, `engine/src/services/ability-manager.ts`, wired into risk-monitor/round-engine/order-validator/index.ts. Frontend: `AbilityCard.tsx`, `AbilityPanel.tsx`, trade page integration.

---

## Database Schema

### Table: `abilities`

Defines all available abilities in the system.

```sql
CREATE TABLE abilities (
  id TEXT PRIMARY KEY, -- 'shield', 'sabotage', 'double_down', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  
  -- Classification
  category TEXT NOT NULL, -- 'attack', 'defense', 'utility'
  rarity TEXT NOT NULL,   -- 'common', 'rare', 'epic', 'legendary'
  
  -- Activation effects
  effect_type TEXT NOT NULL,     -- 'drawdown_buffer', 'pnl_multiplier', 'leverage_reduction', etc.
  effect_value DECIMAL NOT NULL, -- Magnitude of effect (e.g., +10%, 2x, etc.)
  effect_duration_seconds INT NOT NULL, -- How long effect lasts
  
  -- Cooldown
  cooldown_seconds INT NOT NULL, -- Minimum time between uses
  
  -- Restrictions
  min_round INT DEFAULT 1,       -- Earliest round this can be awarded
  max_uses_per_round INT DEFAULT 1, -- Max times a trader can use per round
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed Data:**
```sql
INSERT INTO abilities (id, name, description, icon, category, rarity, effect_type, effect_value, effect_duration_seconds, cooldown_seconds, min_round, max_uses_per_round) VALUES

-- DEFENSE ABILITIES
('shield', 'Shield', 'Immune from elimination for 60 seconds. Drawdown can exceed limit without penalty.', '🛡️', 'defense', 'rare', 'elimination_immunity', 1, 60, 0, 2, 1),
('second_wind', 'Second Wind', 'Reset your drawdown to 0%. Baseline recalculated to current equity.', '🌊', 'defense', 'epic', 'drawdown_reset', 1, 0, 0, 2, 1),
('fortress', 'Fortress', '+10% drawdown buffer for 2 rounds.', '🏰', 'defense', 'rare', 'drawdown_buffer', 10, 0, 0, 1, 1),

-- ATTACK ABILITIES
('sabotage_leverage', 'Sabotage', 'Force one trader to reduce max leverage by 50% for 60 seconds.', '⚔️', 'attack', 'rare', 'target_leverage_reduction', 0.5, 60, 120, 2, 1),
('market_crash', 'Market Crash', 'All open positions lose 5% value instantly. Affects everyone equally.', '💥', 'attack', 'epic', 'global_position_penalty', 0.05, 0, 0, 3, 1),
('info_leak', 'Info Leak', 'See all traders\' exact positions and PnL for 60 seconds.', '👁️', 'attack', 'common', 'reveal_all_positions', 1, 60, 180, 1, 1),

-- UTILITY ABILITIES
('double_down', 'Double Down', 'Your next trade\'s PnL counts 2x toward ranking.', '⚡', 'utility', 'epic', 'pnl_multiplier', 2, 0, 0, 2, 1),
('time_warp', 'Time Warp', 'Add 60 seconds to the current round timer.', '⏰', 'utility', 'rare', 'round_extension', 60, 0, 0, 1, 1),
('scout', 'Scout', 'Reveal one random trader\'s positions for 60 seconds.', '🔍', 'utility', 'common', 'reveal_single_position', 1, 60, 90, 1, 2);
```

### Table: `participant_abilities`

Tracks which abilities each trader owns and their usage state.

```sql
CREATE TABLE participant_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  ability_id TEXT NOT NULL REFERENCES abilities(id),
  
  -- State
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_in_round INT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- Some abilities expire if not used
  
  -- Cooldown tracking
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  cooldown_until TIMESTAMPTZ DEFAULT NULL,
  
  -- Ability target (for targeted abilities like sabotage)
  target_participant_id UUID REFERENCES arena_participants(id) DEFAULT NULL,
  
  UNIQUE(participant_id, ability_id, acquired_in_round)
);

CREATE INDEX idx_pa_arena ON participant_abilities(arena_id);
CREATE INDEX idx_pa_participant ON participant_abilities(participant_id);
CREATE INDEX idx_pa_active ON participant_abilities(participant_id, is_used) WHERE is_used = false;
```

### Table: `active_ability_effects`

Tracks currently active ability effects applied to traders.

```sql
CREATE TABLE active_ability_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  target_participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  
  -- Effect details
  ability_id TEXT NOT NULL REFERENCES abilities(id),
  applied_by_participant_id UUID REFERENCES arena_participants(id), -- Who triggered it
  effect_type TEXT NOT NULL,
  effect_value DECIMAL NOT NULL,
  
  -- Timing
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- State
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_aae_arena ON active_ability_effects(arena_id);
CREATE INDEX idx_aae_target ON active_ability_effects(target_participant_id);
CREATE INDEX idx_aae_active ON active_ability_effects(arena_id, is_active, expires_at) WHERE is_active = true;
```

---

## Ability Earning System

### When Abilities Are Awarded

**End of each round (except Sudden Death):**

| Achievement | Ability Awarded |
|-------------|----------------|
| Highest PnL% | Choose 1 from 3 random abilities |
| Lowest drawdown hit | Defensive ability (Shield or Fortress) |
| Most trades executed | Utility ability (Scout or Time Warp) |
| Biggest comeback (worst → best mid-round) | Epic ability (Double Down or Second Wind) |

### Ability Selection Process

**When:** Round ends, before elimination

**Flow:**
```
1. System identifies top performers
2. For each performer:
   a. Generate pool of 3 random abilities (weighted by rarity)
   b. Show ability cards to trader
   c. Trader has 30s to choose 1
   d. If timeout → auto-select highest rarity
3. Awarded abilities stored in participant_abilities
4. Can be used immediately (if not on cooldown) or saved
```

**Ability Pool Generation:**
```typescript
function generateAbilityPool(
  achievement: 'highest_pnl' | 'lowest_drawdown' | 'most_trades' | 'biggest_comeback',
  currentRound: number
): Ability[] {
  const allAbilities = loadAbilitiesFromDB();
  
  // Filter by round eligibility
  const eligible = allAbilities.filter(a => a.min_round <= currentRound);
  
  // Weight by achievement type
  let weights: Record<string, number>;
  switch (achievement) {
    case 'highest_pnl':
      weights = { attack: 0.5, defense: 0.2, utility: 0.3 };
      break;
    case 'lowest_drawdown':
      weights = { attack: 0.1, defense: 0.7, utility: 0.2 };
      break;
    case 'most_trades':
      weights = { attack: 0.2, defense: 0.2, utility: 0.6 };
      break;
    case 'biggest_comeback':
      weights = { attack: 0.3, defense: 0.3, utility: 0.4 };
      break;
  }
  
  // Weighted random selection
  const weighted = eligible.map(a => ({
    ...a,
    weight: weights[a.category] * getRarityWeight(a.rarity),
  }));
  
  // Pick 3 unique abilities
  return weightedRandomPick(weighted, 3);
}

function getRarityWeight(rarity: string): number {
  switch (rarity) {
    case 'common': return 1.0;
    case 'rare': return 0.6;
    case 'epic': return 0.3;
    case 'legendary': return 0.1;
    default: return 1.0;
  }
}
```

---

## Ability Effects Engine

### Effect Application

**When:** Trader activates ability via API

**Engine Logic:**
```typescript
async function activateAbility(
  arenaId: string,
  participantId: string,
  abilityId: string,
  targetParticipantId?: string
): Promise<AbilityActivationResult> {
  const supabase = getSupabase();
  
  // 1. Validate ability ownership
  const { data: pa } = await supabase
    .from('participant_abilities')
    .select('*')
    .eq('participant_id', participantId)
    .eq('ability_id', abilityId)
    .eq('is_used', false)
    .single();
  
  if (!pa) return { error: 'Ability not owned or already used' };
  
  // 2. Check cooldown
  if (pa.cooldown_until && new Date() < pa.cooldown_until) {
    return { error: `Ability on cooldown until ${pa.cooldown_until}` };
  }
  
  // 3. Load ability definition
  const ability = await loadAbility(abilityId);
  
  // 4. Apply effect based on type
  const effectResult = await applyEffect(arenaId, participantId, ability, targetParticipantId);
  
  // 5. Mark ability as used
  await supabase
    .from('participant_abilities')
    .update({
      is_used: true,
      used_at: new Date(),
      target_participant_id: targetParticipantId || null,
    })
    .eq('id', pa.id);
  
  // 6. Set cooldown
  if (ability.cooldown_seconds > 0) {
    await supabase
      .from('participant_abilities')
      .update({
        cooldown_until: new Date(Date.now() + ability.cooldown_seconds * 1000),
      })
      .eq('participant_id', participantId)
      .eq('ability_id', abilityId)
      .eq('acquired_in_round', pa.acquired_in_round);
  }
  
  // 7. Create active effect record (if duration > 0)
  if (ability.effect_duration_seconds > 0) {
    await supabase.from('active_ability_effects').insert({
      arena_id: arenaId,
      target_participant_id: targetParticipantId || participantId,
      ability_id: abilityId,
      applied_by_participant_id: participantId,
      effect_type: ability.effect_type,
      effect_value: ability.effect_value,
      expires_at: new Date(Date.now() + ability.effect_duration_seconds * 1000),
    });
  }
  
  // 8. Create event
  await supabase.from('events').insert({
    arena_id: arenaId,
    round_number: getCurrentRound(arenaId),
    event_type: 'ability_activated',
    actor_id: participantId,
    target_id: targetParticipantId || null,
    message: `${getUsername(participantId)} activated ${ability.name}!`,
    data: { ability_id: abilityId, target_id: targetParticipantId },
  });
  
  return { success: true, effect: effectResult };
}
```

### Effect Executors

```typescript
async function applyEffect(
  arenaId: string,
  participantId: string,
  ability: Ability,
  targetId?: string
): Promise<EffectResult> {
  switch (ability.effect_type) {
    case 'elimination_immunity':
      return applyEliminationImmunity(arenaId, participantId, ability.effect_duration_seconds);
    
    case 'drawdown_reset':
      return applyDrawdownReset(arenaId, participantId);
    
    case 'drawdown_buffer':
      return applyDrawdownBuffer(arenaId, participantId, ability.effect_value);
    
    case 'target_leverage_reduction':
      return applyLeverageReduction(arenaId, targetId, ability.effect_value, ability.effect_duration_seconds);
    
    case 'global_position_penalty':
      return applyGlobalPenalty(arenaId, ability.effect_value);
    
    case 'pnl_multiplier':
      return applyPnlMultiplier(arenaId, participantId, ability.effect_value);
    
    case 'round_extension':
      return applyRoundExtension(arenaId, ability.effect_value);
    
    case 'reveal_all_positions':
      return { revealed: 'all', duration: ability.effect_duration_seconds };
    
    case 'reveal_single_position':
      return { revealed: targetId, duration: ability.effect_duration_seconds };
    
    default:
      throw new Error(`Unknown effect type: ${ability.effect_type}`);
  }
}
```

### Effect Integration with Risk Monitor

**Drawdown Check Modification:**
```typescript
// engine/src/services/risk-monitor.ts

async function checkDrawdownBreach(
  participantId: string,
  arenaId: string
): Promise<EliminationDecision> {
  const state = getArenaState(arenaId);
  const trader = state.traders.get(participantId);
  
  // Check for active elimination immunity
  const immunity = await getActiveEffect(participantId, 'elimination_immunity');
  if (immunity && immunity.expires_at > new Date()) {
    return { eliminated: false, reason: 'immune' };
  }
  
  // Check for drawdown buffer
  const buffer = await getActiveEffect(participantId, 'drawdown_buffer');
  const effectiveMaxDrawdown = baseMaxDrawdown + (buffer?.effect_value || 0);
  
  // Check for drawdown reset
  const wasReset = await getActiveEffect(participantId, 'drawdown_reset');
  if (wasReset) {
    trader.equityBaseline = trader.equityCurrent;
    trader.maxDrawdownHit = 0;
    return { eliminated: false, reason: 'reset' };
  }
  
  // Normal drawdown check
  if (trader.maxDrawdownHit >= effectiveMaxDrawdown) {
    return { eliminated: true, reason: 'drawdown_breach' };
  }
  
  return { eliminated: false };
}
```

**PnL Calculation Modification:**
```typescript
// engine/src/services/round-engine.ts

async function calculateFinalRankings(arenaId: string): Promise<Ranking[]> {
  const state = getArenaState(arenaId);
  const rankings: Ranking[] = [];
  
  for (const [participantId, trader] of state.traders) {
    let pnl = calcEquity(trader) / trader.equityBaseline - 1;
    
    // Check for PnL multiplier effect
    const multiplier = await getActiveEffect(participantId, 'pnl_multiplier');
    if (multiplier && multiplier.expires_at > new Date()) {
      pnl *= multiplier.effect_value; // 2x = double PnL
    }
    
    rankings.push({ participantId, pnl });
  }
  
  return rankings.sort((a, b) => b.pnl - a.pnl);
}
```

---

## API Endpoints

### GET `/api/arenas/:id/abilities/my`

Get abilities owned by current user.

**Response:**
```json
{
  "data": {
    "owned": [
      {
        "ability_id": "shield",
        "name": "Shield",
        "description": "Immune from elimination for 60s",
        "icon": "🛡️",
        "category": "defense",
        "rarity": "rare",
        "acquired_in_round": 2,
        "is_used": false,
        "cooldown_until": null,
        "can_use": true
      }
    ],
    "used_this_round": [
      {
        "ability_id": "scout",
        "used_at": "2026-04-08T10:12:00Z"
      }
    ]
  }
}
```

### POST `/api/arenas/:id/abilities/activate`

Activate an owned ability.

**Request:**
```json
{
  "ability_id": "sabotage_leverage",
  "target_participant_id": "uuid" // Required for targeted abilities
}
```

**Validation:**
- Must own ability and not used yet
- Not on cooldown
- Target required for targeted abilities
- Target must be active (not eliminated)
- Round must be active

**Response:**
```json
{
  "data": {
    "success": true,
    "ability_name": "Sabotage",
    "effect": "Target's leverage reduced by 50% for 60s",
    "expires_at": "2026-04-08T10:13:00Z"
  }
}
```

### GET `/api/arenas/:id/abilities/active-effects`

Get all currently active ability effects in arena.

**Response:**
```json
{
  "data": {
    "effects": [
      {
        "target_participant_id": "uuid",
        "target_username": "Bob",
        "ability_id": "sabotage_leverage",
        "ability_name": "Sabotage",
        "applied_by": "Alice",
        "effect_type": "target_leverage_reduction",
        "effect_value": 0.5,
        "applied_at": "2026-04-08T10:12:00Z",
        "expires_at": "2026-04-08T10:13:00Z",
        "remaining_seconds": 45
      }
    ]
  }
}
```

---

## Frontend Components

### Component: `AbilityCard`

```typescript
interface AbilityCardProps {
  ability: OwnedAbility;
  onActivate?: (targetId?: string) => void;
  isTargetable?: boolean;
  showDetails?: boolean;
}
```

**Visual (Unused):**
```
┌──────────────────────┐
│  🛡️  SHIELD          │
│  Rare  •  Defense     │
├──────────────────────┤
│  Immune from          │
│  elimination for 60s  │
│                       │
│  [ACTIVATE]           │
└──────────────────────┘
```

**Visual (Used):**
```
┌──────────────────────┐
│  🛡️  SHIELD          │
│  (Used)               │
├──────────────────────┤
│  Used in Round 2      │
│  Cooldown: 45s        │
└──────────────────────┘
```

### Component: `AbilitySelectionModal`

Shown when trader earns ability choice.

**Visual:**
```
┌────────────────────────────────────────────────┐
│  Choose Your Reward!  (28s remaining)          │
├────────────────────────────────────────────────┤
│                                                │
│  ╔═══════════╗ ╔═══════════╗ ╔═══════════╗    │
│  ║  ⚔️        ║ ║  🛡️        ║ ║  ⚡        ║    │
│  ║  Sabotage  ║ ║  Shield    ║ ║  Double   ║    │
│  ║  Rare      ║ ║  Epic      ║ ║  Down     ║    │
│  ║  Attack    ║ ║  Defense   ║ ║  Epic     ║    ║
│  ║           ║ ║           ║ ║  Utility  ║    ║
│  ║  Force    ║ ║  Immune   ║ ║  Next     ║    ║
│  ║  enemy    ║ ║  from     ║ ║  trade    ║    ║
│  ║  leverage ║ ║  elim 60s ║ ║  PnL 2x   ║    ║
│  ║  -50%     ║ ║           ║ ║           ║    ║
│  ╚═══════════╝ ╚═══════════╝ ╚═══════════╝    ║
│     [SELECT]       [SELECT]       [SELECT]     ║
│                                                │
└────────────────────────────────────────────────┘
```

---

## Edge Cases

### Edge Case 1: Ability Activated During Grace Period
**Scenario:** Trader activates Shield during grace period (before next round starts).

**Handling:**
- Abilities CAN be activated during grace period
- Effect persists into next round
- Expiration timer starts immediately (doesn't pause)

### Edge Case 2: Target Eliminated Before Effect Applies
**Scenario:** Alice uses Sabotage on Bob, but Bob eliminated by drawdown in same second.

**Handling:**
- Effect cancelled (no target)
- Ability still marked as used
- Cooldown still applies
- Event: "Sabotage failed — target already eliminated"

### Edge Case 3: Multiple Conflicting Effects
**Scenario:** Trader has both PnL 2x (Double Down) and Global -5% (Market Crash) active.

**Handling:**
- Effects stack multiplicatively
- Order: Global penalty applied first, then multiplier
- Example: Raw +10% → -5% = +5% → 2x = +10% final

### Edge Case 4: Time Warp in Last 30s
**Scenario:** Trader uses Time Warp when round has 30s remaining.

**Handling:**
- Timer extended by 60s (total 90s remaining)
- No upper limit on round extension
- Can be stacked if multiple traders use Time Warp

---

*(Continued below)*

---

# MECHANICAL IDEA 3: ALLIANCE SYSTEM

## Overview

Traders form temporary partnerships (2-3 people) to share elimination risk. Allies' PnL% averaged for elimination calculation. Only ONE ally can advance to next round — creates betrayal drama.

**Chess Parallel:** Like sacrificing piece safety for positional advantage — temporary cooperation with eventual competition.

---

## Database Schema

### Table: `alliances`

```sql
CREATE TABLE alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  -- State
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'betraying', 'dissolved'
  formed_at TIMESTAMPTZ DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Betrayal phase
  betrayal_started_at TIMESTAMPTZ DEFAULT NULL,
  betrayal_deadline_at TIMESTAMPTZ DEFAULT NULL,
  
  UNIQUE(arena_id, round_number) -- One active alliance per participant per round
);

CREATE INDEX idx_alliances_arena ON alliances(arena_id);
CREATE INDEX idx_alliances_arena_round ON alliances(arena_id, round_number);
CREATE INDEX idx_alliances_active ON alliances(arena_id, status) WHERE status = 'active';
```

### Table: `alliance_members`

```sql
CREATE TABLE alliance_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  
  -- State
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_founder BOOLEAN DEFAULT FALSE, -- Who created the alliance
  has_advanced BOOLEAN DEFAULT FALSE, -- Who survived betrayal phase
  
  -- Betrayal vote
  voted_for_participant_id UUID REFERENCES arena_participants(id) DEFAULT NULL,
  voted_at TIMESTAMPTZ DEFAULT NULL,
  
  UNIQUE(alliance_id, participant_id)
);

CREATE INDEX idx_am_alliance ON alliance_members(alliance_id);
CREATE INDEX idx_am_participant ON alliance_members(participant_id);
CREATE INDEX idx_am_voted ON alliance_members(alliance_id, voted_for_participant_id) WHERE voted_for_participant_id IS NOT NULL;
```

---

## Alliance Formation

### When Alliances Can Form

| Phase | Can Form? | Notes |
|-------|-----------|-------|
| Registration | ✅ Yes | Before arena starts |
| Round active | ✅ Yes | During trading |
| Grace period | ✅ Yes | Most common time |
| Elimination phase | ❌ No | Too late |

### Formation Flow

```
1. Trader A sends alliance proposal to Trader B (and optionally C)
2. Trader B receives notification: "Alice wants to form an alliance"
3. Trader B has 60s to accept or decline
4. If accepted → alliance formed, shared PnL% tracking begins
5. If declined → Trader A can propose to someone else
6. Alliance max duration: current round only (dissolves at round end)
```

**Proposal API:**
```typescript
POST /api/arenas/:id/alliances/propose

Request:
{
  "invited_participant_ids": ["uuid-b", "uuid-c"]
}

Validation:
- Max 3 members total (including proposer)
- Invited traders must be active (not eliminated)
- Proposer not already in another alliance this round
- Round must be active or grace period

Response:
{
  "data": {
    "alliance_id": "uuid",
    "status": "pending",
    "invited": [
      { "participant_id": "uuid-b", "username": "Bob", "status": "pending" }
    ],
    "expires_at": "2026-04-08T10:15:00Z"
  }
}
```

### Alliance Benefits

**1. Shared Elimination Risk:**
```typescript
function calculateAlliancePnl(alliance: Alliance): number {
  const members = getAllianceMembers(alliance.id);
  const totalPnl = members.reduce((sum, m) => sum + m.currentPnlPercent, 0);
  return totalPnl / members.length; // Average PnL%
}

// Example:
// Alice: +40%, Bob: +10%, Carol: -20%
// Alliance average: (+40 + 10 - 20) / 3 = +10%
// All three use +10% for elimination ranking (instead of individual)
```

**2. Shared Information:**
- Allies see each other's positions, PnL, drawdown
- Normally hidden from other traders
- Enables coordinated hedging strategies

**3. Coordinated Strategy:**
- "You go long BTC, I'll go short ETH to hedge our alliance"
- Reduces individual risk through diversification

---

## Betrayal Phase

### When Betrayal Triggers

**Timing:** Grace period begins (after round timer expires)

**Betrayal Window:** 60 seconds (during grace period)

### Betrayal Voting Process

```
1. Alliance enters "betrayal" status
2. Each member secretly votes for who should advance
3. Votes revealed simultaneously after 60s
4. Winner determined by vote count
5. If tie → highest individual PnL% wins
6. Losers face elimination individually (no alliance protection)
```

**Voting API:**
```typescript
POST /api/arenas/:id/alliances/:allianceId/vote

Request:
{
  "voted_for_participant_id": "uuid" // Who you want to advance
}

Validation:
- Must be alliance member
- Can only vote once
- Must vote for another alliance member (can't vote self)
- Voting window still open

Response:
{
  "data": {
    "vote_recorded": true,
    "all_members_voted": false, // Are all votes in?
    "time_remaining_seconds": 35
  }
}
```

### Betrayal Resolution

```typescript
async function resolveAllianceBetrayal(allianceId: string): Promise<BetrayalResult> {
  const supabase = getSupabase();
  
  // Get all votes
  const { data: members } = await supabase
    .from('alliance_members')
    .select('participant_id, voted_for_participant_id')
    .eq('alliance_id', allianceId);
  
  // Count votes
  const voteCounts: Record<string, number> = {};
  for (const member of members) {
    if (member.voted_for_participant_id) {
      voteCounts[member.voted_for_participant_id] = 
        (voteCounts[member.voted_for_participant_id] || 0) + 1;
    }
  }
  
  // Find winner
  let winnerId: string | null = null;
  const maxVotes = Math.max(...Object.values(voteCounts));
  const tiedCandidates = Object.entries(voteCounts)
    .filter(([_, count]) => count === maxVotes)
    .map(([id, _]) => id);
  
  if (tiedCandidates.length === 1) {
    winnerId = tiedCandidates[0];
  } else {
    // Tie-breaker: highest individual PnL%
    const rankings = await getIndividualPnlRankings(tiedCandidates);
    winnerId = rankings[0].participantId;
  }
  
  // Mark winner
  await supabase
    .from('alliance_members')
    .update({ has_advanced: true })
    .eq('alliance_id', allianceId)
    .eq('participant_id', winnerId);
  
  // Dissolve alliance
  await supabase
    .from('alliances')
    .update({
      status: 'dissolved',
      dissolved_at: new Date(),
    })
    .eq('id', allianceId);
  
  return {
    winnerId,
    losers: members.filter(m => m.participant_id !== winnerId),
  };
}
```

### Betrayal Outcomes

**Scenario 1: Unanimous Vote**
```
Alice votes: Bob advances
Bob votes: Bob advances
Carol votes: Bob advances

Result: Bob advances (3 votes)
Alice & Carol → individual elimination ranking
```

**Scenario 2: Split Vote, Tie-Breaker**
```
Alice votes: Bob advances
Bob votes: Alice advances
Carol votes: Alice advances

Result: Alice advances (2 votes vs 1)
Bob & Carol → individual elimination ranking
```

**Scenario 3: Complete Tie, PnL Tie-Breaker**
```
Alice votes: Bob advances
Bob votes: Carol advances  
Carol votes: Alice advances

Tie: 1 vote each
PnL% at betrayal time:
  Alice: +15%, Bob: +22%, Carol: +8%

Result: Bob advances (highest PnL%)
Alice & Carol → individual elimination ranking
```

---

## Edge Cases

### Edge Case 1: Alliance Member Eliminated Before Betrayal
**Scenario:** Alice & Bob allied, but Bob eliminated by drawdown mid-round.

**Handling:**
- Alliance dissolved immediately
- Alice faces elimination alone for rest of round
- No betrayal phase (only 1 member left)
- Event: "Alliance dissolved — Bob eliminated"

### Edge Case 2: All Alliance Members in Elimination Zone
**Scenario:** Alliance average PnL still puts everyone in elimination zone.

**Handling:**
- Alliance protection doesn't override territory elimination
- All members eliminated (alliance couldn't save them)
- Creates strategic risk: "Was this alliance worth it?"

### Edge Case 3: Member Disconnects During Betrayal Vote
**Scenario:** Bob disconnects during 60s betrayal voting window.

**Handling:**
- Auto-vote for highest PnL member (rational self-interest assumption)
- 60s timer continues
- Reconnection doesn't allow vote change

---

# MECHANICAL IDEA 4: HAZARD EVENTS

## Overview

Random market/rule events trigger during rounds, forcing traders to adapt. Creates unpredictability — no two rounds play the same.

**Chess Parallel:** Like playing on a board where squares randomly change rules mid-game.

---

## Database Schema

### Table: `hazard_events`

Defines all possible hazard events.

```sql
CREATE TABLE hazard_events (
  id TEXT PRIMARY KEY, -- 'flash_crash', 'pump_dump', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  
  -- Classification
  category TEXT NOT NULL, -- 'market', 'rule', 'opportunity'
  severity TEXT NOT NULL, -- 'minor', 'moderate', 'severe'
  
  -- Timing
  warning_seconds INT NOT NULL DEFAULT 10, -- Telegraph time before event
  duration_seconds INT NOT NULL,           -- How long effect lasts
  
  -- Effects (JSON for flexibility)
  effect_config JSONB NOT NULL,
  
  -- Restrictions
  min_round INT DEFAULT 1,
  max_occurrences_per_round INT DEFAULT 1,
  weight INT DEFAULT 10, -- Probability weight for random selection
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed Data:**
```sql
INSERT INTO hazard_events (id, name, description, icon, category, severity, warning_seconds, duration_seconds, effect_config, min_round, max_occurrences_per_round, weight) VALUES

-- MARKET HAZARDS
('flash_crash', 'Flash Crash', 'BTC drops 10% in 30 seconds. Short positions benefit, longs suffer.', '📉', 'market', 'severe', 10, 30, 
 '{"type": "price_shock", "symbol": "BTC", "direction": "down", "magnitude": 0.10, "duration_seconds": 30}', 1, 1, 5),

('pump_dump', 'Pump & Dump', 'SOL pumps 20% then dumps 15% within 2 minutes.', '📈', 'market', 'severe', 5, 120,
 '{"type": "price_wave", "symbol": "SOL", "pump_percent": 0.20, "dump_percent": 0.15, "wave_duration_seconds": 120}', 1, 1, 5),

('high_volatility', 'High Volatility', 'All price swings 2x normal for 60 seconds.', '🌊', 'market', 'moderate', 10, 60,
 '{"type": "volatility_multiplier", "multiplier": 2.0, "duration_seconds": 60}', 1, 2, 8),

('liquidity_crisis', 'Liquidity Crisis', 'Max position size reduced by 50% for 90 seconds.', '💧', 'market', 'moderate', 15, 90,
 '{"type": "position_size_cap", "reduction_percent": 0.50, "duration_seconds": 90}', 1, 1, 6),

-- RULE HAZARDS
('leverage_cap', 'Leverage Emergency', 'Max leverage temporarily reduced to 3x for this round.', '🚫', 'rule', 'severe', 15, 0,
 '{"type": "leverage_override", "max_leverage": 3}', 1, 1, 4),

('drawdown_tighten', 'Risk-Off', 'Max drawdown reduced by 5% for remainder of round.', '⚠️', 'rule', 'severe', 10, 0,
 '{"type": "drawdown_reduction", "reduction_percent": 5}', 1, 1, 4),

('no_shorting', 'Short Ban', 'Short positions disabled for 60 seconds.', '🚷', 'rule', 'moderate', 10, 60,
 '{"type": "side_restriction", "disabled_side": "short", "duration_seconds": 60}', 1, 1, 5),

-- OPPORTUNITY EVENTS
('bonus_window', 'Bonus Window', 'Double PnL% for next 60 seconds. High risk/reward.', '✨', 'opportunity', 'moderate', 10, 60,
 '{"type": "pnl_multiplier", "multiplier": 2.0, "duration_seconds": 60}', 2, 1, 7),

('safe_haven', 'Safe Haven', '+5% drawdown buffer for 90 seconds.', '🏠', 'opportunity', 'minor', 5, 90,
 '{"type": "drawdown_buffer", "buffer_percent": 5, "duration_seconds": 90}', 1, 2, 8),

('insider_info', 'Insider Info', 'Reveal one random trader\'s positions for 60 seconds.', '🔎', 'opportunity', 'minor', 0, 60,
 '{"type": "position_reveal", "target": "random", "duration_seconds": 60}', 1, 1, 6);
```

### Table: `active_hazard_events`

Tracks currently active hazards in each arena.

```sql
CREATE TABLE active_hazard_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  hazard_id TEXT NOT NULL REFERENCES hazard_events(id),
  
  -- Timing
  warned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  
  -- State
  status TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'active', 'expired'
  
  -- Effect state (for effects that need tracking)
  effect_state JSONB DEFAULT NULL
);

CREATE INDEX idx_ahz_arena ON active_hazard_events(arena_id);
CREATE INDEX idx_ahz_arena_round ON active_hazard_events(arena_id, round_number);
CREATE INDEX idx_ahz_active ON active_hazard_events(arena_id, status) WHERE status IN ('warning', 'active');
```

---

## Hazard Scheduling System

### Event Timing Logic

**Per Round:**
- 1-3 hazards trigger
- Minimum 90s between hazards
- Warning period: 5-15s before effect starts
- Never trigger in last 30s of round (too unfair)

**Scheduling Algorithm:**
```typescript
async function scheduleHazardsForRound(
  arenaId: string,
  roundNumber: number,
  roundDurationMs: number
): Promise<ScheduledHazard[]> {
  // Determine how many hazards (1-3 based on round number)
  const hazardCount = Math.min(3, roundNumber); // Round 1: 1, Round 2: 2, etc.
  
  // Get eligible hazards
  const allHazards = await loadHazardsFromDB();
  const eligible = allHazards.filter(h => h.min_round <= roundNumber);
  
  // Weighted random selection
  const selected = weightedRandomPick(eligible, hazardCount);
  
  // Schedule timing
  const roundEndTime = Date.now() + roundDurationMs;
  const latestStart = roundEndTime - 30000; // No hazards in last 30s
  const minGap = 90000; // 90s between hazards
  
  const scheduled: ScheduledHazard[] = [];
  let lastScheduledTime = Date.now() + 60000; // First hazard 60s after round start
  
  for (const hazard of selected) {
    // Ensure minimum gap
    const triggerAt = Math.max(lastScheduledTime, Date.now() + 60000);
    
    if (triggerAt + hazard.warning_seconds * 1000 > latestStart) {
      break; // Not enough time left in round
    }
    
    scheduled.push({
      hazard,
      warnedAt: triggerAt,
      startsAt: triggerAt + hazard.warning_seconds * 1000,
      expiresAt: triggerAt + hazard.warning_seconds * 1000 + hazard.duration_seconds * 1000,
    });
    
    lastScheduledTime = triggerAt + hazard.duration_seconds * 1000 + minGap;
  }
  
  return scheduled;
}
```

### Hazard Executor

```typescript
async function executeHazardEffect(
  arenaId: string,
  roundNumber: number,
  hazard: HazardEvent
): Promise<void> {
  const config = hazard.effect_config;
  
  switch (config.type) {
    case 'price_shock':
      await applyPriceShock(arenaId, config);
      break;
    
    case 'price_wave':
      await applyPriceWave(arenaId, config);
      break;
    
    case 'volatility_multiplier':
      await applyVolatilityMultiplier(arenaId, config);
      break;
    
    case 'position_size_cap':
      await applyPositionSizeCap(arenaId, config);
      break;
    
    case 'leverage_override':
      await applyLeverageOverride(arenaId, config);
      break;
    
    case 'drawdown_reduction':
      await applyDrawdownReduction(arenaId, config);
      break;
    
    case 'side_restriction':
      await applySideRestriction(arenaId, config);
      break;
    
    case 'pnl_multiplier':
      await applyPnlMultiplier(arenaId, config);
      break;
    
    case 'drawdown_buffer':
      await applyDrawdownBuffer(arenaId, config);
      break;
    
    case 'position_reveal':
      await applyPositionReveal(arenaId, config);
      break;
    
    default:
      console.error(`Unknown hazard effect type: ${config.type}`);
  }
  
  // Record active effect
  await supabase.from('active_hazard_events').insert({
    arena_id: arenaId,
    round_number: roundNumber,
    hazard_id: hazard.id,
    started_at: new Date(),
    expires_at: hazard.duration_seconds > 0 
      ? new Date(Date.now() + hazard.duration_seconds * 1000)
      : null,
    status: 'active',
  });
}
```

---

## Effect Implementations

### Price Shock (Flash Crash)

```typescript
async function applyPriceShock(arenaId: string, config: PriceShockConfig): Promise<void> {
  const priceManager = getPriceManager();
  
  // Artificially move price in direction
  const currentPrice = priceManager.getPrice(config.symbol);
  const shockDirection = config.direction === 'down' ? -1 : 1;
  const shockAmount = currentPrice * config.magnitude * shockDirection;
  const targetPrice = currentPrice + shockAmount;
  
  // Gradual price move over duration
  const steps = config.duration_seconds; // 1 step per second
  const priceStep = (targetPrice - currentPrice) / steps;
  
  for (let i = 0; i < steps; i++) {
    priceManager.setPrice(config.symbol, currentPrice + priceStep * (i + 1));
    await sleep(1000);
  }
  
  // Price returns to normal after duration
  setTimeout(() => {
    // Price returns to market price (next tick from Pacifica WS)
    priceManager.clearArtificialPrice(config.symbol);
  }, config.duration_seconds * 1000);
}
```

### Leverage Override

```typescript
async function applyLeverageOverride(arenaId: string, config: LeverageOverrideConfig): Promise<void> {
  const state = getArenaState(arenaId);
  
  // Override max leverage for all traders
  state.activeHazards.set('leverage_override', {
    maxLeverage: config.max_leverage,
    expiresAt: Date.now() + config.duration_seconds * 1000,
  });
  
  // Update order validator to enforce new limit
  OrderValidator.setActiveHazard('leverage_override', config.max_leverage);
}
```

### Position Reveal (Insider Info)

```typescript
async function applyPositionReveal(arenaId: string, config: PositionRevealConfig): Promise<void> {
  const state = getArenaState(arenaId);
  const activeTraders = Array.from(state.traders.values())
    .filter(t => t.status === 'active');
  
  // Pick random target
  const target = activeTraders[Math.floor(Math.random() * activeTraders.length)];
  
  // Broadcast revealed positions to all traders
  const revealedPositions = target.positions.map(pos => ({
    symbol: pos.symbol,
    side: pos.side,
    size: pos.size,
    entry_price: pos.entryPrice,
    current_pnl: pos.unrealizedPnl,
  }));
  
  // Send to all participants via Supabase event
  await supabase.from('events').insert({
    arena_id: arenaId,
    round_number: getCurrentRound(arenaId),
    event_type: 'hazard_event',
    message: `Insider Info: ${target.username}'s positions revealed!`,
    data: {
      hazard_id: 'insider_info',
      revealed_trader_id: target.participantId,
      revealed_trader_username: target.username,
      positions: revealedPositions,
    },
  });
}
```

---

## Frontend Components

### Component: `HazardWarningBanner`

```typescript
interface HazardWarningBannerProps {
  hazard: HazardEvent;
  warningTimeRemaining: number; // Seconds until effect starts
}
```

**Visual (Warning Phase):**
```
┌────────────────────────────────────────────────────────┐
│  ⚠️  HAZARD WARNING — 8s                              │
│  📉  Flash Crash incoming!                             │
│  BTC will drop 10% over 30 seconds.                    │
│  Prepare your positions!                               │
└────────────────────────────────────────────────────────┘
```

**Visual (Active Phase):**
```
┌────────────────────────────────────────────────────────┐
│  📉  FLASH CRASH — Active (22s remaining)              │
│  BTC: $87,432 → $78,689 (-10%)                        │
│  Short positions benefit, longs suffering.             │
└────────────────────────────────────────────────────────┘
```

### Component: `ActiveHazardsList`

Sidebar component showing current hazards.

```
┌──────────────────────────┐
│  Active Hazards          │
├──────────────────────────┤
│  📉 Flash Crash          │
│     22s remaining        │
│                          │
│  🚫 Short Ban            │
│     45s remaining        │
│                          │
│  ⏱️ Next Hazard: ~3min  │
└──────────────────────────┘
```

---

## Edge Cases

### Edge Case 1: Hazard Conflicts with Ability
**Scenario:** Flash Crash happens while trader has Shield (elimination immunity) active.

**Handling:**
- Shield protects from elimination, but positions still lose value
- Shield expires → trader eliminated if drawdown still exceeded
- Both effects tracked independently

### Edge Case 2: Multiple Hazards Overlap
**Scenario:** High Volatility + Bonus Window active simultaneously.

**Handling:**
- Effects stack multiplicatively
- High Volatility: 2x price swings
- Bonus Window: 2x PnL multiplier
- Combined: 2x swings × 2x PnL = extreme risk/reward
- No cap — creates memorable "chaos rounds"

### Edge Case 3: Hazard Triggered in Last 30s
**Scenario:** Due to Time Warp ability, round extended, hazard scheduled in what was originally last 30s.

**Handling:**
- Hazard allowed (round extension created new time)
- 30s rule applies to original round end, not extended
- Prevents hazard abuse via Time Warp

---

# MECHANICAL IDEA 5: PROGRESSION TREE

## Overview

Traders start restricted (low leverage, limited pairs). Surviving rounds unlocks choices: offense (higher leverage), defense (drawdown buffer), or utility (information). Creates RPG-like character building.

**Chess Parallel:** Like pawn promotion — pieces gain power as game progresses.

---

## Database Schema

### Table: `unlock_nodes`

Defines the progression tree structure.

```sql
CREATE TABLE unlock_nodes (
  id TEXT PRIMARY KEY, -- 'r1_aggro', 'r2_def', etc.
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  
  -- Tree structure
  round_unlocklocked_at INT NOT NULL, -- Which round this becomes available (1 = available after Round 1)
  category TEXT NOT NULL, -- 'offense', 'defense', 'utility'
  
  -- Effects
  effect_type TEXT NOT NULL,
  effect_config JSONB NOT NULL,
  
  -- Prerequisites
  requires_node_id TEXT REFERENCES unlock_nodes(id) DEFAULT NULL,
  
  -- Display
  display_order INT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed Data:**
```sql
INSERT INTO unlock_nodes (id, name, description, icon, round_unlocklocked_at, category, effect_type, effect_config, requires_node_id, display_order) VALUES

-- ROUND 1 → 2 CHOICES
('r1_offense', 'Aggressive Path I', 'Unlock 10x leverage + ETH trading.', '⚔️', 1, 'offense', 'leverage_and_pairs', 
 '{"max_leverage": 10, "add_pairs": ["ETH"]}', NULL, 1),

('r1_defense', 'Defensive Path I', '+5% drawdown buffer + $300 position limit.', '🛡️', 1, 'defense', 'drawdown_and_size',
 '{"drawdown_buffer_percent": 5, "max_position_size": 300}', NULL, 2),

('r1_utility', 'Scout Path I', 'See top 3 traders\' positions.', '🔍', 1, 'utility', 'position_reveal',
 '{"reveal_top_n": 3, "refresh_interval_seconds": 30}', NULL, 3),

-- ROUND 2 → 3 CHOICES
('r2_offense', 'Aggressive Path II', 'Unlock 15x leverage + SOL trading.', '⚔️', 2, 'offense', 'leverage_and_pairs',
 '{"max_leverage": 15, "add_pairs": ["SOL"]}', 'r1_offense', 1),

('r2_defense', 'Defensive Path II', '+10% drawdown buffer + Second Life.', '🛡️', 2, 'defense', 'drawdown_and_loot',
 '{"drawdown_buffer_percent": 10, "grant_second_life": true}', 'r1_defense', 2),

('r2_utility', 'Scout Path II', 'See ALL traders\' positions in real-time.', '🔍', 2, 'utility', 'position_reveal',
 '{"reveal_top_n": 999, "refresh_interval_seconds": 5}', 'r1_utility', 3),

-- ROUND 3 → 4 CHOICES
('r3_offense', 'Aggressive Path III', 'Unlock 20x leverage (maximum).', '⚔️', 3, 'offense', 'leverage_only',
 '{"max_leverage": 20}', 'r2_offense', 1),

('r3_defense', 'Defensive Path III', 'Shield from first elimination in Sudden Death.', '🛡️', 3, 'defense', 'elimination_shield',
 '{"shield_from_first_elimination": true}', 'r2_defense', 2),

('r3_utility', 'Time Warp', '+30s to Sudden Death timer (one-time use).', '⏰', 3, 'utility', 'round_extension',
 '{"extend_sudden_death_seconds": 30}', 'r2_utility', 3);
```

### Table: `participant_unlocks`

Tracks what each trader has unlocked.

```sql
CREATE TABLE participant_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES unlock_nodes(id),
  
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_in_round INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_pu_arena ON participant_unlocks(arena_id);
CREATE INDEX idx_pu_participant ON participant_unlocks(participant_id);
CREATE INDEX idx_pu_active ON participant_unlocks(participant_id, is_active) WHERE is_active = true;
```

---

## Progression Flow

### Round 1 Start (Baseline)

**All traders begin with:**
- Max leverage: 5x (not 20x)
- Available pairs: BTC only
- Max position size: $200
- No special abilities

### Round 1 Ends → First Choice

**Presentation:**
```
┌─────────────────────────────────────────────────────────┐
│  Choose Your Path!  (Round 1 → 2)                       │
│  You survived Round 1! Choose your upgrade:             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ╔════════════════╗ ╔════════════════╗ ╔══════════════╗ ║
│  ║  ⚔️             ║ ║  🛡️             ║ ║  🔍          ║ ║
│  ║  Aggressive I  ║ ║  Defensive I   ║ ║  Scout I    ║ ║
│  ║                ║ ║                ║ ║              ║ ║
│  ║  • 10x leverage║ ║  • +5% DD buffer║ ║  • See top 3 ║ ║
│  ║  • Unlock ETH  ║ ║  • $300 pos limit║ ║    positions ║ ║
│  ║                ║ ║                ║ ║  • 30s refresh║ ║
│  ║                ║ ║                ║ ║              ║ ║
│  ║  [CHOOSE]      ║ ║  [CHOOSE]      ║ ║  [CHOOSE]    ║ ║
│  ╚════════════════╝ ╚════════════════╝ ╚══════════════╝ ║
│                                                         │
│  ⏱️ 25s remaining to choose                            │
│  ⚠️ Timeout = random choice                             │
└─────────────────────────────────────────────────────────┘
```

### Choice Application

```typescript
async function applyUnlock(participantId: string, nodeId: string): Promise<void> {
  const node = await loadUnlockNode(nodeId);
  const config = node.effect_config;
  
  switch (node.effect_type) {
    case 'leverage_and_pairs':
      await applyLeverageAndPairs(participantId, config);
      break;
    
    case 'drawdown_and_size':
      await applyDrawdownAndSize(participantId, config);
      break;
    
    case 'position_reveal':
      await applyPositionReveal(participantId, config);
      break;
    
    case 'drawdown_and_loot':
      await applyDrawdownAndLoot(participantId, config);
      break;
    
    case 'leverage_only':
      await applyLeverageOnly(participantId, config);
      break;
    
    case 'elimination_shield':
      await applyEliminationShield(participantId);
      break;
    
    case 'round_extension':
      await applyRoundExtension(participantId, config);
      break;
  }
  
  // Record unlock
  await supabase.from('participant_unlocks').insert({
    participant_id: participantId,
    node_id: nodeId,
    unlocked_in_round: getCurrentRound(participantId),
  });
}
```

### Effect on Trading Parameters

```typescript
// engine/src/services/risk-monitor.ts

function getEffectiveMaxLeverage(participantId: string, roundNumber: number): number {
  const baseLeverage = ROUND_PARAMS[roundNumber - 1].maxLeverage;
  
  // Check for unlock overrides
  const unlocks = getParticipantUnlocks(participantId);
  const offenseUnlocks = unlocks.filter(u => u.category === 'offense');
  
  let maxLeverage = baseLeverage;
  for (const unlock of offenseUnlocks) {
    if (unlock.effect_config.max_leverage) {
      maxLeverage = Math.max(maxLeverage, unlock.effect_config.max_leverage);
    }
  }
  
  return maxLeverage;
}

function getEffectiveDrawdownBuffer(participantId: string): number {
  const unlocks = getParticipantUnlocks(participantId);
  const defenseUnlocks = unlocks.filter(u => u.category === 'defense');
  
  let buffer = 0;
  for (const unlock of defenseUnlocks) {
    if (unlock.effect_config.drawdown_buffer_percent) {
      buffer += unlock.effect_config.drawdown_buffer_percent;
    }
  }
  
  return buffer;
}
```

---

## Edge Cases

### Edge Case 1: Trader Eliminated Before Choosing
**Scenario:** Round ends, trader eliminated during grace period before making unlock choice.

**Handling:**
- No unlock awarded (elimination = no reward)
- Creates urgency: "Survive to progress"

### Edge Case 2: Timeout on Choice
**Scenario:** 25s timer expires, trader didn't choose.

**Handling:**
- Random selection from available options
- Weighted toward most popular choice (community preference)
- Event: "Auto-selected Aggressive Path I (most popular)"

### Edge Case 3: Prerequisite Not Met
**Scenario:** Bug allows trader to unlock R3 node without R2 prerequisite.

**Handling:**
- Validation prevents unlock if `requires_node_id` not owned
- Choice UI only shows nodes where prerequisite satisfied
- API double-checks server-side

---

# MECHANICAL IDEA 6: SABOTAGE & BETTING

## Overview

Traders earn Action Points (AP) each round. AP spent on sabotaging opponents or betting on outcomes. Adds indirect competition beyond trading skill.

**Chess Parallel:** Like psychological warfare — making opponent mistake under pressure.

---

## Database Schema

### Table: `action_points`

```sql
CREATE TABLE action_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  -- Points
  starting_points INT NOT NULL DEFAULT 3,
  current_points INT NOT NULL DEFAULT 3,
  last_regeneration TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(participant_id, round_number)
);

CREATE INDEX idx_ap_arena ON action_points(arena_id);
CREATE INDEX idx_ap_participant ON action_points(participant_id);
CREATE INDEX idx_ap_round ON action_points(participant_id, round_number);
```

### Table: `sabotage_actions`

```sql
CREATE TABLE sabotage_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  attacker_id UUID NOT NULL REFERENCES arena_participants(id),
  target_id UUID NOT NULL REFERENCES arena_participants(id),
  action_type TEXT NOT NULL, -- 'leak_info', 'increase_fees', 'reduce_leverage', etc.
  ap_cost INT NOT NULL,
  
  -- Effect
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Result
  was_successful BOOLEAN DEFAULT TRUE,
  failure_reason TEXT DEFAULT NULL
);

CREATE INDEX idx_sa_arena_round ON sabotage_actions(arena_id, round_number);
CREATE INDEX idx_sa_attacker ON sabotage_actions(attacker_id);
CREATE INDEX idx_sa_target ON sabotage_actions(target_id);
CREATE INDEX idx_sa_active ON sabotage_actions(arena_id, is_active) WHERE is_active = true;
```

### Table: `bets`

```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  
  bettor_id UUID NOT NULL REFERENCES arena_participants(id),
  bet_type TEXT NOT NULL, -- 'elimination', 'outcome'
  
  -- Bet details
  target_participant_id UUID REFERENCES arena_participants(id) DEFAULT NULL, -- For elimination bets
  target_symbol TEXT DEFAULT NULL, -- For outcome bets
  prediction TEXT NOT NULL, -- 'eliminated', 'survives', 'higher', 'lower'
  
  ap_cost INT NOT NULL,
  
  -- Resolution
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  was_correct BOOLEAN DEFAULT NULL,
  equity_bonus_percent DECIMAL DEFAULT NULL,
  equity_penalty_percent DECIMAL DEFAULT NULL
);

CREATE INDEX idx_bets_arena_round ON bets(arena_id, round_number);
CREATE INDEX idx_bets_bettor ON bets(bettor_id);
CREATE INDEX idx_bets_unresolved ON bets(arena_id, resolved_at) WHERE resolved_at IS NULL;
```

---

## Action Point System

### AP Regeneration

```typescript
// Start of each round
async function initializeActionPoints(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();
  
  const { data: participants } = await supabase
    .from('arena_participants')
    .select('id')
    .eq('arena_id', arenaId)
    .eq('status', 'active');
  
  const apRecords = participants.map(p => ({
    arena_id: arenaId,
    participant_id: p.id,
    round_number: roundNumber,
    starting_points: 3,
    current_points: 3,
    last_regeneration: new Date(),
  }));
  
  await supabase.from('action_points').insert(apRecords);
}

// Regenerate 1 AP every 60s
async function regenerateActionPoints(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  
  for (const [participantId, trader] of state.traders) {
    if (trader.status !== 'active') continue;
    
    const ap = await getActionPoints(participantId);
    if (!ap) continue;
    
    const timeSinceLastRegen = Date.now() - ap.last_regeneration.getTime();
    const pointsToRegen = Math.floor(timeSinceLastRegen / 60000); // 1 per 60s
    
    if (pointsToRegen > 0) {
      await supabase
        .from('action_points')
        .update({
          current_points: Math.min(ap.current_points + pointsToRegen, 10), // Cap at 10
          last_regeneration: new Date(),
        })
        .eq('participant_id', participantId)
        .eq('round_number', ap.round_number);
    }
  }
}
```

---

## Sabotage Actions

### Action Catalog

| Action | AP Cost | Effect | Duration |
|--------|---------|--------|----------|
| Leak Info | 2 | Reveal target's positions to everyone | 60s |
| Increase Fees | 2 | Target pays 3x trading fees | 90s |
| Reduce Leverage | 2 | Target's max leverage reduced by 50% | 60s |
| Spread FUD | 2 | Target's drawdown limit reduced by 3% | Round |
| Forced Close | 3 | Force target to close one random position | Instant |
| Market Manip | 3 | Cause 5% price swing in one pair for 30s | 30s |

### Sabotage Execution

```typescript
async function executeSabotage(
  attackerId: string,
  targetId: string,
  actionType: string
): Promise<SabotageResult> {
  const supabase = getSupabase();
  
  // 1. Check AP balance
  const ap = await getActionPoints(attackerId);
  const action = SABOTAGE_ACTIONS[actionType];
  
  if (ap.current_points < action.cost) {
    return { error: 'Insufficient AP' };
  }
  
  // 2. Deduct AP
  await supabase
    .from('action_points')
    .update({ current_points: ap.current_points - action.cost })
    .eq('participant_id', attackerId)
    .eq('round_number', ap.round_number);
  
  // 3. Apply effect
  const effectResult = await applySabotageEffect(attackerId, targetId, action);
  
  // 4. Record action
  await supabase.from('sabotage_actions').insert({
    attacker_id: attackerId,
    target_id: targetId,
    action_type: actionType,
    ap_cost: action.cost,
    expires_at: effectResult.expiresAt,
  });
  
  // 5. Broadcast event
  await supabase.from('events').insert({
    arena_id: getArenaId(attackerId),
    round_number: getCurrentRound(attackerId),
    event_type: 'sabotage',
    actor_id: attackerId,
    target_id: targetId,
    message: `${getUsername(attackerId)} used ${action.name} on ${getUsername(targetId)}!`,
    data: { action_type: actionType, ...effectResult },
  });
  
  return { success: true, effect: effectResult };
}
```

---

## Betting System

### Bet Types

**Elimination Bet:**
```typescript
{
  bet_type: 'elimination',
  target_participant_id: 'uuid-bob',
  prediction: 'eliminated', // or 'survives'
  ap_cost: 1,
  
  // Resolution
  if correct: equity +5%,
  if wrong: equity -3%
}
```

**Outcome Bet:**
```typescript
{
  bet_type: 'outcome',
  target_symbol: 'BTC',
  prediction: 'higher', // or 'lower'
  ap_cost: 2,
  
  // Resolution
  if correct: equity +8%,
  if wrong: equity -5%
}
```

### Bet Resolution

```typescript
async function resolveBets(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();
  
  // Get unresolved bets
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('arena_id', arenaId)
    .eq('round_number', roundNumber)
    .is('resolved_at', null);
  
  for (const bet of bets) {
    let wasCorrect = false;
    
    if (bet.bet_type === 'elimination') {
      const target = await getParticipant(bet.target_participant_id);
      wasCorrect = bet.prediction === 'eliminated' 
        ? target.status === 'eliminated'
        : target.status !== 'eliminated';
    }
    
    if (bet.bet_type === 'outcome') {
      const priceManager = getPriceManager();
      const currentPrice = priceManager.getPrice(bet.target_symbol);
      const startPrice = getRoundStartPrice(arenaId, roundNumber, bet.target_symbol);
      
      wasCorrect = bet.prediction === 'higher'
        ? currentPrice > startPrice
        : currentPrice < startPrice;
    }
    
    // Apply equity adjustment
    const participant = await getParticipant(bet.bettor_id);
    const equityAdjustment = wasCorrect 
      ? bet.equity_bonus_percent 
      : -bet.equity_penalty_percent;
    
    await applyEquityAdjustment(bet.bettor_id, equityAdjustment);
    
    // Mark resolved
    await supabase
      .from('bets')
      .update({
        resolved_at: new Date(),
        was_correct: wasCorrect,
        equity_bonus_percent: wasCorrect ? bet.equity_bonus_percent : null,
        equity_penalty_percent: wasCorrect ? null : bet.equity_penalty_percent,
      })
      .eq('id', bet.id);
  }
}
```

---

## Frontend Components

### Component: `ActionPanel`

Trader's sabotage/betting interface.

```
┌──────────────────────────────────────┐
│  Action Points: ⚡⚡⚡ (3/3)          │
│  Next AP in: 45s                     │
├──────────────────────────────────────┤
│                                      │
│  ── Sabotage ──                      │
│  👁️  Leak Info (Bob)    [2 AP]      │
│  💰  Increase Fees (Alice) [2 AP]   │
│  📉  Reduce Leverage (Carol) [2 AP] │
│  💥  Forced Close (Dave)  [3 AP]    │
│                                      │
│  ── Betting ──                       │
│  🎯  Bob eliminated this round?      │
│      [YES] [NO]           [1 AP]    │
│                                      │
│  📊  BTC higher at round end?        │
│      [YES] [NO]           [2 AP]    │
│                                      │
└──────────────────────────────────────┘
```

---

## Edge Cases

### Edge Case 1: Sabotage Target Eliminated Before Effect
**Scenario:** Alice uses "Increase Fees" on Bob, but Bob eliminated 5s later.

**Handling:**
- Effect cancelled (no target)
- AP not refunded (already spent)
- Event: "Sabotage failed — target eliminated"

### Edge Case 2: Bet on Self
**Scenario:** Trader bets on their own elimination.

**Handling:**
- Allowed (strategic hedging)
- "I know I'm going down, might as well profit"
- Creates interesting psychology

### Edge Case 3: AP Overflow
**Scenario:** Trader doesn't spend AP for entire round, regenerates to 10.

**Handling:**
- AP capped at 10 (prevents hoarding for one big round)
- Excess AP lost at round end (doesn't carry over)
- Encourages active usage

---

# IMPLEMENTATION PRIORITY MATRIX

| Idea | Uniqueness | Effort | Dependencies | Recommended Order |
|------|-----------|--------|--------------|-------------------|
| M-4: Hazard Events | HIGH | MEDIUM (700-900 lines) | None | **1st** — Quick win, low risk |
| M-1: Territorial Trading | VERY HIGH | MEDIUM-HIGH (800-1000 lines) | None | **2nd** — Core unique mechanic |
| M-5: Progression Tree | HIGH | MEDIUM-HIGH (800-1000 lines) | None | **3rd** — Adds depth |
| M-2: Ability System | HIGH | MEDIUM-HIGH (900-1100 lines) | M-4 (synergy) | **4th** — Complements hazards |
| M-6: Sabotage/Betting | VERY HIGH | HIGH (1100-1300 lines) | None | **5th** — Player interaction |
| M-3: Alliance System | VERY HIGH | HIGH (1000-1200 lines) | None | **6th** — Social layer |

**Total Full Implementation:** ~5,300-6,500 lines, 23-31 days

---

# COMPARISON: BEFORE vs AFTER

## Current Game Loop
```
1. Join arena
2. Open positions
3. Close positions
4. PnL% calculated
5. Bottom X% eliminated
6. Repeat until 1 survivor
```

**Player Experience:** "Open trades, hope for profit, get eliminated if unlucky"
**Spectator Experience:** "Watch PnL numbers go up and down"

## After Full Implementation
```
1. Join arena
2. Draft territory (M-1) → strategic board position
3. Choose unlock path (M-5) → customize your build
4. Trade with modifiers → territory affects your PnL
5. Hazard events trigger (M-4) → adapt to chaos
6. Use abilities (M-2) → shield, sabotage, double down
7. Sabotage rivals (M-6) → spend AP to hurt leaders
8. Bet on outcomes (M-6) → hedge your risks
9. Form alliances (M-3) → share risk, then betray
10. Round ends → territory elimination + ability awards + unlock choice
11. Repeat with evolving strategy
```

**Player Experience:** "Draft territory → adapt to hazards → sabotage rivals → betray allies → survive"
**Spectator Experience:** "Watch territory battles, ability usage, sabotage drama, betrayal reveals"

---

**Last Updated:** April 8, 2026
**Status:** Complete mechanical specifications ready for implementation
**Next Step:** Choose which idea(s) to implement first


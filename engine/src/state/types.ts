/**
 * In-memory state types for the Risk Engine.
 * These live in engine memory only — not persisted directly.
 * Periodic sync writes snapshots to Supabase.
 */

export interface PositionState {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  leverage: number;
}

export interface TraderState {
  participantId: string;
  userId: string;
  subaccountAddress: string;
  balance: number;
  positions: Map<string, PositionState>;
  equityBaseline: number;
  currentEquity: number;
  currentDrawdownPercent: number;
  maxDrawdownHit: number;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
  isInGracePeriod: boolean;
  status: "active" | "eliminated";
}

export interface ArenaState {
  arenaId: string;
  traders: Map<string, TraderState>; // keyed by participantId
  currentRound: number;
  maxDrawdownPercent: number;
  maxLeverage: number;
  allowedPairs: string[];
  status: string;
}

export type DrawdownLevel = "safe" | "caution" | "danger" | "critical";

export function getDrawdownLevel(
  currentPercent: number,
  maxPercent: number
): DrawdownLevel {
  const ratio = currentPercent / maxPercent;
  if (ratio < 0.5) return "safe";
  if (ratio < 0.75) return "caution";
  if (ratio < 0.9) return "danger";
  return "critical";
}

/**
 * Calculate unrealized PnL for a single position.
 */
export function calcUnrealizedPnl(pos: PositionState, markPrice: number): number {
  const direction = pos.side === "long" ? 1 : -1;
  return (markPrice - pos.entryPrice) * pos.size * direction;
}

/**
 * Calculate total equity for a trader.
 */
export function calcEquity(trader: TraderState, markPrices: Map<string, number>): number {
  let unrealizedPnl = 0;
  for (const [symbol, pos] of trader.positions) {
    const markPrice = markPrices.get(symbol);
    if (markPrice) {
      unrealizedPnl += calcUnrealizedPnl(pos, markPrice);
    }
  }
  return trader.balance + unrealizedPnl;
}

/**
 * Calculate drawdown percentage from baseline.
 */
export function calcDrawdownPercent(equity: number, baseline: number): number {
  if (baseline <= 0) return 0;
  const drawdown = ((baseline - equity) / baseline) * 100;
  return Math.max(0, drawdown); // can't have negative drawdown
}

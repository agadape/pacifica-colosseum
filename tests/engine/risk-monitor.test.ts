import { describe, it, expect } from "vitest";
import {
  calcEquity,
  calcDrawdownPercent,
  calcUnrealizedPnl,
  getDrawdownLevel,
  type TraderState,
  type PositionState,
} from "../../engine/src/state/types";

describe("calcUnrealizedPnl", () => {
  it("calculates profit on long position", () => {
    const pos: PositionState = { symbol: "BTC", side: "long", size: 1, entryPrice: 80000, leverage: 5 };
    expect(calcUnrealizedPnl(pos, 85000)).toBe(5000);
  });

  it("calculates loss on long position", () => {
    const pos: PositionState = { symbol: "BTC", side: "long", size: 1, entryPrice: 80000, leverage: 5 };
    expect(calcUnrealizedPnl(pos, 75000)).toBe(-5000);
  });

  it("calculates profit on short position", () => {
    const pos: PositionState = { symbol: "BTC", side: "short", size: 1, entryPrice: 80000, leverage: 5 };
    expect(calcUnrealizedPnl(pos, 75000)).toBe(5000);
  });

  it("calculates loss on short position", () => {
    const pos: PositionState = { symbol: "BTC", side: "short", size: 1, entryPrice: 80000, leverage: 5 };
    expect(calcUnrealizedPnl(pos, 85000)).toBe(-5000);
  });

  it("handles fractional sizes", () => {
    const pos: PositionState = { symbol: "BTC", side: "long", size: 0.5, entryPrice: 80000, leverage: 10 };
    expect(calcUnrealizedPnl(pos, 82000)).toBe(1000);
  });
});

describe("calcEquity", () => {
  it("returns balance when no positions", () => {
    const trader = makeTrader(1000, []);
    const prices = new Map<string, number>();
    expect(calcEquity(trader, prices)).toBe(1000);
  });

  it("adds unrealized PnL to balance", () => {
    const trader = makeTrader(1000, [
      { symbol: "BTC", side: "long", size: 1, entryPrice: 80000, leverage: 5 },
    ]);
    const prices = new Map([["BTC", 85000]]);
    expect(calcEquity(trader, prices)).toBe(6000); // 1000 + 5000
  });

  it("subtracts unrealized loss from balance", () => {
    const trader = makeTrader(1000, [
      { symbol: "BTC", side: "long", size: 0.1, entryPrice: 80000, leverage: 5 },
    ]);
    const prices = new Map([["BTC", 75000]]);
    expect(calcEquity(trader, prices)).toBe(500); // 1000 + (-500)
  });

  it("handles multiple positions", () => {
    const trader = makeTrader(1000, [
      { symbol: "BTC", side: "long", size: 0.1, entryPrice: 80000, leverage: 5 },
      { symbol: "ETH", side: "short", size: 10, entryPrice: 2000, leverage: 3 },
    ]);
    const prices = new Map([["BTC", 82000], ["ETH", 1900]]);
    // BTC pnl: (82000-80000) * 0.1 * 1 = 200
    // ETH pnl: (1900-2000) * 10 * -1 = 1000
    expect(calcEquity(trader, prices)).toBe(2200); // 1000 + 200 + 1000
  });
});

describe("calcDrawdownPercent", () => {
  it("returns 0 when equity equals baseline", () => {
    expect(calcDrawdownPercent(1000, 1000)).toBe(0);
  });

  it("calculates 10% drawdown", () => {
    expect(calcDrawdownPercent(900, 1000)).toBe(10);
  });

  it("calculates 50% drawdown", () => {
    expect(calcDrawdownPercent(500, 1000)).toBe(50);
  });

  it("returns 0 for negative drawdown (profit)", () => {
    expect(calcDrawdownPercent(1100, 1000)).toBe(0);
  });

  it("handles zero baseline", () => {
    expect(calcDrawdownPercent(0, 0)).toBe(0);
  });
});

describe("getDrawdownLevel", () => {
  it("returns safe under 50%", () => {
    expect(getDrawdownLevel(5, 20)).toBe("safe");
  });

  it("returns caution at 50-75%", () => {
    expect(getDrawdownLevel(12, 20)).toBe("caution");
  });

  it("returns danger at 75-90%", () => {
    expect(getDrawdownLevel(16, 20)).toBe("danger");
  });

  it("returns critical at 90%+", () => {
    expect(getDrawdownLevel(19, 20)).toBe("critical");
  });

  it("returns critical at 100%", () => {
    expect(getDrawdownLevel(20, 20)).toBe("critical");
  });
});

// Helper
function makeTrader(balance: number, positions: PositionState[]): TraderState {
  const posMap = new Map<string, PositionState>();
  for (const p of positions) posMap.set(p.symbol, p);
  return {
    participantId: "test",
    userId: "test",
    subaccountAddress: "test",
    balance,
    positions: posMap,
    equityBaseline: 1000,
    currentEquity: balance,
    currentDrawdownPercent: 0,
    maxDrawdownHit: 0,
    hasWideZone: false,
    hasSecondLife: false,
    secondLifeUsed: false,
    isInGracePeriod: false,
    status: "active",
    territoryDrawdownBuffer: 0,
  };
}

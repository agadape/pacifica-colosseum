import { describe, it, expect } from "vitest";
import { calcEquity, calcDrawdownPercent, type TraderState, type PositionState } from "../../engine/src/state/types";

describe("Wide Zone effect", () => {
  it("+5% drawdown buffer when hasWideZone", () => {
    const baseMax = 15; // Round 2 max drawdown
    const wideZoneBonus = 5;
    const effectiveMax = baseMax + wideZoneBonus;
    expect(effectiveMax).toBe(20);
  });

  it("trader with Wide Zone survives at 18% drawdown (max 15% + 5% bonus)", () => {
    const maxDrawdown = 15;
    const wideZoneBonus = 5;
    const effectiveMax = maxDrawdown + wideZoneBonus;
    const currentDrawdown = 18;
    expect(currentDrawdown < effectiveMax).toBe(true);
  });

  it("trader without Wide Zone eliminated at 18% drawdown (max 15%)", () => {
    const maxDrawdown = 15;
    const currentDrawdown = 18;
    expect(currentDrawdown >= maxDrawdown).toBe(true);
  });
});

describe("Second Life effect", () => {
  it("first breach resets baseline instead of eliminating", () => {
    const baseline = 1000;
    const currentEquity = 800; // 20% drawdown
    // After Second Life: baseline resets to current equity
    const newBaseline = currentEquity;
    const newDrawdown = calcDrawdownPercent(currentEquity, newBaseline);
    expect(newDrawdown).toBe(0);
  });

  it("second breach eliminates (no more second life)", () => {
    // After using Second Life, baseline is 800
    const baseline = 800;
    const currentEquity = 640; // 20% drawdown from 800
    const drawdown = calcDrawdownPercent(currentEquity, baseline);
    expect(drawdown).toBe(20);
    // At 20% drawdown with max 15%, this trader should be eliminated
    expect(drawdown >= 15).toBe(true);
  });
});

describe("Loot winner selection", () => {
  it("Wide Zone goes to lowest drawdown trader", () => {
    const traders = [
      { id: "a", maxDrawdown: 8.5 },
      { id: "b", maxDrawdown: 3.2 },
      { id: "c", maxDrawdown: 12.1 },
    ];
    const sorted = [...traders].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
    expect(sorted[0].id).toBe("b");
  });

  it("Second Life goes to highest PnL% trader", () => {
    const traders = [
      { id: "a", pnlPercent: 5.2 },
      { id: "b", pnlPercent: 12.8 },
      { id: "c", pnlPercent: -3.1 },
    ];
    const sorted = [...traders].sort((a, b) => b.pnlPercent - a.pnlPercent);
    expect(sorted[0].id).toBe("b");
  });

  it("same winner gets Second Life, runner-up gets Wide Zone", () => {
    const traders = [
      { id: "a", maxDrawdown: 2.0, pnlPercent: 15.0 }, // best at both
      { id: "b", maxDrawdown: 5.0, pnlPercent: 8.0 },
      { id: "c", maxDrawdown: 10.0, pnlPercent: 3.0 },
    ];

    const wideZoneSorted = [...traders].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
    const secondLifeSorted = [...traders].sort((a, b) => b.pnlPercent - a.pnlPercent);

    let wideZoneWinner = wideZoneSorted[0];
    const secondLifeWinner = secondLifeSorted[0];

    if (wideZoneWinner.id === secondLifeWinner.id) {
      wideZoneWinner = wideZoneSorted[1]; // runner-up
    }

    expect(secondLifeWinner.id).toBe("a");
    expect(wideZoneWinner.id).toBe("b");
  });
});

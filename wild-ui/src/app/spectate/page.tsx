"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RoundBracket } from "@/components/ui/RoundBracket";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { EventFeed } from "@/components/ui/EventFeed";
import { DrawdownBar } from "@/components/ui/DrawdownBar";

const ALL_TRADERS = [
  { rank: 1, traderId: "0xMnemonic...4x2k", pnlPct: 84.2, drawdownPct: 8, status: "active" as const },
  { rank: 2, traderId: "0xPhoenix...9z3m", pnlPct: 61.5, drawdownPct: 12, status: "active" as const },
  { rank: 3, traderId: "0xCipher...2j8p", pnlPct: 43.1, drawdownPct: 18, status: "active" as const },
  { rank: 4, traderId: "0xNeon...7v5n", pnlPct: 29.7, drawdownPct: 22, status: "danger" as const },
  { rank: 5, traderId: "0xVault...1w4q", pnlPct: 18.3, drawdownPct: 31, status: "danger" as const },
  { rank: 6, traderId: "0xGhost...8t6r", pnlPct: -5.2, drawdownPct: 62, status: "eliminated" as const },
  { rank: 7, traderId: "0xStorm...3k9l", pnlPct: -41.8, drawdownPct: 100, status: "eliminated" as const },
  { rank: 8, traderId: "0xRaven...5m7b", pnlPct: -68.4, drawdownPct: 100, status: "eliminated" as const },
];

const MOCK_EVENTS = [
  { id: "1", type: "elimination" as const, message: "Ghost eliminated — drawdown breach", timestamp: new Date(Date.now() - 180000) },
  { id: "2", type: "loot-wide-zone" as const, message: "Mnemonic awarded Wide Zone", timestamp: new Date(Date.now() - 300000) },
  { id: "3", type: "round-start" as const, message: "Round 3 started — BTC only, 10% drawdown", timestamp: new Date(Date.now() - 600000) },
  { id: "4", type: "elimination" as const, message: "Storm eliminated — bottom PnL", timestamp: new Date(Date.now() - 900000) },
  { id: "5", type: "loot-second-life" as const, message: "Phoenix awarded Second Life", timestamp: new Date(Date.now() - 1200000) },
  { id: "6", type: "round-end" as const, message: "Round 2 ended — 4 traders eliminated", timestamp: new Date(Date.now() - 1500000) },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        className="w-7 h-7 flex items-center justify-center text-xs font-bold"
        style={{
          background: "#000",
          border: "2px solid #fff",
          color: "#fff",
          fontFamily: "'Clash Display', system-ui, sans-serif",
        }}
      >
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className="w-7 h-7 flex items-center justify-center text-xs font-bold"
        style={{
          background: "var(--color-void)",
          border: "2px solid var(--color-text-muted)",
          color: "var(--color-text-muted)",
          fontFamily: "'Clash Display', system-ui, sans-serif",
        }}
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className="w-7 h-7 flex items-center justify-center text-xs font-bold"
        style={{
          background: "var(--color-void)",
          border: "2px solid #CD7F32",
          color: "#CD7F32",
          fontFamily: "'Clash Display', system-ui, sans-serif",
        }}
      >
        3
      </div>
    );
  }
  return (
    <div
      className="w-7 h-7 flex items-center justify-center text-xs font-bold"
      style={{
        color: "var(--color-text-muted)",
        fontFamily: "'Clash Display', system-ui, sans-serif",
      }}
    >
      {rank}
    </div>
  );
}

export default function SpectatePage() {
  const [currentRound] = useState<1 | 2 | 3 | 4>(3);
  const [roundSeconds] = useState(9245);

  const survivors = ALL_TRADERS.filter((t) => t.status !== "eliminated");

  return (
    <div className="min-h-screen" style={{ background: "var(--color-void)", fontFamily: "'Satoshi', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "#0D0D0D", borderBottom: "2px solid #fff" }}
      >
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xs font-medium tracking-widest" style={{ color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                ← BACK
              </Link>
              <div className="h-4 w-px" style={{ background: "#fff" }} />
              <span className="text-sm font-bold" style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}>
                SPECTATE: DEMO_ARENA
              </span>
              <span className="badge-live">
                <span className="pulse-dot" style={{ width: 6, height: 6, background: "#fff", display: "inline-block" }} />
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-6">
              <RoundBracket currentRound={currentRound} />
              <div className="h-6 w-px" style={{ background: "#fff" }} />
              <CountdownTimer targetSeconds={roundSeconds} label="ROUND ENDS" size="sm" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          <div className="col-span-12 lg:col-span-8 space-y-6">

            <div className="brut-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "2px solid #fff" }}>
                <div className="flex items-center gap-2">
                  <span className="section-label">LEADERBOARD</span>
                  <span
                    className="mono text-xs px-2 py-0.5 font-semibold"
                    style={{
                      background: "transparent",
                      color: "#22C55E",
                      border: "1px solid #22C55E",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {survivors.length} ALIVE
                  </span>
                </div>
                <span className="mono text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  ROUND {currentRound} OF 4
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>TRADER</th>
                    <th className="text-right">PnL %</th>
                    <th className="text-right w-40">DRAWDOWN</th>
                    <th className="text-right w-20">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_TRADERS.map((trader) => (
                    <tr
                      key={trader.rank}
                      style={{ opacity: trader.status === "eliminated" ? 0.35 : 1 }}
                    >
                      <td>
                        <RankBadge rank={trader.rank} />
                      </td>
                      <td>
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: trader.status === "eliminated" ? "var(--color-text-muted)" : "#fff",
                            textDecoration: trader.status === "eliminated" ? "line-through" : "none",
                            fontFamily: "'Clash Display', system-ui, sans-serif",
                          }}
                        >
                          {trader.traderId}
                        </span>
                      </td>
                      <td
                        className="text-right mono font-semibold"
                        style={{
                          color: trader.pnlPct >= 0 ? "#22C55E" : "#EF4444",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {trader.pnlPct >= 0 ? "+" : ""}
                        {trader.pnlPct.toFixed(2)}%
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DrawdownBar value={trader.drawdownPct} size="sm" />
                        </div>
                      </td>
                      <td className="text-right">
                        {trader.status === "active" && (
                          <span
                            className="mono text-[8px] font-bold tracking-wider px-2 py-0.5"
                            style={{ color: "#22C55E", border: "1px solid #22C55E", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            SAFE
                          </span>
                        )}
                        {trader.status === "danger" && (
                          <span
                            className="mono text-[8px] font-bold tracking-wider px-2 py-0.5"
                            style={{ color: "#FF0000", border: "1px solid #FF0000", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            DANGER
                          </span>
                        )}
                        {trader.status === "eliminated" && (
                          <span
                            className="mono text-[8px] font-bold tracking-wider px-2 py-0.5"
                            style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            OUT
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="brut-card p-4">
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: "PRESET", value: "BLITZ", color: "#EF4444" },
                  { label: "PARTICIPANTS", value: "6 / 8", color: "#888" },
                  { label: "ELIMINATED", value: "2", color: "#FF0000" },
                  { label: "PRIZE POOL", value: "$500", color: "#fff" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="section-label mb-1">{item.label}</div>
                    <div
                      className="mono text-lg font-bold"
                      style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <motion.div
              className="brut-card p-5"
              style={{ position: "sticky", top: 80 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">LIVE FEED</span>
                <span className="pulse-dot" style={{ width: 8, height: 8, background: "#FF0000", display: "inline-block" }} />
              </div>
              <EventFeed events={MOCK_EVENTS} maxHeight="calc(100vh - 200px)" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
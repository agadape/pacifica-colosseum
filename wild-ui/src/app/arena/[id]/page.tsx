"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { TraderCard } from "@/components/ui/TraderCard";
import { RoundBracket } from "@/components/ui/RoundBracket";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { EventFeed } from "@/components/ui/EventFeed";

const MOCK_TRADERS = [
  { rank: 1, traderId: "0xMnemonic...4x2k", pnlPct: 84.2, drawdownPct: 8, status: "active" as const, hasWideZone: true, hasSecondLife: false },
  { rank: 2, traderId: "0xPhoenix...9z3m", pnlPct: 61.5, drawdownPct: 12, status: "active" as const, hasWideZone: false, hasSecondLife: true },
  { rank: 3, traderId: "0xCipher...2j8p", pnlPct: 43.1, drawdownPct: 18, status: "active" as const, hasWideZone: false, hasSecondLife: false },
  { rank: 4, traderId: "0xNeon...7v5n", pnlPct: 29.7, drawdownPct: 22, status: "danger" as const, hasWideZone: false, hasSecondLife: false },
  { rank: 5, traderId: "0xVault...1w4q", pnlPct: 18.3, drawdownPct: 31, status: "danger" as const, hasWideZone: false, hasSecondLife: false },
  { rank: 6, traderId: "0xGhost...8t6r", pnlPct: -5.2, drawdownPct: 62, status: "eliminated" as const, hasWideZone: false, hasSecondLife: false },
  { rank: 7, traderId: "0xStorm...3k9l", pnlPct: -41.8, drawdownPct: 100, status: "eliminated" as const, hasWideZone: false, hasSecondLife: false },
];

function generateEvents() {
  const now = new Date();
  return [
    { id: "1", type: "elimination" as const, message: "Ghost eliminated — drawdown breach", timestamp: new Date(now.getTime() - 180000) },
    { id: "2", type: "loot-wide-zone" as const, message: "Mnemonic awarded Wide Zone — lowest drawdown", timestamp: new Date(now.getTime() - 300000) },
    { id: "3", type: "round-start" as const, message: "Round 3 started — BTC only, 10% drawdown", timestamp: new Date(now.getTime() - 600000) },
    { id: "4", type: "elimination" as const, message: "Storm eliminated — bottom PnL", timestamp: new Date(now.getTime() - 900000) },
    { id: "5", type: "loot-second-life" as const, message: "Phoenix awarded Second Life — highest PnL", timestamp: new Date(now.getTime() - 1200000) },
    { id: "6", type: "round-end" as const, message: "Round 2 ended — 4 traders eliminated", timestamp: new Date(now.getTime() - 1500000) },
  ];
}

export default function ArenaDetailPage() {
  const params = useParams();
  const [currentRound] = useState<1 | 2 | 3 | 4>(3);
  const [roundSeconds] = useState(9245);
  const [events] = useState(() => generateEvents());
  const [myEquity, setMyEquity] = useState(1123.45);
  const [myDrawdown, setMyDrawdown] = useState(18.2);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setMyEquity((e) => {
        const delta = (Math.random() - 0.48) * 5;
        return Math.max(800, e + delta);
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const activeTraders = MOCK_TRADERS.filter((t) => t.status !== "eliminated");
  const eliminatedTraders = MOCK_TRADERS.filter((t) => t.status === "eliminated");

  return (
    <div className="min-h-screen" style={{ background: "var(--color-void)", fontFamily: "'Satoshi', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "#0D0D0D", borderBottom: "2px solid #fff" }}
      >
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/arenas" className="text-xs font-medium tracking-widest" style={{ color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                ← ARENAS
              </Link>
              <div className="h-4 w-px" style={{ background: "#fff" }} />
              <span className="text-sm font-bold" style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}>
                DEMO_ARENA
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
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">
                  SURVIVORS — {activeTraders.length}
                </span>
                <span className="mono text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  ROUND {currentRound} OF 4
                </span>
              </div>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              >
                {activeTraders.map((trader) => (
                  <motion.div
                    key={trader.rank}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <TraderCard {...trader} isMe={trader.rank === 4} />
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {eliminatedTraders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="section-label">ELIMINATED — {eliminatedTraders.length}</span>
                  <div className="flex-1 h-px" style={{ background: "var(--color-border-subtle)" }} />
                </div>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                >
                  {eliminatedTraders.map((trader) => (
                    <motion.div
                      key={trader.rank}
                      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <TraderCard key={trader.rank} {...trader} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-4">
            <motion.div
              className="brut-card p-5"
              style={{ position: "sticky", top: 80 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">EVENT FEED</span>
                <span className="pulse-dot" style={{ width: 8, height: 8, background: "#FF0000", display: "inline-block" }} />
              </div>
              <EventFeed events={events} maxHeight="calc(100vh - 200px)" />
            </motion.div>
          </div>
        </div>

        <motion.div
          className="brut-card mt-6 p-6"
          style={{ borderTop: "3px solid #FF0000" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="section-label" style={{ color: "#FF0000" }}>MY POSITION</span>
            <span
              className="mono text-[8px] font-bold tracking-wider px-2 py-0.5"
              style={{ color: "#EF4444", border: "1px solid #EF4444", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}
            >
              DANGER
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="section-label mb-1">EQUITY</div>
              <div className="mono text-2xl font-semibold" style={{ color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                ${myEquity.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="section-label mb-1">DRAWDOWN</div>
              <div className="mb-2">
                <div
                  className="mono text-2xl font-semibold"
                  style={{
                    color: myDrawdown >= 60 ? "#EF4444" : myDrawdown >= 30 ? "#FF0000" : "#22C55E",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {myDrawdown.toFixed(1)}%
                </div>
              </div>
              <div style={{ height: 5, background: "var(--color-border-subtle)" }}>
                <div
                  style={{
                    width: `${myDrawdown}%`,
                    height: "100%",
                    background: myDrawdown >= 60 ? "#EF4444" : myDrawdown >= 30 ? "#FF0000" : "#22C55E",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="section-label mb-1">ROUND</div>
              <div className="mono text-2xl font-semibold" style={{ color: "#FF0000", fontFamily: "'JetBrains Mono', monospace" }}>
                R{currentRound} / 4
              </div>
            </div>
            <div>
              <div className="section-label mb-1">PRIZE</div>
              <div className="mono text-2xl font-semibold" style={{ color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                $500
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
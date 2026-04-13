"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArenaCard } from "@/components/ui/ArenaCard";
import { HeroArenaIllustration } from "@/components/ui/HeroArenaIllustration";
import { ArenaFeatureIllustration } from "@/components/ui/ArenaFeatureIllustration";
import { TrophyIllustration } from "@/components/ui/TrophyIllustration";
import { VelocityGlitchBars } from "@/components/ui/VelocityGlitch";
import { GlitchText } from "@/components/ui/GlitchText";

const HOW_IT_WORKS = [
  { step: "01", label: "ENTER", sub: "Register & fund your sub-account" },
  { step: "02", label: "BATTLE", sub: "4 rounds, progressive eliminations" },
  { step: "03", label: "SURVIVE", sub: "Last trader standing wins the prize" },
  { step: "04", label: "WIN", sub: "Take the entire prize pool" },
];

const ROUND_PARAMS = [
  { label: "LEVERAGE", values: ["20x", "15x", "10x", "5x"] },
  { label: "DRAWDOWN", values: ["20%", "15%", "10%", "8%"] },
  { label: "PAIRS", values: ["ALL", "BTC/ETH", "BTC", "BTC"] },
  { label: "DURATION", values: ["5 MIN", "2 HR", "24 HR", "7 DAY"] },
];

const MOCK_ARENAS = [
  { id: "arena-1", name: "DEMO_ARENA", preset: "BLITZ" as const, status: "live" as const, currentRound: 2 as const, participants: 6, maxParticipants: 8, prize: "$500", timeDisplay: "02:41:08" },
  { id: "arena-2", name: "OPEN_ARENA", preset: "DAILY" as const, status: "registration" as const, currentRound: 1 as const, participants: 12, maxParticipants: 20, prize: "$1,000", timeDisplay: "01:12:44" },
  { id: "arena-3", name: "WARZONE_01", preset: "SPRINT" as const, status: "live" as const, currentRound: 3 as const, participants: 4, maxParticipants: 8, prize: "$250", timeDisplay: "00:58:33" },
];

const PAIRS = [
  { symbol: "BTC", price: 68420.5, change: 2.34 },
  { symbol: "SOL", price: 142.85, change: -1.12 },
  { symbol: "ETH", price: 3248.3, change: 0.87 },
];

function GlitchHeadline({ lines }: { lines: string[] }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 400);
    const t2 = setTimeout(() => setActive(false), 1200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  return (
    <div className="leading-none" style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontSize: "clamp(52px, 10vw, 120px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
      {lines.map((line, i) => (
        <div key={i} style={{ overflow: "hidden", display: "block" }}>
          {i === 1 ? (
            <GlitchText
              active={active}
              className={active ? "glitch-text active chromatic" : "glitch-text chromatic"}
              style={{ color: "#FF0000", display: "inline-block" }}
            >
              {line}
            </GlitchText>
          ) : (
            <span style={{ color: "#FFFFFF", display: "inline-block" }}>{line}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LivePriceFeed() {
  const [prices, setPrices] = useState(PAIRS);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => {
          const delta = (Math.random() - 0.48) * p.price * 0.001;
          const newPrice = p.price + delta;
          return {
            ...p,
            price: newPrice,
            change: p.change + (Math.random() - 0.5) * 0.1,
          };
        })
      );
    }, 800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
      {prices.map((p) => (
        <div key={p.symbol} style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#444", letterSpacing: "0.2em", marginBottom: "4px" }}>{p.symbol}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
            ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 600, color: p.change >= 0 ? "#22C55E" : "#EF4444" }}>
            {p.change >= 0 ? "+" : ""}{p.change.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function BattleStatusPanel() {
  const [elapsed, setElapsed] = useState(0);
  const [activeTraders, setActiveTraders] = useState(847);
  const [elimCount, setElimCount] = useState(3291);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setElapsed((e) => e + 1);
      if (Math.random() > 0.6) {
        setActiveTraders((a) => Math.max(400, a + (Math.random() > 0.5 ? -1 : 1)));
      }
      if (Math.random() > 0.85) {
        setElimCount((c) => c + 1);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div
      style={{
        border: "2px solid #fff",
        background: "var(--color-void)",
        padding: "20px 24px",
        minWidth: "220px",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: "-1px", left: "-1px", right: "-1px", height: "2px", background: "#FF0000" }} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#FF0000", letterSpacing: "0.3em", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="pulse-dot" style={{ width: 5, height: 5, background: "#FF0000", display: "inline-block" }} />
        BATTLE STATS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          { label: "ELAPSED", value: `${mm}:${ss}`, color: "#fff" },
          { label: "ACTIVE", value: activeTraders.toLocaleString(), color: "#22C55E" },
          { label: "ELIMINATED", value: elimCount.toLocaleString(), color: "#FF0000" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#444", letterSpacing: "0.15em" }}>{item.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#444", letterSpacing: "0.15em" }}>ROUND 3 OF 4</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#FF0000", letterSpacing: "0.1em" }}>75%</span>
        </div>
        <div style={{ height: "3px", background: "#1a1a1a" }}>
          <div style={{ width: "75%", height: "100%", background: "linear-gradient(90deg, #FF0000, #E57C03)", position: "relative" }}>
            <div style={{ position: "absolute", right: 0, top: "-2px", width: "5px", height: "7px", background: "#fff" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanLineAnimation() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: "1px",
        background: "linear-gradient(90deg, transparent, #FF0000 20%, #FF0000 80%, transparent)",
        opacity: 0.3,
        animation: "scanDown 8s linear infinite",
        zIndex: 5,
        pointerEvents: "none",
      }}
    />
  );
}

function SectionMarker({ num }: { num: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-20px",
        left: "24px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "80px",
        fontWeight: 700,
        color: "rgba(255,255,255,0.03)",
        lineHeight: 1,
        letterSpacing: "-0.05em",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {num}
    </div>
  );
}

function ArenaCountdown({ timeDisplay }: { timeDisplay: string }) {
  const [time, setTime] = useState(timeDisplay);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setTime((t) => {
        const parts = t.split(":");
        let seconds = parseInt(parts[parts.length - 1]);
        if (seconds > 0) {
          seconds--;
          parts[parts.length - 1] = String(seconds).padStart(2, "0");
          return parts.join(":");
        }
        return t;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600, color: "#FF0000", letterSpacing: "0.05em" }}>
      {time}
    </span>
  );
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-void)", fontFamily: "'Satoshi', system-ui, sans-serif" }}>

      <style>{`
        @keyframes scanDown {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>

      <div className="brut-grid fixed inset-0 pointer-events-none" style={{ zIndex: 0, opacity: 0.6 }} />
      <VelocityGlitchBars />

      {/* ── NAV ── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: scrolled ? "rgba(10,10,10,0.97)" : "transparent",
          borderBottom: scrolled ? "2px solid #fff" : "2px solid transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <motion.div className="absolute bottom-0 left-0 h-0.5 origin-left" style={{ width: progressWidth, background: "#FF0000" }} />
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
          <div className="flex items-center justify-between" style={{ height: "64px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" fill="#FF0000"/>
                <rect x="8" y="8" width="16" height="16" fill="#000"/>
              </svg>
              <div>
                <div style={{ fontSize: "8px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em", color: "#555" }}>PACIFICA</div>
                <div style={{ fontSize: "13px", fontFamily: "'Clash Display', system-ui", fontWeight: 700, color: "#fff", lineHeight: 1 }}>COLOSSEUM</div>
              </div>
            </Link>
            <nav style={{ display: "flex", alignItems: "center", gap: "32px" }}>
              {[["ARENAS", "/arenas"], ["TRADE", "/trade"], ["SPECTATE", "/spectate"]].map(([label, href]) => (
                <Link key={label} href={href} className="nav-link">{label}</Link>
              ))}
            </nav>
            <Link href="/arenas" className="brut-btn" style={{ fontSize: "11px", padding: "10px 24px" }}>
              ENTER →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="brut-scanlines relative"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: "2px solid #fff", overflow: "hidden" }}
      >
        <div className="brut-grid absolute inset-0 opacity-100" />
        <div className="absolute left-0 top-0 w-full" style={{ height: "3px", background: "#FF0000", zIndex: 10 }} />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ width: "100%", maxWidth: "800px", opacity: 0.12 }}>
            <HeroArenaIllustration />
          </div>
        </div>

        {/* Crosshair overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120px",
            height: "120px",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "1px",
            height: "100%",
            background: "rgba(255,255,255,0.03)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.03)",
            pointerEvents: "none",
          }}
        />

        <ScanLineAnimation />

        <div className="relative z-10" style={{ maxWidth: "1400px", margin: "0 auto", padding: "120px 24px 80px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "start" }}>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-3 mb-8"
                style={{ borderLeft: "4px solid #FF0000", paddingLeft: "12px" }}
              >
                <span className="badge-live">
                  <span className="pulse-dot" style={{ width: "6px", height: "6px", background: "#fff", display: "inline-block" }} />
                  LIVE
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#555", letterSpacing: "0.15em" }}>HACKATHON 2026</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#555", letterSpacing: "0.15em" }}>·</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#FF0000", fontWeight: 700, letterSpacing: "0.1em" }}>$500,000+</span>
              </motion.div>

              <LivePriceFeed />

              <div className="mb-8">
                <GlitchHeadline lines={["THE LAST", "TRADER", "STANDING"]} />
              </div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "#444", lineHeight: 1.8, marginBottom: "40px", maxWidth: "420px", letterSpacing: "0.05em" }}
              >
                BATTLE ROYALE TRADING PROTOCOL.
                <br />
                4 ROUNDS. PROGRESSIVE ELIMINATIONS.
                <br />
                LAST ONE STANDING WINS.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.65 }}
                style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
              >
                <Link href="/arenas" className="brut-btn">
                  ENTER THE FRAY →
                </Link>
                <Link href="/spectate" className="brut-btn-ghost">
                  WATCH LIVE
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.85 }}
                style={{ display: "flex", gap: "48px", marginTop: "64px" }}
              >
                {[
                  { v: "1,452", l: "SURVIVORS" },
                  { v: "$500K+", l: "PRIZE POOL" },
                  { v: "APR 16", l: "DEADLINE" },
                ].map((s) => (
                  <div key={s.l} style={{ position: "relative" }}>
                    <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.v}</div>
                    <div className="section-label" style={{ marginTop: "4px" }}>{s.l}</div>
                    {s.l === "DEADLINE" && (
                      <div style={{ position: "absolute", top: "-8px", right: "-12px", width: "6px", height: "6px", background: "#FF0000" }} />
                    )}
                  </div>
                ))}
              </motion.div>

              {/* Deadline countdown */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 1.0 }}
                style={{ marginTop: "40px", padding: "16px 20px", border: "2px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", display: "inline-flex", gap: "32px" }}
              >
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.25em", marginBottom: "6px" }}>NEXT ROUND STARTS IN</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#FF0000", letterSpacing: "0.1em" }}>02:41:08</div>
                </div>
                <div style={{ width: "1px", background: "rgba(255,255,255,0.08)" }} />
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.25em", marginBottom: "6px" }}>HACKATHON ENDS IN</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "0.1em" }}>72H 14M 33S</div>
                </div>
              </motion.div>
            </div>

            <div style={{ paddingTop: "40px" }}>
              <BattleStatusPanel />

              {/* Top trader mini-panel */}
              <div style={{ marginTop: "16px", border: "2px solid rgba(255,255,255,0.06)", padding: "14px 16px", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.25em", marginBottom: "10px" }}>CURRENT LEADER</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", border: "2px solid #FF0000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Clash Display', system-ui", fontSize: "12px", fontWeight: 700, color: "#FF0000" }}>1</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#fff", letterSpacing: "0.05em" }}>0xMnemonic...4x2k</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#22C55E", letterSpacing: "0.1em" }}>+84.2% PnL</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "16px", fontWeight: 700, color: "#22C55E" }}>$1,842</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.1em" }}>EQUITY</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "24px", border: "2px solid rgba(255,255,255,0.1)", padding: "16px 20px", background: "rgba(0,0,0,0.3)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#444", letterSpacing: "0.25em", marginBottom: "12px" }}>MISSION BRIEFING
                </div>
                {[
                  { icon: "TARGET", text: "Eliminate competitors via drawdown breach" },
                  { icon: "ZONE", text: "4 progressive rounds — last survivor wins" },
                  { icon: "PRIZE", text: "$500,000+ total prize distribution" },
                ].map((m) => (
                  <div key={m.icon} style={{ display: "flex", gap: "12px", marginBottom: "8px", alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#FF0000", letterSpacing: "0.15em", flexShrink: 0, width: "50px", marginTop: "2px" }}>{m.icon}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#555", lineHeight: 1.5 }}>{m.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0" style={{ height: "2px", background: "linear-gradient(90deg, #FF0000, #fff, transparent)" }} />
        <div style={{ position: "absolute", bottom: "8px", right: "24px", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#333", letterSpacing: "0.2em" }}>
          GRID://COLOSSEUM.ARENA.001
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <div style={{ background: "var(--color-base)", borderBottom: "2px solid #fff", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(90deg, var(--color-base), transparent)", zIndex: 10 }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(270deg, var(--color-base), transparent)", zIndex: 10 }} />
        <div className="ticker-anim flex whitespace-nowrap py-3">
          {["ACTIVE TRADERS: 1,452", "TOTAL ARENAS: 847", "PRIZE DISTRIBUTED: $124,500", "ELIMINATIONS TODAY: 3,291", "AVG ROUND TIME: 4M 32S", "TOP PNL: +412%"].map((item, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: "16px", paddingRight: "48px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#444", letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.split(":")[0]}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#FF0000", fontWeight: 700 }}>{item.split(":")[1]}</span>
              <span style={{ width: "4px", height: "4px", background: "#333", display: "inline-block" }} />
            </div>
          ))}
          {["ACTIVE TRADERS: 1,452", "TOTAL ARENAS: 847", "PRIZE DISTRIBUTED: $124,500", "ELIMINATIONS TODAY: 3,291", "AVG ROUND TIME: 4M 32S", "TOP PNL: +412%"].map((item, i) => (
            <div key={`dup-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "16px", paddingRight: "48px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#444", letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.split(":")[0]}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#FF0000", fontWeight: 700 }}>{item.split(":")[1]}</span>
              <span style={{ width: "4px", height: "4px", background: "#333", display: "inline-block" }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE ARENAS ── */}
      <section style={{ background: "var(--color-base)", borderBottom: "2px solid #fff", padding: "80px 0", position: "relative" }}>
        <SectionMarker num="01" />
        <div style={{ position: "absolute", top: "24px", right: "24px", fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#222", letterSpacing: "0.2em" }}>
          // ARENA.ACTIVE.3
        </div>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", background: "#FF0000", animation: "pulse-dot 1s step-end infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 700, color: "#FF0000", letterSpacing: "0.25em" }}>LIVE ARENAS</span>
              <div style={{ width: "1px", height: "12px", background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#333", letterSpacing: "0.15em" }}>3 ACTIVE · BLITZ SPRINT DAILY</span>
            </div>
            <Link href="/arenas" className="brut-btn-ghost" style={{ fontSize: "11px", padding: "8px 20px" }}>VIEW ALL →</Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
            {MOCK_ARENAS.map((arena, i) => (
              <motion.div
                key={arena.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                style={{
                  borderRight: i < MOCK_ARENAS.length - 1 ? "2px solid rgba(255,255,255,0.06)" : "none",
                  borderBottom: "2px solid rgba(255,255,255,0.06)",
                  position: "relative",
                }}
              >
                {arena.status === "live" && (
                  <div style={{ position: "absolute", top: "-2px", left: "-2px", right: "-2px", height: "2px", background: "#FF0000", boxShadow: "0 0 16px #FF0000" }} />
                )}
                {arena.status === "live" && (
                  <div style={{ position: "absolute", top: "0", left: "0", width: "4px", height: "4px", background: "#FF0000" }} />
                )}
                <div style={{ padding: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "7px", color: "#2a2a2a", letterSpacing: "0.2em" }}>#{arena.id.split("-")[1]}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: arena.status === "live" ? "#FF0000" : "#333", letterSpacing: "0.2em", border: `1px solid ${arena.status === "live" ? "rgba(255,0,0,0.3)" : "rgba(255,255,255,0.05)"}`, padding: "2px 6px" }}>
                        {arena.status === "live" ? `R${arena.currentRound}/4` : "REGISTERING"}
                      </span>
                    </div>
                    {arena.status === "live" && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#22C55E", letterSpacing: "0.15em" }}>
                        {arena.participants}/{arena.maxParticipants} ↗
                      </span>
                    )}
                  </div>
                  <ArenaCard {...arena} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: "var(--color-void)", borderBottom: "2px solid #fff", padding: "80px 0", position: "relative" }}>
        <SectionMarker num="02" />
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <div className="section-label" style={{ color: "#555", marginBottom: "8px" }}>THE PROTOCOL</div>
            <h2 style={{ fontFamily: "'Clash Display', system-ui", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              HOW IT <span style={{ color: "#FF0000" }}>WORKS</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                style={{
                  padding: "32px",
                  borderTop: "2px solid #fff",
                  borderLeft: i === 0 ? "2px solid #fff" : "2px solid transparent",
                  borderRight: "2px solid rgba(255,255,255,0.08)",
                  borderBottom: "2px solid rgba(255,255,255,0.08)",
                  position: "relative",
                }}
              >
                {i === HOW_IT_WORKS.length - 1 && (
                  <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", background: "#FF0000" }} />
                )}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "48px", fontWeight: 700, color: "rgba(255,255,255,0.04)", lineHeight: 1, marginBottom: "16px" }}>{item.step}</div>
                <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px", letterSpacing: "0.02em" }}>{item.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#444", lineHeight: 1.6, letterSpacing: "0.05em" }}>{item.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROUND PROGRESSION ── */}
      <section style={{ background: "var(--color-base)", borderBottom: "2px solid #fff", padding: "80px 0", position: "relative" }}>
        <SectionMarker num="03" />
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", alignItems: "stretch" }}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{ borderRight: "2px solid rgba(255,255,255,0.08)", paddingRight: "48px" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "320px" }}>
                <ArenaFeatureIllustration />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ paddingLeft: "48px" }}
            >
              <div className="section-label" style={{ color: "#FF0000", marginBottom: "12px" }}>ROUND PROGRESSION</div>
              <h2 style={{ fontFamily: "'Clash Display', system-ui", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: "32px" }}>
                4 ROUNDS.<br/><span style={{ color: "#FF0000" }}>SHRINKING ZONES.</span>
              </h2>

              <div>
                {ROUND_PARAMS.map((param, pi) => (
                  <motion.div
                    key={param.label}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: pi * 0.08 }}
                    style={{ display: "flex", alignItems: "center", gap: "0", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 0" }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#333", letterSpacing: "0.2em", width: "120px", flexShrink: 0 }}>{param.label}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {param.values.map((v, i) => (
                        <span
                          key={`${param.label}-${i}`}
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            background: i === 0 ? "rgba(255,255,255,0.02)" : i === param.values.length - 1 ? "rgba(255,0,0,0.15)" : "transparent",
                            color: i === 0 ? "#333" : i === param.values.length - 1 ? "#FF0000" : "#666",
                            border: `1px solid ${i === 0 ? "rgba(255,255,255,0.05)" : i === param.values.length - 1 ? "rgba(255,0,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginTop: "32px", padding: "20px", border: "2px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#FF0000", letterSpacing: "0.3em", marginBottom: "12px" }}>ELIMINATION THRESHOLDS</div>
                {[
                  { elim: "30%", round: "R1 — OPEN FIELD", color: "#444" },
                  { elim: "40%", round: "R2 — THE STORM", color: "#E57C03" },
                  { elim: "50%", round: "R3 — FINAL CIRCLE", color: "#fff" },
                  { elim: "WINNER", round: "R4 — SUDDEN DEATH", color: "#FF0000" },
                ].map((e) => (
                  <div key={e.round} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#333", letterSpacing: "0.1em" }}>{e.round}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 700, color: e.color }}>{e.elim}</span>
                  </div>
                ))}
              </div>

              {/* Live standings mini-table */}
              <div style={{ marginTop: "20px", padding: "16px", border: "2px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.3em", marginBottom: "12px" }}>TOP 4 SURVIVORS</div>
                {[
                  { rank: "1", trader: "0xMnemonic...4x2k", pnl: "+84.2%", dd: "8%", color: "#fff" },
                  { rank: "2", trader: "0xPhoenix...9z3m", pnl: "+61.5%", dd: "12%", color: "#888" },
                  { rank: "3", trader: "0xCipher...2j8p", pnl: "+43.1%", dd: "18%", color: "#555" },
                  { rank: "4", trader: "0xNeon...7v5n", pnl: "+29.7%", dd: "22%", color: "#555" },
                ].map((t) => (
                  <div key={t.rank} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ width: "20px", height: "20px", border: `1px solid ${t.rank === "1" ? "#FF0000" : t.rank === "2" ? "#444" : "#222"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: t.color }}>{t.rank}</div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#444", letterSpacing: "0.05em", flex: 1 }}>{t.trader}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: "#22C55E" }}>{t.pnl}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333" }}>DD {t.dd}</span>
                  </div>
                ))}
                <div style={{ marginTop: "10px", padding: "8px", background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.15em" }}>DANGER ZONE</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "8px", color: "#FF0000", letterSpacing: "0.1em" }}>2 TRADERS ABOVE 20% DD</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{ background: "var(--color-void)", borderBottom: "2px solid #fff", padding: "100px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "180px", fontWeight: 800, color: "rgba(255,255,255,0.015)", letterSpacing: "-0.05em", userSelect: "none", whiteSpace: "nowrap" }}>$500,000</div>
        </div>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}
          >
            <TrophyIllustration size={72} />
          </motion.div>

          <div className="section-label" style={{ color: "#FF0000", marginBottom: "16px" }}>APRIL 16, 2026</div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{ fontFamily: "'Clash Display', system-ui", fontSize: "clamp(48px, 10vw, 112px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", marginBottom: "16px" }}
          >
            $500,000+
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#444", marginBottom: "40px", letterSpacing: "0.15em" }}
          >
            PRIZE POOL. HACKATHON DEADLINE.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Link href="/arenas" className="brut-btn" style={{ display: "inline-block" }}>
              REGISTER NOW →
            </Link>
          </motion.div>

          <div style={{ marginTop: "48px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
            {["PACIFICAFI", "TESTNET", "PERPETUAL FUTURES", "HACKATHON 2026", "BTC-PERP", "SOL-PERP"].map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  color: "#2a2a2a",
                  letterSpacing: "0.15em",
                  border: "1px solid #1a1a1a",
                  padding: "4px 10px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "var(--color-base)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" fill="#FF0000" opacity="0.2"/>
                <rect x="8" y="8" width="16" height="16" fill="#FF0000"/>
              </svg>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#2a2a2a", letterSpacing: "0.2em" }}>
                PACIFICA COLOSSEUM · HACKATHON 2026
              </span>
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              {[["ARENAS", "/arenas"], ["TRADE", "/trade"], ["SPECTATE", "/spectate"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#2a2a2a", letterSpacing: "0.1em", textDecoration: "none" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-arena";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardUser {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  total_arenas_entered: number;
  total_arenas_won: number;
  best_pnl_percent: number;
  win_streak: number;
  current_win_streak: number;
  total_rounds_survived: number;
  total_eliminations: number;
  created_at: string;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const SKY = "#4DBFFF";
const SKY2 = "#2A9FE8";
const CORAL = "#FF6B4A";
const GOLD = "#E8C87A";
const GOLD_DIM = "#C8A85A";

const RANK_COLORS = {
  1: { primary: "#FFD700", secondary: "#FFF0A0", glow: "rgba(255,215,0,0.5)", bg: "rgba(255,215,0,0.06)", border: "rgba(255,215,0,0.35)", label: "CHAMPION" },
  2: { primary: "#C0C0C0", secondary: "#E8E8E8", glow: "rgba(192,192,192,0.4)", bg: "rgba(192,192,192,0.04)", border: "rgba(192,192,192,0.25)", label: "GRANDMASTER" },
  3: { primary: "#CD7F32", secondary: "#E8A050", glow: "rgba(205,127,50,0.4)", bg: "rgba(205,127,50,0.04)", border: "rgba(205,127,50,0.25)", label: "MASTER" },
};

// ── Avatar URL helper ──────────────────────────────────────────────────────────
function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed.replace(/\s/g, ""))}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Win rate helper ───────────────────────────────────────────────────────────
function winRate(won: number, entered: number): string {
  if (entered === 0) return "—";
  return `${Math.round((won / entered) * 100)}%`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BACKGROUND — Animated Star Field (canvas)
// ═══════════════════════════════════════════════════════════════════════════════
function StarFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: Array<{
      x: number; y: number; size: number; opacity: number;
      twinkle: number; twinkleSpeed: number; color: string;
    }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      stars.length = 0;
      const count = Math.floor((canvas!.width * canvas!.height) / 18000);
      const starColors = [
        "228,240,255",  // cool white
        "77,191,255",   // sky blue
        "255,107,74",   // coral
        "232,200,122",  // gold
        "165,231,242",  // ice blue
      ];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          size: Math.random() * 1.5 + 0.2,
          opacity: Math.random() * 0.25 + 0.03,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.004,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.twinkle += s.twinkleSpeed;
        const a = s.opacity * (0.4 + 0.6 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color},${a})`;
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = `rgba(${s.color},${a * 0.5})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" style={{ mixBlendMode: "screen" }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RANK CROWN BADGE — Ornate SVG crowns for top 3
// ═══════════════════════════════════════════════════════════════════════════════
function RankCrownBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const c = RANK_COLORS[rank];
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="56" height="48" viewBox="0 0 56 48" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id={`crownGrad${rank}`} x1="0" y1="0" x2="56" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.primary} stopOpacity="1" />
            <stop offset="50%" stopColor={c.secondary} stopOpacity="1" />
            <stop offset="100%" stopColor={c.primary} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`crownGlow${rank}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Main crown body */}
        <path
          d="M6 40 L6 22 L14 30 L22 14 L28 26 L34 14 L42 30 L50 22 L50 40 Z"
          fill={`url(#crownGrad${rank})`}
          filter={`url(#crownGlow${rank})`}
          stroke={c.primary}
          strokeWidth="0.5"
          strokeOpacity="0.5"
        />

        {/* Crown base band */}
        <rect x="6" y="40" width="44" height="6" rx="2" fill={c.primary} fillOpacity="0.8" />
        <rect x="6" y="40" width="44" height="6" rx="2" fill="none" stroke={c.secondary} strokeWidth="0.5" />

        {/* Gemstones */}
        {isGold && (
          <>
            <circle cx="28" cy="17" r="4" fill="#FF4444" stroke="#FF6666" strokeWidth="0.5" />
            <circle cx="28" cy="17" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="14" cy="26" r="2.5" fill="#4488FF" stroke="#66AAFF" strokeWidth="0.5" />
            <circle cx="42" cy="26" r="2.5" fill="#4488FF" stroke="#66AAFF" strokeWidth="0.5" />
          </>
        )}
        {isSilver && (
          <>
            <circle cx="28" cy="17" r="3.5" fill="#88CCFF" stroke="#AACCEE" strokeWidth="0.5" />
            <circle cx="28" cy="17" r="1.5" fill="white" fillOpacity="0.4" />
            <circle cx="14" cy="26" r="2" fill="#AAAAFF" stroke="#CCCCFF" strokeWidth="0.5" />
            <circle cx="42" cy="26" r="2" fill="#AAAAFF" stroke="#CCCCFF" strokeWidth="0.5" />
          </>
        )}
        {isBronze && (
          <>
            <circle cx="28" cy="17" r="3.5" fill="#FF8844" stroke="#FFAA66" strokeWidth="0.5" />
            <circle cx="28" cy="17" r="1.5" fill="white" fillOpacity="0.4" />
            <circle cx="14" cy="26" r="2" fill="#FFCC44" stroke="#FFDD66" strokeWidth="0.5" />
            <circle cx="42" cy="26" r="2" fill="#FFCC44" stroke="#FFDD66" strokeWidth="0.5" />
          </>
        )}

        {/* Crown point glows */}
        <circle cx="14" cy="22" r="1.5" fill={c.primary} fillOpacity="0.6" />
        <circle cx="22" cy="14" r="2" fill={c.primary} fillOpacity="0.8" />
        <circle cx="28" cy="10" r="2.5" fill={c.primary} fillOpacity="0.9" />
        <circle cx="34" cy="14" r="2" fill={c.primary} fillOpacity="0.8" />
        <circle cx="42" cy="22" r="1.5" fill={c.primary} fillOpacity="0.6" />

        {/* Star above crown */}
        <path
          d="M28 2 L29.5 6 L34 6 L30.5 8.5 L32 13 L28 10 L24 13 L25.5 8.5 L22 6 L26.5 6 Z"
          fill={c.primary}
          fillOpacity="0.9"
        />
      </svg>

      {/* Rank number overlay */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-black rounded-full flex items-center justify-center"
        style={{
          width: "22px", height: "22px",
          background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
          color: rank === 1 ? "#1A1000" : "#0A0A10",
          fontFamily: "var(--font-display)",
          fontSize: "11px",
          boxShadow: `0 0 12px ${c.glow}`,
        }}
      >
        {rank}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AVATAR FRAME — Glowing circular frame with rank-specific styling
// ═══════════════════════════════════════════════════════════════════════════════
function AvatarFrame({ seed, rank, size = 56 }: { seed: string; rank: number; size?: number }) {
  const isTop3 = rank <= 3;
  const c = isTop3 ? RANK_COLORS[rank as 1 | 2 | 3] : null;
  const borderColor = isTop3 ? c!.primary : GOLD;
  const glowColor = isTop3 ? c!.glow : "rgba(232,200,122,0.3)";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      {isTop3 && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            animationDuration: `${2 + rank * 0.5}s`,
          }}
        />
      )}

      {/* Outer decorative ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 ${rank === 1 ? "20px" : "12px"} ${glowColor}, inset 0 0 ${rank === 1 ? "10px" : "6px"} ${glowColor}`,
        }}
      />

      {/* Inner ring */}
      <div
        className="absolute inset-[3px] rounded-full"
        style={{ border: `1px solid ${borderColor}66` }}
      />

      {/* Avatar image */}
      <img
        src={getAvatarUrl(seed)}
        alt=""
        className="absolute inset-[5px] rounded-full"
        style={{ objectFit: "cover" }}
      />

      {/* Rank indicator dot */}
      {isTop3 && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${c!.primary}, ${c!.secondary})`,
            boxShadow: `0 0 6px ${c!.glow}`,
          }}
        >
          <span className="text-[8px] font-black" style={{ color: rank === 1 ? "#1A1000" : "#0A0A10" }}>
            {rank}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PLAYER NAME BANNER — Ornate decorative frame around name (Magic Chess style)
// ═══════════════════════════════════════════════════════════════════════════════
function PlayerBanner({ name, rank, totalWon }: { name: string; rank: number; totalWon: number }) {
  const isTop3 = rank <= 3;
  const c = isTop3 ? RANK_COLORS[rank as 1 | 2 | 3] : null;

  if (!isTop3) {
    return (
      <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>
        {name}
      </span>
    );
  }

  return (
    <div className="relative">
      {/* Banner background */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${c!.primary}18, ${c!.primary}08)`,
          border: `1px solid ${c!.border}`,
          boxShadow: `0 0 16px ${c!.glow}, inset 0 0 8px ${c!.primary}10`,
        }}
      />

      {/* Top ornament line */}
      <div
        className="absolute -top-px left-2 right-2 h-px rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${c!.primary}, transparent)` }}
      />

      {/* Left ornament */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-4" style={{ background: `linear-gradient(180deg, transparent, ${c!.primary}, transparent)` }} />

      {/* Right ornament */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-4" style={{ background: `linear-gradient(180deg, transparent, ${c!.primary}, transparent)` }} />

      {/* Content */}
      <div className="relative px-3 py-1.5">
        <span
          className="block font-bold tracking-wide truncate"
          style={{
            color: c!.secondary,
            fontFamily: "var(--font-display)",
            fontSize: rank === 1 ? "14px" : "13px",
            textShadow: `0 0 12px ${c!.glow}`,
          }}
        >
          {name}
        </span>
        {totalWon > 0 && rank === 1 && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 0L5 3L8 3L5.5 5L6.5 8L4 6L1.5 8L2.5 5L0 3L3 3Z" fill={c!.primary} />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c!.primary, fontFamily: "var(--font-display)" }}>
              {totalWon} Victory{totalWon !== 1 ? "es" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STAT ICON — Small icon + value display
// ═══════════════════════════════════════════════════════════════════════════════
function StatChip({ icon, value, color, glow }: { icon: React.ReactNode; value: string; color: string; glow: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded-md"
        style={{
          width: "20px", height: "20px",
          background: `${color}15`,
          border: `1px solid ${color}30`,
          boxShadow: `0 0 6px ${glow}`,
        }}
      >
        {icon}
      </div>
      <span className="font-mono text-xs font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>
        {value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TOP 3 PODIUM — Large display for ranks 1, 2, 3
// ═══════════════════════════════════════════════════════════════════════════════
function TopThreePodium({ traders }: { traders: LeaderboardUser[] }) {
  const top3 = traders.slice(0, 3);

  if (top3.length === 0) return null;

  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]  // silver, gold, bronze
    : top3.length === 2
    ? [null, top3[0], top3[1]]
    : [null, null, top3[0]];

  return (
    <div className="relative">
      {/* Section label */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60)` }} />
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 0L8.5 5H14L9.5 8L11 13L7 10L3 13L4.5 8L0 5H5.5Z" fill={GOLD} />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
            Top Traders
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 0L8.5 5H14L9.5 8L11 13L7 10L3 13L4.5 8L0 5H5.5Z" fill={GOLD} />
          </svg>
        </div>
        <div className="h-px w-12" style={{ background: `linear-gradient(90deg, ${GOLD}60, transparent)` }} />
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 px-4">
        {podiumOrder.map((trader, displayIdx) => {
          const actualRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
          const isEmpty = !trader;

          if (isEmpty) {
            return (
              <div key={actualRank} className="flex flex-col items-center" style={{ width: "140px", height: "200px" }}>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <span className="text-xs text-white/20">—</span>
                </div>
              </div>
            );
          }

          const name = trader.username ?? truncateAddress(trader.wallet_address);
          const c = RANK_COLORS[actualRank as 1 | 2 | 3];
          const isGold = actualRank === 1;
          const pnlPos = trader.best_pnl_percent >= 0;

          return (
            <motion.div
              key={trader.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: actualRank * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="leaderboard-top3-card flex flex-col items-center cursor-pointer"
              style={{ width: isGold ? "160px" : "140px" }}
            >
              {/* Crown */}
              <div className="mb-2 scale-75" style={{ transform: isGold ? "scale(1.1)" : "scale(0.85)", transformOrigin: "bottom center" }}>
                <RankCrownBadge rank={actualRank as 1 | 2 | 3} />
              </div>

              {/* Avatar */}
              <div className="relative mb-3">
                <AvatarFrame seed={trader.username ?? trader.wallet_address} rank={actualRank} size={isGold ? 72 : 60} />
                {/* Rank label below avatar */}
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap"
                  style={{
                    background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
                    color: actualRank === 1 ? "#1A1000" : "#0A0A10",
                    fontFamily: "var(--font-display)",
                    boxShadow: `0 0 10px ${c.glow}`,
                  }}
                >
                  {c.label}
                </div>
              </div>

              {/* Name banner */}
              <div className="w-full mb-3">
                <PlayerBanner name={name} rank={actualRank} totalWon={trader.total_arenas_won} />
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-1.5 w-full">
                <StatChip
                  icon={
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 0L6.2 3.5H10L7 5.8L8.2 9.5L5 7L1.8 9.5L3 5.8L0 3.5H3.8Z" fill={GOLD} />
                    </svg>
                  }
                  value={`${trader.total_arenas_won}W`}
                  color={GOLD}
                  glow="rgba(232,200,122,0.4)"
                />
                <StatChip
                  icon={
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 8L5 2L8 8H2Z" fill={pnlPos ? "#4ECBA3" : "#E85353"} />
                    </svg>
                  }
                  value={`${pnlPos ? "+" : ""}${trader.best_pnl_percent.toFixed(1)}%`}
                  color={pnlPos ? "#4ECBA3" : "#E85353"}
                  glow={pnlPos ? "rgba(78,203,163,0.4)" : "rgba(232,83,83,0.4)"}
                />
                {trader.current_win_streak > 0 && (
                  <StatChip
                    icon={
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 0L6 4L10 4L7 6.5L8 10L5 7.5L2 10L3 6.5L0 4L4 4Z" fill={CORAL} />
                      </svg>
                    }
                    value={`⚡${trader.current_win_streak}`}
                    color={CORAL}
                    glow="rgba(255,107,74,0.4)"
                  />
                )}
              </div>

              {/* Glow at bottom */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${c.primary}60, transparent)` }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Decorative divider below podium */}
      <div className="mt-8 mx-auto max-w-2xl">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${SKY}30)` }} />
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect x="4" y="0" width="4" height="4" transform="rotate(45 4 4)" fill={SKY} fillOpacity="0.5" />
          </svg>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]" style={{ fontFamily: "var(--font-display)" }}>
            Rankings
          </span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect x="4" y="0" width="4" height="4" transform="rotate(45 4 4)" fill={SKY} fillOpacity="0.5" />
          </svg>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${SKY}30, transparent)` }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LEADERBOARD ROW — Individual ranked trader row
// ═══════════════════════════════════════════════════════════════════════════════
function LeaderboardRow({ user, rank }: { user: LeaderboardUser; rank: number }) {
  const name = user.username ?? truncateAddress(user.wallet_address);
  const pnlPos = user.best_pnl_percent >= 0;

  return (
    <motion.div
      className="leaderboard-row group relative flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 cursor-pointer"
      style={{
        borderColor: "rgba(77,191,255,0.06)",
        background: "rgba(6,13,30,0.6)",
        backdropFilter: "blur(8px)",
      }}
      whileHover={{
        scale: 1.005,
        borderColor: "rgba(77,191,255,0.18)",
        background: "rgba(10,20,50,0.8)",
        boxShadow: `0 0 30px rgba(77,191,255,0.08), 0 4px 20px rgba(0,0,0,0.5)`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Left accent line on hover */}
      <div
        className="absolute left-0 top-3 bottom-3 w-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(180deg, transparent, ${SKY}, transparent)` }}
      />

      {/* Rank number */}
      <div className="w-8 flex-shrink-0 text-center">
        <span
          className="font-mono text-sm font-bold"
          style={{ color: rank <= 3 ? RANK_COLORS[rank as 1 | 2 | 3].primary : "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}
        >
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <AvatarFrame seed={user.username ?? user.wallet_address} rank={rank} size={44} />

      {/* Name and username */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>
            {name}
          </span>
          {user.current_win_streak >= 3 && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
              style={{
                background: `${CORAL}20`,
                border: `1px solid ${CORAL}40`,
                color: CORAL,
                fontFamily: "var(--font-display)",
                boxShadow: `0 0 6px rgba(255,107,74,0.3)`,
              }}
            >
              <span>⚡</span>{user.current_win_streak}x
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {user.total_arenas_entered} arenas
          </span>
          {user.total_rounds_survived > 0 && (
            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              · {user.total_rounds_survived} rounds
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Wins */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 0L6.2 3.5H10L7 5.8L8.2 9.5L5 7L1.8 9.5L3 5.8L0 3.5H3.8Z" fill={GOLD} fillOpacity={user.total_arenas_won > 0 ? 1 : 0.3} />
            </svg>
            <span
              className="font-mono text-sm font-bold"
              style={{
                color: user.total_arenas_won > 0 ? GOLD : "var(--color-text-tertiary)",
                fontFamily: "var(--font-mono)",
                textShadow: user.total_arenas_won > 0 ? `0 0 8px rgba(232,200,122,0.4)` : "none",
              }}
            >
              {user.total_arenas_won}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Wins</span>
        </div>

        {/* Best PnL */}
        <div className="text-right min-w-[72px]">
          <div
            className="font-mono text-sm font-bold"
            style={{
              color: pnlPos ? "#4ECBA3" : "#E85353",
              fontFamily: "var(--font-mono)",
              textShadow: pnlPos ? `0 0 8px rgba(78,203,163,0.4)` : `0 0 8px rgba(232,83,83,0.4)`,
            }}
          >
            {pnlPos ? "+" : ""}{user.best_pnl_percent.toFixed(1)}%
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Best PnL</span>
        </div>

        {/* Win Rate */}
        <div className="text-right min-w-[48px] hidden sm:block">
          <div className="font-mono text-sm font-semibold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
            {winRate(user.total_arenas_won, user.total_arenas_entered)}
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Rate</span>
        </div>

        {/* Streak */}
        <div className="text-right min-w-[40px] hidden md:block">
          <div style={{ color: user.current_win_streak > 0 ? CORAL : "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: "bold" }}>
            {user.current_win_streak > 0 ? `⚡${user.current_win_streak}` : "—"}
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Streak</span>
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 opacity-30 group-hover:opacity-80 transition-opacity flex-shrink-0" fill="none" stroke={SKY} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════════
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border animate-pulse"
          style={{ borderColor: "rgba(77,191,255,0.06)", background: "rgba(6,13,30,0.4)" }}>
          <div className="w-8 h-4 rounded bg-white/5" />
          <div className="w-11 h-11 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-white/5" />
            <div className="h-3 w-20 rounded bg-white/5" />
          </div>
          <div className="space-y-2 flex gap-4">
            <div className="h-4 w-8 rounded bg-white/5" />
            <div className="h-4 w-12 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-30">
          <path d="M40 8 L48 28 L70 28 L52 40 L58 62 L40 50 L22 62 L28 40 L10 28 L32 28 Z"
            stroke={SKY} strokeWidth="2" fill="none" />
        </svg>
        <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `radial-gradient(circle, rgba(77,191,255,0.1) 0%, transparent 70%)` }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
        No Traders Yet
      </h3>
      <p className="text-sm max-w-xs" style={{ color: "var(--color-text-tertiary)" }}>
        Complete your first arena battle to appear on the leaderboard
      </p>
      <Link
        href="/arenas"
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${SKY}, ${SKY2})`,
          color: "#030810",
          fontFamily: "var(--font-display)",
          boxShadow: `0 0 30px rgba(77,191,255,0.4)`,
        }}
      >
        Enter the Arena
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COSMIC BACKGROUND EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════
function CosmicBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Deep space gradient */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(77,191,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,107,74,0.04) 0%, transparent 50%), #030810" }} />

      {/* Animated top orb - sky blue */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(77,191,255,0.07) 0%, transparent 70%)", filter: "blur(40px)" }}
      />

      {/* Animated bottom-left orb - coral */}
      <motion.div
        animate={{ x: [0, -30, 25, 0], y: [0, 35, -15, 0], scale: [1, 0.95, 1.05, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-60 -left-60 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,107,74,0.04) 0%, transparent 70%)", filter: "blur(50px)" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(77,191,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(77,191,255,1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LeaderboardPage() {
  const { data, isLoading } = useQuery<{ data: LeaderboardUser[] }>({
    queryKey: ["global-leaderboard"],
    queryFn: () => fetch("/api/leaderboard").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const traders = useMemo(() => data?.data ?? [], [data]);

  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const currentUserRank = useMemo(() => {
    if (!walletAddress || traders.length === 0) return null;
    const idx = traders.findIndex((t) => t.wallet_address.toLowerCase() === walletAddress.toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }, [walletAddress, traders]);
  const currentUserEntry = useMemo(() => {
    if (!walletAddress || traders.length === 0) return null;
    return traders.find((t) => t.wallet_address.toLowerCase() === walletAddress.toLowerCase()) ?? null;
  }, [walletAddress, traders]);

  // anime.js entrance orchestration
  useEffect(() => {
    if (typeof window === "undefined" || isLoading || traders.length === 0) return;

    let anime: any = null;
    (async () => {
      anime = (await import("animejs")).default;

      // Set initial states
      anime.set(".leaderboard-header", { opacity: 0, translateY: -30 });
      anime.set(".leaderboard-podium", { opacity: 0, scale: 0.85, translateY: 20 });
      anime.set(".leaderboard-row", { opacity: 0, translateX: -20 });
      anime.set(".leaderboard-footer", { opacity: 0, translateY: 20 });

      // Header animation
      anime({
        targets: ".leaderboard-header",
        opacity: [0, 1],
        translateY: [-30, 0],
        duration: 900,
        easing: "easeOutExpo",
      });

      // Podium animation
      anime({
        targets: ".leaderboard-podium",
        opacity: [0, 1],
        scale: [0.85, 1],
        translateY: [20, 0],
        duration: 1000,
        delay: 300,
        easing: "easeOutExpo",
      });

      // Rows stagger animation
      anime({
        targets: ".leaderboard-row",
        opacity: [0, 1],
        translateX: [-20, 0],
        duration: 600,
        delay: anime.stagger(60, { start: 600 }),
        easing: "easeOutExpo",
      });

      // Footer animation
      anime({
        targets: ".leaderboard-footer",
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 700,
        delay: 800,
        easing: "easeOutExpo",
      });
    })();
  }, [isLoading, traders.length]);

  return (
    <div className="min-h-screen relative" style={{ background: "var(--color-bg-primary)" }}>
      <CosmicBackground />
      <StarFieldCanvas />

      <div className="relative z-10 pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">

          {/* ── HEADER ── */}
          <header className="leaderboard-header text-center mb-12">
            {/* Decorative top ornament */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${SKY}50)` }} />
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0L12 7H20L13.5 11.5L15.5 18.5L10 14L4.5 18.5L6.5 11.5L0 7H8L10 0Z" fill={SKY} fillOpacity="0.8" />
              </svg>
              <div className="h-px w-16" style={{ background: `linear-gradient(90deg, ${SKY}50, transparent)` }} />
            </div>

            {/* Category label */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4"
              style={{
                borderColor: `${SKY}30`,
                background: `${SKY}08`,
                boxShadow: `0 0 20px rgba(77,191,255,0.1)`,
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: SKY, boxShadow: `0 0 6px ${SKY}` }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: SKY, fontFamily: "var(--font-display)" }}>
                Global Rankings
              </span>
            </div>

            {/* Title */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {/* Left crown */}
              <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="opacity-60">
                <path d="M4 20L4 11L8 15L12 7L16 13L20 7L24 15L28 11L28 20Z" stroke={GOLD} strokeWidth="1.5" fill="none" />
                <circle cx="12" cy="7" r="1.5" fill={GOLD} fillOpacity="0.7" />
                <circle cx="16" cy="4" r="2" fill={GOLD} fillOpacity="0.9" />
                <circle cx="20" cy="7" r="1.5" fill={GOLD} fillOpacity="0.7" />
              </svg>

              <h1
                className="font-black tracking-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  background: `linear-gradient(135deg, ${GOLD}, ${SKY}, ${SKY2}, ${GOLD})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "none",
                  filter: `drop-shadow(0 0 30px rgba(77,191,255,0.3))`,
                }}
              >
                LEADERBOARD
              </h1>

              {/* Right crown */}
              <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="opacity-60">
                <path d="M4 20L4 11L8 15L12 7L16 13L20 7L24 15L28 11L28 20Z" stroke={GOLD} strokeWidth="1.5" fill="none" />
                <circle cx="12" cy="7" r="1.5" fill={GOLD} fillOpacity="0.7" />
                <circle cx="16" cy="4" r="2" fill={GOLD} fillOpacity="0.9" />
                <circle cx="20" cy="7" r="1.5" fill={GOLD} fillOpacity="0.7" />
              </svg>
            </div>

            {/* Subtitle */}
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
              Top traders across all Pacifica Colosseum battle royale arenas
            </p>

            {/* Live update indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${CORAL}40)` }} />
              <div className="flex items-center gap-1.5">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: CORAL, boxShadow: `0 0 6px ${CORAL}` }}
                />
                <span className="text-[9px] uppercase tracking-widest" style={{ color: CORAL, fontFamily: "var(--font-display)" }}>
                  Live Rankings
                </span>
              </div>
              <div className="h-px w-8" style={{ background: `linear-gradient(90deg, ${CORAL}40, transparent)` }} />
            </div>
          </header>

          {/* ── TOP 3 PODIUM ── */}
          {!isLoading && traders.length >= 3 && (
            <div className="leaderboard-podium mb-10">
              <TopThreePodium traders={traders} />
            </div>
          )}

          {/* ── MAIN LEADERBOARD LIST ── */}
          <div className="space-y-2">
            {isLoading ? (
              <LoadingSkeleton />
            ) : traders.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[2rem_44px_1fr_auto] sm:grid-cols-[2rem_44px_1fr_auto_auto_auto] gap-2 px-5 py-2">
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>#</span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Trader</span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Stats</span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-right" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Wins</span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-right hidden sm:block" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>PnL</span>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-right hidden md:block" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Rate</span>
                </div>

                {/* Rows (starting from rank 1) */}
                {traders.map((user, i) => (
                  <LeaderboardRow key={user.id} user={user} rank={i + 1} />
                ))}
              </>
            )}
          </div>

          {/* ── FOOTER INFO ── */}
          {!isLoading && traders.length > 0 && (
            <div className="leaderboard-footer mt-6 flex items-center justify-between text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: SKY }} />
                <span style={{ fontFamily: "var(--font-mono)" }}>{traders.length} traders ranked</span>
              </div>
              <div className="flex items-center gap-1" style={{ fontFamily: "var(--font-mono)" }}>
                <svg className="w-3 h-3 opacity-50" fill="none" stroke={SKY} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Updates every 30s
              </div>
            </div>
          )}

          {/* ── PERSONAL RANK FOOTER ── */}
          {walletAddress && currentUserEntry && currentUserRank && (
            <motion.div
              className="leaderboard-personal-rank mt-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Background panel */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${SKY}08, ${CORAL}06)`,
                  border: `1px solid rgba(77,191,255,0.2)`,
                  boxShadow: `0 0 40px rgba(77,191,255,0.1), inset 0 0 30px rgba(77,191,255,0.03)`,
                }}
              />

              {/* Top shimmer line */}
              <div className="absolute top-0 left-8 right-8 h-px" style={{ background: `linear-gradient(90deg, transparent, ${SKY}, transparent)` }} />

              {/* Inner glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 30% 50%, ${SKY}06 0%, transparent 70%)` }} />

              <div className="relative z-10 flex items-center gap-4 px-6 py-4">
                {/* Label */}
                <div className="flex-shrink-0">
                  <div
                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
                    style={{
                      background: `linear-gradient(135deg, ${SKY}, ${SKY2})`,
                      color: "#030810",
                      fontFamily: "var(--font-display)",
                      boxShadow: `0 0 20px rgba(77,191,255,0.4)`,
                    }}
                  >
                    YOU
                  </div>
                </div>

                {/* Rank */}
                <div className="flex-shrink-0 text-center">
                  <div className="font-black text-2xl leading-none" style={{ color: SKY, fontFamily: "var(--font-display)", textShadow: `0 0 20px rgba(77,191,255,0.5)` }}>
                    #{currentUserRank}
                  </div>
                  <div className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Rank</div>
                </div>

                {/* Divider */}
                <div className="w-px h-10 rounded-full flex-shrink-0" style={{ background: `${SKY}20` }} />

                {/* Avatar */}
                <AvatarFrame seed={currentUserEntry.username ?? currentUserEntry.wallet_address} rank={99} size={40} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "#FFFF00", fontFamily: "var(--font-sans)", textShadow: "0 0 12px rgba(255,255,0,0.3)" }}>
                    {currentUserEntry.username ?? truncateAddress(currentUserEntry.wallet_address)}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {currentUserEntry.total_arenas_entered} arenas entered
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <div className="font-mono text-sm font-bold" style={{ color: GOLD, fontFamily: "var(--font-mono)", textShadow: `0 0 8px rgba(232,200,122,0.4)` }}>
                      {currentUserEntry.total_arenas_won}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Wins</div>
                  </div>
                  <div className="text-center">
                    <div
                      className="font-mono text-sm font-bold"
                      style={{
                        color: currentUserEntry.best_pnl_percent >= 0 ? "#4ECBA3" : "#E85353",
                        fontFamily: "var(--font-mono)",
                        textShadow: currentUserEntry.best_pnl_percent >= 0 ? `0 0 8px rgba(78,203,163,0.4)` : `0 0 8px rgba(232,83,83,0.4)`,
                      }}
                    >
                      {currentUserEntry.best_pnl_percent >= 0 ? "+" : ""}{currentUserEntry.best_pnl_percent.toFixed(1)}%
                    </div>
                    <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Best</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-sm font-bold" style={{ color: currentUserEntry.current_win_streak > 0 ? CORAL : "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {currentUserEntry.current_win_streak > 0 ? `⚡${currentUserEntry.current_win_streak}` : "—"}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Streak</div>
                  </div>
                </div>

                {/* Right chevron */}
                <svg className="w-4 h-4 flex-shrink-0 opacity-50" fill="none" stroke={SKY} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>
          )}

          {/* ── CONNECT PROMPT for logged-out users ── */}
          {!walletAddress && !isLoading && traders.length > 0 && (
            <motion.div
              className="leaderboard-connect-prompt mt-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "rgba(6,13,30,0.8)",
                  border: "1px solid rgba(77,191,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}
              />
              <div className="absolute top-0 left-8 right-8 h-px" style={{ background: `linear-gradient(90deg, transparent, ${SKY}30, transparent)` }} />
              <div className="relative z-10 flex items-center justify-center gap-4 px-6 py-5">
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Connect your wallet to track your rank
                </span>
                <Link
                  href="/arenas"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${SKY}, ${SKY2})`,
                    color: "#030810",
                    fontFamily: "var(--font-display)",
                    boxShadow: `0 0 20px rgba(77,191,255,0.3)`,
                  }}
                >
                  Enter Arena
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── BOTTOM DECORATIVE ── */}
          <div className="flex items-center justify-center gap-3 mt-12">
            <div className="h-px flex-1 max-w-xs" style={{ background: `linear-gradient(90deg, transparent, ${SKY}20)` }} />
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full"
                  style={{ background: SKY, boxShadow: `0 0 6px ${SKY}` }}
                />
              ))}
            </div>
            <div className="h-px flex-1 max-w-xs" style={{ background: `linear-gradient(90deg, ${SKY}20, transparent)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

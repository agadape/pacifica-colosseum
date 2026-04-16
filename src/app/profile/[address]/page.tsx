"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserStats {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  total_arenas_entered: number;
  total_arenas_won: number;
  total_rounds_survived: number;
  total_eliminations: number;
  best_pnl_percent: number;
  win_streak: number;
  current_win_streak: number;
  created_at: string;
}

interface ArenaMatch {
  id: string;
  arena_name: string;
  preset: string;
  status: "completed" | "cancelled";
  rank: number;
  total_participants: number;
  final_pnl_percent: number;
  final_equity: number;
  eliminated_in_round: number | null;
  won: boolean;
  date: string;
  duration_minutes: number;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const SKY = "#4DBFFF";
const SKY2 = "#2A9FE8";
const CORAL = "#FF6B4A";
const GOLD = "#E8C87A";
const GOLD_DIM = "#C8A85A";
const SUCCESS = "#4ECBA3";
const DANGER = "#E85353";

const SKY_ALPHA = "rgba(77,191,255,0.08)";
const CORAL_ALPHA = "rgba(255,107,74,0.04)";
const SKY_GLOW = "rgba(77,191,255,0.5)";
const CORAL_GLOW = "rgba(255,107,74,0.5)";

const SKY_10 = "rgba(77,191,255,0.10)";
const SKY_12 = "rgba(77,191,255,0.12)";
const SKY_15 = "rgba(77,191,255,0.15)";
const SKY_40 = "rgba(77,191,255,0.40)";
const SKY_60 = "rgba(77,191,255,0.60)";
const SKY_06 = "rgba(77,191,255,0.06)";
const CORAL_15 = "rgba(255,107,74,0.15)";
const CORAL_40 = "rgba(255,107,74,0.40)";
const CORAL_08 = "rgba(255,107,74,0.08)";
const CORAL_35 = "rgba(255,107,74,0.35)";
const SUCCESS_15 = "rgba(78,203,163,0.15)";
const SUCCESS_40 = "rgba(78,203,163,0.40)";
const DANGER_15 = "rgba(232,83,83,0.15)";
const DANGER_40 = "rgba(232,83,83,0.40)";

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Tier System ────────────────────────────────────────────────────────────────
type TierKey = "bronze" | "silver" | "gold" | "epic" | "legend" | "mythic" | "champion";

const TIER_CONFIG: Record<TierKey, { label: string; minWins: number; primary: string; secondary: string; glow: string; bg: string; border: string; stars: number; badge: string }> = {
  bronze: {
    label: "Bronze", minWins: 0, primary: "#CD7F32", secondary: "#E8A050", glow: "rgba(205,127,50,0.4)", bg: "rgba(205,127,50,0.06)", border: "rgba(205,127,50,0.3)", stars: 1, badge: "★",
  },
  silver: {
    label: "Silver", minWins: 3, primary: "#C0C0C0", secondary: "#E8E8E8", glow: "rgba(192,192,192,0.4)", bg: "rgba(192,192,192,0.06)", border: "rgba(192,192,192,0.3)", stars: 2, badge: "★★",
  },
  gold: {
    label: "Gold", minWins: 7, primary: "#FFD700", secondary: "#FFF0A0", glow: "rgba(255,215,0,0.4)", bg: "rgba(255,215,0,0.06)", border: "rgba(255,215,0,0.3)", stars: 3, badge: "★★★",
  },
  epic: {
    label: "Epic", minWins: 12, primary: "#9D50BB", secondary: "#C88AFF", glow: "rgba(157,80,187,0.4)", bg: "rgba(157,80,187,0.06)", border: "rgba(157,80,187,0.3)", stars: 4, badge: "★★★★",
  },
  legend: {
    label: "Legend", minWins: 20, primary: "#FF6B4A", secondary: "#FF9A7A", glow: "rgba(255,107,74,0.4)", bg: "rgba(255,107,74,0.06)", border: "rgba(255,107,74,0.3)", stars: 5, badge: "★★★★★",
  },
  mythic: {
    label: "Mythic", minWins: 30, primary: "#4DBFFF", secondary: "#A8DEFF", glow: "rgba(77,191,255,0.4)", bg: "rgba(77,191,255,0.06)", border: "rgba(77,191,255,0.3)", stars: 6, badge: "✧✧✧✧✧✧",
  },
  champion: {
    label: "Champion", minWins: 50, primary: "#FFD700", secondary: "#FFFFFF", glow: "rgba(255,215,0,0.6)", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.5)", stars: 7, badge: "♛♛♛♛♛♛♛",
  },
};

function getTier(wins: number): TierKey {
  const tiers: TierKey[] = ["bronze", "silver", "gold", "epic", "legend", "mythic", "champion"];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (wins >= TIER_CONFIG[tiers[i]].minWins) return tiers[i];
  }
  return "bronze";
}

function getNextTier(current: TierKey): { key: TierKey; winsNeeded: number } | null {
  const tiers: TierKey[] = ["bronze", "silver", "gold", "epic", "legend", "mythic", "champion"];
  const idx = tiers.indexOf(current);
  if (idx === tiers.length - 1) return null;
  const next = tiers[idx + 1];
  return { key: next, winsNeeded: TIER_CONFIG[next].minWins };
}

// ── Avatar helper ───────────────────────────────────────────────────────────────
function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed.replace(/\s/g, ""))}`;
}

// ── Mock Match History ─────────────────────────────────────────────────────────
const MOCK_MATCHES: ArenaMatch[] = [
  { id: "m1", arena_name: "Pacific Arena — Sprint #42", preset: "sprint", status: "completed", rank: 1, total_participants: 24, final_pnl_percent: 124.7, final_equity: 2247, eliminated_in_round: null, won: true, date: "2026-04-12", duration_minutes: 18 },
  { id: "m2", arena_name: "Pacific Arena — Daily #88", preset: "daily", status: "completed", rank: 3, total_participants: 16, final_pnl_percent: 87.3, final_equity: 1873, eliminated_in_round: null, won: false, date: "2026-04-10", duration_minutes: 32 },
  { id: "m3", arena_name: "Pacific Arena — Weekly #15", preset: "weekly", status: "completed", rank: 8, total_participants: 48, final_pnl_percent: 43.2, final_equity: 1432, eliminated_in_round: 3, won: false, date: "2026-04-07", duration_minutes: 55 },
  { id: "m4", arena_name: "Pacific Arena — Blitz #101", preset: "blitz", status: "completed", rank: 2, total_participants: 12, final_pnl_percent: 198.5, final_equity: 2985, eliminated_in_round: null, won: false, date: "2026-04-05", duration_minutes: 9 },
  { id: "m5", arena_name: "Pacific Arena — Sprint #39", preset: "sprint", status: "completed", rank: 5, total_participants: 20, final_pnl_percent: 61.8, final_equity: 1618, eliminated_in_round: null, won: false, date: "2026-04-03", duration_minutes: 22 },
  { id: "m6", arena_name: "Pacific Arena — Daily #82", preset: "daily", status: "completed", rank: 1, total_participants: 16, final_pnl_percent: 156.4, final_equity: 2564, eliminated_in_round: null, won: true, date: "2026-04-01", duration_minutes: 14 },
  { id: "m7", arena_name: "Pacific Arena — Weekly #13", preset: "weekly", status: "completed", rank: 12, total_participants: 40, final_pnl_percent: 28.9, final_equity: 1289, eliminated_in_round: 4, won: false, date: "2026-03-28", duration_minutes: 61 },
  { id: "m8", arena_name: "Pacific Arena — Sprint #36", preset: "sprint", status: "completed", rank: 1, total_participants: 24, final_pnl_percent: 312.1, final_equity: 4121, eliminated_in_round: null, won: true, date: "2026-03-25", duration_minutes: 26 },
];

// ── Mock Achievements ──────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: "a1", name: "First Blood", description: "Win your first arena", icon: "⚔", rarity: "common", earned: true, earnedDate: "2026-03-25" },
  { id: "a2", name: "Flawless Victory", description: "Win with 300%+ PnL", icon: "👑", rarity: "legendary", earned: true, earnedDate: "2026-03-25" },
  { id: "a3", name: "Survivor", description: "Reach final round 5 times", icon: "🛡", rarity: "rare", earned: true, earnedDate: "2026-04-01" },
  { id: "a4", name: "Streak Master", description: "Win 10 in a row", icon: "⚡", rarity: "epic", earned: true, earnedDate: "2026-04-06" },
  { id: "a5", name: "High Roller", description: "Enter 50 arenas", icon: "🎰", rarity: "rare", earned: false, earnedDate: null },
  { id: "a6", name: "Comeback Kid", description: "Win after being in bottom 3", icon: "↩", rarity: "epic", earned: true, earnedDate: "2026-04-10" },
  { id: "a7", name: "Sharpshooter", description: "100 trades without a losing position", icon: "🎯", rarity: "legendary", earned: false, earnedDate: null },
  { id: "a8", name: "Colosseum Legend", description: "Win 50 arenas", icon: "🏆", rarity: "mythic", earned: false, earnedDate: null },
];

const RARITY_COLORS: Record<string, { primary: string; glow: string; border: string }> = {
  common: { primary: "#9A9688", glow: "rgba(154,150,136,0.3)", border: "rgba(154,150,136,0.3)" },
  rare: { primary: "#4DBFFF", glow: "rgba(77,191,255,0.4)", border: "rgba(77,191,255,0.35)" },
  epic: { primary: "#9D50BB", glow: "rgba(157,80,187,0.4)", border: "rgba(157,80,187,0.35)" },
  legendary: { primary: "#FFD700", glow: "rgba(255,215,0,0.5)", border: "rgba(255,215,0,0.4)" },
  mythic: { primary: "#FF6B4A", glow: "rgba(255,107,74,0.5)", border: "rgba(255,107,74,0.4)" },
};

// ── Star Field Canvas ──────────────────────────────────────────────────────────
function StarFieldCanvas({ colorCount = 3 }: { colorCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const stars: Array<{ x: number; y: number; size: number; opacity: number; twinkle: number; twinkleSpeed: number; color: string }> = [];
    function resize() { if (!canvas) return; canvas.width = window.innerWidth; canvas.height = 600; }
    function init() {
      resize();
      stars.length = 0;
      const count = Math.floor(250);
      const colors = ["228,240,255", "77,191,255", "255,107,74", "232,200,122", "165,231,242"];
      for (let i = 0; i < count; i++) {
        stars.push({ x: Math.random() * canvas!.width, y: Math.random() * canvas!.height, size: Math.random() * 1.5 + 0.2, opacity: Math.random() * 0.2 + 0.03, twinkle: Math.random() * Math.PI * 2, twinkleSpeed: Math.random() * 0.02 + 0.004, color: colors[Math.floor(Math.random() * colors.length)] });
      }
    }
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.twinkle += s.twinkleSpeed;
        const a = s.opacity * (0.4 + 0.6 * Math.sin(s.twinkle));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color},${a})`; ctx.shadowBlur = s.size * 4; ctx.shadowColor = `rgba(${s.color},${a * 0.5})`; ctx.fill();
        ctx.shadowBlur = 0;
      }
      animId = requestAnimationFrame(draw);
    }
    init(); draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 pointer-events-none" style={{ mixBlendMode: "screen", maskImage: "linear-gradient(180deg, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)" }} />;
}

// ── Rank Badge SVG ─────────────────────────────────────────────────────────────
function TierBadgeLarge({ tier }: { tier: TierKey }) {
  const c = TIER_CONFIG[tier];
  return (
    <div className="relative flex flex-col items-center">
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" className="drop-shadow-xl">
        <defs>
          <linearGradient id={`badgeGrad${tier}`} x1="0" y1="0" x2="120" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.primary} stopOpacity="1" />
            <stop offset="60%" stopColor={c.secondary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={c.primary} stopOpacity="0.5" />
          </linearGradient>
          <filter id={`badgeGlow${tier}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Outer hexagon */}
        <path d="M60 5 L105 27 L105 73 L60 95 L15 73 L15 27 Z" fill={`url(#badgeGrad${tier})`} fillOpacity="0.12" stroke={`url(#badgeGrad${tier})`} strokeWidth="2" filter={`url(#badgeGlow${tier})`} />
        {/* Inner hexagon */}
        <path d="M60 15 L95 33 L95 67 L60 85 L25 67 L25 33 Z" fill={c.primary} fillOpacity="0.08" stroke={c.primary} strokeWidth="1" strokeOpacity="0.4" />
        {/* Badge icon */}
        <path d="M60 30 L70 45 L88 48 L74 61 L77 78 L60 70 L43 78 L46 61 L32 48 L50 45 Z" fill={`url(#badgeGrad${tier})`} fillOpacity="0.9" stroke={c.secondary} strokeWidth="0.5" />
        {/* Stars below */}
        {Array.from({ length: Math.min(c.stars, 5) }).map((_, i) => (
          <path key={i} d="M${38 + i * 11} 82 L${40 + i * 11} 86 L${38 + i * 11} 85 L${39 + i * 11} 88 L${37 + i * 11} 86 L${35 + i * 11} 87 L${36 + i * 11} 85 Z" fill={c.primary} fillOpacity="0.8" />
        ))}
        {/* Top gem */}
        <circle cx="60" cy="20" r="4" fill={c.primary} stroke={c.secondary} strokeWidth="0.5" />
        <circle cx="60" cy="20" r="2" fill="white" fillOpacity="0.5" />
      </svg>
      {/* Label below */}
      <div className="mt-2 px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest" style={{ background: c.bg, borderColor: c.border, color: c.primary, fontFamily: "var(--font-display)", boxShadow: "0 0 20px " + c.glow, textShadow: "0 0 10px " + c.glow }}>
        {c.label}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, glow, accent }: { icon: React.ReactNode; label: string; value: string; color: string; glow: string; accent?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative overflow-hidden rounded-2xl border p-4 cursor-default"
      style={{ background: "rgba(6,13,30,0.8)", borderColor: accent ? hexToRgba(color, 0.40) : "rgba(77,191,255,0.06)", boxShadow: accent ? "0 0 30px " + glow + ", inset 0 0 20px " + glow : "0 4px 20px rgba(0,0,0,0.5)" }}
    >
      {accent && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 30%, " + hexToRgba(color, 0.08) + " 0%, transparent 60%)" }} />}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15), border: "1px solid " + hexToRgba(color, 0.30), boxShadow: "0 0 12px " + glow }}>
          {icon}
        </div>
      </div>
      <div className="font-mono text-xl font-bold" style={{ color, textShadow: "0 0 16px " + glow, fontFamily: "var(--font-mono)" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>{label}</div>
    </motion.div>
  );
}

// ── Match History Card ─────────────────────────────────────────────────────────
function MatchCard({ match }: { match: ArenaMatch }) {
  const presetColors: Record<string, { color: string; bg: string; border: string }> = {
    sprint: { color: "#5DD9A8", bg: "rgba(93,217,168,0.08)", border: "rgba(93,217,168,0.25)" },
    daily: { color: "#4DBFFF", bg: "rgba(77,191,255,0.08)", border: "rgba(77,191,255,0.25)" },
    weekly: { color: "#E8A836", bg: "rgba(232,168,54,0.08)", border: "rgba(232,168,54,0.25)" },
    blitz: { color: "#E85353", bg: "rgba(232,83,83,0.08)", border: "rgba(232,83,83,0.25)" },
  };
  const pc = presetColors[match.preset] ?? presetColors.sprint;
  return (
    <motion.div whileHover={{ x: 4, borderColor: `${hexToRgba(pc.color, 0.40)}` }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border" style={{ background: "rgba(6,13,30,0.6)", borderColor: "rgba(77,191,255,0.06)", backdropFilter: "blur(8px)" }}>
      {/* Win/Loss indicator */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs" style={{ background: match.won ? SUCCESS_15 : DANGER_15, border: "1px solid " + (match.won ? SUCCESS_40 : DANGER_40), color: match.won ? SUCCESS : DANGER, fontFamily: "var(--font-display)", boxShadow: "0 0 16px " + (match.won ? "rgba(78,203,163,0.2)" : "rgba(232,83,83,0.2)") }}>
        {match.won ? "WIN" : "LOSS"}
      </div>
      {/* Arena info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{match.arena_name}</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: pc.bg, border: "1px solid " + pc.border, color: pc.color, fontFamily: "var(--font-display)" }}>{match.preset}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span>{new Date(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span>·</span>
          <span>{match.duration_minutes}m</span>
          <span>·</span>
          <span>Rank #{match.rank}/{match.total_participants}</span>
        </div>
      </div>
      {/* PnL */}
      <div className="text-right flex-shrink-0">
        <div className="font-mono text-base font-bold" style={{ color: match.final_pnl_percent >= 0 ? SUCCESS : DANGER, textShadow: "0 0 10px " + (match.final_pnl_percent >= 0 ? "rgba(78,203,163,0.4)" : "rgba(232,83,83,0.4)"), fontFamily: "var(--font-mono)" }}>
          {match.final_pnl_percent >= 0 ? "+" : ""}{match.final_pnl_percent.toFixed(1)}%
        </div>
        <div className="font-mono text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>${match.final_equity.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}

// ── Achievement Badge ─────────────────────────────────────────────────────────
function AchievementBadge({ achievement }: { achievement: typeof ACHIEVEMENTS[0] }) {
  const r = RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common;
  return (
    <motion.div whileHover={{ scale: 1.05, y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-default"
      style={{ background: achievement.earned ? hexToRgba(r.primary, 0.08) : "rgba(6,13,30,0.4)", borderColor: achievement.earned ? hexToRgba(r.primary, 0.35) : "rgba(77,191,255,0.06)", opacity: achievement.earned ? 1 : 0.45 }}>
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: achievement.earned ? hexToRgba(r.primary, 0.15) : "rgba(77,191,255,0.05)", border: "2px solid " + (achievement.earned ? hexToRgba(r.primary, 0.25) : "rgba(77,191,255,0.1)"), boxShadow: achievement.earned ? "0 0 24px " + r.glow + ", inset 0 0 12px " + r.glow : "none" }}>
        {achievement.earned ? achievement.icon : "?"}
      </div>
      {/* Name */}
      <span className="text-[11px] font-bold text-center leading-tight" style={{ color: achievement.earned ? r.primary : "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>{achievement.earned ? achievement.name : "???"}</span>
      {/* Rarity */}
      <span className="text-[8px] uppercase tracking-widest" style={{ color: achievement.earned ? r.primary : "var(--color-text-tertiary)", opacity: 0.7, fontFamily: "var(--font-display)" }}>{achievement.rarity}</span>
      {!achievement.earned && <div className="absolute inset-0 rounded-2xl" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(77,191,255,0.02) 4px, rgba(77,191,255,0.02) 8px)" }} />}
    </motion.div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function TierProgressBar({ wins }: { wins: number }) {
  const tier = getTier(wins);
  const next = getNextTier(tier);
  const currentTier = TIER_CONFIG[tier];
  const prevTierWins = tier === "bronze" ? 0 : TIER_CONFIG[tier as TierKey]?.minWins ?? 0;
  const tierRange = next ? next.winsNeeded - prevTierWins : 1;
  const progress = next ? Math.min(((wins - prevTierWins) / tierRange) * 100, 100) : 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px]">
        <span style={{ color: currentTier.primary, fontFamily: "var(--font-display)", fontWeight: 700 }}>{currentTier.label}</span>
        {next && <span style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>{next.winsNeeded - wins} wins to {TIER_CONFIG[next.key].label}</span>}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(77,191,255,0.08)", border: "1px solid rgba(77,191,255,0.1)" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full" style={{ background: "linear-gradient(90deg, " + currentTier.primary + ", " + currentTier.secondary + ")", boxShadow: "0 0 12px " + currentTier.glow }} />
      </div>
    </div>
  );
}

// ── Main Profile Page ──────────────────────────────────────────────────────────
type Tab = "overview" | "history" | "achievements";

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { user: privyUser } = usePrivy();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const isOwnProfile = privyUser?.wallet?.address?.toLowerCase() === address.toLowerCase();

  // In demo mode, use mock data
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  // Mock profile data for demo
  const mockUser: UserStats = useMemo(() => ({
    id: "demo-user",
    wallet_address: address,
    username: isOwnProfile ? "SatoshiBlade" : "NeonPhantom",
    avatar_url: null,
    total_arenas_entered: 28,
    total_arenas_won: 14,
    total_rounds_survived: 112,
    total_eliminations: 14,
    best_pnl_percent: 847.3,
    win_streak: 14,
    current_win_streak: 8,
    created_at: "2024-08-15T10:00:00Z",
  }), [address, isOwnProfile]);

  const user = isDemoMode || !privyUser ? mockUser : ({} as UserStats);
  const tier = getTier(user.total_arenas_won ?? 0);
  const tc = TIER_CONFIG[tier];
  const winRate = user.total_arenas_entered > 0 ? ((user.total_arenas_won / user.total_arenas_entered) * 100) : 0;

  // anime.js entrance
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      const anime = (await import("animejs")).default;
      anime.set(".profile-hero", { opacity: 0, scale: 0.9, y: -20 });
      anime.set(".profile-stat", { opacity: 0, translateY: 20 });
      anime.set(".profile-tab", { opacity: 0, translateY: 10 });
      anime.set(".profile-match", { opacity: 0, translateX: -15 });
      anime.set(".profile-achievement", { opacity: 0, scale: 0.8 });
      anime({ targets: ".profile-hero", opacity: [0, 1], scale: [0.9, 1], y: [-20, 0], duration: 1000, easing: "easeOutExpo" });
      anime({ targets: ".profile-stat", opacity: [0, 1], translateY: [20, 0], delay: anime.stagger(80, { start: 400 }), duration: 600, easing: "easeOutExpo" });
      anime({ targets: ".profile-tab", opacity: [0, 1], translateY: [10, 0], delay: anime.stagger(60, { start: 800 }), duration: 500, easing: "easeOutExpo" });
    })();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "history", label: "Battle History" },
    { key: "achievements", label: "Achievements" },
  ];

  return (
    <div className="min-h-screen relative" style={{ background: "var(--color-bg-primary)" }}>
      {/* Background */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, #4DBFFF 8%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, #FF6B4A 4%, transparent 50%), #030810" }} />
        <motion.div animate={{ x: [0, 20, -15, 0], y: [0, -30, 15, 0], scale: [1, 1.05, 0.98, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full" style={{ background: SKY_ALPHA, filter: "blur(40px)" }} />
        <motion.div animate={{ x: [0, -20, 15, 0], y: [0, 25, -10, 0], scale: [1, 0.95, 1.05, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-20 w-[600px] h-[600px] rounded-full" style={{ background: CORAL_ALPHA, filter: "blur(50px)" }} />
      </div>
      <StarFieldCanvas />

      <div className="relative z-10 pt-20 pb-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* ── HERO SECTION ── */}
          <section className="profile-hero relative mb-10">
            {/* Card */}
            <div className="relative rounded-3xl overflow-hidden" style={{ background: "rgba(6,13,30,0.85)", border: "1px solid rgba(77,191,255,0.15)", boxShadow: "0 0 60px rgba(77,191,255,0.08), 0 20px 60px rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}>
              {/* Top shimmer */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(77,191,255,0.60), transparent)" }} />
              {/* Left accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(180deg, rgba(77,191,255,0.8), transparent)" }} />
              {/* Background glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(77,191,255,0.06), transparent 70%)" }} />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 px-8 py-8">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                    <div className="relative w-28 h-28 rounded-full" style={{ border: "3px solid " + tc.primary, boxShadow: "0 0 40px " + tc.glow + ", 0 0 80px " + tc.glow }}>
                      <div className="absolute inset-0 rounded-full" style={{ border: "1px solid " + hexToRgba(tc.primary, 0.25) }} />
                      <img src={getAvatarUrl(address)} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover" />
                    </div>
                    {/* Rank badge overlay */}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs" style={{ background: "linear-gradient(135deg, " + tc.primary + ", " + tc.secondary + ")", color: tier === "mythic" || tier === "champion" ? "#030810" : "#0A0A10", fontFamily: "var(--font-display)", boxShadow: "0 0 16px " + tc.glow, border: "2px solid #030810" }}>
                      {user.total_arenas_won > 0 ? "#" : "—"}
                    </div>
                  </motion.div>
                </div>

                {/* User info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                    <h1 className="font-black text-3xl tracking-tight" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)", textShadow: "0 0 30px " + tc.glow }}>
                      {user.username ?? `${address.slice(0, 6)}…${address.slice(-4)}`}
                    </h1>
                    {isOwnProfile && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border" style={{ background: SKY_10, borderColor: SKY_40, color: SKY, fontFamily: "var(--font-display)" }}>
                        You
                      </span>
                    )}
                  </div>

                  {/* Wallet */}
                  <div className="font-mono text-xs mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                    {address.slice(0, 12)}…{address.slice(-8)}
                  </div>

                  {/* Tier + progress */}
                  <div className="max-w-md">
                    <TierProgressBar wins={user.total_arenas_won ?? 0} />
                  </div>
                </div>

                {/* Tier Badge */}
                <div className="flex-shrink-0">
                  <TierBadgeLarge tier={tier} />
                </div>
              </div>
            </div>
          </section>

          {/* ── STATS GRID ── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L10 5.5H15L11 8.5L12.5 13L8 10.5L3.5 13L5 8.5L1 5.5H6Z" fill="#FFD700" /></svg>} label="Arenas Won" value={String(user.total_arenas_won ?? 0)} color="#FFD700" glow="rgba(255,215,0,0.4)" accent />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 12L8 4L13 12H3Z" fill="#4DBFFF" /></svg>} label="Arenas Played" value={String(user.total_arenas_entered ?? 0)} color="#4DBFFF" glow="rgba(77,191,255,0.4)" />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6.5H14L10.5 9.5L12 14L8 11L4 14L5.5 9.5L2 6.5H6.5Z" fill="#FF6B4A" /></svg>} label="Best PnL" value={`${(user.best_pnl_percent ?? 0) >= 0 ? "+" : ""}${(user.best_pnl_percent ?? 0).toFixed(1)}%`} color="#FF6B4A" glow="rgba(255,107,74,0.4)" accent />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10L8 4L14 10" stroke="#4ECBA3" strokeWidth="2" strokeLinecap="round"/><path d="M2 13L8 7L14 13" stroke="#4ECBA3" strokeWidth="2" strokeLinecap="round" opacity="0.5"/></svg>} label="Win Rate" value={`${winRate.toFixed(0)}%`} color="#4ECBA3" glow="rgba(78,203,163,0.4)" />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6H14L11 9L12.5 13L8 10.5L3.5 13L5 9L2 6H6Z" fill="#FF6B4A" /></svg>} label="Current Streak" value={user.current_win_streak > 0 ? `⚡${user.current_win_streak}` : "—"} color="#FF6B4A" glow="rgba(255,107,74,0.4)" accent />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L8 4L14 12" stroke="#9D50BB" strokeWidth="2" strokeLinecap="round"/></svg>} label="Best Streak" value={`⚡${user.win_streak ?? 0}`} color="#9D50BB" glow="rgba(157,80,187,0.4)" />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#4DBFFF" strokeWidth="1.5"/><path d="M8 4V8L11 10" stroke="#4DBFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>} label="Rounds Survived" value={String(user.total_rounds_survived ?? 0)} color="#4DBFFF" glow="rgba(77,191,255,0.4)" />
            </div>
            <div className="profile-stat">
              <StatCard icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z" fill="#E85353" /></svg>} label="Eliminations" value={String(user.total_eliminations ?? 0)} color="#E85353" glow="rgba(232,83,83,0.4)" />
            </div>
          </section>

          {/* ── TABS ── */}
          <section className="mb-6">
            <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: "rgba(6,13,30,0.8)", border: "1px solid rgba(77,191,255,0.08)", backdropFilter: "blur(8px)" }}>
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="profile-tab flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200"
                  style={{ fontFamily: "var(--font-display)", background: activeTab === tab.key ? SKY_12 : "transparent", color: activeTab === tab.key ? SKY : "var(--color-text-tertiary)", boxShadow: activeTab === tab.key ? `0 0 20px rgba(77,191,255,0.15)` : "none" }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── TAB CONTENT ── */}
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {/* Win Rate + Rank summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Win Rate Donut */}
                  <div className="rounded-2xl border p-6" style={{ background: "rgba(6,13,30,0.8)", borderColor: SKY_10 }}>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>Win Rate</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(77,191,255,0.08)" strokeWidth="8" />
                          <motion.circle cx="50" cy="50" r="40" fill="none" stroke={winRate > 50 ? SUCCESS : winRate > 25 ? SKY : CORAL} strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 40}`} initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - winRate / 100) }}
                            transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-black text-xl" style={{ color: winRate > 50 ? SUCCESS : winRate > 25 ? SKY : CORAL, fontFamily: "var(--font-display)" }}>{winRate.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: "var(--color-text-tertiary)" }}>Wins</span>
                          <span className="font-bold" style={{ color: SUCCESS, fontFamily: "var(--font-mono)" }}>{user.total_arenas_won}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: "var(--color-text-tertiary)" }}>Losses</span>
                          <span className="font-bold" style={{ color: DANGER, fontFamily: "var(--font-mono)" }}>{(user.total_arenas_entered ?? 0) - (user.total_arenas_won ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: "var(--color-text-tertiary)" }}>Total</span>
                          <span className="font-bold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{user.total_arenas_entered}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier Summary */}
                  <div className="rounded-2xl border p-6" style={{ background: "rgba(6,13,30,0.8)", borderColor: tc.border }}>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>Current Tier</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: tc.bg, border: "2px solid " + tc.border, boxShadow: "0 0 24px " + tc.glow }}>
                        {tc.stars >= 5 ? "♛" : tc.stars >= 3 ? "★★★".slice(0, Math.min(tc.stars, 3)) : "★"}
                      </div>
                      <div>
                        <div className="font-black text-xl" style={{ color: tc.primary, fontFamily: "var(--font-display)", textShadow: "0 0 16px " + tc.glow }}>{tc.label}</div>
                        <div className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>{tc.stars} Star{tc.stars !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(["bronze", "silver", "gold", "epic", "legend", "mythic", "champion"] as TierKey[]).map((t) => {
                        const tc2 = TIER_CONFIG[t];
                        const reached = (user.total_arenas_won ?? 0) >= tc2.minWins;
                        return (
                          <div key={t} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: reached ? tc2.primary : "rgba(77,191,255,0.1)" }} />
                            <span className="text-[11px] flex-1" style={{ color: reached ? tc2.primary : "var(--color-text-tertiary)" }}>{tc2.label}</span>
                            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>{tc2.minWins}+ wins</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
                    Recent Battles
                  </h3>
                  <span className="text-[10px] px-3 py-1 rounded-full border" style={{ color: "var(--color-text-tertiary)", borderColor: "rgba(77,191,255,0.1)", fontFamily: "var(--font-display)" }}>
                    {MOCK_MATCHES.length} matches
                  </span>
                </div>
                {MOCK_MATCHES.map((match, i) => (
                  <motion.div key={match.id} initial={{ opacity: 0, translateX: -15 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                    <MatchCard match={match} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === "achievements" && (
              <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
                    Achievements
                  </h3>
                  <span className="text-[10px] px-3 py-1 rounded-full border" style={{ color: "var(--color-text-tertiary)", borderColor: "rgba(77,191,255,0.1)", fontFamily: "var(--font-display)" }}>
                    {ACHIEVEMENTS.filter((a) => a.earned).length}/{ACHIEVEMENTS.length} earned
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ACHIEVEMENTS.map((achievement, i) => (
                    <motion.div key={achievement.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                      <AchievementBadge achievement={achievement} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-center gap-2 mt-12">
            <div className="h-px flex-1 max-w-xs" style={{ background: "linear-gradient(90deg, transparent, rgba(77,191,255,0.20))" }} />
            <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Pacifica Colosseum</span>
            <div className="h-px flex-1 max-w-xs" style={{ background: "linear-gradient(90deg, rgba(77,191,255,0.20), transparent)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

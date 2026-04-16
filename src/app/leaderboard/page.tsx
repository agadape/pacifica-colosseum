"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import Link from "next/link";

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

// ── Mock Data — rich demo traders matching LeaderboardUser interface ───────────
const MOCK_LEADERBOARD: LeaderboardUser[] = [
  {
    id: "mock-001",
    wallet_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    username: "SatoshiBlade",
    avatar_url: null,
    total_arenas_entered: 28,
    total_arenas_won: 14,
    best_pnl_percent: 847.3,
    win_streak: 14,
    current_win_streak: 8,
    total_rounds_survived: 112,
    total_eliminations: 14,
    created_at: "2024-08-15T10:00:00Z",
  },
  {
    id: "mock-002",
    wallet_address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    username: "NeonPhantom",
    avatar_url: null,
    total_arenas_entered: 35,
    total_arenas_won: 11,
    best_pnl_percent: 623.8,
    win_streak: 11,
    current_win_streak: 3,
    total_rounds_survived: 89,
    total_eliminations: 24,
    created_at: "2024-09-02T14:30:00Z",
  },
  {
    id: "mock-003",
    wallet_address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
    username: "CryptoValkyrie",
    avatar_url: null,
    total_arenas_entered: 19,
    total_arenas_won: 9,
    best_pnl_percent: 512.1,
    win_streak: 9,
    current_win_streak: 9,
    total_rounds_survived: 67,
    total_eliminations: 10,
    created_at: "2024-10-11T08:15:00Z",
  },
  {
    id: "mock-004",
    wallet_address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    username: "ZeroTierOne",
    avatar_url: null,
    total_arenas_entered: 42,
    total_arenas_won: 7,
    best_pnl_percent: 489.6,
    win_streak: 7,
    current_win_streak: 2,
    total_rounds_survived: 95,
    total_eliminations: 35,
    created_at: "2024-07-20T16:45:00Z",
  },
  {
    id: "mock-005",
    wallet_address: "0xBcd4042DE499D14e55001C6B3bb2351116B5f9c4",
    username: "OmegaHarbinger",
    avatar_url: null,
    total_arenas_entered: 51,
    total_arenas_won: 6,
    best_pnl_percent: 398.2,
    win_streak: 6,
    current_win_streak: 0,
    total_rounds_survived: 108,
    total_eliminations: 45,
    created_at: "2024-06-08T12:00:00Z",
  },
  {
    id: "mock-006",
    wallet_address: "0x71C7656EC7ab88b098defB751B7401B5f6d89770",
    username: "KaijuCapital",
    avatar_url: null,
    total_arenas_entered: 15,
    total_arenas_won: 5,
    best_pnl_percent: 334.7,
    win_streak: 5,
    current_win_streak: 5,
    total_rounds_survived: 43,
    total_eliminations: 10,
    created_at: "2024-11-01T09:30:00Z",
  },
  {
    id: "mock-007",
    wallet_address: "0x2B5aD5EbC54b12485C8608490a5C3B9dE80A3f8C",
    username: "ArcaneTrade",
    avatar_url: null,
    total_arenas_entered: 23,
    total_arenas_won: 4,
    best_pnl_percent: 276.9,
    win_streak: 4,
    current_win_streak: 0,
    total_rounds_survived: 58,
    total_eliminations: 19,
    created_at: "2024-08-30T18:20:00Z",
  },
  {
    id: "mock-008",
    wallet_address: "0x3dA5aF9b2F5e3e7B6C8D1E4F9A2B3C5D7E9F1A3",
    username: "QuantumHedge",
    avatar_url: null,
    total_arenas_entered: 38,
    total_arenas_won: 4,
    best_pnl_percent: 241.5,
    win_streak: 4,
    current_win_streak: 4,
    total_rounds_survived: 77,
    total_eliminations: 34,
    created_at: "2024-09-14T11:10:00Z",
  },
  {
    id: "mock-009",
    wallet_address: "0x5C26e7E8f9A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6",
    username: "VoidTrader99",
    avatar_url: null,
    total_arenas_entered: 11,
    total_arenas_won: 3,
    best_pnl_percent: 198.3,
    win_streak: 3,
    current_win_streak: 1,
    total_rounds_survived: 29,
    total_eliminations: 8,
    created_at: "2024-12-03T07:55:00Z",
  },
  {
    id: "mock-010",
    wallet_address: "0x6D38F9C0B1A2E3D4F5A6B7C8D9E0F1A2B3C4D5E6",
    username: "NebulaHunter",
    avatar_url: null,
    total_arenas_entered: 29,
    total_arenas_won: 3,
    best_pnl_percent: 167.8,
    win_streak: 3,
    current_win_streak: 0,
    total_rounds_survived: 61,
    total_eliminations: 26,
    created_at: "2024-10-25T14:00:00Z",
  },
  {
    id: "mock-011",
    wallet_address: "0x7E49C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8",
    username: "StellarWise",
    avatar_url: null,
    total_arenas_entered: 16,
    total_arenas_won: 2,
    best_pnl_percent: 143.2,
    win_streak: 2,
    current_win_streak: 2,
    total_rounds_survived: 38,
    total_eliminations: 14,
    created_at: "2024-11-19T20:15:00Z",
  },
  {
    id: "mock-012",
    wallet_address: "0x8F5A2D3E4F6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D",
    username: "HexVault",
    avatar_url: null,
    total_arenas_entered: 44,
    total_arenas_won: 2,
    best_pnl_percent: 118.6,
    win_streak: 2,
    current_win_streak: 0,
    total_rounds_survived: 92,
    total_eliminations: 42,
    created_at: "2024-08-07T10:40:00Z",
  },
  {
    id: "mock-013",
    wallet_address: "0x9A6B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B",
    username: "RogueQuant",
    avatar_url: null,
    total_arenas_entered: 8,
    total_arenas_won: 1,
    best_pnl_percent: 95.4,
    win_streak: 1,
    current_win_streak: 1,
    total_rounds_survived: 19,
    total_eliminations: 7,
    created_at: "2025-01-08T15:25:00Z",
  },
  {
    id: "mock-014",
    wallet_address: "0xAB7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C",
    username: "DeepSeaFisher",
    avatar_url: null,
    total_arenas_entered: 31,
    total_arenas_won: 1,
    best_pnl_percent: 72.1,
    win_streak: 1,
    current_win_streak: 0,
    total_rounds_survived: 64,
    total_eliminations: 30,
    created_at: "2024-09-28T13:00:00Z",
  },
  {
    id: "mock-015",
    wallet_address: "0xBC8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D",
    username: "FractalMind",
    avatar_url: null,
    total_arenas_entered: 20,
    total_arenas_won: 1,
    best_pnl_percent: 58.9,
    win_streak: 1,
    current_win_streak: 0,
    total_rounds_survived: 45,
    total_eliminations: 19,
    created_at: "2024-12-15T09:10:00Z",
  },
  {
    id: "mock-016",
    wallet_address: "0xCD9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8",
    username: "OrbitBreak",
    avatar_url: null,
    total_arenas_entered: 12,
    total_arenas_won: 0,
    best_pnl_percent: 44.3,
    win_streak: 0,
    current_win_streak: 0,
    total_rounds_survived: 25,
    total_eliminations: 12,
    created_at: "2025-01-22T16:50:00Z",
  },
  {
    id: "mock-017",
    wallet_address: "0xDE0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9",
    username: "ZenithPulse",
    avatar_url: null,
    total_arenas_entered: 7,
    total_arenas_won: 0,
    best_pnl_percent: 28.7,
    win_streak: 0,
    current_win_streak: 0,
    total_rounds_survived: 14,
    total_eliminations: 7,
    created_at: "2025-02-05T11:35:00Z",
  },
  {
    id: "mock-018",
    wallet_address: "0xEF1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
    username: "ApexCipher",
    avatar_url: null,
    total_arenas_entered: 24,
    total_arenas_won: 0,
    best_pnl_percent: 15.2,
    win_streak: 0,
    current_win_streak: 0,
    total_rounds_survived: 48,
    total_eliminations: 24,
    created_at: "2025-01-30T08:20:00Z",
  },
  {
    id: "mock-019",
    wallet_address: "0xF1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1",
    username: "ByteHunter",
    avatar_url: null,
    total_arenas_entered: 33,
    total_arenas_won: 0,
    best_pnl_percent: 3.8,
    win_streak: 0,
    current_win_streak: 0,
    total_rounds_survived: 67,
    total_eliminations: 33,
    created_at: "2025-02-14T17:45:00Z",
  },
  {
    id: "mock-020",
    wallet_address: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C",
    username: "NovaSeeker",
    avatar_url: null,
    total_arenas_entered: 5,
    total_arenas_won: 0,
    best_pnl_percent: -8.4,
    win_streak: 0,
    current_win_streak: 0,
    total_rounds_survived: 8,
    total_eliminations: 5,
    created_at: "2025-03-01T12:10:00Z",
  },
];

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
//  RANK MEDAL BADGE — Mobile Legends-style diamond + wings + crown (ranks 1-5)
// ═══════════════════════════════════════════════════════════════════════════════
function RankMedalBadge({ rank }: { rank: number }) {
  // ── per-rank palette ──────────────────────────────────────────────────────
  const P: Record<number, { hi: string; mid: string; lo: string; dark: string; glow: string; gem: string }> = {
    1: { hi: "#FFE566", mid: "#FFB800", lo: "#A06400", dark: "#5A3800", glow: "rgba(255,184,0,0.75)", gem: "#FF5555" },
    2: { hi: "#E8F2FF", mid: "#A0BCDC", lo: "#5A7898", dark: "#2E4868", glow: "rgba(160,188,220,0.65)", gem: "#88AAFF" },
    3: { hi: "#E8A060", mid: "#C07030", lo: "#7A4018", dark: "#3E200A", glow: "rgba(192,112,48,0.65)", gem: "#FFCC44" },
    4: { hi: "#7090B0", mid: "#485E78", lo: "#283848", dark: "#142030", glow: "rgba(72,94,120,0.55)", gem: "#4DBFFF" },
    5: { hi: "#587090", mid: "#384858", lo: "#1E2C3A", dark: "#0E1820", glow: "rgba(56,72,88,0.5)",  gem: "#4DBFFF" },
  };
  const c = P[rank] ?? P[5];
  const id = `rmb${rank}`;

  // Rank 1: full gold crowned badge (72×88px)
  if (rank === 1) return (
    <div style={{ filter: `drop-shadow(0 0 10px ${c.glow}) drop-shadow(0 3px 8px rgba(0,0,0,0.8))` }}>
      <svg width="68" height="84" viewBox="0 0 68 84" fill="none">
        <defs>
          <linearGradient id={`${id}b`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor={c.hi}/>
            <stop offset="45%"  stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.lo}/>
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={c.hi} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={c.mid} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`${id}w`} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%"   stopColor={c.mid}/>
            <stop offset="60%"  stopColor={c.lo}/>
            <stop offset="100%" stopColor={c.dark} stopOpacity="0.6"/>
          </linearGradient>
          <filter id={`${id}g`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── CROWN (rank 1 only) ── */}
        {/* Crown base */}
        <path d="M20,32 L48,32 L48,28 L40,20 L34,26 L34,14 L34,14 L34,14 L34,26 L28,20 L20,28 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="1"/>
        {/* Crown points top */}
        <path d="M20,28 L22,18 L26,24 L34,12 L42,24 L46,18 L48,28 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="0.8"/>
        {/* Crown point highlights */}
        <circle cx="34" cy="12" r="3"   fill={c.gem} stroke={c.hi} strokeWidth="0.8"/>
        <circle cx="22" cy="18" r="2"   fill={c.hi} fillOpacity="0.9"/>
        <circle cx="46" cy="18" r="2"   fill={c.hi} fillOpacity="0.9"/>
        <circle cx="34" cy="12" r="1.5" fill="white" fillOpacity="0.5"/>
        {/* Crown band */}
        <rect x="20" y="28" width="28" height="5" rx="1"
          fill={c.mid} stroke={c.dark} strokeWidth="0.8"/>
        <rect x="22" y="29" width="24" height="2" rx="0.5" fill={c.hi} fillOpacity="0.45"/>

        {/* ── LEFT WING ── */}
        <path d="M20,50 Q8,44 2,40 Q4,50 8,55 Q12,58 20,56 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="1"/>
        <path d="M20,50 Q10,46 4,43" stroke={c.hi} strokeWidth="0.8" fill="none" strokeOpacity="0.6"/>
        <path d="M20,54 Q11,52 6,52" stroke={c.hi} strokeWidth="0.6" fill="none" strokeOpacity="0.45"/>

        {/* ── RIGHT WING ── */}
        <path d="M48,50 Q60,44 66,40 Q64,50 60,55 Q56,58 48,56 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="1"/>
        <path d="M48,50 Q58,46 64,43" stroke={c.hi} strokeWidth="0.8" fill="none" strokeOpacity="0.6"/>
        <path d="M48,54 Q57,52 62,52" stroke={c.hi} strokeWidth="0.6" fill="none" strokeOpacity="0.45"/>

        {/* ── MAIN DIAMOND BODY ── */}
        <path d="M34,32 L56,52 L34,72 L12,52 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="1.5"/>
        {/* Inner diamond border */}
        <path d="M34,36 L52,52 L34,68 L16,52 Z"
          fill="none" stroke={c.hi} strokeWidth="0.8" strokeOpacity="0.55"/>
        {/* Body sheen */}
        <path d="M34,36 L50,52 L34,58 L18,52 Z"
          fill={`url(#${id}s)`} fillOpacity="0.3"/>
        {/* Corner gems */}
        <circle cx="34" cy="35" r="2.5" fill={c.gem} stroke={c.hi} strokeWidth="0.7"/>
        <circle cx="34" cy="35" r="1.2" fill="white" fillOpacity="0.55"/>
        <circle cx="34" cy="69" r="2"   fill={c.hi} fillOpacity="0.7"/>
        <circle cx="13" cy="52" r="2"   fill={c.mid} fillOpacity="0.8"/>
        <circle cx="55" cy="52" r="2"   fill={c.mid} fillOpacity="0.8"/>

        {/* ── NUMBER CIRCLE ── */}
        <circle cx="34" cy="52" r="11" fill={c.dark} stroke={c.hi} strokeWidth="1.5"/>
        <circle cx="34" cy="52" r="9"  fill={c.lo}/>
        <circle cx="34" cy="52" r="9"  fill={`url(#${id}s)`} fillOpacity="0.4"/>
        <text x="34" y="56.5" textAnchor="middle" fontSize="12" fontWeight="900"
          fill={c.hi} fontFamily="var(--font-display)" letterSpacing="-0.5">1</text>
        <circle cx="30" cy="49" r="2.5" fill="white" fillOpacity="0.18"/>
      </svg>
    </div>
  );

  // Rank 2: Silver diamond with wings (62×72px)
  if (rank === 2) return (
    <div style={{ filter: `drop-shadow(0 0 8px ${c.glow}) drop-shadow(0 3px 7px rgba(0,0,0,0.75))` }}>
      <svg width="62" height="72" viewBox="0 0 62 72" fill="none">
        <defs>
          <linearGradient id={`${id}b`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor={c.hi}/>
            <stop offset="50%"  stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.lo}/>
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0.5" y1="0" x2="0.5" y2="0.6">
            <stop offset="0%"   stopColor={c.hi} stopOpacity="0.8"/>
            <stop offset="100%" stopColor={c.hi} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`${id}w`} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%"   stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.dark} stopOpacity="0.5"/>
          </linearGradient>
        </defs>

        {/* Left wing */}
        <path d="M18,38 Q7,32 2,29 Q3,38 7,43 Q11,46 18,44 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="1"/>
        <path d="M18,38 Q9,34 3,31" stroke={c.hi} strokeWidth="0.7" fill="none" strokeOpacity="0.55"/>

        {/* Right wing */}
        <path d="M44,38 Q55,32 60,29 Q59,38 55,43 Q51,46 44,44 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="1"/>
        <path d="M44,38 Q53,34 59,31" stroke={c.hi} strokeWidth="0.7" fill="none" strokeOpacity="0.55"/>

        {/* Small crown topper */}
        <path d="M22,18 L31,18 L31,14 L27,10 L31,14 L31,10 L31,14 L35,10 L31,14 L31,18 L40,18 L40,14 L31,18 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="0.8" opacity="0.9"/>
        <path d="M22,18 L40,18 L40,14 L36,8 L31,12 L26,8 L22,14 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="0.9"/>
        <circle cx="31" cy="8"  r="2.2" fill={c.gem} stroke={c.hi} strokeWidth="0.6"/>
        <circle cx="22" cy="14" r="1.5" fill={c.hi} fillOpacity="0.8"/>
        <circle cx="40" cy="14" r="1.5" fill={c.hi} fillOpacity="0.8"/>
        <rect x="22" y="18" width="18" height="4" rx="0.8" fill={c.mid} stroke={c.dark} strokeWidth="0.7"/>

        {/* Main diamond */}
        <path d="M31,22 L50,40 L31,58 L12,40 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="1.4"/>
        <path d="M31,26 L46,40 L31,54 L16,40 Z"
          fill="none" stroke={c.hi} strokeWidth="0.7" strokeOpacity="0.5"/>
        <path d="M31,26 L45,40 L31,47 L17,40 Z"
          fill={`url(#${id}s)`} fillOpacity="0.28"/>
        {/* Corner accents */}
        <circle cx="31" cy="23" r="2.2" fill={c.gem} stroke={c.hi} strokeWidth="0.6"/>
        <circle cx="31" cy="23" r="1"   fill="white" fillOpacity="0.5"/>
        <circle cx="31" cy="57" r="1.8" fill={c.hi} fillOpacity="0.65"/>

        {/* Number circle */}
        <circle cx="31" cy="40" r="10"  fill={c.dark} stroke={c.hi} strokeWidth="1.4"/>
        <circle cx="31" cy="40" r="8.2" fill={c.lo}/>
        <circle cx="31" cy="40" r="8.2" fill={`url(#${id}s)`} fillOpacity="0.35"/>
        <text x="31" y="44.5" textAnchor="middle" fontSize="11" fontWeight="900"
          fill={c.hi} fontFamily="var(--font-display)">2</text>
        <circle cx="27.5" cy="37" r="2.2" fill="white" fillOpacity="0.18"/>
      </svg>
    </div>
  );

  // Rank 3: Bronze diamond with wings (56×66px)
  if (rank === 3) return (
    <div style={{ filter: `drop-shadow(0 0 7px ${c.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.7))` }}>
      <svg width="56" height="66" viewBox="0 0 56 66" fill="none">
        <defs>
          <linearGradient id={`${id}b`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor={c.hi}/>
            <stop offset="50%"  stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.lo}/>
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0.5" y1="0" x2="0.5" y2="0.6">
            <stop offset="0%"   stopColor={c.hi} stopOpacity="0.7"/>
            <stop offset="100%" stopColor={c.hi} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`${id}w`} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%"   stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.dark} stopOpacity="0.45"/>
          </linearGradient>
        </defs>

        {/* Left wing */}
        <path d="M16,35 Q7,30 2,27 Q3,35 6,39 Q9,42 16,41 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="0.9"/>
        <path d="M16,35 Q8,31 3,29" stroke={c.hi} strokeWidth="0.6" fill="none" strokeOpacity="0.5"/>

        {/* Right wing */}
        <path d="M40,35 Q49,30 54,27 Q53,35 50,39 Q47,42 40,41 Z"
          fill={`url(#${id}w)`} stroke={c.dark} strokeWidth="0.9"/>
        <path d="M40,35 Q48,31 53,29" stroke={c.hi} strokeWidth="0.6" fill="none" strokeOpacity="0.5"/>

        {/* Small topper */}
        <path d="M20,16 L36,16 L36,12 L32,7 L28,11 L24,7 L20,12 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="0.8"/>
        <circle cx="28" cy="7"  r="2"   fill={c.gem} stroke={c.hi} strokeWidth="0.5"/>
        <circle cx="20" cy="12" r="1.3" fill={c.hi} fillOpacity="0.75"/>
        <circle cx="36" cy="12" r="1.3" fill={c.hi} fillOpacity="0.75"/>
        <rect x="20" y="16" width="16" height="3.5" rx="0.7" fill={c.mid} stroke={c.dark} strokeWidth="0.6"/>

        {/* Main diamond */}
        <path d="M28,20 L45,36 L28,52 L11,36 Z"
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="1.3"/>
        <path d="M28,24 L41,36 L28,48 L15,36 Z"
          fill="none" stroke={c.hi} strokeWidth="0.6" strokeOpacity="0.45"/>
        <path d="M28,24 L40,36 L28,43 L16,36 Z"
          fill={`url(#${id}s)`} fillOpacity="0.26"/>
        <circle cx="28" cy="21" r="2"   fill={c.gem} stroke={c.hi} strokeWidth="0.6"/>
        <circle cx="28" cy="21" r="0.9" fill="white" fillOpacity="0.5"/>
        <circle cx="28" cy="51" r="1.6" fill={c.hi} fillOpacity="0.6"/>

        {/* Number circle */}
        <circle cx="28" cy="36" r="9.5"  fill={c.dark} stroke={c.hi} strokeWidth="1.3"/>
        <circle cx="28" cy="36" r="7.8"  fill={c.lo}/>
        <circle cx="28" cy="36" r="7.8"  fill={`url(#${id}s)`} fillOpacity="0.3"/>
        <text x="28" y="40.5" textAnchor="middle" fontSize="11" fontWeight="900"
          fill={c.hi} fontFamily="var(--font-display)">3</text>
        <circle cx="25"  cy="33" r="2" fill="white" fillOpacity="0.16"/>
      </svg>
    </div>
  );

  // Ranks 4 & 5: simpler steel shield (48×56px / 44×52px)
  const sz = rank === 4 ? 48 : 44;
  const cy = sz * 0.57;
  return (
    <div style={{ filter: `drop-shadow(0 0 6px ${c.glow}) drop-shadow(0 2px 5px rgba(0,0,0,0.65))` }}>
      <svg width={sz} height={sz + 8} viewBox={`0 0 ${sz} ${sz + 8}`} fill="none">
        <defs>
          <linearGradient id={`${id}b`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor={c.hi}/>
            <stop offset="55%"  stopColor={c.mid}/>
            <stop offset="100%" stopColor={c.lo}/>
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0.5" y1="0" x2="0.5" y2="0.55">
            <stop offset="0%"   stopColor={c.hi} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={c.hi} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Subtle side nubs */}
        <path d={`M${sz*0.28},${cy} Q${sz*0.08},${cy*0.88} ${sz*0.02},${cy} Q${sz*0.08},${cy*1.12} ${sz*0.28},${cy*1.04} Z`}
          fill={c.mid} fillOpacity="0.7"/>
        <path d={`M${sz*0.72},${cy} Q${sz*0.92},${cy*0.88} ${sz*0.98},${cy} Q${sz*0.92},${cy*1.12} ${sz*0.72},${cy*1.04} Z`}
          fill={c.mid} fillOpacity="0.7"/>
        {/* Diamond body */}
        <path d={`M${sz/2},${sz*0.12} L${sz*0.88},${cy} L${sz/2},${sz*0.88} L${sz*0.12},${cy} Z`}
          fill={`url(#${id}b)`} stroke={c.dark} strokeWidth="1.2"/>
        <path d={`M${sz/2},${sz*0.18} L${sz*0.82},${cy} L${sz/2},${sz*0.82} L${sz*0.18},${cy} Z`}
          fill="none" stroke={c.hi} strokeWidth="0.6" strokeOpacity="0.4"/>
        <path d={`M${sz/2},${sz*0.18} L${sz*0.80},${cy} L${sz/2},${cy*0.9} L${sz*0.20},${cy} Z`}
          fill={`url(#${id}s)`} fillOpacity="0.25"/>
        {/* Number circle */}
        <circle cx={sz/2} cy={cy} r={sz*0.22}  fill={c.dark} stroke={c.hi} strokeWidth="1.1"/>
        <circle cx={sz/2} cy={cy} r={sz*0.178} fill={c.lo}/>
        <circle cx={sz/2} cy={cy} r={sz*0.178} fill={`url(#${id}s)`} fillOpacity="0.28"/>
        <text x={sz/2} y={cy + sz*0.072} textAnchor="middle"
          fontSize={sz*0.22} fontWeight="900"
          fill={c.hi} fontFamily="var(--font-display)">{rank}</text>
        <circle cx={sz/2 - sz*0.07} cy={cy - sz*0.07} r={sz*0.055} fill="white" fillOpacity="0.15"/>
      </svg>
    </div>
  );
}

/** Keep old name as alias so the podium section still compiles */
function RankCrownBadge({ rank }: { rank: 1 | 2 | 3 }) {
  return <RankMedalBadge rank={rank} />;
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
//  MARINE RANK CONFIG — texture intensity scales with rank (5x→1x)
// ═══════════════════════════════════════════════════════════════════════════════
const MARINE_CONFIG: Record<number, {
  label: string; depth: string;
  bgTop: string; bgBot: string;
  accent: string; glow: string;
  borderOpacity: number;
  waves: number;           // texture multiplier
  rowPy: string;
}> = {
  1: { label:"ABYSSAL LEGEND", depth:"Deep Abyss",    bgTop:"#010A14", bgBot:"#061E38", accent:"#00F5FF", glow:"rgba(0,245,255,0.55)", borderOpacity:0.85, waves:5, rowPy:"py-6" },
  2: { label:"CORAL EMPEROR",  depth:"Coral Reef",    bgTop:"#030F1C", bgBot:"#082440", accent:"#1DE9FF", glow:"rgba(29,233,255,0.45)", borderOpacity:0.65, waves:4, rowPy:"py-5" },
  3: { label:"TIDE MASTER",    depth:"Kelp Forest",   bgTop:"#031018", bgBot:"#0A2535", accent:"#00D4C8", glow:"rgba(0,212,200,0.40)", borderOpacity:0.50, waves:3, rowPy:"py-5" },
  4: { label:"CURRENT RIDER",  depth:"Coastal Sea",   bgTop:"#030D16", bgBot:"#081E2C", accent:"#4DBFFF", glow:"rgba(77,191,255,0.35)", borderOpacity:0.38, waves:2, rowPy:"py-4" },
  5: { label:"SURFACE DIVER",  depth:"Open Ocean",    bgTop:"#030810", bgBot:"#071420", accent:"#4DBFFF", glow:"rgba(77,191,255,0.25)", borderOpacity:0.25, waves:1, rowPy:"py-4" },
};

// ── SVG Fish (scaled by rank) ─────────────────────────────────────────────────
function FishSvg({ color, size = 1 }: { color: string; size?: number }) {
  const s = size;
  return (
    <svg width={26 * s} height={14 * s} viewBox="0 0 26 14" fill="none">
      {/* Tail */}
      <path d="M0 3 L7 7 L0 11 Z" fill={color} fillOpacity="0.7" />
      {/* Body */}
      <ellipse cx="16" cy="7" rx="10" ry="5" fill={color} fillOpacity="0.85" />
      {/* Fin top */}
      <path d="M13 2 Q16 0 18 2" stroke={color} strokeWidth="1.2" fill="none" strokeOpacity="0.7"/>
      {/* Eye */}
      <circle cx="21" cy="6" r="1.5" fill="white" fillOpacity="0.9" />
      <circle cx="21.5" cy="6" r="0.7" fill="#0A1A2A" />
      {/* Stripe */}
      <line x1="15" y1="2.5" x2="15" y2="11.5" stroke="white" strokeWidth="0.8" strokeOpacity="0.25"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BREACH CREATURES — 3D overlay creatures that extend BEYOND the card bounds.
//  These sit BEHIND the card so the submerged portion is hidden by the opaque
//  card (looks like the body is underwater) and only the breaching part shows.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
//  BREACH CREATURES — PNG image assets, left-side positioned
// ═══════════════════════════════════════════════════════════════════════════════

// Rank 1 — Shark (watercolor great white, diagonal pose, Rank 1 badge)
function BreachWhaleSide() {
  return (
    <div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{
        left: "-95px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "185px",
        height: "240px",
        zIndex: 3,
        animation: "whale-breach 6s ease-in-out infinite",
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(77,191,255,0.2))",
      }}
    >
      <img src="/creatures/SharkLabel.png" alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

// Rank 2 — Whale (watercolor humpback, facing right)
function BreachShark() {
  return (
    <div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{
        left: "-78px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "155px",
        height: "205px",
        zIndex: 3,
        animation: "shark-circle 8s ease-in-out infinite",
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 18px rgba(77,191,255,0.18))",
      }}
    >
      <img src="/creatures/WhaleLabel.png" alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

// Rank 3 — Manta ray (wide wings, swimming diagonal)
function BreachWave() {
  return (
    <div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{
        left: "-120px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "255px",
        height: "155px",
        zIndex: 3,
        animation: "wave-roll 6s ease-in-out infinite",
        filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 16px rgba(77,191,255,0.15))",
      }}
    >
      <img src="/creatures/MantaLabel.png" alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

// Rank 4 — Jellyfish (glowing translucent, tentacles trailing)
function BreachDolphin() {
  return (
    <div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{
        left: "-68px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "135px",
        height: "200px",
        zIndex: 3,
        animation: "dolphin-leap 5s ease-in-out infinite",
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 16px rgba(77,191,255,0.18))",
      }}
    >
      <img src="/creatures/JellyFishLabel.png" alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

// Rank 5 — Wave (deep blue illustrated ocean wave)
function BreachFin() {
  return (
    <div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{
        left: "-88px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "175px",
        height: "160px",
        zIndex: 3,
        animation: "fin-bob 5s ease-in-out infinite",
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5)) drop-shadow(0 0 14px rgba(77,191,255,0.15))",
      }}
    >
      <img src="/creatures/WaveLabel.png" alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}


// ── Wave layer SVG paths ──────────────────────────────────────────────────────
function WaveLayer({ y, opacity, dur, color }: { y: number; opacity: number; dur: string; color: string }) {
  // Two identical wave segments side by side so the loop is seamless
  const path = `M0,${y} Q25,${y-8} 50,${y} T100,${y} T150,${y} T200,${y}`;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ top: 0, bottom: 0 }}>
      <svg
        className="absolute"
        style={{ bottom: 0, left: 0, width: "200%", height: "100%",
          opacity,
          animation: `wave-drift ${dur} linear infinite`,
          willChange: "transform",
        }}
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
      >
        <path d={path} fill={color} fillOpacity="0.12" />
        {/* Second wave at offset */}
        <path d={`M0,${y+6} Q25,${y-2} 50,${y+6} T100,${y+6} T150,${y+6} T200,${y+6}`}
          fill={color} fillOpacity="0.07" />
      </svg>
    </div>
  );
}

// ── SVG background texture per rank ──────────────────────────────────────────
function MarineTexture({ rank, accent }: { rank: number; accent: string }) {
  const id = `mpt${rank}`;
  const a = accent;

  // Fish scale texture (rank 1-2), bubble texture (rank 3-4), ripple (rank 5)
  if (rank === 1) return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.18 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="9"  r="10" fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="0"  cy="0"  r="10" fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="20" cy="0"  r="10" fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="0"  cy="18" r="10" fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="20" cy="18" r="10" fill="none" stroke={a} strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
  if (rank === 2) return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.14 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="28" height="24" patternUnits="userSpaceOnUse">
          {/* Coral branch pattern */}
          <line x1="14" y1="24" x2="14" y2="12" stroke={a} strokeWidth="1"/>
          <line x1="14" y1="16" x2="8"  y2="10" stroke={a} strokeWidth="0.8"/>
          <line x1="14" y1="14" x2="20" y2="8"  stroke={a} strokeWidth="0.8"/>
          <line x1="8"  y1="10" x2="5"  y2="6"  stroke={a} strokeWidth="0.6"/>
          <line x1="20" y1="8"  x2="23" y2="4"  stroke={a} strokeWidth="0.6"/>
          <circle cx="5"  cy="6"  r="1.2" fill={a}/>
          <circle cx="23" cy="4"  r="1.2" fill={a}/>
          <circle cx="14" cy="12" r="1"   fill={a}/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
  if (rank === 3) return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.12 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          {/* Bubble pattern */}
          <circle cx="8"  cy="8"  r="4" fill="none" stroke={a} strokeWidth="0.8"/>
          <circle cx="22" cy="18" r="6" fill="none" stroke={a} strokeWidth="0.8"/>
          <circle cx="5"  cy="24" r="3" fill="none" stroke={a} strokeWidth="0.6"/>
          <circle cx="25" cy="6"  r="2" fill="none" stroke={a} strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
  if (rank === 4) return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.10 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          {/* Ripple rings */}
          <circle cx="20" cy="10" r="8"  fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="20" cy="10" r="14" fill="none" stroke={a} strokeWidth="0.4"/>
          <circle cx="0"  cy="10" r="8"  fill="none" stroke={a} strokeWidth="0.7"/>
          <circle cx="40" cy="10" r="8"  fill="none" stroke={a} strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
  // Rank 5 – simple diagonal lines (surface shimmer)
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.07 }}>
      <defs>
        <pattern id={id} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="20" x2="20" y2="0" stroke={a} strokeWidth="0.8"/>
          <line x1="0" y1="10" x2="10" y2="0" stroke={a} strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// ── Bioluminescent orbs (rank 1 only) ────────────────────────────────────────
function BiolumOrbs({ count, color }: { count: number; color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      {[...Array(count)].map((_, i) => (
        <circle
          key={i}
          cx={`${10 + i * 12}%`}
          cy={`${30 + (i % 3) * 25}%`}
          r="3"
          fill={color}
          fillOpacity="0.6"
          style={{ animation: `biolum-pulse ${1.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MARINE LEADERBOARD ROW — top 5 rows with aquatic textures
// ═══════════════════════════════════════════════════════════════════════════════
function MarineLeaderboardRow({ user, rank }: { user: LeaderboardUser; rank: number }) {
  const name = user.username ?? truncateAddress(user.wallet_address);
  const pnlPos = user.best_pnl_percent >= 0;
  const cfg = MARINE_CONFIG[rank as 1|2|3|4|5];
  const { accent, glow, bgTop, bgBot, waves, label, depth, borderOpacity, rowPy } = cfg;

  const waveDurs = ["6s","9s","12s","15s","18s"];

  const fishConfigs: Record<number, { delay: string[] }> = {
    1: { delay: ["8s","13s","18s","22s"] },
    2: { delay: ["10s","16s","24s"] },
    3: { delay: ["12s","20s"] },
    4: { delay: ["14s"] },
    5: { delay: ["18s"] },
  };
  const fc = fishConfigs[rank];

  // Vertical breathing room so creature (centered on card) doesn't overlap adjacent rows
  const topMargin    = rank === 1 ? 80 : rank === 2 ? 65 : rank === 3 ? 38 : rank === 4 ? 68 : 48;
  const bottomMargin = rank === 1 ? 75 : rank === 2 ? 62 : rank === 3 ? 35 : rank === 4 ? 64 : 44;

  return (
    <div
      className="leaderboard-row relative"
      style={{ overflow: "visible", marginTop: topMargin, marginBottom: bottomMargin }}
    >
      {/* ═══ BREACHING CREATURE — sibling of the card, z:3, positioned LEFT side ═══ */}
      {rank === 1 && <BreachWhaleSide />}
      {rank === 2 && <BreachShark />}
      {rank === 3 && <BreachWave />}
      {rank === 4 && <BreachDolphin />}
      {rank === 5 && <BreachFin />}

      {/* ═══ INNER CARD — clipped, textured, contains all content ═══ */}
      <motion.div
        className={`group relative flex items-center gap-4 px-5 ${rowPy} rounded-xl overflow-hidden cursor-pointer`}
        style={{
          background: `linear-gradient(135deg, ${bgTop}, ${bgBot})`,
          border: `1px solid ${accent}${Math.round(borderOpacity * 255).toString(16).padStart(2, "0")}`,
          boxShadow: `0 0 ${waves * 8}px ${glow}, 0 0 ${waves * 16}px ${glow.replace(/[\d.]+\)$/, "0.2)")}, 0 4px 24px rgba(0,0,0,0.7)`,
          zIndex: 2,
        }}
        whileHover={{
          scale: 1.008,
          boxShadow: `0 0 ${waves * 12}px ${glow}, 0 0 ${waves * 24}px ${glow.replace(/[\d.]+\)$/, "0.3)")}, 0 8px 32px rgba(0,0,0,0.8)`,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* ── BACKGROUND LAYERS (clipped inside card) ── */}

        {/* 1. SVG pattern texture (unique per rank) */}
        <MarineTexture rank={rank} accent={accent} />

        {/* 2. Wave layers (count = waves multiplier) */}
        {[...Array(waves)].map((_, i) => (
          <WaveLayer
            key={i}
            y={45 - i * 8}
            opacity={0.4 - i * 0.06}
            dur={waveDurs[i]}
            color={accent}
          />
        ))}

        {/* 3. Bioluminescent orbs (rank 1 only, 5 orbs = 5x) */}
        {rank === 1 && <BiolumOrbs count={5} color={accent} />}

        {/* 4. Swimming fish */}
        {fc.delay.map((dur, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              top: `${20 + (i % 3) * 22}%`,
              right: 0,
              animation: `fish-swim ${dur} linear infinite`,
              animationDelay: `${i * -4}s`,
              filter: `drop-shadow(0 0 4px ${accent})`,
              opacity: 0.45,
            }}
          >
            <FishSvg color={accent} size={rank === 1 ? 1.3 : rank === 2 ? 1.1 : 0.9} />
          </div>
        ))}

        {/* 5. Rank depth label bottom-right */}
        <div className="absolute bottom-1 right-3 pointer-events-none z-[3]">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accent, opacity: 0.55, fontFamily: "var(--font-display)" }}>
            {depth} · {waves}×
          </span>
        </div>

        {/* Left edge glow line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)`, opacity: borderOpacity }} />

        {/* ── CONTENT (z-10, always on top of textures) ── */}

        {/* Creature is purely absolute-positioned — no spacer needed, content is full-width */}

        <div className="relative z-10 flex-shrink-0 flex items-center justify-center"
          style={{ width: rank === 1 ? 72 : rank === 2 ? 66 : rank === 3 ? 60 : 52 }}>
          <RankMedalBadge rank={rank} />
        </div>

        <div className="relative z-10 flex-shrink-0">
          <AvatarFrame seed={user.username ?? user.wallet_address} rank={rank} size={rank <= 2 ? 52 : 44} />
        </div>

        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-bold truncate"
              style={{
                color: accent,
                fontFamily: "var(--font-display)",
                fontSize: rank === 1 ? "15px" : rank === 2 ? "14px" : "13px",
                textShadow: `0 0 10px ${glow}`,
              }}
            >
              {name}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border"
              style={{
                background: `${accent}15`,
                borderColor: `${accent}40`,
                color: accent,
                fontFamily: "var(--font-display)",
                boxShadow: `0 0 8px ${glow}`,
              }}
            >
              {label}
            </span>
            {user.current_win_streak >= 3 && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
                style={{ background: `${CORAL}20`, border: `1px solid ${CORAL}40`, color: CORAL, fontFamily: "var(--font-display)" }}
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

        <div className="relative z-10 flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 0L6.2 3.5H10L7 5.8L8.2 9.5L5 7L1.8 9.5L3 5.8L0 3.5H3.8Z" fill={GOLD} fillOpacity={user.total_arenas_won > 0 ? 1 : 0.3} />
              </svg>
              <span className="font-mono text-sm font-bold"
                style={{ color: user.total_arenas_won > 0 ? GOLD : "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", textShadow: user.total_arenas_won > 0 ? `0 0 8px rgba(232,200,122,0.4)` : "none" }}>
                {user.total_arenas_won}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Wins</span>
          </div>

          <div className="text-right min-w-[72px]">
            <div className="font-mono text-sm font-bold"
              style={{ color: pnlPos ? "#4ECBA3" : "#E85353", fontFamily: "var(--font-mono)", textShadow: pnlPos ? `0 0 8px rgba(78,203,163,0.4)` : `0 0 8px rgba(232,83,83,0.4)` }}>
              {pnlPos ? "+" : ""}{user.best_pnl_percent.toFixed(1)}%
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Best PnL</span>
          </div>

          <div className="text-right min-w-[48px] hidden sm:block">
            <div className="font-mono text-sm font-semibold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
              {winRate(user.total_arenas_won, user.total_arenas_entered)}
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Rate</span>
          </div>

          <div className="text-right min-w-[40px] hidden md:block">
            <div style={{ color: user.current_win_streak > 0 ? CORAL : "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: "bold" }}>
              {user.current_win_streak > 0 ? `⚡${user.current_win_streak}` : "—"}
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>Streak</span>
          </div>

          <svg className="w-4 h-4 flex-shrink-0" style={{ opacity: 0.4, color: accent }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
    </div>
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
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const { data, isLoading } = useQuery<{ data: LeaderboardUser[] }>({
    queryKey: ["global-leaderboard"],
    queryFn: () => fetch("/api/leaderboard").then((r) => r.json()),
    refetchInterval: 30000,
    enabled: !isDemoMode,
  });

  const traders = useMemo(() => {
    const live = data?.data ?? [];
    if (isDemoMode || live.length === 0) return MOCK_LEADERBOARD;
    return live;
  }, [data, isDemoMode]);

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
            {/* Demo mode badge */}
            {(isDemoMode || traders === MOCK_LEADERBOARD) && (
              <div className="flex justify-center mb-4">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border"
                  style={{
                    background: `${CORAL}12`,
                    borderColor: `${CORAL}40`,
                    color: CORAL,
                    fontFamily: "var(--font-display)",
                    boxShadow: `0 0 16px rgba(255,107,74,0.15)`,
                  }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: CORAL, boxShadow: `0 0 6px ${CORAL}` }}
                  />
                  Demo Data
                </div>
              </div>
            )}

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
          <div className="space-y-0" style={{ overflow: "visible" }}>
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
                {traders.map((user, i) => {
                  const rank = i + 1;
                  return rank <= 5
                    ? <MarineLeaderboardRow key={user.id} user={user} rank={rank} />
                    : <LeaderboardRow key={user.id} user={user} rank={rank} />;
                })}
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SKY = "#4DBFFF";
const CORAL = "#FF6B4A";
const GOLD = "#E8C87A";
const GOLD_DIM = "#C8A85A";
const MIDNIGHT = "#030810";
const SURFACE = "rgba(6,13,30,0.85)";

type TierKey = "bronze" | "silver" | "gold" | "epic" | "legend" | "mythic" | "champion";

const TIER_CONFIG: Record<TierKey, {
  label: string;
  minWins: number;
  primary: string;
  secondary: string;
  glow: string;
  bg: string;
  border: string;
  stars: number;
  icon: React.ReactNode;
  description: string;
}> = {
  bronze: {
    label: "Bronze",
    minWins: 0,
    primary: "#CD7F32",
    secondary: "#E8A050",
    glow: "rgba(205,127,50,0.4)",
    bg: "rgba(205,127,50,0.08)",
    border: "rgba(205,127,50,0.3)",
    stars: 1,
    description: "Arena Rookie",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 8 L65 24 L65 56 L40 72 L15 56 L15 24 Z" fill="url(#bronzeGrad)" stroke="#CD7F32" strokeWidth="2" />
        <path d="M40 20 L55 30 L55 50 L40 60 L25 50 L25 30 Z" fill="#CD7F32" fillOpacity="0.3" stroke="#E8A050" strokeWidth="1" />
        <circle cx="40" cy="40" r="8" fill="#CD7F32" />
        <defs>
          <linearGradient id="bronzeGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#CD7F32" />
            <stop offset="100%" stopColor="#E8A050" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  silver: {
    label: "Silver",
    minWins: 3,
    primary: "#C0C0C0",
    secondary: "#E8E8E8",
    glow: "rgba(192,192,192,0.4)",
    bg: "rgba(192,192,192,0.08)",
    border: "rgba(192,192,192,0.3)",
    stars: 2,
    description: "Arena Challenger",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 6 L66 23 L66 57 L40 74 L14 57 L14 23 Z" fill="url(#silverGrad)" stroke="#C0C0C0" strokeWidth="2" />
        <path d="M40 18 L56 29 L56 51 L40 62 L24 51 L24 29 Z" fill="#C0C0C0" fillOpacity="0.2" stroke="#E8E8E8" strokeWidth="1" />
        <path d="M40 28 L46 40 L58 42 L48 50 L50 62 L40 55 L30 62 L32 50 L22 42 L34 40 Z" fill="#C0C0C0" />
        <defs>
          <linearGradient id="silverGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#E8E8E8" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  gold: {
    label: "Gold",
    minWins: 7,
    primary: "#FFD700",
    secondary: "#FFF0A0",
    glow: "rgba(255,215,0,0.4)",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.3)",
    stars: 3,
    description: "Arena Warrior",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 4 L68 22 L68 58 L40 76 L12 58 L12 22 Z" fill="url(#goldGrad)" stroke="#FFD700" strokeWidth="2.5" />
        <path d="M40 16 L58 28 L58 52 L40 64 L22 52 L22 28 Z" fill="#FFD700" fillOpacity="0.15" stroke="#FFF0A0" strokeWidth="1.5" />
        <path d="M40 26 L47 38 L60 40 L49 49 L52 62 L40 54 L28 62 L31 49 L20 40 L33 38 Z" fill="url(#goldIconGrad)" />
        <circle cx="40" cy="40" r="6" fill="#FFD700" stroke="#FFF0A0" strokeWidth="1" />
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF0A0" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <linearGradient id="goldIconGrad" x1="20" y1="26" x2="60" y2="62">
            <stop offset="0%" stopColor="#FFF0A0" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  epic: {
    label: "Epic",
    minWins: 12,
    primary: "#9D50BB",
    secondary: "#C88AFF",
    glow: "rgba(157,80,187,0.5)",
    bg: "rgba(157,80,187,0.08)",
    border: "rgba(157,80,187,0.3)",
    stars: 4,
    description: "Arena Elite",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 2 L70 20 L70 60 L40 78 L10 60 L10 20 Z" fill="url(#epicGrad)" stroke="#9D50BB" strokeWidth="2.5" />
        <path d="M40 12 L60 26 L60 54 L40 68 L20 54 L20 26 Z" fill="#9D50BB" fillOpacity="0.1" stroke="#C88AFF" strokeWidth="1.5" />
        <path d="M40 22 L50 32 L60 30 L54 42 L60 52 L50 50 L40 60 L30 50 L20 52 L26 42 L20 30 L30 32 Z" fill="url(#epicIconGrad)" />
        <circle cx="40" cy="40" r="10" fill="none" stroke="#C88AFF" strokeWidth="2" />
        <circle cx="40" cy="40" r="5" fill="#9D50BB" />
        <defs>
          <linearGradient id="epicGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#9D50BB" />
            <stop offset="100%" stopColor="#C88AFF" />
          </linearGradient>
          <linearGradient id="epicIconGrad" x1="20" y1="22" x2="60" y2="60">
            <stop offset="0%" stopColor="#C88AFF" />
            <stop offset="100%" stopColor="#9D50BB" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  legend: {
    label: "Legend",
    minWins: 20,
    primary: "#FF6B4A",
    secondary: "#FF9A7A",
    glow: "rgba(255,107,74,0.5)",
    bg: "rgba(255,107,74,0.08)",
    border: "rgba(255,107,74,0.3)",
    stars: 5,
    description: "Arena Master",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 0 L72 18 L72 62 L40 80 L8 62 L8 18 Z" fill="url(#legendGrad)" stroke="#FF6B4A" strokeWidth="3" />
        <path d="M40 10 L62 24 L62 56 L40 70 L18 56 L18 24 Z" fill="#FF6B4A" fillOpacity="0.08" stroke="#FF9A7A" strokeWidth="2" />
        <path d="M40 18 L52 30 L64 28 L56 40 L64 52 L52 50 L40 62 L28 50 L16 52 L24 40 L16 28 L28 30 Z" fill="url(#legendIconGrad)" />
        <circle cx="40" cy="40" r="12" fill="none" stroke="#FF9A7A" strokeWidth="2.5" />
        <circle cx="40" cy="40" r="6" fill="#FF6B4A" stroke="#FF9A7A" strokeWidth="1.5" />
        <path d="M40 28 L43 36 L52 37 L45 43 L47 52 L40 47 L33 52 L35 43 L28 37 L37 36 Z" fill="#FF9A7A" />
        <defs>
          <linearGradient id="legendGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#FF6B4A" />
            <stop offset="100%" stopColor="#FF9A7A" />
          </linearGradient>
          <linearGradient id="legendIconGrad" x1="16" y1="18" x2="64" y2="62">
            <stop offset="0%" stopColor="#FF9A7A" />
            <stop offset="100%" stopColor="#FF6B4A" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  mythic: {
    label: "Mythic",
    minWins: 30,
    primary: "#4DBFFF",
    secondary: "#A8DEFF",
    glow: "rgba(77,191,255,0.5)",
    bg: "rgba(77,191,255,0.08)",
    border: "rgba(77,191,255,0.3)",
    stars: 6,
    description: "Arena Supreme",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 0 L74 16 L74 64 L40 80 L6 64 L6 16 Z" fill="url(#mythicGrad)" stroke="#4DBFFF" strokeWidth="3" />
        <path d="M40 8 L66 22 L66 58 L40 72 L14 58 L14 22 Z" fill="#4DBFFF" fillOpacity="0.06" stroke="#A8DEFF" strokeWidth="2" />
        <path d="M40 16 L54 28 L66 26 L58 38 L68 50 L54 48 L40 60 L26 48 L12 50 L22 38 L14 26 L26 28 Z" fill="url(#mythicIconGrad)" />
        <circle cx="40" cy="40" r="14" fill="none" stroke="#A8DEFF" strokeWidth="2.5" />
        <circle cx="40" cy="40" r="8" fill="#4DBFFF" stroke="#A8DEFF" strokeWidth="2" />
        <circle cx="40" cy="40" r="3" fill="#FFFFFF" />
        <path d="M40 26 L44 36 L54 37 L46 44 L48 54 L40 48 L32 54 L34 44 L26 37 L36 36 Z" fill="#A8DEFF" fillOpacity="0.8" />
        <defs>
          <linearGradient id="mythicGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#4DBFFF" />
            <stop offset="100%" stopColor="#A8DEFF" />
          </linearGradient>
          <linearGradient id="mythicIconGrad" x1="12" y1="16" x2="68" y2="60">
            <stop offset="0%" stopColor="#A8DEFF" />
            <stop offset="100%" stopColor="#4DBFFF" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  champion: {
    label: "Champion",
    minWins: 50,
    primary: "#FFD700",
    secondary: "#FFFFFF",
    glow: "rgba(255,215,0,0.6)",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.5)",
    stars: 7,
    description: "Colosseum Legend",
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
        <path d="M40 0 L76 14 L76 66 L40 80 L4 66 L4 14 Z" fill="url(#championGrad)" stroke="#FFD700" strokeWidth="3.5" />
        <path d="M40 6 L70 19 L70 61 L40 74 L10 61 L10 19 Z" fill="url(#championInner)" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M40 14 L58 26 L70 24 L62 36 L72 48 L58 46 L40 58 L22 46 L8 48 L18 36 L10 24 L22 26 Z" fill="url(#championIconGrad)" />
        <circle cx="40" cy="40" r="16" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="40" cy="40" r="10" fill="url(#championCenter)" stroke="#FFD700" strokeWidth="2" />
        <circle cx="40" cy="40" r="4" fill="#FFFFFF" />
        <path d="M40 24 L45 36 L57 37 L48 45 L50 57 L40 50 L30 57 L32 45 L23 37 L35 36 Z" fill="#FFFFFF" fillOpacity="0.9" />
        <circle cx="40" cy="40" r="20" fill="none" stroke="#FFD700" strokeWidth="1" strokeDasharray="4 4" />
        <defs>
          <linearGradient id="championGrad" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF0A0" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <linearGradient id="championInner" x1="10" y1="6" x2="70" y2="74">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="championIconGrad" x1="8" y1="14" x2="72" y2="58">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFF0A0" />
          </linearGradient>
          <radialGradient id="championCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFD700" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
};

const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "epic", "legend", "mythic", "champion"];

function getTier(wins: number): TierKey {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (wins >= TIER_CONFIG[TIER_ORDER[i]].minWins) return TIER_ORDER[i];
  }
  return "bronze";
}

function getNextTier(current: TierKey): { key: TierKey; winsNeeded: number } | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx === TIER_ORDER.length - 1) return null;
  return { key: TIER_ORDER[idx + 1], winsNeeded: TIER_CONFIG[TIER_ORDER[idx + 1]].minWins };
}

function StarIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 1L12.5 7H19L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L1 7H7.5L10 1Z"
        fill={filled ? color : "transparent"}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: Array<{ x: number; y: number; size: number; opacity: number; twinkle: number; twinkleSpeed: number }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      stars.length = 0;
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.twinkle += star.twinkleSpeed;
        const currentOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(77,191,255,${currentOpacity})`;
        ctx!.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", init);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 pointer-events-none" style={{ mixBlendMode: "screen" }} />;
}

function ParticleOrb({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        filter: "blur(40px)",
      }}
      animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.2, 0.9, 1] }}
      transition={{ duration: 12 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function RankBadge({ tier, wins, totalStars }: { tier: TierKey; wins: number; totalStars: number }) {
  const config = TIER_CONFIG[tier];
  const nextTier = getNextTier(tier);
  const progress = nextTier ? Math.min(((wins - config.minWins) / (nextTier.winsNeeded - config.minWins)) * 100, 100) : 100;
  const filledStars = config.stars;
  const partialFill = config.stars < totalStars ? (totalStars - config.stars) * (progress / 100) : 0;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-40 h-40">
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${config.bg} 0%, transparent 70%)`,
            border: `3px solid ${config.primary}`,
            boxShadow: `0 0 40px ${config.glow}, inset 0 0 30px ${config.glow}40`,
          }}
        >
          <div className="w-24 h-24">{config.icon}</div>
        </div>
        <div
          className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black"
          style={{
            background: `linear-gradient(135deg, ${config.primary}, ${config.secondary})`,
            color: tier === "mythic" || tier === "champion" ? "#030810" : "#0A0A10",
            fontFamily: "var(--font-display)",
            boxShadow: `0 0 16px ${config.glow}`,
            border: "2px solid rgba(0,0,0,0.3)",
          }}
        >
          #{wins}
        </div>
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-2xl font-black tracking-tight" style={{ color: config.primary, fontFamily: "var(--font-display)", textShadow: `0 0 20px ${config.glow}` }}>
          {config.label} {wins > 0 ? Math.floor(wins / config.stars) + 1 : "I"}
        </h2>
        <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
          {config.description}
        </p>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {TIER_ORDER.map((t, i) => {
          const tc = TIER_CONFIG[t];
          const isFilled = i < TIER_ORDER.indexOf(tier);
          return (
            <div
              key={t}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: isFilled ? tc.primary : "transparent",
                border: `2px solid ${tc.primary}`,
                opacity: isFilled ? 1 : 0.4,
                boxShadow: isFilled ? `0 0 8px ${tc.glow}` : "none",
              }}
            >
              {isFilled && <span className="text-[8px] font-black" style={{ color: t === "mythic" || t === "champion" ? "#030810" : "#0A0A10" }}>★</span>}
            </div>
          );
        })}
      </div>

      <div className="w-48 mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(77,191,255,0.1)", border: "1px solid rgba(77,191,255,0.1)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${config.primary}, ${config.secondary})`, boxShadow: `0 0 8px ${config.glow}` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />
      </div>
      {nextTier && (
        <p className="text-[10px] mt-2" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
          {nextTier.winsNeeded - wins} wins to {TIER_CONFIG[nextTier.key].label}
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="relative rounded-2xl p-4 text-center"
      style={{
        background: SURFACE,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 20px ${color}15`,
      }}
    >
      <div className="text-2xl font-black" style={{ color, fontFamily: "var(--font-display)", textShadow: `0 0 12px ${color}60` }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
        {label}
      </div>
      {sub && (
        <div className="text-[8px] mt-0.5" style={{ color: "var(--color-text-tertiary)", opacity: 0.7 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function TierMiniBadge({ tier, isActive, isCompleted, isNext }: { tier: TierKey; isActive: boolean; isCompleted: boolean; isNext: boolean }) {
  const config = TIER_CONFIG[tier];
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: isActive ? config.bg : isCompleted ? `${config.primary}20` : "rgba(77,191,255,0.03)",
          border: isActive ? `2px solid ${config.primary}` : isCompleted ? `1.5px solid ${config.primary}60` : "1px solid rgba(77,191,255,0.08)",
          boxShadow: isActive ? `0 0 20px ${config.glow}` : isCompleted ? `0 0 10px ${config.glow}40` : "none",
          transform: isActive ? "scale(1.15)" : "scale(1)",
        }}
      >
        <div className={`${isActive ? "w-9 h-9" : "w-7 h-7"} transition-all duration-300`}>
          {config.icon}
        </div>
      </div>
      <span
        className="text-[9px] font-bold uppercase tracking-wider mt-1.5"
        style={{
          color: isActive ? config.primary : isCompleted ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
          fontFamily: "var(--font-display)",
          opacity: isActive || isCompleted ? 1 : 0.5,
        }}
      >
        {config.label}
      </span>
      {isActive && (
        <motion.div
          className="absolute -bottom-1 w-2 h-2 rounded-full"
          style={{ background: config.primary, boxShadow: `0 0 8px ${config.glow}` }}
          layoutId="activeTierIndicator"
        />
      )}
      {isNext && !isActive && (
        <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full border" style={{ borderColor: config.primary, background: "transparent" }} />
      )}
    </div>
  );
}

function NavButton({ icon, label, href, primary }: { icon: React.ReactNode; label: string; href: string; primary?: boolean }) {
  if (primary) {
    return (
      <Link href={href} className="relative flex flex-col items-center gap-1">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
            boxShadow: `0 0 30px rgba(255,215,0,0.5), 0 4px 20px rgba(0,0,0,0.4)`,
            clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          }}
        >
          <span className="text-lg font-black" style={{ color: "#030810", fontFamily: "var(--font-display)" }}>
            {icon}
          </span>
        </motion.div>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: SURFACE,
          border: "1px solid rgba(77,191,255,0.15)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
        {label}
      </span>
    </Link>
  );
}

const MOCK_USER = {
  username: "PacificTrader",
  wallet_address: "0x1234...5678",
  total_arenas_entered: 48,
  total_arenas_won: 23,
  best_pnl_percent: 312.4,
  current_win_streak: 7,
  best_win_streak: 12,
  total_rounds_survived: 156,
  total_eliminations: 89,
};

export default function RankingPage() {
  const [animeLoaded, setAnimeLoaded] = useState(false);
  const wins = MOCK_USER.total_arenas_won;
  const tier = getTier(wins);
  const config = TIER_CONFIG[tier];
  const winRate = MOCK_USER.total_arenas_entered > 0 ? (MOCK_USER.total_arenas_won / MOCK_USER.total_arenas_entered) * 100 : 0;
  const currentTierIdx = TIER_ORDER.indexOf(tier);
  const totalStars = config.stars + Math.floor(wins / config.stars);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      const anime = (await import("animejs")).default;
      anime.set(".rank-badge-wrapper", { opacity: 0, scale: 0.8, y: 30 });
      anime.set(".rank-stat", { opacity: 0, translateY: 20 });
      anime.set(".rank-tier-path", { opacity: 0, scale: 0.9 });
      anime.set(".rank-nav", { opacity: 0, y: 20 });

      anime({ targets: ".rank-badge-wrapper", opacity: [0, 1], scale: [0.8, 1], y: [30, 0], duration: 1000, easing: "easeOutExpo" });
      anime({ targets: ".rank-stat", opacity: [0, 1], translateY: [20, 0], delay: anime.stagger(80, { start: 500 }), duration: 600, easing: "easeOutExpo" });
      anime({ targets: ".rank-tier-path", opacity: [0, 1], scale: [0.9, 1], delay: anime.stagger(60, { start: 800 }), duration: 600, easing: "easeOutExpo" });
      anime({ targets: ".rank-nav", opacity: [0, 1], y: [20, 0], delay: 1200, duration: 600, easing: "easeOutExpo" });

      setAnimeLoaded(true);
    })();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: MIDNIGHT }}>
      <StarFieldCanvas />

      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(77,191,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 70% 80%, rgba(255,107,74,0.04) 0%, transparent 50%)`,
        }}
      />

      <ParticleOrb delay={0} x="10%" y="20%" size={300} color="rgba(77,191,255,0.08)" />
      <ParticleOrb delay={3} x="80%" y="60%" size={250} color="rgba(255,107,74,0.06)" />
      <ParticleOrb delay={6} x="50%" y="80%" size={200} color="rgba(232,200,122,0.05)" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 pt-6 pb-4">
          <Link href="/" className="flex items-center gap-2">
            <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE, border: "1px solid rgba(77,191,255,0.15)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="#4DBFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
              Your Rank
            </span>
          </Link>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: SURFACE, border: "1px solid rgba(77,191,255,0.15)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V7L10 10" stroke="#4DBFFF" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="7" r="6" stroke="#4DBFFF" strokeWidth="1.5" />
            </svg>
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
              Season Ends: <span style={{ color: SKY }}>27d</span>
            </span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center px-4 pb-32">
          <div className="rank-badge-wrapper mt-6">
            <RankBadge tier={tier} wins={wins} totalStars={totalStars} />
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-8">
            <div className="rank-stat">
              <StatBox label="Win Rate" value={`${winRate.toFixed(1)}%`} sub="48 games" color={SKY} />
            </div>
            <div className="rank-stat">
              <StatBox label="Matches" value={MOCK_USER.total_arenas_entered.toString()} sub={`+${MOCK_USER.total_arenas_won} won`} color={CORAL} />
            </div>
            <div className="rank-stat">
              <StatBox label="Best PnL" value={`+${MOCK_USER.best_pnl_percent.toFixed(0)}%`} sub="all time" color={GOLD} />
            </div>
          </div>

          <div className="w-full max-w-lg mt-10 px-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
                Season Journey
              </h3>
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {wins} / {TIER_CONFIG[TIER_ORDER[TIER_ORDER.length - 1]].minWins} Wins
              </span>
            </div>

            <div className="rank-tier-path relative flex items-center justify-between px-2">
              <div
                className="absolute top-7 left-0 right-0 h-0.5"
                style={{
                  background: "rgba(77,191,255,0.08)",
                  borderRadius: "2px",
                }}
              />
              <motion.div
                className="absolute top-7 left-0 h-0.5 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${TIER_CONFIG["bronze"].primary}, ${config.primary})`,
                  boxShadow: `0 0 10px ${config.glow}`,
                  width: `${(wins / TIER_CONFIG["champion"].minWins) * 100}%`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(wins / TIER_CONFIG["champion"].minWins) * 100}%` }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              />

              {TIER_ORDER.map((t) => {
                const isCompleted = TIER_ORDER.indexOf(t) < currentTierIdx;
                const isActive = TIER_ORDER.indexOf(t) === currentTierIdx;
                const isNext = TIER_ORDER.indexOf(t) === currentTierIdx + 1;
                return <TierMiniBadge key={t} tier={t} isActive={isActive} isCompleted={isCompleted} isNext={isNext} />;
              })}
            </div>
          </div>

          <div className="w-full max-w-sm mt-10 px-2">
            <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: SURFACE, border: "1px solid rgba(77,191,255,0.1)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${config.primary}15`, border: `1.5px solid ${config.primary}40` }}>
                <div className="w-8 h-8">{config.icon}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>
                  Current Highest Rank
                </div>
                <div className="text-xs" style={{ color: config.primary, fontFamily: "var(--font-display)" }}>
                  {config.label} {wins > 0 ? Math.floor(wins / config.stars) + 1 : "I"} — {config.description}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black" style={{ color: config.primary, fontFamily: "var(--font-display)", textShadow: `0 0 10px ${config.glow}` }}>
                  #{wins}
                </div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
                  Rank
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="rank-nav fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ background: "linear-gradient(to top, rgba(3,8,16,0.98) 0%, rgba(3,8,16,0.9) 60%, transparent 100%)" }}>
          <div className="flex items-center justify-around max-w-md mx-auto">
            <NavButton
              label="Journey"
              href="/arenas"
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L13 7H18L14 11L15.5 17L10 14L4.5 17L6 11L2 7H7L10 2Z" fill="#4DBFFF" fillOpacity="0.8" />
                </svg>
              }
            />
            <NavButton
              label="Play"
              href="/arenas"
              primary
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5V19L19 12L8 5Z" fill="#030810" />
                </svg>
              }
            />
            <NavButton
              label="Conquest"
              href="/leaderboard"
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L13 7H18L14 11L15.5 17L10 14L4.5 17L6 11L2 7H7L10 2Z" fill="#E8C87A" fillOpacity="0.8" />
                </svg>
              }
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

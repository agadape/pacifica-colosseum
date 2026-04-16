"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  rankName: string;
}> = {
  bronze: {
    label: "Bronze",
    minWins: 0,
    primary: "#CD7F32",
    secondary: "#E8A050",
    glow: "rgba(205,127,50,0.5)",
    bg: "rgba(205,127,50,0.08)",
    border: "rgba(205,127,50,0.3)",
    stars: 1,
    description: "Arena Rookie",
    rankName: "Bronze Fighter",
    icon: (
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="bronzeOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#8B5A2B" />
            <stop offset="50%" stopColor="#CD7F32" />
            <stop offset="100%" stopColor="#8B5A2B" />
          </linearGradient>
          <linearGradient id="bronzeInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#E8A050" />
            <stop offset="100%" stopColor="#CD7F32" />
          </linearGradient>
          <filter id="bronzeGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#CD7F32" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bronzeOuter)" filter="url(#bronzeGlow)" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#E8A050" strokeWidth="1" strokeOpacity="0.5" />
        <polygon points="50,15 85,35 85,65 50,85 15,65 15,35" fill="url(#bronzeInner)" stroke="#E8A050" strokeWidth="2" />
        <polygon points="50,22 78,38 78,62 50,78 22,62 22,38" fill="#CD7F32" fillOpacity="0.3" stroke="#E8A050" strokeWidth="1" />
        <circle cx="50" cy="50" r="12" fill="url(#bronzeOuter)" stroke="#E8A050" strokeWidth="2" />
        <circle cx="50" cy="50" r="6" fill="#E8A050" />
        <path d="M50 28 L53 40 L65 42 L56 50 L58 62 L50 56 L42 62 L44 50 L35 42 L47 40 Z" fill="#E8A050" fillOpacity="0.6" />
      </svg>
    ),
  },
  silver: {
    label: "Silver",
    minWins: 3,
    primary: "#C0C0C0",
    secondary: "#E8E8E8",
    glow: "rgba(192,192,192,0.5)",
    bg: "rgba(192,192,192,0.08)",
    border: "rgba(192,192,192,0.3)",
    stars: 2,
    description: "Arena Challenger",
    rankName: "Silver Warrior",
    icon: (
      <Image src="/badges/Badge1.png" alt="Silver Badge" width={400} height={400} className="w-full h-full object-contain" />
    ),
  },
  gold: {
    label: "Gold",
    minWins: 7,
    primary: "#FFD700",
    secondary: "#FFF0A0",
    glow: "rgba(255,215,0,0.6)",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.3)",
    stars: 3,
    description: "Arena Warrior",
    rankName: "Gold Champion",
    icon: (
      <Image src="/badges/Badge2.png" alt="Gold Badge" width={400} height={400} className="w-full h-full object-contain" />
    ),
  },
  epic: {
    label: "Epic",
    minWins: 12,
    primary: "#9D50BB",
    secondary: "#C88AFF",
    glow: "rgba(157,80,187,0.6)",
    bg: "rgba(157,80,187,0.08)",
    border: "rgba(157,80,187,0.3)",
    stars: 4,
    description: "Arena Elite",
    rankName: "Epic Master",
    icon: (
      <Image src="/badges/Badge3.png" alt="Epic Badge" width={400} height={400} className="w-full h-full object-contain" />
    ),
  },
  legend: {
    label: "Legend",
    minWins: 20,
    primary: "#FF6B4A",
    secondary: "#FF9A7A",
    glow: "rgba(255,107,74,0.65)",
    bg: "rgba(255,107,74,0.08)",
    border: "rgba(255,107,74,0.3)",
    stars: 5,
    description: "Arena Master",
    rankName: "Legendary Champion",
    icon: (
      <Image src="/badges/Badge4.png" alt="Legend Badge" width={400} height={400} className="w-full h-full object-contain" />
    ),
  },
  mythic: {
    label: "Mythic",
    minWins: 30,
    primary: "#4DBFFF",
    secondary: "#A8DEFF",
    glow: "rgba(77,191,255,0.7)",
    bg: "rgba(77,191,255,0.08)",
    border: "rgba(77,191,255,0.3)",
    stars: 6,
    description: "Arena Supreme",
    rankName: "Mythic Overlord",
    icon: (
      <Image src="/badges/Badge5.png" alt="Mythic Badge" width={400} height={400} className="w-full h-full object-contain" />
    ),
  },
  champion: {
    label: "Champion",
    minWins: 50,
    primary: "#FFD700",
    secondary: "#FFFFFF",
    glow: "rgba(255,215,0,0.8)",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.5)",
    stars: 7,
    description: "Colosseum Legend",
    rankName: "Supreme Champion",
    icon: (
      <Image src="/badges/Badge6.png" alt="Champion Badge" width={400} height={400} className="w-full h-full object-contain" />
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

function StarFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: Array<{ x: number; y: number; size: number; opacity: number; twinkle: number; twinkleSpeed: number; color: string }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      stars.length = 0;
      const colors = ["77,191,255", "255,215,0", "255,107,74", "232,200,122", "165,231,242"];
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          size: Math.random() * 2.5 + 0.3,
          opacity: Math.random() * 0.6 + 0.1,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.04 + 0.008,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.twinkle += star.twinkleSpeed;
        const currentOpacity = star.opacity * (0.4 + 0.6 * Math.sin(star.twinkle));
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${star.color},${currentOpacity})`;
        ctx!.fill();
        if (star.size > 1.5) {
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${star.color},${currentOpacity * 0.2})`;
          ctx!.fill();
        }
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

function FloatingParticle({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      animate={{
        x: [0, 40, -30, 0],
        y: [0, -50, 30, 0],
        scale: [1, 1.3, 0.8, 1],
        opacity: [0.6, 1, 0.4, 0.6],
      }}
      transition={{ duration: 15 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function BadgeOrnament({ tier, position }: { tier: TierKey; position: "tl" | "tr" | "bl" | "br" }) {
  const config = TIER_CONFIG[tier];
  const rotations = { tl: 0, tr: 90, bl: -90, br: 180 };
  const transforms = {
    tl: "top-2 left-2",
    tr: "top-2 right-2 rotate-90",
    bl: "bottom-2 left-2 -rotate-90",
    br: "bottom-2 right-2 rotate-180",
  };

  return (
    <div className={`absolute ${transforms[position]} w-6 h-6 pointer-events-none`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" style={{ filter: `drop-shadow(0 0 4px ${config.glow})` }}>
        <path d="M2 2 L12 2 L12 4 L4 4 L4 12 L2 12 Z" fill={config.primary} fillOpacity="0.6" />
        <path d="M2 2 L12 2 L12 4 L4 4 L4 12 L2 12 Z" stroke={config.secondary} strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function RankBadge({ tier, wins }: { tier: TierKey; wins: number }) {
  const config = TIER_CONFIG[tier];
  const nextTier = getNextTier(tier);
  const progress = nextTier ? Math.min(((wins - config.minWins) / (nextTier.winsNeeded - config.minWins)) * 100, 100) : 100;
  const tierIndex = TIER_ORDER.indexOf(tier);

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div
          className="relative w-56 h-56"
          style={{ filter: `drop-shadow(0 0 30px ${config.glow}) drop-shadow(0 0 60px ${config.glow}50)` }}
        >
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)` }} />

          <div className="relative w-full h-full rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${config.bg} 0%, transparent 60%)` }}>
            <div
              className="absolute inset-2 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${SURFACE} 0%, rgba(3,8,16,0.9) 100%)`,
                border: `3px solid ${config.primary}`,
                boxShadow: `inset 0 0 40px ${config.glow}30, 0 0 20px ${config.glow}40`,
              }}
            >
              <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${config.primary}10 0%, transparent 50%)` }} />

              <div className="absolute inset-3 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `1px solid ${config.primary}30` }}>
                <div className="w-44 h-44 relative">
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
                      {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const rad = (angle - 90) * Math.PI / 180;
                        const x1 = 50 + 45 * Math.cos(rad);
                        const y1 = 50 + 45 * Math.sin(rad);
                        const x2 = 50 + 48 * Math.cos(rad);
                        const y2 = 50 + 48 * Math.sin(rad);
                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={config.primary} strokeWidth="1" strokeOpacity="0.5" />;
                      })}
                    </svg>
                  </motion.div>

                  <div className="w-full h-full">
                    {config.icon}
                  </div>
                </div>
              </div>

              <BadgeOrnament tier={tier} position="tl" />
              <BadgeOrnament tier={tier} position="tr" />
              <BadgeOrnament tier={tier} position="bl" />
              <BadgeOrnament tier={tier} position="br" />
            </div>
          </div>

          <motion.div
            className="absolute -top-1 -right-1 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm"
            style={{
              background: `linear-gradient(135deg, ${config.primary}, ${config.secondary})`,
              color: tier === "mythic" || tier === "champion" ? "#030810" : "#0A0A10",
              fontFamily: "var(--font-display)",
              boxShadow: `0 0 20px ${config.glow}, 0 4px 12px rgba(0,0,0,0.4)`,
              border: "2px solid rgba(255,255,255,0.2)",
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            #{wins}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-black tracking-tight" style={{ color: config.primary, fontFamily: "var(--font-display)", textShadow: `0 0 30px ${config.glow}` }}>
          {config.label}
        </h2>
        <p className="text-xs uppercase tracking-[0.3em] mt-2" style={{ color: config.secondary, fontFamily: "var(--font-display)" }}>
          {config.rankName}
        </p>
      </motion.div>

      <motion.div
        className="flex items-center gap-1.5 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[...Array(tierIndex + 1)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1, type: "spring" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${TIER_CONFIG[TIER_ORDER[i]].primary}, ${TIER_CONFIG[TIER_ORDER[i]].secondary})`,
                boxShadow: `0 0 12px ${TIER_CONFIG[TIER_ORDER[i]].glow}`,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <span className="text-[10px] font-black" style={{ color: i >= 5 ? "#030810" : "#0A0A10" }}>★</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="w-56 mt-5 h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(77,191,255,0.08)", border: "1px solid rgba(77,191,255,0.15)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${config.primary}, ${config.secondary})`,
            boxShadow: `0 0 12px ${config.glow}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, delay: 0.9, ease: "easeOut" }}
        />
      </motion.div>

      {nextTier && (
        <p className="text-[11px] mt-2.5 tracking-wide" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
          <span style={{ color: config.primary }}>{nextTier.winsNeeded - wins}</span> wins to {TIER_CONFIG[nextTier.key].label}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, delay }: { label: string; value: string; sub?: string; color: string; delay: number }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5 + delay * 0.15, type: "spring", stiffness: 300 }}
    >
      <div
        className="relative rounded-2xl p-4 text-center overflow-hidden"
        style={{
          background: SURFACE,
          border: `1px solid ${color}25`,
          boxShadow: `0 0 0 1px ${color}10, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}15`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle at 50% 0%, ${color}20 0%, transparent 60%)` }}
        />

        <div
          className="text-2xl font-black tracking-tight"
          style={{ color, fontFamily: "var(--font-display)", textShadow: `0 0 20px ${color}50` }}
        >
          {value}
        </div>

        <div className="text-xs uppercase tracking-[0.2em] mt-1.5" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
          {label}
        </div>

        {sub && (
          <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-tertiary)", opacity: 0.7 }}>
            {sub}
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
        />
      </div>
    </motion.div>
  );
}

function TierPathItem({ tier, isActive, isCompleted, index }: { tier: TierKey; isActive: boolean; isCompleted: boolean; index: number }) {
  const config = TIER_CONFIG[tier];

  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.08, type: "spring", stiffness: 300 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        animate={isActive ? {
          scale: [1, 1.1, 1],
          boxShadow: [
            `0 0 20px ${config.glow}`,
            `0 0 40px ${config.glow}`,
            `0 0 20px ${config.glow}`,
          ],
        } : {}}
        transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
        style={{
          background: isActive ? config.bg : isCompleted ? `${config.primary}15` : "rgba(77,191,255,0.03)",
          border: isActive ? `2.5px solid ${config.primary}` : isCompleted ? `1.5px solid ${config.primary}50` : "1px solid rgba(77,191,255,0.1)",
          boxShadow: isActive ? `0 0 25px ${config.glow}` : isCompleted ? `0 0 10px ${config.glow}30` : "none",
          transform: isActive ? "scale(1.15)" : "scale(1)",
        }}
      >
        <div className={`${isActive ? "w-36 h-36" : "w-32 h-32"} transition-all duration-300`}>
          {config.icon}
        </div>
      </motion.div>

      <span
        className="text-[10px] font-bold uppercase tracking-wider mt-2"
        style={{
          color: isActive ? config.primary : isCompleted ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
          fontFamily: "var(--font-display)",
        }}
      >
        {config.label}
      </span>

      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: config.primary }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4L3 6L7 2" stroke="#030810" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

function NavButton({ icon, label, href, primary }: { icon: React.ReactNode; label: string; href: string; primary?: boolean }) {
  if (primary) {
    return (
      <Link href={href} className="relative flex flex-col items-center gap-1.5">
        <motion.div
          whileHover={{ scale: 1.15, y: -3 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
          style={{
            filter: `drop-shadow(0 0 20px rgba(255,215,0,0.6)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))`,
          }}
        >
          <div
            className="w-16 h-16 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM}, ${GOLD})`,
              clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)",
            }}
          >
            <div className="text-lg font-black" style={{ color: "#030810", fontFamily: "var(--font-display)" }}>
              {icon}
            </div>
          </div>
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)`,
              clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)",
            }}
          />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-1.5">
      <motion.div
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: SURFACE,
          border: "1px solid rgba(77,191,255,0.15)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {icon}
      </motion.div>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
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
  const wins = MOCK_USER.total_arenas_won;
  const tier = getTier(wins);
  const config = TIER_CONFIG[tier];
  const winRate = MOCK_USER.total_arenas_entered > 0 ? (MOCK_USER.total_arenas_won / MOCK_USER.total_arenas_entered) * 100 : 0;
  const currentTierIdx = TIER_ORDER.indexOf(tier);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: MIDNIGHT }}>
      <StarFieldCanvas />

      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 0%, rgba(77,191,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 20% 100%, rgba(255,107,74,0.05) 0%, transparent 40%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(232,200,122,0.04) 0%, transparent 40%)
          `,
        }}
      />

      <FloatingParticle delay={0} x="5%" y="15%" size={400} color="rgba(77,191,255,0.06)" />
      <FloatingParticle delay={4} x="85%" y="25%" size={350} color="rgba(255,107,74,0.05)" />
      <FloatingParticle delay={8} x="60%" y="70%" size={300} color="rgba(255,215,0,0.04)" />
      <FloatingParticle delay={12} x="20%" y="80%" size={250} color="rgba(77,191,255,0.04)" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 pt-6 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: SURFACE,
                border: "1px solid rgba(77,191,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="#4DBFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <span className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
              Your Rank
            </span>
          </Link>

          <motion.div
            className="flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{
              background: SURFACE,
              border: "1px solid rgba(77,191,255,0.15)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
            animate={{ boxShadow: ["0 4px 16px rgba(0,0,0,0.3)", "0 4px 20px rgba(77,191,255,0.1)", "0 4px 16px rgba(0,0,0,0.3)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin" style={{ animationDuration: "4s" }}>
              <circle cx="7" cy="7" r="6" stroke="#4DBFFF" strokeWidth="1.5" strokeDasharray="20 10" />
            </svg>
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}>
              Season Ends: <span style={{ color: SKY }}>27d</span>
            </span>
          </motion.div>
        </header>

        <div className="flex-1 flex flex-col items-center px-4 pb-36">
          <div className="mt-4">
            <RankBadge tier={tier} wins={wins} />
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-8">
            <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} sub="48 games" color={SKY} delay={0} />
            <StatCard label="Matches" value={MOCK_USER.total_arenas_entered.toString()} sub={`+${MOCK_USER.total_arenas_won} won`} color={CORAL} delay={1} />
            <StatCard label="Best PnL" value={`+${MOCK_USER.best_pnl_percent.toFixed(0)}%`} sub="all time" color={GOLD} delay={2} />
          </div>

          <div className="w-full max-w-2xl mt-10 px-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
                Season Journey
              </h3>
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {wins} / {TIER_CONFIG["champion"].minWins} Wins
              </span>
            </div>

            <div className="relative flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: SURFACE, border: "1px solid rgba(77,191,255,0.08)" }}>
              <div
                className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 rounded-full"
                style={{ background: "rgba(77,191,255,0.06)" }}
              />
              <motion.div
                className="absolute top-1/2 left-4 h-1 -translate-y-1/2 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${TIER_CONFIG["bronze"].primary}, ${config.primary})`,
                  boxShadow: `0 0 12px ${config.glow}`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(wins / TIER_CONFIG["champion"].minWins) * 100}%` }}
                transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
              />

              {TIER_ORDER.map((t, i) => (
                <TierPathItem
                  key={t}
                  tier={t}
                  isActive={i === currentTierIdx}
                  isCompleted={i < currentTierIdx}
                  index={i}
                />
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm mt-8 px-2">
            <motion.div
              className="flex items-center gap-4 p-4 rounded-2xl overflow-hidden"
              style={{
                background: SURFACE,
                border: `1px solid ${config.primary}20`,
                boxShadow: `0 0 0 1px ${config.primary}08, 0 8px 32px rgba(0,0,0,0.3)`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: `${config.primary}15`,
                  border: `2px solid ${config.primary}40`,
                  boxShadow: `0 0 20px ${config.glow}30`,
                }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                <div className="w-36 h-36">{config.icon}</div>
              </motion.div>

              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>
                  Highest Rank Achieved
                </div>
                <div className="text-xs mt-0.5" style={{ color: config.primary, fontFamily: "var(--font-display)" }}>
                  {config.rankName}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black" style={{ color: config.primary, fontFamily: "var(--font-display)", textShadow: `0 0 15px ${config.glow}` }}>
                  #{wins}
                </div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
                  Rank
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <nav
          className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, rgba(3,8,16,0.98) 0%, rgba(3,8,16,0.95) 60%, rgba(3,8,16,0.8) 100%)",
          }}
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            <NavButton
              label="Journey"
              href="/arenas"
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L13 7H18L14 11L15.5 17L10 14L4.5 17L6 11L2 7H7L10 2Z" fill="#4DBFFF" fillOpacity="0.9" />
                </svg>
              }
            />
            <NavButton
              label="Play"
              href="/arenas"
              primary
              icon={
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M7 4V18L19 11L7 4Z" fill="#030810" />
                </svg>
              }
            />
            <NavButton
              label="Conquest"
              href="/leaderboard"
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L13 7H18L14 11L15.5 17L10 14L4.5 17L6 11L2 7H7L10 2Z" fill="#E8C87A" fillOpacity="0.9" />
                </svg>
              }
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

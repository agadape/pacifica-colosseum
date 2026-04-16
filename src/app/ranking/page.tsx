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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="silverOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#888" />
            <stop offset="50%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#888" />
          </linearGradient>
          <linearGradient id="silverInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#E8E8E8" />
            <stop offset="100%" stopColor="#C0C0C0" />
          </linearGradient>
          <filter id="silverGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feFlood floodColor="#C0C0C0" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#silverOuter)" filter="url(#silverGlow)" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#E8E8E8" strokeWidth="1.5" strokeOpacity="0.6" />
        <polygon points="50,12 88,33 88,67 50,88 12,67 12,33" fill="url(#silverInner)" stroke="#E8E8E8" strokeWidth="2.5" />
        <polygon points="50,20 80,38 80,62 50,80 20,62 20,38" fill="#C0C0C0" fillOpacity="0.2" stroke="#E8E8E8" strokeWidth="1" />
        <path d="M50 25 L60 42 L78 45 L64 58 L68 76 L50 66 L32 76 L36 58 L22 45 L40 42 Z" fill="url(#silverInner)" stroke="#E8E8E8" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="10" fill="url(#silverOuter)" stroke="#E8E8E8" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
      </svg>
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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="goldOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#B8860B" />
            <stop offset="30%" stopColor="#FFD700" />
            <stop offset="70%" stopColor="#FFF0A0" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <linearGradient id="goldInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#FFF0A0" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <radialGradient id="goldCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </radialGradient>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#FFD700" floodOpacity="0.7" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#goldOuter)" filter="url(#goldGlow)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#FFF0A0" strokeWidth="2" strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#FFD700" strokeWidth="1" strokeDasharray="3 3" />
        <polygon points="50,8 92,30 92,70 50,92 8,70 8,30" fill="url(#goldInner)" stroke="#FFF0A0" strokeWidth="3" />
        <polygon points="50,18 82,36 82,64 50,82 18,64 18,36" fill="#FFD700" fillOpacity="0.15" stroke="#FFF0A0" strokeWidth="1.5" />
        <path d="M50 22 L62 40 L82 43 L66 56 L70 76 L50 65 L30 76 L34 56 L18 43 L38 40 Z" fill="url(#goldInner)" stroke="#FFF0A0" strokeWidth="2" />
        <circle cx="50" cy="50" r="14" fill="url(#goldCenter)" stroke="#FFF0A0" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="6" fill="#FFFFFF" />
        <path d="M50 36 L54 46 L65 47 L57 54 L59 65 L50 59 L41 65 L43 54 L35 47 L46 46 Z" fill="#FFF0A0" />
      </svg>
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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="epicOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#6B2D8B" />
            <stop offset="50%" stopColor="#9D50BB" />
            <stop offset="100%" stopColor="#6B2D8B" />
          </linearGradient>
          <linearGradient id="epicInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#C88AFF" />
            <stop offset="100%" stopColor="#9D50BB" />
          </linearGradient>
          <radialGradient id="epicCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0B8FF" />
            <stop offset="100%" stopColor="#9D50BB" />
          </radialGradient>
          <filter id="epicGlow">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feFlood floodColor="#9D50BB" floodOpacity="0.8" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#epicOuter)" filter="url(#epicGlow)" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#C88AFF" strokeWidth="2" strokeOpacity="0.6" />
        <polygon points="50,5 95,28 95,72 50,95 5,72 5,28" fill="url(#epicInner)" stroke="#C88AFF" strokeWidth="3" />
        <polygon points="50,14 86,34 86,66 50,86 14,66 14,34" fill="#9D50BB" fillOpacity="0.2" stroke="#C88AFF" strokeWidth="1.5" />
        <polygon points="50,24 76,40 76,60 50,76 24,60 24,40" fill="url(#epicInner)" stroke="#C88AFF" strokeWidth="1" />
        <path d="M50 20 L64 38 L84 40 L68 52 L74 72 L50 60 L26 72 L32 52 L16 40 L36 38 Z" fill="url(#epicInner)" stroke="#E0B8FF" strokeWidth="2" />
        <circle cx="50" cy="50" r="16" fill="url(#epicCore)" stroke="#C88AFF" strokeWidth="3" />
        <circle cx="50" cy="50" r="8" fill="#E0B8FF" />
        <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
        <path d="M50 34 L55 45 L67 46 L58 53 L60 65 L50 58 L40 65 L42 53 L33 46 L45 45 Z" fill="#C88AFF" fillOpacity="0.8" />
      </svg>
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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="legendOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#CC4422" />
            <stop offset="50%" stopColor="#FF6B4A" />
            <stop offset="100%" stopColor="#CC4422" />
          </linearGradient>
          <linearGradient id="legendInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#FF9A7A" />
            <stop offset="100%" stopColor="#FF6B4A" />
          </linearGradient>
          <radialGradient id="legendCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFDDD0" />
            <stop offset="50%" stopColor="#FF6B4A" />
            <stop offset="100%" stopColor="#CC4422" />
          </radialGradient>
          <filter id="legendGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#FF6B4A" floodOpacity="0.9" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#legendOuter)" filter="url(#legendGlow)" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#FF9A7A" strokeWidth="2.5" strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#FF6B4A" strokeWidth="1" strokeDasharray="5 3" />
        <polygon points="50,3 97,26 97,74 50,97 3,74 3,26" fill="url(#legendInner)" stroke="#FF9A7A" strokeWidth="3.5" />
        <polygon points="50,12 88,32 88,68 50,88 12,68 12,32" fill="#FF6B4A" fillOpacity="0.15" stroke="#FF9A7A" strokeWidth="2" />
        <polygon points="50,22 78,38 78,62 50,78 22,62 22,38" fill="url(#legendInner)" stroke="#FF9A7A" strokeWidth="1.5" />
        <path d="M50 18 L66 36 L86 38 L70 50 L76 70 L50 58 L24 70 L30 50 L14 38 L34 36 Z" fill="url(#legendInner)" stroke="#FFDDD0" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="18" fill="url(#legendCore)" stroke="#FF9A7A" strokeWidth="3" />
        <circle cx="50" cy="50" r="8" fill="#FFDDD0" />
        <path d="M50 32 L56 44 L69 45 L59 53 L62 66 L50 59 L38 66 L41 53 L31 45 L44 44 Z" fill="#FF9A7A" />
        <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
      </svg>
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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="mythicOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#1A8CCC" />
            <stop offset="50%" stopColor="#4DBFFF" />
            <stop offset="100%" stopColor="#1A8CCC" />
          </linearGradient>
          <linearGradient id="mythicInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#A8DEFF" />
            <stop offset="100%" stopColor="#4DBFFF" />
          </linearGradient>
          <radialGradient id="mythicCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#A8DEFF" />
            <stop offset="100%" stopColor="#4DBFFF" />
          </radialGradient>
          <filter id="mythicGlow">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feFlood floodColor="#4DBFFF" floodOpacity="1" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#mythicOuter)" filter="url(#mythicGlow)" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#A8DEFF" strokeWidth="2.5" strokeOpacity="0.8" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#4DBFFF" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#A8DEFF" strokeWidth="1" strokeOpacity="0.5" />
        <polygon points="50,1 99,25 99,75 50,99 1,75 1,25" fill="url(#mythicInner)" stroke="#A8DEFF" strokeWidth="4" />
        <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="#4DBFFF" fillOpacity="0.1" stroke="#A8DEFF" strokeWidth="2" />
        <polygon points="50,20 80,36 80,64 50,80 20,64 20,36" fill="url(#mythicInner)" stroke="#A8DEFF" strokeWidth="1.5" />
        <path d="M50 16 L68 34 L88 36 L72 48 L78 68 L50 55 L22 68 L28 48 L12 36 L32 34 Z" fill="url(#mythicInner)" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="20" fill="url(#mythicCore)" stroke="#A8DEFF" strokeWidth="3.5" />
        <circle cx="50" cy="50" r="10" fill="#FFFFFF" fillOpacity="0.9" />
        <path d="M50 30 L57 43 L71 44 L60 53 L63 67 L50 59 L37 67 L40 53 L29 44 L43 43 Z" fill="#A8DEFF" />
        <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="2" fill="#4DBFFF" />
      </svg>
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
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="champOuter" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#996515" />
            <stop offset="25%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF8DC" />
            <stop offset="75%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#996515" />
          </linearGradient>
          <linearGradient id="champInner" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <radialGradient id="champCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#FFF8DC" />
            <stop offset="70%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#996515" />
          </radialGradient>
          <filter id="champGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#FFD700" floodOpacity="1" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="49" fill="url(#champOuter)" filter="url(#champGlow)" />
        <circle cx="50" cy="50" r="47" fill="none" stroke="#FFF8DC" strokeWidth="3" strokeOpacity="0.9" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#FFD700" strokeWidth="2" strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#FFF8DC" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="50" cy="50" r="39" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.5" />
        <polygon points="50,-2 102,24 102,76 50,102 -2,76 -2,24" fill="url(#champInner)" stroke="#FFF8DC" strokeWidth="4.5" />
        <polygon points="50,8 92,28 92,72 50,92 8,72 8,28" fill="#FFD700" fillOpacity="0.08" stroke="#FFF8DC" strokeWidth="2.5" />
        <polygon points="50,18 84,34 84,66 50,82 16,66 16,34" fill="url(#champInner)" stroke="#FFF8DC" strokeWidth="2" />
        <polygon points="50,28 76,40 76,60 50,72 24,60 24,40" fill="url(#champInner)" stroke="#FFFFFF" strokeWidth="1.5" />
        <path d="M50 14 L70 32 L90 34 L74 46 L80 66 L50 52 L20 66 L26 46 L10 34 L30 32 Z" fill="url(#champInner)" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="50" cy="50" r="22" fill="url(#champCore)" stroke="#FFF8DC" strokeWidth="4" />
        <circle cx="50" cy="50" r="12" fill="#FFFFFF" />
        <path d="M50 28 L58 42 L73 43 L62 53 L65 68 L50 59 L35 68 L38 53 L27 43 L42 42 Z" fill="#FFD700" />
        <circle cx="50" cy="50" r="6" fill="#FFF8DC" />
        <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45) * Math.PI / 180;
          const x = 50 + 37 * Math.cos(angle);
          const y = 50 + 37 * Math.sin(angle);
          return <circle key={i} cx={x} cy={y} r="2" fill="#FFF8DC" fillOpacity="0.8" />;
        })}
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
          className="relative w-48 h-48"
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
                <div className="w-28 h-28 relative">
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

                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                  >
                    {config.icon}
                  </motion.div>
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

        <div className="text-[10px] uppercase tracking-[0.2em] mt-1.5" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
          {label}
        </div>

        {sub && (
          <div className="text-[9px] mt-0.5" style={{ color: "var(--color-text-tertiary)", opacity: 0.7 }}>
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
        <div className={`${isActive ? "w-10 h-10" : "w-8 h-8"} transition-all duration-300`}>
          {config.icon}
        </div>
      </motion.div>

      <span
        className="text-[9px] font-bold uppercase tracking-wider mt-2"
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
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GOLD, fontFamily: "var(--font-display)" }}>
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
                <div className="w-9 h-9">{config.icon}</div>
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
                <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
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

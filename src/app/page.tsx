"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import SpotlightCard from "@/components/shared/SpotlightCard";

// Load FaultyTerminal client-side only (WebGL)
const FaultyTerminal = dynamic(
  () => import("@/components/shared/FaultyTerminal"),
  { ssr: false }
);

// Load Dither client-side only (WebGL / React Three Fiber)
const Dither = dynamic(
  () => import("@/components/shared/Dither"),
  { ssr: false }
);

// ── Palette tokens (match globals.css new palette) ──────────────────────────
const SKY   = "#4DBFFF";
const SKY2  = "#2A9FE8";
const CORAL = "#FF6B4A";
const GOLD  = "#E8C87A";

// ── Gacha card art — SVG illustrations per step ─────────────────────────────
const STEP_ART = {
  "01": (color: string) => (
    <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="shieldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="38" ry="38" fill="url(#shieldGlow)"/>
      {/* Shield */}
      <path d="M50 18 L72 28 L72 52 C72 68 50 80 50 80 C50 80 28 68 28 52 L28 28 Z"
        fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M50 22 L68 30 L68 52 C68 66 50 76 50 76 C50 76 32 66 32 52 L32 30 Z"
        fill={color} fillOpacity="0.12"/>
      {/* Check / sword vertical */}
      <line x1="50" y1="36" x2="50" y2="64" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="50" x2="59" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Sparkles */}
      <circle cx="30" cy="24" r="1.5" fill={color} fillOpacity="0.8"/>
      <circle cx="72" cy="30" r="1" fill={color} fillOpacity="0.6"/>
      <circle cx="26" cy="60" r="1" fill={color} fillOpacity="0.5"/>
      <circle cx="75" cy="55" r="1.5" fill={color} fillOpacity="0.7"/>
    </svg>
  ),
  "02": (color: string) => (
    <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="chartGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={color} stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="36" ry="32" fill="url(#chartGlow)"/>
      {/* Sword handle → candle */}
      <rect x="47" y="22" width="6" height="28" rx="3" fill={color} fillOpacity="0.9"/>
      <rect x="40" y="34" width="20" height="3" rx="1.5" fill={color} fillOpacity="0.7"/>
      {/* Candlestick bars */}
      <rect x="28" y="52" width="8" height="22" rx="2" fill="url(#barGrad)"/>
      <line x1="32" y1="48" x2="32" y2="52" stroke={color} strokeWidth="1.5"/>
      <line x1="32" y1="74" x2="32" y2="78" stroke={color} strokeWidth="1.5"/>
      <rect x="42" y="44" width="8" height="30" rx="2" fill="url(#barGrad)"/>
      <line x1="46" y1="40" x2="46" y2="44" stroke={color} strokeWidth="1.5"/>
      <rect x="56" y="36" width="8" height="38" rx="2" fill="url(#barGrad)"/>
      <line x1="60" y1="30" x2="60" y2="36" stroke={color} strokeWidth="1.5"/>
      <line x1="60" y1="74" x2="60" y2="80" stroke={color} strokeWidth="1.5"/>
      {/* Up arrow */}
      <polyline points="32,68 46,56 56,62 70,42" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="70,38 75,46 65,44" fill={color}/>
      {/* Sparkles */}
      <circle cx="25" cy="38" r="1.5" fill={color} fillOpacity="0.6"/>
      <circle cx="74" cy="30" r="1" fill={color} fillOpacity="0.8"/>
    </svg>
  ),
  "03": (color: string) => (
    <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="rankGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="36" ry="34" fill="url(#rankGlow)"/>
      {/* Rank medal circle */}
      <circle cx="50" cy="56" r="24" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.08"/>
      <circle cx="50" cy="56" r="18" stroke={color} strokeWidth="1" strokeDasharray="4 3" fill="none" strokeOpacity="0.5"/>
      {/* Lightning bolt */}
      <path d="M54 34 L44 54 L52 54 L46 78 L60 50 L52 50 Z" fill={color} fillOpacity="0.9" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
      {/* Ranking bars */}
      <rect x="22" y="74" width="6" height="10" rx="1" fill={color} fillOpacity="0.4"/>
      <rect x="31" y="68" width="6" height="16" rx="1" fill={color} fillOpacity="0.6"/>
      <rect x="62" y="68" width="6" height="16" rx="1" fill={color} fillOpacity="0.6"/>
      <rect x="71" y="74" width="6" height="10" rx="1" fill={color} fillOpacity="0.4"/>
      {/* Sparkles */}
      <circle cx="26" cy="36" r="2" fill={color} fillOpacity="0.7"/>
      <circle cx="74" cy="34" r="1.5" fill={color} fillOpacity="0.6"/>
      <circle cx="78" cy="50" r="1" fill={color} fillOpacity="0.5"/>
      <circle cx="22" cy="50" r="1" fill={color} fillOpacity="0.5"/>
    </svg>
  ),
  "04": (color: string) => (
    <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
      <defs>
        <radialGradient id="crownGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={color} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="42" ry="40" fill="url(#crownGlow)"/>
      {/* Crown base */}
      <rect x="28" y="60" width="44" height="14" rx="3" fill="url(#crownGrad)" fillOpacity="0.85"/>
      {/* Crown points */}
      <polygon points="28,60 28,38 38,50 50,30 62,50 72,38 72,60" fill="url(#crownGrad)" fillOpacity="0.9"/>
      {/* Crown gems */}
      <circle cx="50" cy="34" r="4" fill={color}/>
      <circle cx="50" cy="34" r="2" fill="white" fillOpacity="0.6"/>
      <circle cx="33" cy="53" r="3" fill={color} fillOpacity="0.8"/>
      <circle cx="67" cy="53" r="3" fill={color} fillOpacity="0.8"/>
      {/* Shine lines */}
      <line x1="50" y1="16" x2="50" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="28" x2="27" y2="34" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="78" y1="28" x2="73" y2="34" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Star sparkles */}
      <circle cx="20" cy="45" r="2" fill={color} fillOpacity="0.7"/>
      <circle cx="80" cy="42" r="2" fill={color} fillOpacity="0.7"/>
      <circle cx="18" cy="64" r="1.5" fill={color} fillOpacity="0.5"/>
      <circle cx="82" cy="60" r="1.5" fill={color} fillOpacity="0.5"/>
      <circle cx="35" cy="80" r="1" fill={color} fillOpacity="0.4"/>
      <circle cx="65" cy="80" r="1" fill={color} fillOpacity="0.4"/>
    </svg>
  ),
};

const HOW_IT_WORKS = [
  {
    step: "01",
    label: "STEP 1",
    title: "Enter the Arena",
    description: "Register your wallet and join a funded battle royale arena.",
    rarity: 3,
    color: "#5DD9A8",
    glow: "rgba(93,217,168,0.35)",
    cardBg: "linear-gradient(180deg, #061A12 0%, #030D09 100%)",
    borderColor: "rgba(93,217,168,0.45)",
    artBg: "rgba(93,217,168,0.07)",
    spotlightRgb: "93, 217, 168",
  },
  {
    step: "02",
    label: "STEP 2",
    title: "Trade to Survive",
    description: "Open positions on BTC, ETH, SOL perps. Stay in the top ranks.",
    rarity: 4,
    color: SKY,
    glow: "rgba(77,191,255,0.35)",
    cardBg: "linear-gradient(180deg, #061220 0%, #030A14 100%)",
    borderColor: "rgba(77,191,255,0.45)",
    artBg: "rgba(77,191,255,0.07)",
    spotlightRgb: "77, 191, 255",
  },
  {
    step: "03",
    label: "STEP 3",
    title: "Climb the Ranks",
    description: "Survive each round as leverage drops and conditions tighten.",
    rarity: 4,
    color: CORAL,
    glow: "rgba(255,107,74,0.35)",
    cardBg: "linear-gradient(180deg, #1A0A06 0%, #0D0503 100%)",
    borderColor: "rgba(255,107,74,0.45)",
    artBg: "rgba(255,107,74,0.07)",
    spotlightRgb: "255, 107, 74",
  },
  {
    step: "04",
    label: "STEP 4",
    title: "Win it All",
    description: "Last trader standing. Claim the crown and the prize pool.",
    rarity: 5,
    color: GOLD,
    glow: "rgba(232,200,122,0.5)",
    cardBg: "linear-gradient(180deg, #1A1206 0%, #0D0A03 100%)",
    borderColor: "rgba(232,200,122,0.7)",
    artBg: "rgba(232,200,122,0.10)",
    spotlightRgb: "232, 200, 122",
  },
];

const ROUNDS = [
  {
    name: "Open Field",
    leverage: "20x", drawdown: "20%", elim: "30%",
    color: "#5DD9A8", bgGlow: "rgba(93,217,168,0.06)",
    element: "Anemo", spotlightRgb: "93, 217, 168",
    cardBg: "linear-gradient(160deg, #061A12 0%, #030D09 100%)",
    description: "The proving ground. All trading pairs available, generous leverage and drawdown limits. Establish your strategy — just don't finish in the bottom 30%.",
    icon: (c: string) => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="28" stroke={c} strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M16 38 Q24 26 32 30 Q40 34 48 22" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 44 Q24 36 32 38 Q40 40 48 30" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5"/>
        <circle cx="32" cy="20" r="5" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <line x1="32" y1="14" x2="32" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="15" x2="38" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="15" x2="26" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="32" cy="20" r="2" fill={c}/>
      </svg>
    ),
  },
  {
    name: "The Storm",
    leverage: "10x", drawdown: "15%", elim: "40%",
    color: SKY, bgGlow: "rgba(77,191,255,0.06)",
    element: "Hydro", spotlightRgb: "77, 191, 255",
    cardBg: "linear-gradient(160deg, #061220 0%, #030A14 100%)",
    description: "Pressure intensifies. Leverage halves, volatility window tightens. Undisciplined traders get swept away. Survive the storm — 40% get eliminated.",
    icon: (c: string) => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="28" stroke={c} strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M22 18 C18 18 14 22 14 26 C14 30 17 32 20 32 L44 32 C47 32 50 30 50 26 C50 22 47 18 43 18 C42 13 37 10 32 12 C28 10 23 13 22 18Z"
          fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.5"/>
        <path d="M36 32 L29 44 L34 44 L28 56" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M26 32 L21 41 L25 41" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
      </svg>
    ),
  },
  {
    name: "Final Circle",
    leverage: "5x", drawdown: "10%", elim: "50%",
    color: CORAL, bgGlow: "rgba(255,107,74,0.06)",
    element: "Pyro", spotlightRgb: "255, 107, 74",
    cardBg: "linear-gradient(160deg, #1A0A06 0%, #0D0503 100%)",
    description: "The zone has collapsed. Max leverage slashed to 5x, drawdown tolerance razor-thin. Half the remaining field gets cut. Only the elite survive.",
    icon: (c: string) => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="26" stroke={c} strokeWidth="1.5" strokeOpacity="0.25"/>
        <circle cx="32" cy="32" r="18" stroke={c} strokeWidth="1.5" strokeOpacity="0.5"/>
        <circle cx="32" cy="32" r="10" stroke={c} strokeWidth="2" strokeOpacity="0.8"/>
        <circle cx="32" cy="32" r="3" fill={c}/>
        <line x1="32" y1="6" x2="32" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <line x1="32" y1="50" x2="32" y2="58" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <line x1="6" y1="32" x2="14" y2="32" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="32" x2="58" y2="32" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: "Sudden Death",
    leverage: "3x", drawdown: "8%", elim: "Winner",
    color: "#E85353", bgGlow: "rgba(232,83,83,0.08)",
    element: "Electro", spotlightRgb: "232, 83, 83",
    cardBg: "linear-gradient(160deg, #1A0606 0%, #0D0303 100%)",
    description: "No mercy. Minimum leverage, minimum drawdown. One wrong move and you're out. Last trader standing claims the crown and the full prize pool.",
    icon: (c: string) => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="28" stroke={c} strokeWidth="1.5" strokeOpacity="0.3"/>
        <path d="M32 12 C22 12 14 20 14 30 C14 36 17 40 22 43 L22 50 L42 50 L42 43 C47 40 50 36 50 30 C50 20 42 12 32 12Z"
          fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1.5"/>
        <rect x="26" y="50" width="12" height="3" rx="1.5" fill={c} fillOpacity="0.6"/>
        <rect x="28" y="53" width="8" height="3" rx="1.5" fill={c} fillOpacity="0.4"/>
        <circle cx="27" cy="29" r="3" fill={c} fillOpacity="0.8"/>
        <circle cx="37" cy="29" r="3" fill={c} fillOpacity="0.8"/>
        <path d="M26 38 Q32 35 38 38" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="32" y1="14" x2="32" y2="22" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const ELEMENT_COLORS: Record<string, string> = {
  Anemo:   "#80F8E2",
  Hydro:   SKY,
  Pyro:    "#FF5136",
  Electro: "#D54DFF",
};

// ── Crown logo — sky blue gradient ──────────────────────────────────────────
function CrownLogo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" className="mb-1">
        <path
          d="M28 24 C12 24 4 10 2 4 L6 1 C10 7 16 14 28 14 C40 14 46 7 50 1 L54 4 C52 10 44 24 28 24Z"
          stroke="url(#heroCrownGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="28" cy="6" r="2.5" fill={SKY} style={{ filter: `drop-shadow(0 0 4px ${SKY}99)` }} />
        <circle cx="16" cy="12" r="1.5" fill={SKY2} />
        <circle cx="40" cy="12" r="1.5" fill={SKY2} />
        <circle cx="8"  cy="18" r="1"   fill="rgba(77,191,255,0.5)" />
        <circle cx="48" cy="18" r="1"   fill="rgba(77,191,255,0.5)" />
        <defs>
          <linearGradient id="heroCrownGrad" x1="2" y1="1" x2="54" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor={SKY} />
            <stop offset="0.5" stopColor={SKY2} />
            <stop offset="1" stopColor={SKY} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Anime.js: hero entrance timeline ────────────────────────────────────────
function HeroAnimeEntrance() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(async () => {
      const animeLib = await import("animejs");
      const anime = animeLib.default;

      anime.set(".hero-crown",       { opacity: 0, translateY: -20 });
      anime.set(".hero-badge",       { opacity: 0, scale: 0.8 });
      anime.set(".hero-title-line",  { opacity: 0, translateY: 50, scaleY: 0.9 });
      anime.set(".hero-subtitle",    { opacity: 0, translateY: 20 });
      anime.set(".hero-cta",         { opacity: 0, translateY: 25, scale: 0.9 });
      anime.set(".hero-meta",        { opacity: 0 });
      anime.set(".hero-scroll-hint", { opacity: 0 });

      const tl = anime.timeline({ easing: "easeOutExpo" });
      tl
        .add({ targets: ".hero-crown",       opacity: [0,1], translateY: [-20,0], duration: 800, easing: "easeOutBack" })
        .add({ targets: ".hero-badge",       opacity: [0,1], scale: [0.8,1],      duration: 600 }, "-=400")
        .add({ targets: ".hero-title-line",  opacity: [0,1], translateY: [50,0], scaleY: [0.9,1], duration: 1000, delay: anime.stagger(120) }, "-=300")
        .add({ targets: ".hero-subtitle",    opacity: [0,1], translateY: [20,0],  duration: 700, easing: "easeOutCubic" }, "-=600")
        .add({ targets: ".hero-cta",         opacity: [0,1], translateY: [25,0], scale: [0.9,1], duration: 700, easing: "easeOutBack" }, "-=400")
        .add({ targets: ".hero-meta",        opacity: [0,1],                      duration: 800, easing: "easeOutCubic" }, "-=400")
        .add({ targets: ".hero-scroll-hint", opacity: [0,1], translateY: [10,0],  duration: 600, easing: "easeOutCubic" }, "-=300");
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

// ── Anime.js: scroll-reveal (single elements) ───────────────────────────────
function ScrollRevealSection() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      async (entries) => {
        const animeLib = await import("animejs");
        const anime = animeLib.default;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.delay ?? "0");
            anime({ targets: el, opacity: [0,1], translateY: [40,0], rotateX: [-6,0], duration: 700, delay, easing: "easeOutExpo" });
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}

// ── Anime.js: stagger reveal (grids / lists) ─────────────────────────────────
function StaggerRevealSection() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      async (entries) => {
        const animeLib = await import("animejs");
        const anime = animeLib.default;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            anime({
              targets: entry.target.querySelectorAll(".stagger-item"),
              opacity: [0,1], translateY: [30,0],
              delay: anime.stagger(100, { from: "center" }),
              duration: 700, easing: "easeOutExpo",
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".stagger-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}

// ── Anime.js: hover glow on cards ───────────────────────────────────────────
function useAnimeHover(selector: string, glowColor: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let anime: typeof import("animejs").default;

    (async () => {
      const lib = await import("animejs");
      anime = lib.default;

      function onEnter(e: Event) {
        anime({ targets: e.currentTarget, scale: [1, 1.025], translateY: [0, -3], duration: 300, easing: "easeOutCubic" });
      }
      function onLeave(e: Event) {
        anime({ targets: e.currentTarget, scale: [1.025, 1], translateY: [-3, 0], duration: 250, easing: "easeOutCubic" });
      }

      const els = document.querySelectorAll(selector);
      els.forEach((el) => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    })();
  }, [selector, glowColor]);
}

// ── Anime.js: click ripple on buttons ───────────────────────────────────────
function useClickRipple(selector: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      const lib = await import("animejs");
      const anime = lib.default;

      document.querySelectorAll(selector).forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const el = e.currentTarget as HTMLElement;
          anime({ targets: el, scale: [1, 0.94, 1], duration: 350, easing: "easeOutElastic(1,.5)" });
        });
      });
    })();
  }, [selector]);
}

// ── Round types ───────────────────────────────────────────────────────────────
type Round = typeof ROUNDS[number];

// ── RoundMiniCard — compact Genshin-style inventory cell ──────────────────────
function RoundMiniCard({
  round, index, isSelected, onClick,
}: { round: Round; index: number; isSelected: boolean; onClick: () => void }) {
  return (
    <SpotlightCard
      spotlightColor={`rgba(${round.spotlightRgb}, 0.25)`}
      onClick={onClick}
      className="cursor-target relative flex flex-col cursor-pointer select-none transition-all duration-300"
      style={{
        width: "118px",
        height: "128px",
        borderRadius: "14px",
        background: round.cardBg,
        border: `2px solid ${isSelected ? round.color : round.color + "30"}`,
        boxShadow: isSelected
          ? `0 0 28px ${round.color}60, 0 0 60px ${round.color}25, 0 6px 20px rgba(0,0,0,0.6)`
          : `0 2px 10px rgba(0,0,0,0.5)`,
        transform: isSelected ? "scale(1.06)" : "scale(1)",
      } as React.CSSProperties}
    >
      {/* Selected indicator — top shimmer */}
      {isSelected && (
        <div className="absolute top-0 left-2 right-2 h-px rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${round.color}, transparent)` }}/>
      )}

      {/* Round number badge — top-left corner like Genshin level badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center justify-center"
        style={{
          width: "22px", height: "22px", borderRadius: "50%",
          background: isSelected ? round.color : `${round.color}22`,
          border: `1px solid ${round.color}60`,
          fontFamily: "var(--font-display)",
          fontSize: "10px",
          fontWeight: 900,
          color: isSelected ? "#030810" : round.color,
          boxShadow: isSelected ? `0 0 10px ${round.color}80` : "none",
        }}>
        {index + 1}
      </div>

      {/* Icon art area — fills most of the card */}
      <div className="flex-1 flex items-center justify-center p-2 pt-6">
        <div className="w-14 h-14">
          {round.icon(round.color)}
        </div>
      </div>

      {/* Rarity / color bar at bottom — like Genshin rarity strip */}
      <div style={{ height: "4px", borderRadius: "0 0 12px 12px",
        background: `linear-gradient(90deg, transparent, ${round.color}, transparent)`,
        opacity: isSelected ? 1 : 0.4 }}/>

      {/* Name label below the bar */}
      <div className="py-1.5 text-center">
        <span style={{
          fontFamily: "var(--font-display)", fontSize: "8px", fontWeight: 700,
          color: isSelected ? round.color : "var(--color-text-tertiary)",
          letterSpacing: "0.06em", textTransform: "uppercase",
          textShadow: isSelected ? `0 0 8px ${round.color}` : "none",
        }}>
          {round.name}
        </span>
      </div>
    </SpotlightCard>
  );
}

// ── RoundDetailPanel — Genshin weapon-stat panel on the right ─────────────────
function RoundDetailPanel({ round, index }: { round: Round; index: number }) {
  const stats = [
    { label: "Max Leverage",  value: round.leverage, icon: "⚡" },
    { label: "Max Drawdown",  value: round.drawdown, icon: "📉" },
    { label: "Elimination",   value: round.elim,     icon: "☠" },
  ];

  return (
    <motion.div
      key={round.name}
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col overflow-hidden"
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: "20px",
        background: round.cardBg,
        border: `1px solid ${round.color}35`,
        boxShadow: `0 0 40px ${round.color}20, 0 8px 32px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-8 right-8 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${round.color}80, transparent)` }}/>

      {/* Inner glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 40% at 30% 30%, ${round.color}0A 0%, transparent 70%)` }}/>

      <div className="relative z-10 p-7 flex flex-col h-full">
        {/* Header row — large icon + round info */}
        <div className="flex items-start gap-5 mb-6">
          {/* Large icon */}
          <div className="flex-shrink-0 relative"
            style={{
              width: "88px", height: "88px", borderRadius: "16px",
              background: `${round.color}12`,
              border: `1px solid ${round.color}35`,
              boxShadow: `0 0 24px ${round.color}30`,
              padding: "10px",
            }}>
            {round.icon(round.color)}
            {/* Diagonal texture overlay */}
            <div className="absolute inset-0 rounded-[14px] opacity-[0.04]"
              style={{ backgroundImage: `repeating-linear-gradient(45deg, ${round.color} 0px, ${round.color} 1px, transparent 1px, transparent 10px)` }}/>
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em]"
                style={{ fontFamily: "var(--font-display)", color: round.color }}>
                Round {index + 1}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider"
                style={{
                  color: ELEMENT_COLORS[round.element],
                  borderColor: `${ELEMENT_COLORS[round.element]}40`,
                  background: `${ELEMENT_COLORS[round.element]}12`,
                  fontFamily: "var(--font-display)",
                }}>
                {round.element}
              </span>
            </div>
            <h3 className="font-black tracking-tight leading-none mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(18px, 2.5vw, 26px)",
                color: round.color,
                textShadow: `0 0 20px ${round.color}60`,
              }}>
              {round.name.toUpperCase()}
            </h3>
            {/* Intensity dots */}
            <div className="flex gap-1.5 mt-2">
              {[...Array(4)].map((_, j) => (
                <motion.div key={j}
                  animate={{ opacity: j <= index ? 1 : 0.15 }}
                  className="rounded-full"
                  style={{
                    width: "8px", height: "8px",
                    background: j <= index ? round.color : "var(--color-border-medium)",
                    boxShadow: j <= index ? `0 0 6px ${round.color}80` : "none",
                  }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-5"
          style={{ background: `linear-gradient(90deg, ${round.color}40, transparent)` }}/>

        {/* Stats — like Genshin base stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {stats.map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{
                background: `${round.color}0A`,
                border: `1px solid ${round.color}20`,
              }}>
              <div className="text-lg mb-1">{icon}</div>
              <div className="font-black mb-0.5"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  color: label === "Elimination" ? "#E85353" : round.color,
                  textShadow: `0 0 10px ${label === "Elimination" ? "rgba(232,83,83,0.5)" : round.color + "60"}`,
                }}>
                {value}
              </div>
              <div className="uppercase tracking-wider"
                style={{ fontSize: "8px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="leading-relaxed text-[var(--color-text-secondary)] flex-1"
          style={{ fontSize: "13px" }}>
          {round.description}
        </p>

        {/* Bottom — active indicator */}
        <div className="mt-5 flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: round.color, boxShadow: `0 0 8px ${round.color}` }}/>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-tertiary)" }}>
            Progressive Elimination · Battle Royale
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── GachaCard — individual card with per-card spotlight state ────────────────
type HowItWorksStep = typeof HOW_IT_WORKS[number];

function GachaCard({
  step,
  index,
  isActive,
  onToggle,
}: {
  step: HowItWorksStep;
  index: number;
  isActive: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <SpotlightCard
      spotlightColor={`rgba(${step.spotlightRgb}, 0.22)`}
      className="cursor-target stagger-item animate-card flex-shrink-0 relative flex flex-col select-none"
      style={{
        width: isActive ? "244px" : "220px",
        height: isActive ? "464px" : "424px",
        borderRadius: "32px",
        background: step.cardBg,
        border: `2px solid ${isActive ? step.borderColor : step.borderColor + "88"}`,
        boxShadow: isActive
          ? `0 0 40px ${step.glow}, 0 0 80px ${step.glow}, 0 12px 40px rgba(0,0,0,0.7)`
          : `0 0 20px ${step.glow}55, 0 8px 24px rgba(0,0,0,0.6)`,
        cursor: "pointer",
        transition: "width 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.3s ease",
      } as React.CSSProperties}
      onClick={() => onToggle(index)}
    >
      {/* Active shimmer top edge */}
      {isActive && (
        <div className="absolute top-0 left-4 right-4 h-px rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }}/>
      )}

      {/* Step number badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center justify-center font-black"
          style={{
            width: isActive ? "56px" : "50px",
            height: isActive ? "56px" : "50px",
            borderRadius: "50%",
            background: isActive
              ? `linear-gradient(135deg, ${step.color}, ${step.color}AA)`
              : `linear-gradient(135deg, ${step.color}CC, ${step.color}66)`,
            border: `2px solid ${step.borderColor}`,
            boxShadow: `0 0 20px ${step.glow}, 0 4px 14px rgba(0,0,0,0.5)`,
            color: isActive ? "#030810" : step.color,
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            transition: "width 0.35s ease, height 0.35s ease",
          }}>
          {index + 1}
        </div>
      </div>

      {/* Art area */}
      <div className="relative overflow-hidden flex-shrink-0"
        style={{
          height: isActive ? "270px" : "242px",
          borderRadius: "30px 30px 0 0",
          background: step.artBg,
          transition: "height 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 60%, ${step.color}18 0%, transparent 70%)` }}/>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `repeating-linear-gradient(45deg, ${step.color} 0px, ${step.color} 1px, transparent 1px, transparent 12px)` }}/>

        <div className="absolute inset-0 flex items-center justify-center p-3 pt-16">
          {STEP_ART[step.step as keyof typeof STEP_ART](step.color)}
        </div>

        {[...Array(5)].map((_, j) => (
          <motion.div key={j}
            animate={{ y: [0, -(6 + j * 3), 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2 + j * 0.5, repeat: Infinity, delay: j * 0.4 }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: j % 2 === 0 ? "3px" : "2px",
              height: j % 2 === 0 ? "3px" : "2px",
              left: `${20 + j * 15}%`,
              bottom: `${10 + (j % 3) * 15}%`,
              background: step.color,
              boxShadow: `0 0 4px ${step.color}`,
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px mx-3"
        style={{ background: `linear-gradient(90deg, transparent, ${step.borderColor}, transparent)` }}/>

      {/* Info area */}
      <div className="flex flex-col flex-1 px-4 pt-4 pb-2">
        <div className="flex justify-center gap-1 mb-3">
          {[...Array(5)].map((_, j) => (
            <span key={j} className="text-base leading-none"
              style={{
                color: j < step.rarity ? step.color : "rgba(255,255,255,0.1)",
                textShadow: j < step.rarity ? `0 0 8px ${step.glow}` : "none",
              }}>★</span>
          ))}
        </div>

        <h3 className="font-black text-center leading-tight mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "13px",
            color: isActive ? step.color : "var(--color-text-primary)",
            textShadow: isActive ? `0 0 12px ${step.glow}` : "none",
            letterSpacing: "0.05em",
            transition: "color 0.3s ease",
          }}>
          {step.title.toUpperCase()}
        </h3>

        <p className="text-center leading-relaxed text-[var(--color-text-secondary)] flex-1"
          style={{ fontSize: "11.5px" }}>
          {step.description}
        </p>
      </div>

      {/* Claim button */}
      <div className="px-4 pb-5">
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="cursor-target flex items-center justify-center gap-1.5 py-2.5 rounded-full cursor-pointer"
          style={{
            background: isActive
              ? `linear-gradient(135deg, ${step.color}, ${step.color}BB)`
              : `linear-gradient(135deg, ${step.color}33, ${step.color}18)`,
            border: `1px solid ${step.borderColor}`,
            boxShadow: `0 0 16px ${step.glow}`,
            transition: "background 0.3s ease",
          }}>
          {isActive ? (
            <span className="font-black text-xs tracking-widest"
              style={{ fontFamily: "var(--font-display)", color: "#030810" }}>
              ★ CLAIM ★
            </span>
          ) : (
            <span className="font-bold text-xs tracking-wider"
              style={{ fontFamily: "var(--font-display)", color: step.color }}>
              START →
            </span>
          )}
        </motion.div>
      </div>

      {/* Active corner filigree */}
      {isActive && (
        <>
          <div className="absolute top-4 left-4 w-6 h-6 opacity-50"
            style={{ borderTop: `2px solid ${step.color}`, borderLeft: `2px solid ${step.color}`, borderRadius: "6px 0 0 0" }}/>
          <div className="absolute top-4 right-4 w-6 h-6 opacity-50"
            style={{ borderTop: `2px solid ${step.color}`, borderRight: `2px solid ${step.color}`, borderRadius: "0 6px 0 0" }}/>
          <div className="absolute bottom-4 left-4 w-6 h-6 opacity-50"
            style={{ borderBottom: `2px solid ${step.color}`, borderLeft: `2px solid ${step.color}`, borderRadius: "0 0 0 6px" }}/>
          <div className="absolute bottom-4 right-4 w-6 h-6 opacity-50"
            style={{ borderBottom: `2px solid ${step.color}`, borderRight: `2px solid ${step.color}`, borderRadius: "0 0 6px 0" }}/>
        </>
      )}
    </SpotlightCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number>(0);

  useEffect(() => { setMounted(true); }, []);

  // Global hover/click animations wired after mount
  useAnimeHover(".animate-card", SKY);
  useClickRipple(".animate-btn");

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-[var(--color-neon-cyan)] font-mono text-sm tracking-widest animate-pulse"
          style={{ fontFamily: "var(--font-display)" }}>
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <HeroAnimeEntrance />
      <ScrollRevealSection />
      <StaggerRevealSection />

      {/* ══════════════════════════════════════════════════════════
          HERO — FaultyTerminal full-bleed background
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-4 md:px-6 lg:px-8 overflow-hidden">

        {/* FaultyTerminal — fills the entire hero section */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <FaultyTerminal
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={0.4}
            pause={false}
            scanlineIntensity={0.45}
            glitchAmount={1}
            flickerAmount={0.8}
            noiseAmp={1}
            chromaticAberration={0}
            dither={0}
            curvature={0.08}
            tint={SKY}            /* Pacifica sky blue instead of green */
            mouseReact
            mouseStrength={0.4}
            pageLoadAnimation
            brightness={0.45}
            className="w-full h-full"
          />
          {/* Vignette overlay so text stays readable */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 20%, rgba(3,8,16,0.7) 70%, rgba(3,8,16,0.95) 100%)",
            }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(77,191,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(77,191,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 100%)",
            zIndex: 1,
          }}
        />

        {/* Hero content */}
        <div className="relative text-center max-w-5xl mx-auto" style={{ zIndex: 2 }}>

          <div className="hero-crown">
            <CrownLogo />
          </div>

          {/* Badge */}
          <div
            className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-10"
            style={{
              borderColor: `rgba(77,191,255,0.25)`,
              background: `rgba(77,191,255,0.06)`,
              boxShadow: `0 0 20px rgba(77,191,255,0.1)`,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: SKY, boxShadow: `0 0 8px ${SKY}CC` }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ fontFamily: "var(--font-display)", color: SKY }}
            >
              Battle Royale Trading
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-black leading-[0.88] tracking-tight mb-10"
            style={{
              fontFamily: "var(--font-display)",
              textShadow: `0 0 60px rgba(77,191,255,0.25), 0 0 120px rgba(77,191,255,0.1)`,
            }}
          >
            {["THE LAST", "TRADER", "STANDING"].map((line, i) => (
              <span
                key={line}
                className="hero-title-line block"
                style={{
                  color: i === 1 ? undefined : "var(--color-text-primary)",
                  background: i === 1 ? `linear-gradient(135deg, ${SKY}, ${SKY2}, ${SKY})` : "none",
                  WebkitBackgroundClip: i === 1 ? "text" : undefined,
                  WebkitTextFillColor: i === 1 ? "transparent" : undefined,
                  backgroundClip: i === 1 ? "text" : undefined,
                  fontSize: "clamp(3rem, 10vw, 7.5rem)",
                }}
              >
                {line}
              </span>
            ))}
          </h1>

          <p
            className="hero-subtitle text-base md:text-lg text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed mb-14"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            4 rounds. Progressive eliminations. Last trader standing wins the prize pool.
          </p>

          {/* CTAs */}
          <div className="hero-cta flex flex-col sm:flex-row gap-5 justify-center items-center">
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: `0 0 50px rgba(77,191,255,0.5)` }}
              whileTap={{ scale: 0.97 }}
              className="cursor-target relative animate-btn"
            >
              <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ background: `rgba(77,191,255,0.4)` }} />
              <Link
                href="/arenas"
                className="relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm tracking-wider"
                style={{
                  fontFamily: "var(--font-display)",
                  background: `linear-gradient(135deg, ${SKY} 0%, ${SKY2} 100%)`,
                  boxShadow: `0 0 30px rgba(77,191,255,0.4)`,
                  color: "#030810",
                }}
              >
                ENTER THE ARENA
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </motion.div>

            <motion.a
              href="#how-it-works"
              whileHover={{ scale: 1.03, borderColor: `rgba(77,191,255,0.5)` }}
              whileTap={{ scale: 0.97 }}
              className="cursor-target group animate-btn px-8 py-4 rounded-full border text-sm font-semibold tracking-wide transition-colors"
              style={{
                borderColor: "rgba(77,191,255,0.2)",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-display)",
              }}
            >
              <span className="flex items-center gap-2">
                How It Works
                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </motion.a>
          </div>

          {/* Meta row */}
          <div
            className="hero-meta mt-20 flex justify-center gap-12 text-[10px] text-[var(--color-text-tertiary)] tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {[
              { color: "#5DD9A8", glow: "rgba(93,217,168,0.6)" },
              { color: SKY,       glow: `rgba(77,191,255,0.6)` },
              { color: "#E85353", glow: "rgba(232,83,83,0.6)"  },
            ].map(({ color, glow }, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${glow}` }} />
                {["Live Trading", "Real Prizes", "Battle Royale"][i]}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 10, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="cursor-target hero-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ zIndex: 2 }}
        >
          <svg className="w-5 h-5 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — Gacha card style (Genshin × MLBB ref)
      ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 px-4 md:px-6 lg:px-8 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #060D1E 0%, #030810 100%)" }}>

        {/* Star field background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(60)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: "white",
                opacity: Math.random() * 0.5 + 0.1,
                animation: `star-twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Corner diamond decorations (like MLBB reference) */}
        {[
          { top: 20, left: 16 }, { top: 20, right: 16 },
          { bottom: 20, left: 16 }, { bottom: 20, right: 16 },
        ].map((pos, i) => (
          <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="none"
            className="absolute opacity-60"
            style={{ ...pos as React.CSSProperties }}>
            <rect x="9" y="0" width="9" height="9" transform="rotate(45 9 9)"
              fill={SKY} fillOpacity="0.7"/>
          </svg>
        ))}

        {/* Section header — styled like a game UI panel */}
        <div className="relative z-10 text-center mb-16 scroll-reveal" data-delay="0">
          {/* Decorative horizontal rule */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-16 md:w-32" style={{ background: `linear-gradient(90deg, transparent, ${SKY}60)` }}/>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="5" y="0" width="5" height="5" transform="rotate(45 5 5)" fill={SKY} fillOpacity="0.8"/>
            </svg>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em]"
              style={{ fontFamily: "var(--font-display)", color: SKY }}>
              The Protocol
            </p>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="5" y="0" width="5" height="5" transform="rotate(45 5 5)" fill={SKY} fillOpacity="0.8"/>
            </svg>
            <div className="h-px w-16 md:w-32" style={{ background: `linear-gradient(90deg, ${SKY}60, transparent)` }}/>
          </div>

          <h2 className="font-black text-4xl md:text-5xl lg:text-6xl tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              textShadow: `0 0 40px rgba(77,191,255,0.2)`,
            }}>
            How It Works
          </h2>
          <p className="mt-4 text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
            Four steps. One winner. Are you the last trader standing?
          </p>
        </div>

        {/* ── Gacha card row ── */}
        <div className="relative z-10 flex flex-row gap-5 md:gap-7 justify-center items-end
                        overflow-x-auto pb-6 pt-2 px-4 stagger-section
                        scrollbar-thin scrollbar-thumb-[var(--color-border-medium)]">
          {HOW_IT_WORKS.map((step, i) => (
            <GachaCard
              key={step.step}
              step={step}
              index={i}
              isActive={activeStep === i}
              onToggle={(idx) => setActiveStep(activeStep === idx ? null : idx)}
            />
          ))}
        </div>

        {/* Bottom connector line */}
        <div className="relative z-10 flex items-center justify-center mt-12">
          <div className="h-px w-48" style={{ background: `linear-gradient(90deg, transparent, ${SKY}40, transparent)` }}/>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ROUND PROGRESSION — Mini card grid + detail panel
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 md:px-6 lg:px-8 bg-[var(--color-bg-primary)] relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${ROUNDS[selectedRound].color}08 0%, transparent 70%)`, transition: "background 0.5s ease" }}/>
        <div className="absolute inset-0 grid-bg opacity-[0.03]"/>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 scroll-reveal" data-delay="0">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 md:w-24" style={{ background: `linear-gradient(90deg, transparent, ${CORAL}60)` }}/>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em]"
                style={{ fontFamily: "var(--font-display)", color: CORAL }}>Escalation</p>
              <div className="h-px w-12 md:w-24" style={{ background: `linear-gradient(90deg, ${CORAL}60, transparent)` }}/>
            </div>
            <h2 className="font-black text-4xl md:text-5xl lg:text-6xl text-[var(--color-text-primary)] tracking-tight mb-3"
              style={{ fontFamily: "var(--font-display)" }}>
              4 Rounds of Hell
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Select a round to see full details
            </p>
          </div>

          {/* Main interactive area */}
          <div className="flex flex-col md:flex-row gap-5 items-start">

            {/* ── Left: 2×2 mini card grid ── */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              {ROUNDS.map((round, i) => (
                <RoundMiniCard
                  key={round.name}
                  round={round}
                  index={i}
                  isSelected={selectedRound === i}
                  onClick={() => setSelectedRound(i)}
                />
              ))}
            </div>

            {/* ── Right: Detail panel with AnimatePresence ── */}
            <div className="flex-1 min-w-0 min-h-[320px]">
              <AnimatePresence mode="wait">
                <RoundDetailPanel
                  key={selectedRound}
                  round={ROUNDS[selectedRound]}
                  index={selectedRound}
                />
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--color-bg-primary)]" style={{ minHeight: "600px" }}>

        {/* ── Dither WebGL background — full bleed ── */}
        <div className="absolute inset-0 z-0">
          <Dither
            waveColor={[0.302, 0.749, 1.0]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.35}
            colorNum={4}
            pixelSize={2}
            waveAmplitude={0.38}
            waveFrequency={3}
            waveSpeed={0.04}
          />
        </div>

        {/* Dark vignette — keeps text readable */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(3,8,16,0.45) 0%, rgba(3,8,16,0.82) 100%)",
          }}/>

        {/* Bottom fade into footer */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-bg-primary))" }}/>

        {/* ── Content ── */}
        <div className="relative z-20 flex items-center justify-center min-h-[600px] px-4 md:px-6 lg:px-8 py-32">
          <div className="max-w-3xl mx-auto text-center scroll-reveal" data-delay="0">

            {/* Crown */}
            <motion.div
              className="flex justify-center mb-8"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="80" height="36" viewBox="0 0 80 36" fill="none" className="opacity-80">
                <path d="M40 32 C20 32 10 16 4 6 L8 2 C14 10 22 20 40 20 C58 20 66 10 72 2 L76 6 C70 16 60 32 40 32Z"
                  stroke="url(#ctaCrownGrad)" strokeWidth="1.5" fill="none"/>
                <circle cx="40" cy="8" r="3" fill={SKY}  style={{ filter: `drop-shadow(0 0 6px ${SKY})` }}/>
                <circle cx="22" cy="16" r="2" fill={SKY2}/>
                <circle cx="58" cy="16" r="2" fill={SKY2}/>
                <defs>
                  <linearGradient id="ctaCrownGrad" x1="4" y1="2" x2="76" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor={SKY}/><stop offset="0.5" stopColor={SKY2}/><stop offset="1" stopColor={SKY}/>
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            <h2 className="font-black leading-tight tracking-tight mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                color: "var(--color-text-primary)",
                textShadow: `0 0 60px rgba(77,191,255,0.35), 0 2px 20px rgba(0,0,0,0.8)`,
              }}>
              Ready to{" "}
              <span style={{
                background: `linear-gradient(135deg, ${SKY}, ${SKY2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: `drop-shadow(0 0 20px ${SKY}88)`,
              }}>
                Compete
              </span>?
            </h2>

            <p className="text-base md:text-lg mb-14 max-w-xl mx-auto leading-relaxed"
              style={{ color: "var(--color-text-secondary)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
              Join hundreds of traders battling for the top spot. The arena awaits.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <motion.div
                whileHover={{ scale: 1.06, boxShadow: `0 0 80px rgba(77,191,255,0.6)` }}
                whileTap={{ scale: 0.97 }}
                className="cursor-target relative animate-btn"
              >
                <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
                  style={{ background: `rgba(77,191,255,0.5)` }}/>
                <Link href="/arenas"
                  className="relative inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-sm tracking-wider"
                  style={{
                    fontFamily: "var(--font-display)",
                    background: `linear-gradient(135deg, ${SKY} 0%, ${SKY2} 100%)`,
                    boxShadow: `0 0 32px rgba(77,191,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`,
                    color: "#030810",
                  }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/>
                  </svg>
                  ENTER THE ARENA
                </Link>
              </motion.div>

              <motion.a href="/leaderboard"
                whileHover={{ scale: 1.04, borderColor: `rgba(77,191,255,0.6)` }}
                whileTap={{ scale: 0.97 }}
                className="cursor-target animate-btn px-10 py-5 rounded-full border text-sm font-semibold tracking-wide transition-all"
                style={{
                  borderColor: "rgba(77,191,255,0.35)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-display)",
                  backdropFilter: "blur(8px)",
                  background: "rgba(3,8,16,0.4)",
                }}>
                View Leaderboard
              </motion.a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="py-10 px-4 md:px-6 lg:px-8 border-t"
        style={{ background: "var(--color-bg-secondary)", borderColor: "rgba(77,191,255,0.08)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY2})`, boxShadow: `0 0 16px rgba(77,191,255,0.3)` }}>
              <span className="font-bold text-xs text-[#030810]" style={{ fontFamily: "var(--font-display)" }}>C</span>
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-[var(--color-text-tertiary)]"
              style={{ fontFamily: "var(--font-display)" }}>
              PACIFICA COLOSSEUM
            </span>
          </div>

          <div className="flex items-center gap-8 text-xs text-[var(--color-text-tertiary)]">
            <Link href="/arenas"      className="cursor-target hover:text-[var(--color-neon-cyan)] transition-colors">Arenas</Link>
            <Link href="/leaderboard" className="cursor-target hover:text-[var(--color-neon-cyan)] transition-colors">Leaderboard</Link>
            <span>Built on Pacifica</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

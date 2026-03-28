"use client";

import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import ConnectButton from "@/components/shared/ConnectButton";

// ── Animations ──────────────────────────────────────────

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease } },
};

const slideLeft = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

// ── Counter Hook ────────────────────────────────────────

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [isInView, target]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

// ── Round data ──────────────────────────────────────────

const rounds = [
  {
    num: 1,
    name: "Open Field",
    desc: "All pairs. High leverage. The calm before the storm.",
    leverage: "20x",
    drawdown: "20%",
    elimination: "Bottom 30%",
    accent: "#22c55e",
    bg: "from-success/5 to-transparent",
  },
  {
    num: 2,
    name: "The Storm",
    desc: "Isolated margin only. The field narrows.",
    leverage: "10x",
    drawdown: "15%",
    elimination: "Bottom 40%",
    accent: "#eab308",
    bg: "from-warning/5 to-transparent",
  },
  {
    num: 3,
    name: "Final Circle",
    desc: "BTC only. Top 5 advance. Everything else is noise.",
    leverage: "5x",
    drawdown: "10%",
    elimination: "Top 5 only",
    accent: "#f97316",
    bg: "from-orange-500/5 to-transparent",
  },
  {
    num: 4,
    name: "Sudden Death",
    desc: "One breach. You're out. No second chances.",
    leverage: "3x",
    drawdown: "8%",
    elimination: "Any breach",
    accent: "#ef4444",
    bg: "from-danger/5 to-transparent",
  },
];

// Stats are defined inline in the JSX section below

// ── Page ────────────────────────────────────────────────

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <main className="overflow-x-hidden">
      {/* ════════ HERO ════════ */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          {/* Primary blob */}
          <motion.div
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -60, 30, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)" }}
          />
          {/* Secondary blob */}
          <motion.div
            animate={{
              x: [0, -40, 60, 0],
              y: [0, 40, -50, 0],
              scale: [1, 0.85, 1.15, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, rgba(244,63,94,0.04) 50%, transparent 70%)" }}
          />
          {/* Accent blob */}
          <motion.div
            animate={{
              x: [0, 30, -50, 0],
              y: [0, -30, 40, 0],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
          />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />

          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px",
            }}
          />
        </div>

        {/* Decorative lines */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, ease }}
          className="absolute left-8 md:left-16 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-primary/10 to-transparent origin-top"
        />
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease }}
          className="absolute right-8 md:right-16 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-primary/10 to-transparent origin-top"
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 pt-20"
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-light shadow-sm">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs tracking-[0.2em] uppercase text-text-secondary font-medium">
                  Battle Royale Trading
                </span>
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={fadeUp}
              className="font-display font-800 tracking-[-0.04em] leading-[0.85]"
            >
              <span className="block text-[clamp(3.5rem,12vw,10rem)] text-text-primary">
                Survive.
              </span>
              <span className="block text-[clamp(3.5rem,12vw,10rem)] bg-gradient-to-r from-accent-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Adapt.
              </span>
              <span className="block text-[clamp(3.5rem,12vw,10rem)] text-text-primary">
                Trade.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={fadeUp}
              className="mt-8 text-base md:text-lg text-text-secondary max-w-md mx-auto leading-relaxed"
            >
              Compete in perpetual futures arenas. Rounds shrink.
              Leverage drops. Only one trader survives.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/arenas">
                <motion.span
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99,102,241,0.25)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-accent-primary text-white font-semibold text-base shadow-xl shadow-accent-primary/20 transition-all"
                >
                  Enter the Arena
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.span>
              </Link>
              <Link href="#rounds">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-8 py-4 rounded-full text-text-secondary font-medium text-base hover:text-text-primary transition-colors"
                >
                  See the rounds ↓
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-9 rounded-full border-2 border-text-tertiary/20 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2 rounded-full bg-text-tertiary/40" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="py-32 md:py-40 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary/30 to-bg-primary" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative max-w-5xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <p className="text-xs tracking-[0.3em] uppercase text-text-tertiary mb-4">
              How it works
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-800 tracking-tight text-text-primary">
              Three steps to glory
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Join",
                desc: "Pick an arena, connect your wallet, enter the battlefield. Minimum 4 traders to start.",
                gradient: "from-accent-primary/10 to-accent-primary/0",
                border: "group-hover:border-accent-primary/20",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-accent-primary"/>
                    <path d="M16 10v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent-primary"/>
                  </svg>
                ),
              },
              {
                num: "02",
                title: "Trade",
                desc: "Open positions on BTC, ETH, SOL perpetuals. Manage leverage. Stay above the drawdown limit.",
                gradient: "from-warning/10 to-warning/0",
                border: "group-hover:border-warning/20",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M4 24l7-7 5 5 12-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning"/>
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Win",
                desc: "Outlast every trader through 4 rounds of increasing pressure. Last one standing takes the crown.",
                gradient: "from-accent-gold/10 to-accent-gold/0",
                border: "group-hover:border-accent-gold/20",
                icon: (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4l3.5 7 7.5 1-5.5 5.5L23 25l-7-4-7 4 1.5-7.5L5 12l7.5-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-accent-gold"/>
                  </svg>
                ),
              },
            ].map((step) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className={`group relative bg-surface rounded-3xl border border-border-light p-8 hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="mb-5">{step.icon}</div>
                  <p className="font-mono text-[10px] text-text-tertiary tracking-widest uppercase mb-1">{step.num}</p>
                  <h3 className="font-display text-2xl font-700 text-text-primary mb-3">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════ ROUNDS ════════ */}
      <section id="rounds" className="py-32 md:py-40 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <p className="text-xs tracking-[0.3em] uppercase text-text-tertiary mb-4">
              The gauntlet
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-800 tracking-tight text-text-primary">
              Each round gets harder
            </h2>
          </motion.div>

          <div className="space-y-4">
            {rounds.map((round) => (
              <motion.div
                key={round.num}
                variants={slideLeft}
                whileHover={{ x: 6, transition: { duration: 0.2 } }}
                className={`group relative bg-surface rounded-2xl border border-border-light overflow-hidden hover:shadow-lg transition-all duration-300`}
              >
                {/* Left accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
                  style={{ backgroundColor: round.accent }}
                />

                <div className="pl-7 pr-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <span
                      className="font-mono text-3xl font-900 w-10"
                      style={{ color: round.accent }}
                    >
                      {round.num}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-700 text-text-primary">
                        {round.name}
                      </h3>
                      <p className="text-xs text-text-tertiary mt-0.5 max-w-xs">
                        {round.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pl-15 sm:pl-0">
                    <div className="text-center min-w-[60px]">
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Leverage</p>
                      <p className="font-mono text-lg font-bold text-text-primary">{round.leverage}</p>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Drawdown</p>
                      <p className="font-mono text-lg font-bold" style={{ color: round.accent }}>{round.drawdown}</p>
                    </div>
                    <div className="text-center min-w-[80px] hidden sm:block">
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Eliminated</p>
                      <p className="font-mono text-sm font-semibold text-text-secondary">{round.elimination}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════ STATS ════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary/20 to-bg-primary" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Max Traders", value: 100, prefix: "", suffix: "" },
              { label: "Starting Capital", value: 1000, prefix: "$", suffix: "" },
              { label: "Rounds", value: 4, prefix: "", suffix: "" },
              { label: "Presets", value: 4, prefix: "", suffix: "" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="text-center bg-surface rounded-2xl border border-border-light p-6 hover:border-accent-primary/10 transition-colors"
              >
                <p className="text-3xl md:text-4xl font-bold text-text-primary">
                  {stat.prefix}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="py-32 md:py-40 px-6 relative">
        {/* Dark overlay for drama */}
        <div className="absolute inset-0 bg-text-primary rounded-t-[3rem] mx-4 md:mx-10 overflow-hidden">
          {/* Animated gradient in dark section */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/2 -right-1/2 w-full h-full opacity-20"
            style={{ background: "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #6366f1)" }}
          />
          <div className="absolute inset-0 bg-text-primary/90" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="relative max-w-3xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-7xl font-800 tracking-tight text-white leading-tight"
          >
            Ready to
            <br />
            <span className="bg-gradient-to-r from-accent-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              compete?
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 text-white/50 text-lg max-w-md mx-auto">
            Connect your wallet and enter the arena. No signup required.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10">
            <Link href="/arenas">
              <motion.span
                whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(99,102,241,0.3)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-text-primary font-semibold text-base shadow-2xl transition-all"
              >
                Enter the Arena
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-16 px-6 border-t border-border-light">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg font-800 tracking-tight text-text-primary">
            COLOSSEUM
          </span>
          <div className="flex items-center gap-6 text-xs text-text-tertiary">
            <Link href="/arenas" className="hover:text-text-secondary transition-colors">Arenas</Link>
            <Link href="/leaderboard" className="hover:text-text-secondary transition-colors">Leaderboard</Link>
            <span>Built on Pacifica</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

"use client";

import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ConnectButton from "@/components/shared/ConnectButton";

const HeroModel = dynamic(() => import("@/components/shared/HeroModel"), { ssr: false });
const TrophyModel = dynamic(() => import("@/components/shared/TrophyModel"), { ssr: false });

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } };

function Counter({ target, prefix = "" }: { target: number; prefix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, target, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setVal(Math.floor(v)) });
    return () => ctrl.stop();
  }, [inView, target]);
  return <span ref={ref} className="font-mono tabular-nums">{prefix}{val.toLocaleString()}</span>;
}

const rounds = [
  { num: 1, name: "Open Field", leverage: "20x", drawdown: "20%", elim: "Bottom 30%", color: "#22c55e" },
  { num: 2, name: "The Storm", leverage: "10x", drawdown: "15%", elim: "Bottom 40%", color: "#eab308" },
  { num: 3, name: "Final Circle", leverage: "5x", drawdown: "10%", elim: "Top 5 only", color: "#f97316" },
  { num: 4, name: "Sudden Death", leverage: "3x", drawdown: "8%", elim: "Any breach", color: "#ef4444" },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <main className="overflow-x-hidden">

      {/* ═══ HERO — DARK WITH ARENA IMAGE ═══ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity }}
        className="relative min-h-screen flex items-center justify-center bg-[#0a0a1a]"
      >
        {/* Arena background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/Hero_Background.png"
            alt="Arena"
            fill
            className="object-cover opacity-60"
            priority
          />
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/40 via-transparent to-[#0a0a1a]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-transparent" />
        </div>

        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.2, opacity: 0.2 }}
            animate={{ scale: [0.2, 1.5], opacity: [0.15, 0] }}
            transition={{ duration: 4, delay: i * 1.3, repeat: Infinity, ease: "easeOut" }}
            className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-indigo-400/20"
          />
        ))}

        {/* 3D Model — floating sword */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease }}
          className="absolute inset-0 z-[5] pointer-events-none"
        >
          <HeroModel />
        </motion.div>

        {/* Content */}
        <motion.div variants={stagger} initial="hidden" animate="visible" className="relative z-10 text-center px-6 max-w-3xl">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-[11px] tracking-[0.15em] uppercase text-white/60 font-medium">Battle Royale Trading</span>
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-display font-800 tracking-[-0.03em] leading-[0.88] text-4xl md:text-6xl lg:text-7xl">
            <span className="block text-white">Survive.</span>
            <motion.span
              className="block bg-[length:200%_auto] bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #818cf8, #a78bfa, #e879f9, #818cf8)" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              Adapt.
            </motion.span>
            <span className="block text-white">Trade.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-4 text-sm md:text-base text-white/50 max-w-md mx-auto leading-relaxed">
            Compete in perpetual futures arenas. Rounds shrink. Leverage drops. Only one trader survives.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/arenas">
              <motion.span whileHover={{ scale: 1.04, boxShadow: "0 8px 40px rgba(99,102,241,0.35)" }} whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all">
                Enter the Arena
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.span>
            </Link>
            <Link href="#rounds">
              <motion.span whileHover={{ scale: 1.03 }}
                className="inline-block px-6 py-3.5 rounded-full text-white/40 text-sm font-medium hover:text-white/70 transition-colors">
                See the rounds ↓
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
              <rect x="1" y="1" width="18" height="28" rx="9" stroke="white" strokeWidth="1.5" opacity="0.3"/>
              <circle cx="10" cy="9" r="2" fill="white" opacity="0.4"/>
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══ HOW IT WORKS — LIGHT ═══ */}
      <section className="pt-16 pb-20 md:pt-20 md:pb-24 px-6 bg-bg-primary relative">
        {/* Smooth dark→light transition */}
        <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a1a] to-bg-primary" />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-tertiary mb-3">How it works</p>
            <h2 className="font-display text-3xl md:text-5xl font-800 tracking-tight text-text-primary">Three steps to glory</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { num: "01", title: "Join", desc: "Pick an arena. Connect your wallet. Minimum 4 traders to start the battle.", img: "/images/Join.png", borderColor: "border-indigo-200", numColor: "text-indigo-500" },
              { num: "02", title: "Trade", desc: "Open positions on BTC, ETH, SOL perpetuals. Manage leverage. Stay above the drawdown limit.", img: "/images/Trade.png", borderColor: "border-amber-200", numColor: "text-amber-500" },
              { num: "03", title: "Win", desc: "Survive 4 rounds of increasing pressure. Last trader standing takes the crown.", img: "/images/Win.png", borderColor: "border-orange-200", numColor: "text-orange-500" },
            ].map((step) => (
              <motion.div key={step.num} variants={fadeUp} whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className={`group bg-white rounded-2xl border ${step.borderColor} p-7 hover:shadow-2xl hover:border-accent-primary/30 transition-all duration-300`}>
                {/* Icon image — larger */}
                <div className="relative w-20 h-20 mb-6 rounded-2xl overflow-hidden bg-[#0a0a1a] shadow-lg">
                  <Image src={step.img} alt={step.title} fill className="object-contain p-2.5 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <p className={`font-mono text-[10px] tracking-widest uppercase mb-1 ${step.numColor}`}>{step.num}</p>
                <h3 className="font-display text-xl font-700 text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ ROUNDS ═══ */}
      <section id="rounds" className="py-16 md:py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary/40 via-bg-secondary/20 to-transparent" />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="relative max-w-4xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-text-tertiary mb-3">The gauntlet</p>
            <h2 className="font-display text-3xl md:text-5xl font-800 tracking-tight text-text-primary">Each round gets harder</h2>
          </motion.div>

          <div className="space-y-3">
            {rounds.map((r) => (
              <motion.div key={r.num} variants={fadeUp} whileHover={{ x: 4 }}
                className="group bg-white rounded-xl border border-border-light overflow-hidden hover:shadow-lg transition-all">
                <div className="flex items-center">
                  <div className="w-1.5 self-stretch transition-all group-hover:w-2" style={{ backgroundColor: r.color }} />
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-2xl font-900 w-8" style={{ color: r.color }}>{r.num}</span>
                      <h3 className="font-display text-base font-700 text-text-primary">{r.name}</h3>
                    </div>
                    <div className="flex items-center gap-5 ml-12 sm:ml-0">
                      <div className="text-center">
                        <p className="text-[9px] text-text-tertiary uppercase tracking-wider">Leverage</p>
                        <p className="font-mono text-sm font-bold text-text-primary">{r.leverage}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-text-tertiary uppercase tracking-wider">Max DD</p>
                        <p className="font-mono text-sm font-bold" style={{ color: r.color }}>{r.drawdown}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-[9px] text-text-tertiary uppercase tracking-wider">Cut</p>
                        <p className="font-mono text-xs font-semibold text-text-secondary">{r.elim}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3 mt-12">
            {[
              { label: "Max Traders", value: 100, prefix: "" },
              { label: "Starting Capital", value: 1000, prefix: "$" },
              { label: "Rounds", value: 4, prefix: "" },
              { label: "Survival Rate", value: 12, prefix: "", suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="text-center py-4">
                <p className="text-2xl md:text-3xl font-bold text-text-primary">
                  <Counter target={s.value} prefix={s.prefix} />{s.suffix ?? ""}
                </p>
                <p className="text-[9px] text-text-tertiary uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ CTA — DARK ═══ */}
      <section className="py-10 px-4 md:px-8">
        <div className="relative rounded-[2rem] overflow-hidden py-20 md:py-28">
          {/* Reuse arena image for CTA bg */}
          <div className="absolute inset-0">
            <Image src="/images/Hero_Background.png" alt="" fill className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-[#0a0a1a]/85" />
          </div>

          {/* 3D Trophy */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-[1] pointer-events-none"
          >
            <TrophyModel />
          </motion.div>

          {/* Ripple rings */}
          {[0, 1, 2].map((i) => (
            <motion.div key={i}
              initial={{ scale: 0.2, opacity: 0.15 }}
              animate={{ scale: [0.2, 1], opacity: [0.1, 0] }}
              transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-indigo-400/15"
            />
          ))}

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="relative z-10 text-center px-6">
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-6xl font-800 tracking-tight text-white leading-tight">
              Ready to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">compete?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-white/40 text-base max-w-md mx-auto">
              Connect your wallet and enter the arena.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <Link href="/arenas">
                <motion.span whileHover={{ scale: 1.05, boxShadow: "0 8px 40px rgba(255,255,255,0.15)" }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#0a0a1a] font-semibold text-sm shadow-xl transition-all">
                  Enter the Arena
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-10 px-6 border-t border-border-light bg-bg-primary">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-base font-800 tracking-tight text-text-primary">COLOSSEUM</span>
          <div className="flex items-center gap-6 text-xs text-text-tertiary">
            <Link href="/arenas" className="hover:text-text-primary transition-colors">Arenas</Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link>
            <span>Built on Pacifica</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

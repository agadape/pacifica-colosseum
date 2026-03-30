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
    <main className="overflow-x-hidden bg-[#0a0a1a] text-white">

      {/* ═══ HERO ═══ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity }}
        className="relative min-h-screen flex items-center justify-center"
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

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="pt-24 pb-20 md:pt-28 md:pb-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#0d0d24] to-[#0a0a1a]" />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="relative max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/30 mb-3">How it works</p>
            <h2 className="font-display text-3xl md:text-5xl font-800 tracking-tight text-white">Three steps to glory</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { num: "01", title: "Join", desc: "Pick an arena. Connect your wallet. Minimum 4 traders to start the battle.", img: "/images/Join.png", accent: "from-indigo-500/20 to-indigo-500/0", borderHover: "hover:border-indigo-400/30", numColor: "text-indigo-400" },
              { num: "02", title: "Trade", desc: "Open positions on BTC, ETH, SOL perpetuals. Manage leverage. Stay above the drawdown limit.", img: "/images/Trade.png", accent: "from-amber-500/20 to-amber-500/0", borderHover: "hover:border-amber-400/30", numColor: "text-amber-400" },
              { num: "03", title: "Win", desc: "Survive 4 rounds of increasing pressure. Last trader standing takes the crown.", img: "/images/Win.png", accent: "from-orange-500/20 to-orange-500/0", borderHover: "hover:border-orange-400/30", numColor: "text-orange-400" },
            ].map((step) => (
              <motion.div key={step.num} variants={fadeUp} whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className={`group relative bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-7 ${step.borderHover} hover:bg-white/[0.06] transition-all duration-300`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                <div className="relative">
                  <div className="relative w-20 h-20 mb-6 rounded-2xl overflow-hidden bg-white/[0.05] border border-white/[0.06] shadow-lg">
                    <Image src={step.img} alt={step.title} fill className="object-contain p-2.5 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <p className={`font-mono text-[10px] tracking-widest uppercase mb-1 ${step.numColor}`}>{step.num}</p>
                  <h3 className="font-display text-xl font-700 text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ TRUST SIGNALS ═══ */}
      <section className="py-10 px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 py-6 border-t border-b border-white/[0.06]">
            <span className="text-[11px] tracking-[0.2em] uppercase text-white/25">Powered by</span>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">P</span>
                </div>
                <span className="text-sm font-medium text-white/60">Pacifica Exchange</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />
              <div className="hidden sm:flex items-center gap-3">
                {["BTC", "ETH", "SOL"].map((asset) => (
                  <span key={asset} className="text-[11px] font-mono font-medium text-white/30 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
                    {asset}
                  </span>
                ))}
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />
              <span className="text-[11px] font-mono text-white/25 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/50">Testnet</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══ ROUNDS ═══ */}
      <section id="rounds" className="py-16 md:py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent" />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="relative max-w-4xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/30 mb-3">The gauntlet</p>
            <h2 className="font-display text-3xl md:text-5xl font-800 tracking-tight text-white">Each round gets harder</h2>
          </motion.div>

          <div className="space-y-3">
            {rounds.map((r) => (
              <motion.div key={r.num} variants={fadeUp} whileHover={{ x: 4 }}
                className="group bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                <div className="flex items-center">
                  <div className="w-1.5 self-stretch transition-all group-hover:w-2" style={{ backgroundColor: r.color }} />
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-2xl font-900 w-8" style={{ color: r.color }}>{r.num}</span>
                      <h3 className="font-display text-base font-700 text-white">{r.name}</h3>
                    </div>
                    <div className="flex items-center gap-6 ml-12 sm:ml-0">
                      <div className="text-center">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Leverage</p>
                        <p className="font-mono text-sm font-bold text-white/90">{r.leverage}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Max DD</p>
                        <p className="font-mono text-sm font-bold" style={{ color: r.color }}>{r.drawdown}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Cut</p>
                        <p className="font-mono text-sm font-semibold text-white/70">{r.elim}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ═══ STATS — glass card with dividers ═══ */}
          <motion.div variants={fadeUp} className="mt-12">
            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4">
                {[
                  { label: "Max Traders", value: 100, prefix: "" },
                  { label: "Starting Capital", value: 1000, prefix: "$" },
                  { label: "Rounds", value: 4, prefix: "" },
                  { label: "Survival Rate", value: 12, prefix: "", suffix: "%" },
                ].map((s, i) => (
                  <div key={s.label} className={`text-center py-6 px-3 border-white/[0.06] ${
                    i % 2 === 0 ? "border-r" : ""
                  } ${
                    i < 2 ? "border-b md:border-b-0" : ""
                  } ${
                    i < 3 ? "md:border-r" : "md:border-r-0"
                  }`}>
                    <p className="text-2xl md:text-3xl font-bold text-white">
                      <Counter target={s.value} prefix={s.prefix} />{s.suffix ?? ""}
                    </p>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1.5 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-10 px-4 md:px-8">
        <div className="relative rounded-[2rem] overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0">
            <Image src="/images/Hero_Background.png" alt="" fill className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-[#0a0a1a]/70" />
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
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-6xl font-800 tracking-tight leading-tight">
              <span className="text-white">Ready to </span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.35)]">compete?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-white/50 text-base max-w-md mx-auto">
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
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-base font-800 tracking-tight text-white">COLOSSEUM</span>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/arenas" className="hover:text-white/60 transition-colors">Arenas</Link>
            <Link href="/leaderboard" className="hover:text-white/60 transition-colors">Leaderboard</Link>
            <span>Built on Pacifica</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

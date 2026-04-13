"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter the Arena",
    description: "Register with your wallet, fund your sub-account, and join a battle royale arena.",
  },
  {
    step: "02",
    title: "Trade to Survive",
    description: "Open positions on BTC, ETH, SOL perpetual futures. Make profits to stay ahead.",
  },
  {
    step: "03",
    title: "Climb the Ranks",
    description: "Each round tightens the rules — leverage drops, drawdown shrinks. Outlast your rivals.",
  },
  {
    step: "04",
    title: "Win it All",
    description: "Last trader standing takes the crown. Claim the prize pool.",
  },
];

const ROUNDS = [
  { name: "Open Field", leverage: "20x", drawdown: "20%", elim: "30%", color: "bg-emerald-500" },
  { name: "The Storm", leverage: "10x", drawdown: "15%", elim: "40%", color: "bg-amber-500" },
  { name: "Final Circle", leverage: "5x", drawdown: "10%", elim: "50%", color: "bg-orange-500" },
  { name: "Sudden Death", leverage: "3x", drawdown: "8%", elim: "Winner", color: "bg-red-500" },
];

function GridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 100%)",
      }}
    />
  );
}

function FloatingOrb({ className, size }: { className: string; size: string }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function SectionReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CardReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div variants={fadeUp} className={className}>{children}</motion.div>;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-tertiary font-mono text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-surface/80 backdrop-blur-md border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-primary flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display text-lg font-bold text-text-primary">COLOSSEUM</span>
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/arenas" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden md:block">
            Arenas
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden md:block">
            Leaderboard
          </Link>
          <Link
            href="/arenas"
            className="px-5 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-sm focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            Enter the Arena →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-6 md:px-10 overflow-hidden">
        <GridBackground />
        <FloatingOrb className="top-20 right-10 bg-indigo-200/30" size="400px" />
        <FloatingOrb className="bottom-20 left-10 bg-amber-100/30" size="300px" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-semibold uppercase tracking-wider mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            Battle Royale Trading
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-6xl md:text-8xl lg:text-9xl font-bold text-text-primary leading-[0.9] tracking-tight mb-8"
          >
            THE LAST
            <br />
            <span className="text-accent-primary">TRADER</span>
            <br />
            STANDING
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed mb-12"
          >
            4 rounds. Progressive eliminations. Last trader standing wins the prize pool.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/arenas"
              className="px-8 py-4 rounded-full bg-accent-primary text-white text-base font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-md focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              Enter the Arena →
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-full border-2 border-border text-text-secondary font-semibold hover:border-accent-primary hover:text-accent-primary transition-all text-base"
            >
              How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 md:px-10 bg-surface">
        <div className="max-w-6xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-3">The Protocol</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary">How It Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((step) => (
                <CardReveal
                  key={step.step}
                  className="bg-bg-primary rounded-2xl border border-border p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="font-mono text-5xl font-bold text-accent-primary/20 mb-6">{step.step}</div>
                  <h3 className="font-display text-xl font-bold text-text-primary mb-3">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
                </CardReveal>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── ROUND PROGRESSION ── */}
      <section className="py-24 px-6 md:px-10 bg-bg-primary">
        <div className="max-w-5xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-primary mb-3">Escalation</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary">4 Rounds of Hell</h2>
              <p className="text-text-secondary mt-4 max-w-lg mx-auto">Each round tightens the noose. Leverage drops. Drawdown shrinks. The weak fall.</p>
            </div>

            <div className="space-y-4">
              {ROUNDS.map((round, i) => (
                <CardReveal
                  key={round.name}
                  className="bg-surface rounded-2xl border border-border p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-3 h-12 rounded-full ${round.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-bold text-text-primary">{round.name}</h3>
                        <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Round {i + 1}</span>
                      </div>
                      <div className="flex gap-8">
                        <div>
                          <span className="text-xs text-text-tertiary uppercase tracking-wide block">Max Leverage</span>
                          <span className="font-mono text-lg font-bold text-text-primary">{round.leverage}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text-tertiary uppercase tracking-wide block">Max Drawdown</span>
                          <span className="font-mono text-lg font-bold text-text-primary">{round.drawdown}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text-tertiary uppercase tracking-wide block">Elimination</span>
                          <span className="font-mono text-lg font-bold text-danger">{round.elim}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardReveal>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 md:px-10 bg-bg-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <SectionReveal>
            <h2 className="font-display text-5xl md:text-7xl font-bold text-text-primary leading-tight mb-6">
              Ready to <span className="text-accent-primary">Compete</span>?
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-xl mx-auto leading-relaxed">
              Join hundreds of traders battling for the top spot. The arena awaits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/arenas"
                className="px-10 py-4 rounded-full bg-accent-primary text-white text-base font-semibold hover:bg-accent-hover transition-all hover:scale-105 shadow-md"
              >
                Enter the Arena →
              </Link>
              <a
                href="/leaderboard"
                className="px-10 py-4 rounded-full border-2 border-border text-text-secondary font-semibold hover:border-accent-primary hover:text-accent-primary transition-all text-base"
              >
                View Leaderboard
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 md:px-10 bg-surface border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              <span className="text-accent-primary font-display font-bold text-xs">C</span>
            </div>
            <span className="font-display text-sm font-bold text-text-tertiary">PACIFICA COLOSSEUM</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-text-tertiary">
            <Link href="/arenas" className="hover:text-text-primary transition-colors">Arenas</Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link>
            <span>Built on Pacifica</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
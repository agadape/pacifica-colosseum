"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import ConnectButton from "@/components/shared/ConnectButton";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: customEase } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: customEase } },
};

const steps = [
  { number: "01", title: "Join", desc: "Pick an arena, connect your wallet, enter the battlefield.", icon: "⚔️" },
  { number: "02", title: "Trade", desc: "Open positions on perpetual futures. Manage risk. Stay alive.", icon: "📊" },
  { number: "03", title: "Win", desc: "Outlast every other trader. Last one standing wins.", icon: "👑" },
];

const rounds = [
  { name: "Open Field", leverage: "20x", drawdown: "20%", color: "text-success" },
  { name: "The Storm", leverage: "10x", drawdown: "15%", color: "text-warning" },
  { name: "Final Circle", leverage: "5x", drawdown: "10%", color: "text-orange-500" },
  { name: "Sudden Death", leverage: "3x", drawdown: "8%", color: "text-danger" },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 relative"
      >
        {/* Decorative ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 0.04, scale: 1, rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full border border-accent-primary"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 0.03, scale: 1, rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute w-[700px] h-[700px] md:w-[900px] md:h-[900px] rounded-full border border-accent-primary/50 border-dashed"
          />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl relative z-10"
        >
          <motion.div
            variants={fadeUp}
            className="inline-block px-4 py-1.5 rounded-full bg-accent-primary/5 border border-accent-primary/10 mb-8"
          >
            <span className="text-xs uppercase tracking-[0.25em] text-accent-primary font-semibold">
              Battle Royale Trading
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-7xl md:text-[120px] lg:text-[140px] font-800 tracking-[-0.03em] text-text-primary leading-[0.85]"
          >
            Survive.
            <br />
            <span className="bg-gradient-to-r from-accent-primary to-purple-500 bg-clip-text text-transparent">
              Adapt.
            </span>
            <br />
            Trade.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-lg md:text-xl text-text-secondary max-w-lg mx-auto leading-relaxed"
          >
            Compete in perpetual futures arenas. Rounds shrink. Leverage drops.
            Only one trader survives.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-12 flex items-center justify-center gap-4">
            <Link href="/arenas">
              <motion.span
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-block px-10 py-4 rounded-full bg-accent-primary text-white font-semibold text-base hover:bg-accent-hover transition-all shadow-lg shadow-accent-primary/20"
              >
                Enter the Arena
              </motion.span>
            </Link>
            <Link href="#how-it-works">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block px-8 py-4 rounded-full border border-border text-text-secondary font-semibold text-base hover:border-text-secondary hover:text-text-primary transition-all"
              >
                How it works
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full border-2 border-text-tertiary/30 flex items-start justify-center p-1"
          >
            <motion.div className="w-1 h-2 rounded-full bg-text-tertiary/50" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* How It Works */}
      <section id="how-it-works" className="min-h-screen flex flex-col items-center justify-center px-6 py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center max-w-5xl w-full"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-4"
          >
            How it works
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-6xl font-800 tracking-tight text-text-primary mb-20"
          >
            Three steps to glory
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={scaleIn}
                whileHover={{ y: -8 }}
                className="relative bg-surface rounded-3xl border border-border-light p-8 hover:border-accent-primary/20 hover:shadow-xl transition-all"
              >
                <span className="text-4xl mb-4 block">{step.icon}</span>
                <span className="font-mono text-xs text-text-tertiary">
                  {step.number}
                </span>
                <h3 className="font-display text-2xl font-700 text-text-primary mt-1">
                  {step.title}
                </h3>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Rounds Preview */}
      <section className="py-32 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-4xl mx-auto"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-4 text-center"
          >
            The gauntlet
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-6xl font-800 tracking-tight text-text-primary mb-16 text-center"
          >
            Each round gets harder
          </motion.h2>

          <div className="space-y-4">
            {rounds.map((round, i) => (
              <motion.div
                key={round.name}
                variants={fadeUp}
                whileHover={{ x: 8 }}
                className="flex items-center justify-between bg-surface rounded-2xl border border-border-light p-6 hover:border-accent-primary/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-2xl font-bold ${round.color}`}>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-700 text-text-primary">{round.name}</h3>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {i < 3 ? `Bottom ${[30, 40, "all but top 5"][i]}% eliminated` : "Any drawdown breach = out"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-text-tertiary text-xs">Leverage</p>
                    <p className="font-mono font-bold text-text-primary">{round.leverage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-tertiary text-xs">Max Drawdown</p>
                    <p className={`font-mono font-bold ${round.color}`}>{round.drawdown}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-5xl md:text-7xl font-800 tracking-tight text-text-primary"
          >
            Ready to compete?
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-text-secondary text-lg">
            Connect your wallet and enter the arena.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10">
            <ConnectButton />
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border-light">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-tertiary">
          <span className="font-display text-base font-700 tracking-tight text-text-primary">COLOSSEUM</span>
          <span>Built on Pacifica &middot; Perpetual Futures</span>
        </div>
      </footer>
    </main>
  );
}

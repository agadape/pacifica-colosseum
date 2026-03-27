"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ConnectButton from "@/components/shared/ConnectButton";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const steps = [
  { number: "01", title: "Join", desc: "Enter an arena" },
  { number: "02", title: "Trade", desc: "Survive each round" },
  { number: "03", title: "Win", desc: "Last one standing" },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-6"
          >
            Battle Royale Trading
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-display text-6xl md:text-8xl font-800 tracking-tight text-text-primary leading-[0.9]"
          >
            Survive.
            <br />
            <span className="text-accent-primary">Adapt.</span>
            <br />
            Trade.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 text-lg text-text-secondary max-w-md mx-auto"
          >
            Compete in perpetual futures arenas. Rounds shrink. Leverage drops. Only one trader survives.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-4">
            <Link href="/arenas">
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block px-8 py-3.5 rounded-full bg-accent-primary text-white font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm"
              >
                Enter the Arena
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center max-w-4xl w-full"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-4"
          >
            How it works
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-5xl font-800 tracking-tight text-text-primary mb-16"
          >
            Three steps to glory
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                className="text-center"
              >
                <span className="font-mono text-5xl font-bold text-border">
                  {step.number}
                </span>
                <h3 className="font-display text-2xl font-700 text-text-primary mt-2">
                  {step.title}
                </h3>
                <p className="text-text-secondary mt-2">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-6xl font-800 tracking-tight text-text-primary"
          >
            Ready to compete?
          </motion.h2>
          <motion.div variants={fadeUp} className="mt-8">
            <ConnectButton />
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border-light">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-text-tertiary">
          <span className="font-display font-700 tracking-tight">COLOSSEUM</span>
          <span>Built on Pacifica</span>
        </div>
      </footer>
    </main>
  );
}

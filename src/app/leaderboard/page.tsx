"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const columns = ["Rank", "Trader", "Wins", "Arenas", "Best PnL", "Win Rate"];

export default function LeaderboardPage() {
  // Placeholder — will be populated with real data from Supabase
  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
            Rankings
          </p>
          <h1 className="font-display text-4xl font-800 tracking-tight text-text-primary mb-10">
            Leaderboard
          </h1>

          <div className="bg-surface rounded-2xl border border-border-light overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-border-light">
              {columns.map((col) => (
                <span
                  key={col}
                  className="text-xs uppercase tracking-wider text-text-tertiary font-semibold"
                >
                  {col}
                </span>
              ))}
            </div>

            {/* Empty state */}
            <div className="py-16 text-center">
              <p className="text-text-tertiary">No traders ranked yet</p>
              <p className="text-text-tertiary text-sm mt-1">
                Complete an arena to appear here
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

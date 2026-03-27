"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const rarityColors: Record<string, string> = {
  legendary: "border-accent-gold text-accent-gold bg-accent-gold/5",
  epic: "border-accent-primary text-accent-primary bg-accent-primary/5",
  rare: "border-success text-success bg-success/5",
  common: "border-border text-text-secondary bg-surface",
};

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);

  // For now, show a placeholder profile
  // Will be connected to real user data when auth flow is complete
  const stats = [
    { label: "Arenas", value: "0" },
    { label: "Wins", value: "0" },
    { label: "Survival Rate", value: "0%" },
    { label: "Best PnL", value: "0%" },
  ];

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
            Profile
          </p>
          <h1 className="font-display text-3xl font-800 tracking-tight text-text-primary mb-1">
            {address.slice(0, 4)}...{address.slice(-4)}
          </h1>
          <p className="font-mono text-sm text-text-tertiary mb-10">{address}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface rounded-2xl border border-border-light p-5 text-center"
              >
                <p className="font-mono text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-text-tertiary uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Badges */}
          <h2 className="font-display text-lg font-700 text-text-primary mb-4">
            Badges
          </h2>
          <p className="text-text-tertiary text-sm">No badges earned yet</p>

          {/* Match History */}
          <h2 className="font-display text-lg font-700 text-text-primary mb-4 mt-12">
            Match History
          </h2>
          <p className="text-text-tertiary text-sm">No matches played yet</p>
        </motion.div>
      </div>
    </main>
  );
}

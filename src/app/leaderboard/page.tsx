"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardUser {
  id: string;
  wallet_address: string;
  username: string | null;
  total_arenas_entered: number;
  total_arenas_won: number;
  best_pnl_percent: number;
  win_streak: number;
  current_win_streak: number;
  total_rounds_survived: number;
}

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed.replace(/\s/g, ""))}`;
}

function winRate(won: number, entered: number) {
  if (entered === 0) return "—";
  return `${Math.round((won / entered) * 100)}%`;
}

const MEDAL = ["🥇", "🥈", "🥉"];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const rowVariant = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery<{ data: LeaderboardUser[] }>({
    queryKey: ["global-leaderboard"],
    queryFn: () => fetch("/api/leaderboard").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const traders = data?.data ?? [];

  return (
    <main className="min-h-screen pt-24 px-4 md:px-10 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">Global</p>
          <h1 className="font-display text-4xl font-800 tracking-tight text-text-primary">
            Leaderboard
          </h1>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : traders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface rounded-2xl border border-border-light py-20 text-center"
          >
            <p className="text-text-tertiary">No traders ranked yet</p>
            <p className="text-text-tertiary text-sm mt-1">Complete an arena to appear here</p>
          </motion.div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border-light overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_4rem_4rem_5rem_4rem_4rem] gap-4 px-6 py-3 border-b border-border-light">
              {["#", "Trader", "Wins", "Played", "Best PnL", "Win Rate", "Streak"].map((col) => (
                <span key={col} className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                  {col}
                </span>
              ))}
            </div>

            {/* Rows */}
            <motion.div variants={container} initial="hidden" animate="visible">
              {traders.map((user, i) => {
                const name = user.username ?? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}`;
                const seed = user.username ?? user.wallet_address;
                const isTop3 = i < 3;
                const pnlPos = user.best_pnl_percent >= 0;

                return (
                  <motion.div
                    key={user.id}
                    variants={rowVariant}
                    className={`grid grid-cols-[2rem_1fr_4rem_4rem_5rem_4rem_4rem] gap-4 px-6 py-4 items-center border-b border-border-light/50 last:border-0 transition-colors hover:bg-bg-primary/50 ${
                      i === 0 ? "bg-accent-gold/[0.03]" : ""
                    }`}
                  >
                    {/* Rank */}
                    <span className="text-sm font-mono font-bold text-text-tertiary">
                      {isTop3 ? MEDAL[i] : i + 1}
                    </span>

                    {/* Trader */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getAvatarUrl(seed)}
                        alt={name}
                        className="w-8 h-8 rounded-full flex-shrink-0 bg-bg-primary"
                      />
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold truncate block ${isTop3 ? "text-text-primary" : "text-text-secondary"}`}>
                          {name}
                        </span>
                        {user.total_rounds_survived > 0 && (
                          <span className="text-[10px] text-text-tertiary">
                            {user.total_rounds_survived} rounds survived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wins */}
                    <span className={`font-mono text-sm font-bold ${user.total_arenas_won > 0 ? "text-accent-gold" : "text-text-tertiary"}`}>
                      {user.total_arenas_won}
                    </span>

                    {/* Played */}
                    <span className="font-mono text-sm text-text-secondary">
                      {user.total_arenas_entered}
                    </span>

                    {/* Best PnL */}
                    <span className={`font-mono text-sm font-bold ${pnlPos ? "text-success" : "text-danger"}`}>
                      {pnlPos ? "+" : ""}{user.best_pnl_percent.toFixed(1)}%
                    </span>

                    {/* Win Rate */}
                    <span className="font-mono text-sm text-text-secondary">
                      {winRate(user.total_arenas_won, user.total_arenas_entered)}
                    </span>

                    {/* Streak */}
                    <span className="font-mono text-sm">
                      {user.current_win_streak > 0 ? (
                        <span className="text-accent-primary font-bold">🔥{user.current_win_streak}</span>
                      ) : user.win_streak > 0 ? (
                        <span className="text-text-secondary">{user.win_streak}</span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        <p className="text-[11px] text-text-tertiary mt-4 text-right font-mono">
          Updates every 30s · {traders.length} traders ranked
        </p>
      </div>
    </main>
  );
}

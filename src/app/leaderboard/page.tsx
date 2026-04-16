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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const rowVariant = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

function TrophyIcon({ rank }: { rank: number }) {
  const colors = {
    0: { primary: "#FFD700", glow: "rgba(255,215,0,0.5)" },
    1: { primary: "#C0C0C0", glow: "rgba(192,192,192,0.4)" },
    2: { primary: "#CD7F32", glow: "rgba(205,127,50,0.4)" },
  };
  const color = colors[rank as 0 | 1 | 2] ?? colors[0];

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm"
      style={{
        background: `${color.primary}15`,
        color: color.primary,
        border: `1px solid ${color.primary}40`,
        boxShadow: `0 0 16px ${color.glow}`,
        fontFamily: "var(--font-display)",
      }}
    >
      {rank === 0 ? "I" : rank === 1 ? "II" : "III"}
    </div>
  );
}

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
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-neon-magenta)] mb-2 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Global
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-[var(--color-text-primary)]">
            Leaderboard
          </h1>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-[var(--color-neon-cyan)] border-t-transparent"
              style={{ boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
            />
          </div>
        ) : traders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] py-20 text-center"
          >
            <div className="text-5xl mb-5 opacity-50">🏆</div>
            <p className="text-[var(--color-text-tertiary)]">No traders ranked yet</p>
            <p className="text-[var(--color-text-tertiary)] text-sm mt-1">Complete an arena to appear here</p>
          </motion.div>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden" style={{ boxShadow: "0 0 40px rgba(0,240,255,0.05)" }}>
            {/* Column headers */}
            <div className="grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem_4rem] gap-4 px-6 py-4 border-b border-[var(--color-border)]" style={{ background: "rgba(0,240,255,0.02)" }}>
              {["#", "Trader", "Wins", "Played", "Best PnL", "Win Rate", "Streak"].map((col, i) => (
                <span
                  key={col}
                  className="text-[10px] uppercase tracking-[0.15em] font-bold"
                  style={{
                    color: "var(--color-text-tertiary)",
                    fontFamily: "var(--font-display)",
                    gridColumn: i === 1 ? undefined : undefined,
                  }}
                >
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
                    className={`grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem_4rem] gap-4 px-6 py-4 items-center border-b border-[var(--color-border)]/50 last:border-0 transition-all hover:bg-[var(--color-bg-secondary)]/50 ${
                      isTop3 ? "" : ""
                    }`}
                    style={isTop3 ? {
                      background: i === 0
                        ? "linear-gradient(90deg, rgba(255,215,0,0.03), transparent)"
                        : "transparent"
                    } : {}}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center">
                      {isTop3 ? (
                        <TrophyIcon rank={i} />
                      ) : (
                        <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-tertiary)" }}>
                          {i + 1}
                        </span>
                      )}
                    </div>

                    {/* Trader */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getAvatarUrl(seed)}
                        alt={name}
                        className="w-8 h-8 rounded-lg flex-shrink-0"
                        style={{ background: "var(--color-bg-tertiary)" }}
                      />
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold truncate block ${isTop3 ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                          {name}
                        </span>
                        {user.total_rounds_survived > 0 && (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            {user.total_rounds_survived} rounds survived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wins */}
                    <span
                      className="font-mono text-sm font-bold"
                      style={user.total_arenas_won > 0 ? {
                        color: "var(--color-neon-gold)",
                        textShadow: "0 0 8px rgba(255,215,0,0.4)"
                      } : { color: "var(--color-text-tertiary)" }}
                    >
                      {user.total_arenas_won}
                    </span>

                    {/* Played */}
                    <span className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {user.total_arenas_entered}
                    </span>

                    {/* Best PnL */}
                    <span
                      className="font-mono text-sm font-bold"
                      style={{
                        color: pnlPos ? "var(--color-success)" : "var(--color-danger)",
                        textShadow: pnlPos ? "0 0 8px rgba(0,255,136,0.4)" : "0 0 8px rgba(255,51,51,0.4)"
                      }}
                    >
                      {pnlPos ? "+" : ""}{user.best_pnl_percent.toFixed(1)}%
                    </span>

                    {/* Win Rate */}
                    <span className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {winRate(user.total_arenas_won, user.total_arenas_entered)}
                    </span>

                    {/* Streak */}
                    <span className="font-mono text-sm">
                      {user.current_win_streak > 0 ? (
                        <span className="font-bold" style={{ color: "var(--color-neon-magenta)" }}>
                          ⚡{user.current_win_streak}
                        </span>
                      ) : user.win_streak > 0 ? (
                        <span style={{ color: "var(--color-text-secondary)" }}>{user.win_streak}</span>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        <p className="text-[11px] mt-4 text-right font-mono" style={{ color: "var(--color-text-tertiary)" }}>
          Updates every 30s · {traders.length} traders ranked
        </p>
      </div>
    </main>
  );
}

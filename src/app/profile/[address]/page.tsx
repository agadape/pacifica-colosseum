"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { useCurrentUser, useUpdateUsername } from "@/hooks/use-arena";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const { data: userData, isLoading } = useCurrentUser();
  const updateUsername = useUpdateUsername();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const user = userData?.data;

  async function handleSave() {
    setError("");
    const result = await updateUsername.mutateAsync(draft).catch((e: Error) => ({ error: e.message }));
    if ((result as { error?: string }).error) {
      setError((result as { error: string }).error);
    } else {
      setEditing(false);
    }
  }

  const stats = [
    { label: "Arenas", value: user?.total_arenas_entered ?? 0, color: "var(--color-neon-cyan)" },
    { label: "Wins", value: user?.total_arenas_won ?? 0, color: "var(--color-neon-gold)" },
    { label: "Rounds survived", value: user?.total_rounds_survived ?? 0, color: "var(--color-success)" },
    { label: "Best PnL", value: user?.best_pnl_percent != null ? `${user.best_pnl_percent.toFixed(1)}%` : "—", color: "var(--color-neon-magenta)" },
  ];

  return (
    <main className="min-h-screen pt-24 px-4 md:px-6 lg:px-10 pb-16">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p
            className="text-xs uppercase tracking-[0.3em] mb-2 font-semibold"
            style={{ color: "var(--color-neon-cyan)", fontFamily: "var(--font-display)" }}
          >
            Profile
          </p>

          {/* Username + edit */}
          <div className="flex items-end gap-4 mb-2">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                  maxLength={20}
                  placeholder="username (3-20 chars, a-z 0-9 _)"
                  className="px-3 py-2 rounded-xl border text-sm w-72"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-neon-cyan)",
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-display)",
                    outline: "none",
                    boxShadow: "0 0 12px rgba(0,240,255,0.2)",
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={updateUsername.isPending}
                  className="px-4 py-2 rounded-full text-sm font-bold text-black disabled:opacity-50"
                  style={{
                    background: "var(--color-neon-cyan)",
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 0 16px rgba(0,240,255,0.3)",
                  }}
                >
                  {updateUsername.isPending ? "Saving..." : "Save"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setEditing(false); setError(""); }}
                  className="px-4 py-2 rounded-full border text-sm font-semibold transition-colors"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1
                  className="font-display text-3xl font-black tracking-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {isLoading ? "Loading..." : user?.username ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
                </h1>
                {user && (
                  <button
                    onClick={() => { setDraft(user.username ?? ""); setEditing(true); setError(""); }}
                    className="text-xs transition-colors underline underline-offset-2"
                    style={{ color: "var(--color-neon-cyan)" }}
                  >
                    {user.username ? "Edit" : "Set username"}
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm mb-3" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <p
            className="font-mono text-sm mb-10"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {address}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -4, boxShadow: `0 0 30px ${stat.color}30` }}
                className="rounded-2xl border p-5 text-center transition-all"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p
                  className="font-mono text-2xl font-bold"
                  style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}40` }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-xs uppercase tracking-wider mt-1"
                  style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Referral */}
          <div
            className="rounded-2xl border p-5 mb-12"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <h2
              className="font-display text-lg font-bold mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              Referral Link
            </h2>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}?ref=${user?.referral_code ?? address.slice(0, 8)}`}
                className="flex-1 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 16px rgba(0,240,255,0.4)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.referral_code ?? address.slice(0, 8)}`)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-black"
                style={{
                  background: "var(--color-neon-cyan)",
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 0 12px rgba(0,240,255,0.3)",
                }}
              >
                Copy
              </motion.button>
            </div>
          </div>

          {/* Badges */}
          <h2
            className="font-display text-lg font-bold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Badges
          </h2>
          <p className="text-sm mb-12" style={{ color: "var(--color-text-tertiary)" }}>
            No badges earned yet
          </p>

          {/* Match History */}
          <h2
            className="font-display text-lg font-bold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Match History
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            No matches played yet
          </p>
        </motion.div>
      </div>
    </main>
  );
}

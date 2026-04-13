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
    { label: "Arenas", value: user?.total_arenas_entered ?? 0 },
    { label: "Wins", value: user?.total_arenas_won ?? 0 },
    { label: "Rounds survived", value: user?.total_rounds_survived ?? 0 },
    { label: "Best PnL", value: user?.best_pnl_percent != null ? `${user.best_pnl_percent.toFixed(1)}%` : "—" },
  ];

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
            Profile
          </p>

          {/* Username + edit */}
          <div className="flex items-end gap-4 mb-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                  maxLength={20}
                  placeholder="username (3-20 chars, a-z 0-9 _)"
                  className="px-3 py-2 rounded-xl border border-accent-primary bg-surface font-display text-2xl font-800 text-text-primary outline-none w-72"
                />
                <button
                  onClick={handleSave}
                  disabled={updateUsername.isPending}
                  className="px-4 py-2 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {updateUsername.isPending ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditing(false); setError(""); }} className="px-4 py-2 rounded-full border border-border text-text-secondary text-sm hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-800 tracking-tight text-text-primary">
                  {isLoading ? "Loading..." : user?.username ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
                </h1>
                {user && (
                  <button
                    onClick={() => { setDraft(user.username ?? ""); setEditing(true); setError(""); }}
                    className="text-xs text-text-tertiary hover:text-accent-primary transition-colors underline underline-offset-2"
                  >
                    {user.username ? "Edit" : "Set username"}
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-danger text-sm mb-3">{error}</p>}

          <p className="font-mono text-sm text-text-tertiary mb-10">{address}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface rounded-2xl border border-border-medium p-5 text-center"
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

          {/* Referral */}
          <div className="bg-surface rounded-2xl border border-border-medium p-5 mb-12">
            <h2 className="font-display text-lg font-700 text-text-primary mb-2">
              Referral Link
            </h2>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}?ref=${user?.referral_code ?? address.slice(0, 8)}`}
                className="flex-1 px-3 py-2 rounded-lg bg-bg-primary border border-border-medium font-mono text-xs text-text-secondary"
              />
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.referral_code ?? address.slice(0, 8)}`)}
                className="px-4 py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
              >
                Copy
              </button>
            </div>
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

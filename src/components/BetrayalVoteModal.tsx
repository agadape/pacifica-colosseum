"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

interface AllianceState {
  data: {
    myAlliance: {
      id: string;
      status: string;
      partnerId: string;
      betrayalDeadlineAt: string | null;
      myVote: string | null;
      partnerVote: string | null;
    } | null;
    incomingProposals: unknown[];
  };
}

interface BetrayalVoteModalProps {
  arenaId: string;
  partnerName: string;
}

export function BetrayalVoteModal({ arenaId, partnerName }: BetrayalVoteModalProps) {
  const queryClient = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { getAccessToken } = usePrivy();

  const { data } = useQuery<AllianceState>({
    queryKey: ["alliances", arenaId],
    refetchInterval: 10_000,
  });

  const alliance = data?.data?.myAlliance;

  useEffect(() => {
    if (!alliance?.betrayalDeadlineAt) return;
    const deadline = new Date(alliance.betrayalDeadlineAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [alliance?.betrayalDeadlineAt]);

  const voteMutation = useMutation({
    mutationFn: async (vote: "stay" | "betray") => {
      const token = await getAccessToken();
      const res = await fetch(`/api/arenas/${arenaId}/alliances/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allianceId: alliance?.id, vote }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Vote failed");
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alliances", arenaId] });
      setTimeout(() => setDismissed(true), 2500);
    },
  });

  const shouldShow =
    !dismissed &&
    alliance?.status === "betraying" &&
    alliance.myVote === null &&
    (secondsLeft === null || secondsLeft > 0);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 16 }}
            className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-sm p-8"
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🗡️</div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-1">Betrayal Phase</h2>
              <p className="text-sm text-text-secondary">
                Your alliance with <span className="font-semibold text-neon-gold">{partnerName}</span> reaches its reckoning.
              </p>
            </div>

            {secondsLeft !== null && (
              <div className={`text-center mb-6 ${secondsLeft <= 15 ? "text-danger" : "text-text-secondary"}`}>
                <span className="font-mono text-3xl font-bold">
                  {secondsLeft}s
                </span>
                <p className="text-xs mt-1 opacity-60">until auto-resolve</p>
              </div>
            )}

            <div className="bg-bg-primary rounded-2xl p-4 mb-6 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm">🤝</span>
                <p className="text-xs text-text-secondary">
                  <span className="font-semibold text-neon-cyan">Stay</span> — alliance dissolves peacefully. Both survive independently.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm">⚔️</span>
                <p className="text-xs text-text-secondary">
                  <span className="font-semibold text-danger">Betray</span> — if only you betray, your partner is eliminated. If both betray, lower PnL loses.
                </p>
              </div>
            </div>

            {!voteMutation.isSuccess ? (
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => voteMutation.mutate("stay")}
                  disabled={voteMutation.isPending}
                  className="py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/20 transition-colors disabled:opacity-50"
                >
                  Stay Loyal
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => voteMutation.mutate("betray")}
                  disabled={voteMutation.isPending}
                  className="py-3 rounded-2xl bg-danger/10 border border-danger/30 text-danger font-semibold text-sm hover:bg-danger/20 transition-colors disabled:opacity-50"
                >
                  Betray
                </motion.button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4"
              >
                <p className="text-sm font-semibold text-text-primary">Vote cast. Waiting for partner...</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
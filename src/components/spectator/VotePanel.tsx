"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";

interface Candidate {
  id: string;
  user_id: string;
  subaccount_address: string;
  total_pnl_percent: number;
  users?: { username: string | null; wallet_address: string } | null;
}

interface VotePanelProps {
  arenaId: string;
  roundNumber: number;
  candidates: Candidate[];
  hasVoted: boolean;
  votedForId: string | null;
  votingOpen: boolean;
  tally: Record<string, number>;
  totalVotes: number;
}

export default function VotePanel({
  arenaId,
  roundNumber,
  candidates,
  hasVoted,
  votedForId,
  votingOpen,
  tally,
  totalVotes,
}: VotePanelProps) {
  const { getAccessToken, authenticated } = usePrivy();
  const [localVotedFor, setLocalVotedFor] = useState<string | null>(votedForId);
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);
  const [isVoting, setIsVoting] = useState(false);

  const effectiveVotedFor = localVotedFor ?? votedForId;
  const effectiveHasVoted = localHasVoted || hasVoted;

  const handleVote = async (participantId: string) => {
    if (effectiveHasVoted || !authenticated || isVoting) return;
    setIsVoting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/arenas/${arenaId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ round_number: roundNumber, voted_for_id: participantId }),
      });
      const result = await res.json();
      if (!result.error) {
        setLocalVotedFor(participantId);
        setLocalHasVoted(true);
      }
    } finally {
      setIsVoting(false);
    }
  };

  if (!votingOpen) {
    return (
      <div className="bg-surface rounded-2xl border border-border-light p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display text-sm font-700 text-text-primary">Second Life Vote</h3>
          <span className="text-[9px] font-mono text-text-tertiary bg-bg-primary rounded px-1.5 py-0.5 border border-border-light">
            last 5 min of round
          </span>
        </div>
        <p className="text-xs text-text-tertiary">
          {totalVotes > 0
            ? `${totalVotes} vote${totalVotes !== 1 ? "s" : ""} cast so far`
            : "Voting opens in the last 5 minutes of the round"}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-2xl border border-accent-gold/20 p-5"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-sm font-700 text-accent-gold">Second Life Vote</h3>
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-[9px] font-mono text-accent-gold/70 flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-gold inline-block" />
          OPEN
        </motion.span>
      </div>
      <p className="text-xs text-text-tertiary mb-4">
        {effectiveHasVoted
          ? "Your vote has been cast!"
          : "Vote for a bottom-50% trader to give them Second Life next round"}
      </p>

      <div className="space-y-2">
        {candidates.map((c) => {
          const name = c.users?.username ?? `${c.subaccount_address?.slice(0, 6)}…${c.subaccount_address?.slice(-4)}`;
          const votes = tally[c.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = effectiveVotedFor === c.id;

          return (
            <motion.button
              key={c.id}
              whileHover={!effectiveHasVoted ? { scale: 1.01 } : {}}
              whileTap={!effectiveHasVoted ? { scale: 0.99 } : {}}
              onClick={() => handleVote(c.id)}
              disabled={effectiveHasVoted || isVoting}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left relative overflow-hidden ${
                isMyVote
                  ? "border-accent-gold bg-accent-gold/5"
                  : "border-border-light hover:border-accent-gold/30 disabled:cursor-default"
              }`}
            >
              {/* Vote bar fill */}
              {effectiveHasVoted && pct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-accent-gold/8 rounded-xl"
                />
              )}
              <div className="relative flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-text-primary truncate">{name}</span>
                <span className={`font-mono text-xs flex-shrink-0 ${c.total_pnl_percent >= 0 ? "text-success" : "text-danger"}`}>
                  {c.total_pnl_percent >= 0 ? "+" : ""}{c.total_pnl_percent?.toFixed(1)}%
                </span>
              </div>
              <div className="relative flex items-center gap-2 flex-shrink-0">
                {effectiveHasVoted && (
                  <span className="font-mono text-xs text-text-tertiary">{votes > 0 ? `${pct}%` : "0%"}</span>
                )}
                {isMyVote && <span className="text-accent-gold text-xs">✓</span>}
                {!effectiveHasVoted && <span className="text-xs text-accent-gold font-semibold">Vote</span>}
              </div>
            </motion.button>
          );
        })}
      </div>

      {totalVotes > 0 && (
        <p className="text-[10px] text-text-tertiary text-center mt-3 font-mono">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
        </p>
      )}
    </motion.div>
  );
}

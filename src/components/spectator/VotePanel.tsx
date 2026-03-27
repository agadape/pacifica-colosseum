"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";

interface Candidate {
  id: string;
  user_id: string;
  subaccount_address: string;
  total_pnl_percent: number;
  votes?: number;
}

interface VotePanelProps {
  arenaId: string;
  roundNumber: number;
  candidates: Candidate[];
  hasVoted: boolean;
  votingOpen: boolean;
}

export default function VotePanel({
  arenaId,
  roundNumber,
  candidates,
  hasVoted,
  votingOpen,
}: VotePanelProps) {
  const { getAccessToken, authenticated } = usePrivy();
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (participantId: string) => {
    if (hasVoted || !authenticated || isVoting) return;

    setIsVoting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/arenas/${arenaId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          round_number: roundNumber,
          voted_for_id: participantId,
        }),
      });

      const result = await res.json();
      if (!result.error) {
        setVotedFor(participantId);
      }
    } finally {
      setIsVoting(false);
    }
  };

  if (!votingOpen) {
    return (
      <div className="bg-surface rounded-2xl border border-border-light p-5">
        <h3 className="font-display text-sm font-700 text-text-primary mb-2">
          Second Life Vote
        </h3>
        <p className="text-xs text-text-tertiary">Voting opens in the last 5 minutes of the round</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-accent-gold/20 p-5">
      <h3 className="font-display text-sm font-700 text-accent-gold mb-1">
        Second Life Vote
      </h3>
      <p className="text-xs text-text-tertiary mb-4">
        Vote for a trader in the bottom 50% to receive Second Life next round
      </p>

      <div className="space-y-2">
        {candidates.map((c) => {
          const isVotedFor = votedFor === c.id || (hasVoted && votedFor === null);
          return (
            <motion.button
              key={c.id}
              whileHover={!hasVoted ? { scale: 1.01 } : {}}
              whileTap={!hasVoted ? { scale: 0.99 } : {}}
              onClick={() => handleVote(c.id)}
              disabled={hasVoted || isVoting}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                isVotedFor
                  ? "border-accent-gold bg-accent-gold/5"
                  : "border-border-light hover:border-accent-gold/30 disabled:opacity-50"
              }`}
            >
              <div>
                <span className="font-mono text-sm text-text-primary">
                  {c.subaccount_address?.slice(0, 6)}...{c.subaccount_address?.slice(-4)}
                </span>
                <span className={`ml-2 font-mono text-xs ${c.total_pnl_percent >= 0 ? "text-success" : "text-danger"}`}>
                  {c.total_pnl_percent >= 0 ? "+" : ""}{c.total_pnl_percent?.toFixed(2)}%
                </span>
              </div>
              {!hasVoted && (
                <span className="text-xs text-accent-gold font-semibold">Vote</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {hasVoted && (
        <p className="text-xs text-accent-gold text-center mt-3 font-semibold">Vote cast!</p>
      )}
    </div>
  );
}

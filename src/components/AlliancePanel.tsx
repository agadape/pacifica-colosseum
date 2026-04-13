"use client";

import { useState } from "react";
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
    incomingProposals: Array<{
      id: string;
      proposerId: string;
      expiresAt: string | null;
    }>;
  };
}

interface Target {
  participantId: string;
  username: string;
}

interface AlliancePanelProps {
  arenaId: string;
  myParticipantId: string;
  targets: Target[];
}

async function fetchAlliances(arenaId: string): Promise<AllianceState> {
  const res = await fetch(`/api/arenas/${arenaId}/alliances`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch alliances");
  return res.json() as Promise<AllianceState>;
}

export function AlliancePanel({ arenaId, myParticipantId, targets }: AlliancePanelProps) {
  const queryClient = useQueryClient();
  const [selectedTarget, setSelectedTarget] = useState("");
  const [showPropose, setShowPropose] = useState(false);
  const { getAccessToken } = usePrivy();

  const { data } = useQuery({
    queryKey: ["alliances", arenaId],
    queryFn: () => fetchAlliances(arenaId),
    refetchInterval: 10_000,
  });

  const allianceData = data?.data;
  const myAlliance = allianceData?.myAlliance ?? null;
  const incomingProposals = allianceData?.incomingProposals ?? [];

  const proposeMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/arenas/${arenaId}/alliances/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetParticipantId: targetId }),
      });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alliances", arenaId] });
      setShowPropose(false);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (allianceId: string) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/arenas/${arenaId}/alliances/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allianceId }),
      });
      return res.json();
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["alliances", arenaId] }),
  });

  const declineMutation = useMutation({
    mutationFn: async (allianceId: string) => {
      const token = await getAccessToken();
      const res = await fetch(`/api/arenas/${arenaId}/alliances/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allianceId }),
      });
      return res.json();
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["alliances", arenaId] }),
  });

  const partnerName = myAlliance
    ? (targets.find(t => t.participantId === myAlliance.partnerId)?.username ?? myAlliance.partnerId.slice(0, 8))
    : null;

  return (
    <div className="bg-surface rounded-2xl border border-border-medium p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider">Alliance</h3>
        {!myAlliance && !showPropose && (
          <button
            onClick={() => setShowPropose(true)}
            className="text-xs text-accent-primary hover:text-accent-primary/70 font-medium transition-colors"
          >
            + Propose
          </button>
        )}
      </div>

      {/* Incoming proposals */}
      <AnimatePresence>
        {incomingProposals.length > 0 && !myAlliance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 space-y-2"
          >
            {incomingProposals.map(proposal => {
              const proposerName = targets.find(t => t.participantId === proposal.proposerId)?.username
                ?? proposal.proposerId.slice(0, 8);
              return (
                <div key={proposal.id} className="rounded-xl bg-amber-50 border border-amber-200/60 p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Alliance Proposal</p>
                  <p className="text-xs text-amber-700 mb-2">
                    <span className="font-medium">{proposerName}</span> wants to form an alliance
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptMutation.mutate(proposal.id)}
                      disabled={acceptMutation.isPending}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(proposal.id)}
                      disabled={declineMutation.isPending}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No alliance */}
      {!myAlliance && !showPropose && incomingProposals.length === 0 && (
        <p className="text-xs text-text-tertiary">No alliance — trading solo</p>
      )}

      {/* Propose form */}
      <AnimatePresence>
        {showPropose && !myAlliance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <select
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
              className="w-full text-xs bg-bg-primary border border-border-medium rounded-lg px-2 py-1.5 text-text-primary"
            >
              <option value="">Select a trader...</option>
              {targets.map(t => (
                <option key={t.participantId} value={t.participantId}>
                  {t.username}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => selectedTarget && proposeMutation.mutate(selectedTarget)}
                disabled={!selectedTarget || proposeMutation.isPending}
                className="flex-1 text-xs py-1.5 rounded-lg bg-accent-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {proposeMutation.isPending ? "Sending..." : "Send Proposal"}
              </button>
              <button
                onClick={() => { setShowPropose(false); setSelectedTarget(""); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-border-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active alliance */}
      {myAlliance && myAlliance.status === "active" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-text-primary font-medium">Allied with <span className="font-semibold">{partnerName}</span>&apos;s</span>
          </div>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Your PnL is averaged with your partner&apos;s for elimination ranking. Survive together.
          </p>
        </div>
      )}

      {/* Betrayal phase indicator */}
      {myAlliance && myAlliance.status === "betraying" && (
        <div className="rounded-xl bg-danger/5 border border-danger/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-danger"
            />
            <p className="text-xs font-semibold text-danger">Betrayal Phase</p>
          </div>
          <p className="text-xs text-danger/70">
            {myAlliance.myVote
              ? `You voted to ${myAlliance.myVote}. Waiting for partner...`
              : "Check the betrayal modal to cast your vote."}
          </p>
        </div>
      )}

      {/* Partner ID display for non-bot targets */}
      {myAlliance && myParticipantId && (
        <p className="text-xs text-text-tertiary/40 mt-2">
          Alliance #{myAlliance.id.slice(0, 8)}
        </p>
      )}
    </div>
  );
}

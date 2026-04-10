"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface UnlockNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "aggressive" | "defensive" | "scout";
  round_available: number;
  effect_type: string;
  effect_value: number;
  requires_node_id: string | null;
}

interface ProgressionData {
  chosen: { nodeId: string; roundNumber: number; chosenAt: string }[];
  pending: { roundNumber: number } | null;
  available: UnlockNode[];
  allNodes: UnlockNode[];
}

interface ProgressionModalProps {
  arenaId: string;
}

const CATEGORY_STYLES = {
  aggressive: {
    bg: "bg-red-950/60",
    border: "border-red-500/40",
    selectedBorder: "border-red-400",
    badge: "bg-red-500/20 text-red-300",
    btn: "bg-red-500 hover:bg-red-400",
    glow: "shadow-red-500/20",
    label: "Aggressive",
  },
  defensive: {
    bg: "bg-blue-950/60",
    border: "border-blue-500/40",
    selectedBorder: "border-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    btn: "bg-blue-500 hover:bg-blue-400",
    glow: "shadow-blue-500/20",
    label: "Defensive",
  },
  scout: {
    bg: "bg-emerald-950/60",
    border: "border-emerald-500/40",
    selectedBorder: "border-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
    btn: "bg-emerald-500 hover:bg-emerald-400",
    glow: "shadow-emerald-500/20",
    label: "Scout",
  },
};

function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}

export function ProgressionModal({ arenaId }: ProgressionModalProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [dismissed, setDismissed] = useState<number | null>(null); // round number of dismissed choice

  const { data, refetch } = useQuery<{ data: ProgressionData }>({
    queryKey: ["progression", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/arenas/${arenaId}/progression`);
      if (!res.ok) throw new Error("Failed to fetch progression");
      return res.json();
    },
    refetchInterval: 5_000,
  });

  const progression = data?.data;
  const pending = progression?.pending ?? null;
  const available = progression?.available ?? [];

  const countdown = useCountdown(30);
  const autoPickFired = useRef(false);

  // Auto-pick randomly if countdown hits 0 — guard prevents double-fire
  useEffect(() => {
    if (countdown === 0 && pending && available.length && !chosen && !autoPickFired.current) {
      autoPickFired.current = true;
      const random = available[Math.floor(Math.random() * available.length)];
      void handleChoose(random.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleChoose excluded: defined below this effect, including it re-registers on every render
  }, [countdown]);

  const handleChoose = useCallback(async (nodeId: string) => {
    if (choosing || chosen) return;
    setChoosing(true);
    setChosen(nodeId);
    try {
      await fetch(`/api/arenas/${arenaId}/progression/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId }),
      });
      await refetch();
      // Dismiss after 1.5s
      setTimeout(() => setDismissed(pending?.roundNumber ?? null), 1500);
    } finally {
      setChoosing(false);
    }
  }, [arenaId, choosing, chosen, pending, refetch]);

  const isVisible = !!pending && available.length > 0 && dismissed !== pending.roundNumber && !chosen;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.88, y: 32 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 280 }}
            className="w-full max-w-2xl bg-[#0d0d0f] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-1">
                    Round {pending?.roundNumber} Complete
                  </p>
                  <h2 className="font-display text-2xl font-bold text-white">Choose Your Path</h2>
                  <p className="text-sm text-white/40 mt-0.5">This bonus persists for the rest of the arena.</p>
                </div>
                {/* Countdown ring */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="3" />
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none"
                      stroke={countdown <= 10 ? "#ef4444" : "white"}
                      strokeOpacity="0.6"
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - countdown / 30)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold ${countdown <= 10 ? "text-red-400" : "text-white"}`}>
                    {countdown}
                  </span>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {available.map((node) => {
                const style = CATEGORY_STYLES[node.category];
                return (
                  <motion.button
                    key={node.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoose(node.id)}
                    disabled={choosing}
                    className={`
                      relative text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer
                      ${style.bg} ${style.border}
                      hover:${style.selectedBorder} hover:shadow-lg hover:${style.glow}
                      disabled:opacity-60 disabled:cursor-not-allowed
                    `}
                  >
                    {/* Category badge */}
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3 ${style.badge}`}>
                      {style.label}
                    </span>

                    {/* Icon + name */}
                    <div className="text-3xl mb-2">{node.icon}</div>
                    <h3 className="font-semibold text-white text-sm mb-1">{node.name}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{node.description}</p>

                    {/* Effect highlight */}
                    <div className={`mt-3 text-xs font-mono font-bold ${
                      node.category === "aggressive" ? "text-red-400" :
                      node.category === "defensive" ? "text-blue-400" : "text-emerald-400"
                    }`}>
                      {node.effect_type === "leverage_bonus" && `+${node.effect_value}x leverage`}
                      {node.effect_type === "drawdown_buffer" && `+${node.effect_value}% drawdown buffer`}
                      {node.effect_type === "position_scout" && `Reveal ${node.effect_value >= 99 ? "all" : node.effect_value} traders`}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <p className="text-center text-xs text-white/20 pb-5">
              Auto-selects randomly if timer expires
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation flash */}
      {chosen && (
        <motion.div
          key="chosen"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-[#0d0d0f] border border-white/10 rounded-2xl px-8 py-5 text-center shadow-2xl">
            <p className="text-2xl mb-1">
              {available.find(n => n.id === chosen)?.icon ?? "✓"}
            </p>
            <p className="font-semibold text-white text-sm">
              {available.find(n => n.id === chosen)?.name ?? "Unlocked"}
            </p>
            <p className="text-xs text-white/40 mt-0.5">Path chosen</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

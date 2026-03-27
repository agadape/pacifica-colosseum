"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface RoundTransitionProps {
  roundName: string;
  roundNumber: number;
  maxLeverage: number;
  maxDrawdown: number;
  onComplete: () => void;
}

export default function RoundTransition({
  roundName,
  roundNumber,
  maxLeverage,
  maxDrawdown,
  onComplete,
}: RoundTransitionProps) {
  const [phase, setPhase] = useState<"announce" | "countdown" | "done">("announce");
  const [count, setCount] = useState(3);

  useEffect(() => {
    // Announce for 2s, then countdown
    const announceTimer = setTimeout(() => setPhase("countdown"), 2000);
    return () => clearTimeout(announceTimer);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;

    if (count <= 0) {
      setPhase("done");
      setTimeout(onComplete, 500);
      return;
    }

    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, count, onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-text-primary/95 flex items-center justify-center"
        >
          {phase === "announce" && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <p className="text-white/40 text-xs uppercase tracking-[0.4em] mb-4">
                Round {roundNumber}
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-800 text-white tracking-tight">
                {roundName}
              </h1>
              <div className="flex items-center justify-center gap-6 mt-6">
                <span className="text-white/60 text-sm">
                  Max <span className="text-white font-mono font-bold">{maxLeverage}x</span>
                </span>
                <span className="text-danger text-sm">
                  Drawdown <span className="font-mono font-bold">{maxDrawdown}%</span>
                </span>
              </div>
            </motion.div>
          )}

          {phase === "countdown" && (
            <motion.span
              key={count}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display text-8xl font-800 text-white"
            >
              {count}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface EliminationBannerProps {
  traderAddress: string;
  reason: string;
  equity: number;
  onDismiss: () => void;
}

export default function EliminationBanner({
  traderAddress,
  reason,
  equity,
  onDismiss,
}: EliminationBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
        >
          <div className="bg-danger/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-2xl border border-danger/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-wider font-semibold">
                  Eliminated
                </p>
                <p className="text-white font-display text-lg font-700 mt-0.5">
                  {traderAddress.slice(0, 6)}...{traderAddress.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">{reason.replace(/_/g, " ")}</p>
                <p className="text-white font-mono font-bold">${equity.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

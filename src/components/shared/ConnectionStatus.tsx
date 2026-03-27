"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWSStore } from "@/stores/ws-store";

export default function ConnectionStatus() {
  const { connected } = useWSStore();

  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="px-4 py-2 rounded-full bg-warning/90 text-text-primary text-xs font-semibold shadow-lg backdrop-blur-sm">
            Reconnecting to price feed...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TraderPopup from "./TraderPopup";

interface Participant {
  id: string;
  subaccount_address: string;
  status: string;
  total_pnl_percent: number;
  max_drawdown_hit: number;
  total_trades: number;
  users?: { username: string | null; wallet_address: string } | null;
}

interface AvatarRowProps {
  participants: Participant[];
  maxDrawdown: number;
}

export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed.replace(/\s/g, ""))}`;
}

function getRingClass(pnlPercent: number, drawdown: number, maxDrawdown: number): string {
  const dangerPct = drawdown / maxDrawdown;
  if (dangerPct >= 0.8) return "ring-2 ring-danger shadow-sm shadow-danger/30";
  if (dangerPct >= 0.5) return "ring-2 ring-warning shadow-sm shadow-warning/20";
  if (pnlPercent > 0) return "ring-2 ring-success/50";
  return "ring-1 ring-border-light";
}

export default function AvatarRow({ participants, maxDrawdown }: AvatarRowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = [...participants].sort((a, b) => {
    const aOut = a.status === "eliminated" || a.status === "winner";
    const bOut = b.status === "eliminated" || b.status === "winner";
    if (!aOut && bOut) return -1;
    if (aOut && !bOut) return 1;
    return (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0);
  });

  const selected = sorted.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="relative">
      <div className="flex items-end gap-4 flex-wrap">
        {sorted.map((p, i) => {
          const isEliminated = p.status === "eliminated";
          const isWinner = p.status === "winner";
          const isActive = !isEliminated && !isWinner;
          const seed = p.users?.username ?? p.users?.wallet_address ?? p.subaccount_address;
          const firstName = (p.users?.username ?? p.subaccount_address).split(" ")[0];
          const ringClass = isActive ? getRingClass(p.total_pnl_percent, p.max_drawdown_hit, maxDrawdown) : "";

          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 30 }}
              onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div
                className={`relative w-11 h-11 rounded-full overflow-hidden transition-all duration-200 ${ringClass} ${
                  isEliminated ? "grayscale opacity-35" : "group-hover:scale-110"
                } ${selectedId === p.id ? "scale-110" : ""}`}
              >
                <img
                  src={getAvatarUrl(seed)}
                  alt={firstName}
                  className="w-full h-full object-cover bg-bg-primary"
                />
                {isEliminated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-white text-base font-bold leading-none">✕</span>
                  </div>
                )}
                {isWinner && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1 text-base"
                  >
                    👑
                  </motion.div>
                )}
                {isActive && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                    className={`absolute inset-0 rounded-full pointer-events-none ${
                      p.max_drawdown_hit / maxDrawdown >= 0.8
                        ? "bg-danger/15"
                        : p.max_drawdown_hit / maxDrawdown >= 0.5
                        ? "bg-warning/10"
                        : "bg-success/8"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[9px] font-medium max-w-[44px] truncate transition-colors ${
                  isEliminated
                    ? "text-text-tertiary"
                    : "text-text-secondary group-hover:text-text-primary"
                }`}
              >
                {firstName}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <TraderPopup
            key={selected.id}
            participant={selected}
            maxDrawdown={maxDrawdown}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

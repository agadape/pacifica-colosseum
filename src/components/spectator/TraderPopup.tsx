"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getAvatarUrl } from "./AvatarRow";

interface Participant {
  id: string;
  subaccount_address: string;
  status: string;
  total_pnl_percent: number;
  max_drawdown_hit: number;
  total_trades: number;
  users?: { username: string | null; wallet_address: string } | null;
}

interface TraderPopupProps {
  participant: Participant;
  maxDrawdown: number;
  onClose: () => void;
}

function getStatusInfo(
  p: Participant,
  maxDrawdown: number
): { label: string; color: string } {
  if (p.status === "winner") return { label: "WINNER", color: "text-accent-gold" };
  if (p.status === "eliminated") return { label: "ELIMINATED", color: "text-danger" };
  const ratio = p.max_drawdown_hit / maxDrawdown;
  if (ratio >= 0.8) return { label: "CRITICAL", color: "text-danger" };
  if (ratio >= 0.5) return { label: "DANGER", color: "text-warning" };
  return { label: "SAFE", color: "text-success" };
}

export default function TraderPopup({
  participant: p,
  maxDrawdown,
  onClose,
}: TraderPopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seed =
    p.users?.username ?? p.users?.wallet_address ?? p.subaccount_address;
  const displayName =
    p.users?.username ??
    `${p.subaccount_address.slice(0, 6)}...${p.subaccount_address.slice(-4)}`;
  const statusInfo = getStatusInfo(p, maxDrawdown);
  const drawdownRatio = Math.min(p.max_drawdown_hit / maxDrawdown, 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // slight delay so the click that opens it doesn't immediately close it
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="absolute top-full left-0 mt-3 z-50 w-52 bg-surface rounded-2xl border border-border-light shadow-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-primary border border-border-light flex-shrink-0">
          <img
            src={getAvatarUrl(seed)}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-tight truncate">
            {displayName}
          </p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${statusInfo.color}`}>
            {statusInfo.label}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between items-center">
          <span className="text-text-tertiary">PnL</span>
          <span
            className={`font-mono font-bold ${
              p.total_pnl_percent >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {p.total_pnl_percent >= 0 ? "+" : ""}
            {p.total_pnl_percent.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-tertiary">Drawdown</span>
          <span className="font-mono text-text-secondary">
            {p.max_drawdown_hit.toFixed(1)}% / {maxDrawdown}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-tertiary">Trades</span>
          <span className="font-mono text-text-secondary">{p.total_trades}</span>
        </div>
      </div>

      {/* Drawdown bar */}
      <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${drawdownRatio * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${
            drawdownRatio >= 0.8
              ? "bg-danger"
              : drawdownRatio >= 0.5
              ? "bg-warning"
              : "bg-success"
          }`}
        />
      </div>
    </motion.div>
  );
}

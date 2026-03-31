"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Timer from "@/components/shared/Timer";

interface ArenaCardProps {
  arena: {
    id: string;
    name: string;
    preset: string;
    status: string;
    starts_at: string;
    current_round: number;
    min_participants: number;
    max_participants: number;
    starting_capital?: number;
    arena_participants?: Array<{ count: number }> | number;
  };
}

const presetStyles: Record<string, { bg: string; text: string; border: string }> = {
  blitz: { bg: "bg-danger/5", text: "text-danger", border: "border-danger/20" },
  sprint: { bg: "bg-accent-primary/5", text: "text-accent-primary", border: "border-accent-primary/20" },
  daily: { bg: "bg-success/5", text: "text-success", border: "border-success/20" },
  weekly: { bg: "bg-accent-gold/5", text: "text-accent-gold", border: "border-accent-gold/20" },
};

const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  registration: { label: "Open", color: "text-success", pulse: true },
  starting: { label: "Starting", color: "text-warning", pulse: true },
  round_1: { label: "Round 1", color: "text-accent-primary", pulse: true },
  round_2: { label: "Round 2", color: "text-accent-primary", pulse: true },
  round_3: { label: "Round 3", color: "text-danger", pulse: true },
  sudden_death: { label: "Sudden Death", color: "text-danger", pulse: true },
  completed: { label: "Completed", color: "text-text-tertiary", pulse: false },
  cancelled: { label: "Cancelled", color: "text-text-tertiary", pulse: false },
};

function getParticipantCount(arena: ArenaCardProps["arena"]): number {
  if (typeof arena.arena_participants === "number") return arena.arena_participants;
  if (Array.isArray(arena.arena_participants) && arena.arena_participants[0]?.count !== undefined) {
    return arena.arena_participants[0].count;
  }
  return 0;
}

export default function ArenaCard({ arena }: ArenaCardProps) {
  const count = getParticipantCount(arena);
  const statusInfo = statusConfig[arena.status] ?? { label: arena.status, color: "text-text-secondary", pulse: false };
  const preset = presetStyles[arena.preset] ?? presetStyles.sprint;
  const isActive = ["round_1", "round_2", "round_3", "sudden_death"].includes(arena.status);
  const isCompleted = arena.status === "completed" || arena.status === "cancelled";
  const href = isActive ? `/arenas/${arena.id}/spectate` : `/arenas/${arena.id}`;

  return (
    <Link href={href}>
      <motion.div
        whileHover={isCompleted ? {} : { y: -6, scale: 1.02 }}
        whileTap={isCompleted ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`group relative bg-surface rounded-2xl border overflow-hidden cursor-pointer transition-shadow ${
          isActive
            ? "border-accent-primary/30 shadow-lg hover:shadow-xl"
            : isCompleted
            ? "border-border-light opacity-50"
            : "border-border-light hover:shadow-xl"
        }`}
      >
        {/* Top color accent bar */}
        <div className={`h-1 ${isActive ? "bg-accent-primary" : isCompleted ? "bg-border-light" : preset.bg}`} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className={`font-display text-lg font-700 transition-colors ${isCompleted ? "text-text-tertiary" : "text-text-primary group-hover:text-accent-primary"}`}>
                {arena.name}
              </h3>
              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${preset.bg} ${preset.text} ${preset.border}`}>
                {arena.preset}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {statusInfo.pulse && (
                <span className={`w-2 h-2 rounded-full ${statusInfo.color === "text-success" ? "bg-success" : statusInfo.color === "text-danger" ? "bg-danger" : "bg-accent-primary"} animate-pulse`} />
              )}
              <span className={`text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Starting capital */}
          {arena.starting_capital && (
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-text-tertiary">Prize Pool</span>
              <span className="font-mono font-semibold text-accent-gold">
                ${(arena.starting_capital * (arena.max_participants ?? 8)).toLocaleString()}
              </span>
            </div>
          )}

          {/* Progress bar for participants */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-tertiary">Traders</span>
              <span className="font-mono text-text-secondary">
                {count}/{arena.max_participants}
              </span>
            </div>
            <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((count / arena.max_participants) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" as const }}
                className={`h-full rounded-full ${isActive ? "bg-accent-primary" : "bg-accent-primary/60"}`}
              />
            </div>
          </div>

          {arena.status === "registration" && (
            <Timer targetDate={arena.starts_at} label="starts in" className="text-xs" />
          )}

          {isActive && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-accent-primary font-semibold">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-accent-primary inline-block"
                />
                Live Now
              </div>
              <span className="text-[10px] text-accent-primary font-medium uppercase tracking-wider">
                Watch →
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

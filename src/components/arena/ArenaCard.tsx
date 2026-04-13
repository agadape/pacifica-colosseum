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
  blitz: { bg: "bg-red-50", text: "text-danger", border: "border-red-200" },
  sprint: { bg: "bg-indigo-50", text: "text-accent-primary", border: "border-indigo-200" },
  daily: { bg: "bg-emerald-50", text: "text-success-dark", border: "border-emerald-200" },
  weekly: { bg: "bg-amber-50", text: "text-accent-gold", border: "border-amber-200" },
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
        whileHover={isCompleted ? {} : { y: -4, scale: 1.01 }}
        whileTap={isCompleted ? {} : { scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`group relative bg-surface rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
          isActive
            ? "border-accent-primary/30 shadow-md hover:shadow-lg"
            : isCompleted
            ? "border-border opacity-60"
            : "border-border hover:shadow-md"
        }`}
      >
        <div className={`h-1.5 ${isActive ? "bg-accent-primary" : isCompleted ? "bg-border" : preset.bg.replace("-50", "-500")}`} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className={`font-display text-lg font-bold transition-colors ${isCompleted ? "text-text-tertiary" : "text-text-primary group-hover:text-accent-primary"}`}>
                {arena.name}
              </h3>
              <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${preset.bg} ${preset.text} ${preset.border}`}>
                {arena.preset}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {statusInfo.pulse && (
                <span className={`w-2 h-2 rounded-full ${statusInfo.color === "text-success" ? "bg-success" : statusInfo.color === "text-danger" ? "bg-danger" : "bg-accent-primary"} animate-pulse`} />
              )}
              <span className={`text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {arena.starting_capital && (
            <div className="flex items-center justify-between text-xs mb-4">
              <span className="text-text-tertiary">Prize Pool</span>
              <span className="font-mono font-semibold text-accent-gold">
                ${(arena.starting_capital * (arena.max_participants ?? 8)).toLocaleString()}
              </span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-tertiary">Traders</span>
              <span className="font-mono text-text-secondary font-medium">
                {count}/{arena.max_participants}
              </span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
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
            <div className="flex items-center justify-between pt-2 border-t border-border-medium">
              <div className="flex items-center gap-2 text-xs text-accent-primary font-semibold">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-accent-primary inline-block"
                />
                Live
              </div>
              <span className="text-xs text-accent-primary font-medium uppercase tracking-wider">
                Watch →
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
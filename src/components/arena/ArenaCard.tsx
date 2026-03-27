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
    arena_participants?: Array<{ count: number }> | number;
  };
}

const presetColors: Record<string, string> = {
  blitz: "bg-danger/10 text-danger",
  sprint: "bg-accent-primary/10 text-accent-primary",
  daily: "bg-success/10 text-success",
  weekly: "bg-accent-gold/10 text-accent-gold",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  registration: { label: "Open", color: "text-success" },
  starting: { label: "Starting", color: "text-warning" },
  round_1: { label: "Round 1", color: "text-accent-primary" },
  round_2: { label: "Round 2", color: "text-accent-primary" },
  round_3: { label: "Round 3", color: "text-danger" },
  sudden_death: { label: "Sudden Death", color: "text-danger" },
  completed: { label: "Completed", color: "text-text-tertiary" },
  cancelled: { label: "Cancelled", color: "text-text-tertiary" },
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
  const statusInfo = statusLabels[arena.status] ?? { label: arena.status, color: "text-text-secondary" };
  const presetColor = presetColors[arena.preset] ?? "bg-border-light text-text-secondary";

  return (
    <Link href={`/arenas/${arena.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group bg-surface rounded-2xl border border-border-light p-6 hover:border-accent-primary/30 hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-700 text-text-primary group-hover:text-accent-primary transition-colors">
              {arena.name}
            </h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${presetColor}`}>
              {arena.preset}
            </span>
          </div>
          <span className={`text-xs font-semibold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-text-secondary">
            <span className="font-mono">{count}</span>
            <span>/</span>
            <span className="font-mono">{arena.max_participants}</span>
            <span className="text-text-tertiary ml-1">traders</span>
          </div>

          {arena.status === "registration" && (
            <Timer targetDate={arena.starts_at} label="starts" />
          )}
        </div>
      </motion.div>
    </Link>
  );
}

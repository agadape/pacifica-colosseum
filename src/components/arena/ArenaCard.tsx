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

const presetConfig: Record<string, { bg: string; text: string; border: string; glow: string; label: string }> = {
  blitz: { bg: "rgba(232,83,83,0.1)", text: "#E85353", border: "rgba(232,83,83,0.3)", glow: "rgba(232,83,83,0.3)", label: "BLITZ" },
  sprint: { bg: "rgba(93,217,168,0.08)", text: "#5DD9A8", border: "rgba(93,217,168,0.25)", glow: "rgba(93,217,168,0.25)", label: "SPRINT" },
  daily: { bg: "rgba(77,191,255,0.08)", text: "#4DBFFF", border: "rgba(77,191,255,0.25)", glow: "rgba(77,191,255,0.25)", label: "DAILY" },
  weekly: { bg: "rgba(42,159,232,0.08)", text: "#2A9FE8", border: "rgba(42,159,232,0.25)", glow: "rgba(42,159,232,0.25)", label: "WEEKLY" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; pulse: boolean }> = {
  registration: { label: "OPEN", color: "#5DD9A8", bgColor: "rgba(93,217,168,0.1)", pulse: true },
  starting: { label: "STARTING", color: "#E8A836", bgColor: "rgba(232,168,54,0.1)", pulse: true },
  round_1: { label: "ROUND 1", color: "#4DBFFF", bgColor: "rgba(77,191,255,0.1)", pulse: true },
  round_2: { label: "ROUND 2", color: "#4DBFFF", bgColor: "rgba(77,191,255,0.1)", pulse: true },
  round_3: { label: "ROUND 3", color: "#FF6B4A", bgColor: "rgba(255,107,74,0.1)", pulse: true },
  sudden_death: { label: "SUDDEN DEATH", color: "#E85353", bgColor: "rgba(232,83,83,0.1)", pulse: true },
  completed: { label: "COMPLETED", color: "#5A5848", bgColor: "rgba(90,88,72,0.1)", pulse: false },
  cancelled: { label: "CANCELLED", color: "#5A5848", bgColor: "rgba(90,88,72,0.1)", pulse: false },
};

function getParticipantCount(arena: ArenaCardProps["arena"]): number {
  if (typeof arena.arena_participants === "number") return arena.arena_participants;
  if (Array.isArray(arena.arena_participants) && arena.arena_participants[0]?.count !== undefined) {
    return arena.arena_participants[0].count;
  }
  return 0;
}

function CardCorner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const transforms: Record<string, string> = {
    tl: "top-0 left-0 -translate-x-1 -translate-y-1",
    tr: "top-0 right-0 translate-x-1 -translate-y-1 rotate-90",
    bl: "bottom-0 left-0 -translate-x-1 translate-y-1 rotate(-90deg)",
    br: "bottom-0 right-0 translate-x-1 translate-y-1 rotate(180deg)",
  };

  return (
    <div
      className={`absolute w-4 h-4 pointer-events-none ${transforms[position]}`}
      style={{ opacity: 0.4 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M0 16 L0 4 C0 1.8 1.8 0 4 0 L16 0" stroke="#4DBFFF" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function ArenaCard({ arena }: ArenaCardProps) {
  const count = getParticipantCount(arena);
  const status = statusConfig[arena.status] ?? { label: arena.status, color: "#9A9688", bgColor: "rgba(154,150,136,0.1)", pulse: false };
  const preset = presetConfig[arena.preset] ?? presetConfig.sprint;
  const isActive = ["round_1", "round_2", "round_3", "sudden_death"].includes(arena.status);
  const isCompleted = arena.status === "completed" || arena.status === "cancelled";
  const href = isActive ? `/arenas/${arena.id}/spectate` : `/arenas/${arena.id}`;

  return (
    <Link href={href}>
      <motion.div
        whileHover={isCompleted ? {} : { y: -6, scale: 1.01 }}
        whileTap={isCompleted ? {} : { scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
          isActive ? "genshin-card-ornate" : "genshin-card"
        }`}
        style={{
          borderColor: isActive ? "rgba(77,191,255,0.35)" : "rgba(77,191,255,0.12)",
          boxShadow: isActive
            ? "0 0 0 1px rgba(77,191,255,0.08), 0 8px 40px rgba(0,0,0,0.8), 0 0 30px rgba(77,191,255,0.12)"
            : "0 0 0 1px rgba(77,191,255,0.05), 0 4px 24px rgba(0,0,0,0.7)",
        }}
      >
        <CardCorner position="tl" />
        <CardCorner position="tr" />
        <CardCorner position="bl" />
        <CardCorner position="br" />

        <div
          className="h-1"
          style={{
            background: isActive
              ? `linear-gradient(90deg, ${preset.text}, ${preset.text}60)`
              : isCompleted
              ? "var(--color-border)"
              : preset.text,
            boxShadow: isActive ? `0 0 20px ${preset.glow}` : "none",
          }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
                <h3
                  className={`font-bold tracking-wide transition-colors text-base ${
                    isCompleted ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)] group-hover:text-[var(--color-sky-primary)]"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                {arena.name}
              </h3>
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  background: preset.bg,
                  color: preset.text,
                  borderColor: preset.border,
                  fontFamily: "var(--font-display)",
                  boxShadow: `0 0 10px ${preset.glow}`,
                }}
              >
                {preset.label}
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
              style={{
                background: status.bgColor,
                color: status.color,
                fontFamily: "var(--font-display)",
                boxShadow: status.pulse ? `0 0 10px ${status.color}30` : "none",
              }}
            >
              {status.pulse && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: status.color, boxShadow: `0 0 6px ${status.color}` }}
                />
              )}
              {status.label}
            </div>
          </div>

          {arena.starting_capital && (
            <div className="flex items-center justify-between text-xs mb-4">
              <span className="text-[var(--color-text-tertiary)]">Prize Pool</span>
              <span
                className="font-mono font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-sky-primary)" }}
              >
                ${(arena.starting_capital * (arena.max_participants ?? 8)).toLocaleString()}
              </span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[var(--color-text-tertiary)]">Traders</span>
              <span className="font-mono font-semibold text-[var(--color-text-secondary)]">
                {count}/{arena.max_participants}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-bg-tertiary)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((count / arena.max_participants) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: isActive
                    ? "linear-gradient(90deg, #4DBFFF, #2A9FE8)"
                    : "linear-gradient(90deg, #4DBFFF80, #2A9FE880)",
                  boxShadow: isActive ? `0 0 8px rgba(77,191,255,0.5)` : "none",
                }}
              />
            </div>
          </div>

          {arena.status === "registration" && (
            <Timer targetDate={arena.starts_at} label="starts in" className="text-xs" />
          )}

          {isActive && (
            <div
              className="flex items-center justify-between pt-3 mt-2 border-t"
              style={{ borderColor: "rgba(77,191,255,0.1)" }}
            >
              <div
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--color-sky-primary)" }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#4DBFFF", boxShadow: "0 0 8px rgba(77,191,255,0.6)" }}
                />
                Live
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-sky-primary)" }}>
                Watch →
              </span>
            </div>
          )}
        </div>

        {isActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: "radial-gradient(ellipse at top, rgba(77,191,255,0.03) 0%, transparent 60%)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        )}
      </motion.div>
    </Link>
  );
}

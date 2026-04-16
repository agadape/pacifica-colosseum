"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Event {
  id: number;
  event_type: string;
  message: string;
  created_at: string;
  actor_id: string | null;
}

interface ActivityFeedProps {
  events: Event[];
}

const typeColors: Record<string, string> = {
  trade_opened: "text-neon-cyan",
  trade_closed: "text-neon-cyan",
  elimination: "text-danger",
  round_start: "text-neon-cyan",
  round_end: "text-text-secondary",
  loot_awarded: "text-neon-gold",
  arena_start: "text-neon-cyan",
  arena_end: "text-text-primary",
  second_life_used: "text-neon-gold",
  leverage_warning: "text-warning",
  vote_cast: "text-text-secondary",
};

const typeIcons: Record<string, string> = {
  trade_opened: "↗",
  trade_closed: "↙",
  elimination: "✕",
  round_start: "▶",
  round_end: "■",
  loot_awarded: "★",
  arena_start: "⚡",
  arena_end: "🏁",
  second_life_used: "♻",
  leverage_warning: "⚠",
  vote_cast: "🗳",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="font-display text-sm font-bold text-text-primary mb-4">
        Activity
      </h3>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4">No events yet</p>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-0"
              >
                <span className={`text-sm ${typeColors[event.event_type] ?? "text-text-secondary"}`}>
                  {typeIcons[event.event_type] ?? "•"}
                </span>
                <p className="text-xs text-text-secondary flex-1 leading-relaxed">
                  {event.message}
                </p>
                <span className="text-xs text-text-tertiary font-mono whitespace-nowrap">
                  {timeAgo(event.created_at)}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
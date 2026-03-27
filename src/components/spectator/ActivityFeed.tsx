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
  trade_opened: "text-success",
  trade_closed: "text-accent-primary",
  elimination: "text-danger",
  round_start: "text-accent-primary",
  round_end: "text-text-secondary",
  loot_awarded: "text-accent-gold",
  arena_start: "text-accent-primary",
  arena_end: "text-text-primary",
  second_life_used: "text-accent-gold",
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
    <div className="bg-surface rounded-2xl border border-border-light p-5">
      <h3 className="font-display text-sm font-700 text-text-primary mb-4">
        Activity
      </h3>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-sm text-text-tertiary">No events yet</p>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 py-2 border-b border-border-light last:border-0"
              >
                <span className={`text-sm ${typeColors[event.event_type] ?? "text-text-secondary"}`}>
                  {typeIcons[event.event_type] ?? "•"}
                </span>
                <p className="text-xs text-text-secondary flex-1 leading-relaxed">
                  {event.message}
                </p>
                <span className="text-[10px] text-text-tertiary font-mono whitespace-nowrap">
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

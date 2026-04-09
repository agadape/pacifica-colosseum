"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DraftEvent {
  id: string;
  event_type: string;
  actor_id: string;
  data: {
    territory_id?: string;
    cell_label?: string;
    pnl_bonus_percent?: number;
  };
  message: string;
  created_at: string;
}

interface TerritoryDraftModalProps {
  events: DraftEvent[];
  currentRound: number;
  /** participant.id → display name */
  nameMap: Record<string, string>;
}

const DRAFT_VISIBLE_WINDOW_MS = 45_000; // Show modal for 45s after last draft event

export default function TerritoryDraftModal({
  events,
  currentRound,
  nameMap,
}: TerritoryDraftModalProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastRound, setLastRound] = useState(currentRound);

  // Filter territory_draft events for current round
  const draftEvents = events.filter(
    (e) =>
      e.event_type === "territory_draft" &&
      // created_at within last DRAFT_VISIBLE_WINDOW_MS
      Date.now() - new Date(e.created_at).getTime() < DRAFT_VISIBLE_WINDOW_MS
  );

  // Auto-dismiss when round changes (new round starts fresh)
  useEffect(() => {
    if (currentRound !== lastRound) {
      setDismissed(false);
      setLastRound(currentRound);
    }
  }, [currentRound, lastRound]);

  // Show when draft events appear
  useEffect(() => {
    if (draftEvents.length > 0 && !dismissed) {
      setVisible(true);
    } else if (draftEvents.length === 0) {
      setVisible(false);
    }
  }, [draftEvents.length, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm pointer-events-auto"
        >
          <div className="mx-4 bg-surface border border-border-light rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface/80">
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-accent-primary inline-block"
                />
                <span className="text-xs font-semibold text-text-primary">
                  Territory Draft — Round {currentRound}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-text-tertiary hover:text-text-primary transition-colors text-sm leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Draft picks list */}
            <div className="max-h-52 overflow-y-auto p-3 space-y-1">
              {draftEvents.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-2">Waiting for draft…</p>
              ) : (
                [...draftEvents].reverse().map((event, i) => {
                  const name = nameMap[event.actor_id] ?? event.actor_id.slice(0, 8);
                  const label = event.data?.cell_label ?? "?";
                  const bonus = event.data?.pnl_bonus_percent;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-surface/60 border border-border-light"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-tertiary font-mono text-[10px]">
                          #{draftEvents.length - i}
                        </span>
                        <span className="font-semibold text-text-primary truncate max-w-[120px]">{name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-text-primary font-bold">{label}</span>
                        {bonus !== undefined && bonus > 0 && (
                          <span className="text-[9px] font-semibold text-emerald-600">
                            +{bonus.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-border-light">
              <p className="text-[10px] text-text-tertiary text-center">
                Snake draft — best PnL picks first. Territories carry bonuses into the round.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

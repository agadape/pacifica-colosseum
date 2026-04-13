"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface TerritoryCell {
  id: string;
  label: string;
  row: number;
  col: number;
  pnlBonusPercent: number;
  drawdownBufferPercent: number;
  leverageOverride: number | null;
  maxPositionSize: number | null;
  isEliminationZone: boolean;
  holder: {
    participantId: string;
    userId: string;
    username: string | null;
    currentPnlPercent: number;
    status: string;
  } | null;
}

interface BoardState {
  rows: number;
  cols: number;
  grid: Array<Array<TerritoryCell | null>>;
}

interface TerritoryInfoCardProps {
  arenaId: string;
  myParticipantId: string;
}

export default function TerritoryInfoCard({ arenaId, myParticipantId }: TerritoryInfoCardProps) {
  const { data } = useQuery<{ data: BoardState }>({
    queryKey: ["territories", arenaId],
    queryFn: () => fetch(`/api/arenas/${arenaId}/territories`).then((r) => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const board = data?.data;

  // Find my cell
  const myCell = board?.grid
    .flat()
    .find((cell) => cell?.holder?.participantId === myParticipantId) ?? null;

  if (!board) return null;
  if (!myCell) {
    return (
      <div className="bg-surface rounded-2xl border border-border-medium p-4">
        <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Territory
        </h3>
        <p className="text-xs text-text-tertiary italic">No territory assigned yet</p>
      </div>
    );
  }

  const hasBonus = myCell.pnlBonusPercent > 0;
  const hasBuffer = myCell.drawdownBufferPercent > 0;
  const hasCap = myCell.leverageOverride !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface rounded-2xl border p-4 space-y-3 ${
        myCell.isEliminationZone
          ? "border-rose-300/60 bg-rose-50/30"
          : "border-border-medium"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Territory
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-text-primary">{myCell.label}</span>
          {myCell.isEliminationZone && (
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider bg-rose-100 px-1.5 py-0.5 rounded-full">
              Danger
            </span>
          )}
        </div>
      </div>

      {/* Modifiers */}
      <div className="space-y-1.5">
        {hasBonus && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">PnL Bonus</span>
            <span className="text-[11px] font-mono font-semibold text-emerald-600">
              +{myCell.pnlBonusPercent.toFixed(1)}%
            </span>
          </div>
        )}
        {hasBuffer && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">DD Buffer</span>
            <span className="text-[11px] font-mono font-semibold text-blue-600">
              +{myCell.drawdownBufferPercent.toFixed(1)}%
            </span>
          </div>
        )}
        {hasCap && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Max Leverage</span>
            <span className="text-[11px] font-mono font-semibold text-text-primary">
              {myCell.leverageOverride}×
            </span>
          </div>
        )}
        {!hasBonus && !hasBuffer && !hasCap && (
          <p className="text-xs text-text-tertiary italic">No modifiers — base rules apply</p>
        )}
      </div>

      {myCell.isEliminationZone && (
        <div className="rounded-lg bg-rose-50 border border-rose-200/60 px-3 py-2">
          <p className="text-xs text-rose-700 font-semibold">⚠ Elimination zone</p>
          <p className="text-xs text-rose-600/70 mt-0.5">
            Traders in bottom rows are eliminated first at round end. Attack upward to escape.
          </p>
        </div>
      )}
    </motion.div>
  );
}

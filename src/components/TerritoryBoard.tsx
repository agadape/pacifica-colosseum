"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";

interface TerritoryHolder {
  participantId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  currentPnlPercent: number;
  status: string;
}

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
  holder: TerritoryHolder | null;
}

interface BoardState {
  rows: number;
  cols: number;
  grid: Array<Array<TerritoryCell | null>>;
}

interface TerritoryBoardProps {
  arenaId: string;
  myParticipantId?: string | null;
}

function pnlColor(pnl: number): string {
  if (pnl >= 0.05) return "text-neon-cyan drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]";
  if (pnl >= 0) return "text-neon-cyan/70";
  if (pnl >= -0.05) return "text-neon-magenta/70";
  return "text-neon-magenta drop-shadow-[0_0_4px_rgba(255,0,110,0.4)]";
}

function cellBg(cell: TerritoryCell, isMe: boolean, isTarget: boolean): string {
  if (isTarget) return "bg-neon-gold/10 border-neon-gold shadow-neon-gold/20";
  if (isMe) return "bg-neon-cyan/8 border-neon-cyan shadow-sm";
  if (cell.isEliminationZone && !cell.holder) return "bg-neon-magenta/5 border-neon-magenta/30";
  if (cell.isEliminationZone) return "bg-neon-magenta/10 border-neon-magenta/40";
  if (!cell.holder) return "bg-surface/40 border-border-medium border-dashed";
  return "bg-surface border-border-medium";
}

export default function TerritoryBoard({ arenaId, myParticipantId }: TerritoryBoardProps) {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();
  const [targetCell, setTargetCell] = useState<TerritoryCell | null>(null);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [attackSuccess, setAttackSuccess] = useState(false);

  const { data, isLoading } = useQuery<{ data: BoardState }>({
    queryKey: ["territories", arenaId],
    queryFn: () => fetch(`/api/arenas/${arenaId}/territories`).then((r) => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const board = data?.data;

  const attackMutation = useMutation({
    mutationFn: async (defenderId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/arenas/${arenaId}/territories/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ defenderId }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.error) {
        setAttackError(typeof result.error === "string" ? result.error : "Attack failed");
      } else {
        setAttackSuccess(true);
        setTargetCell(null);
        queryClient.invalidateQueries({ queryKey: ["territories", arenaId] });
        setTimeout(() => setAttackSuccess(false), 3000);
      }
    },
    onError: (err) => {
      setAttackError(err instanceof Error ? err.message : "Attack failed");
    },
  });

  const handleCellClick = (cell: TerritoryCell) => {
    if (!myParticipantId) return;
    if (!cell.holder) return;
    if (cell.holder.participantId === myParticipantId) return;
    setAttackError(null);
    setTargetCell(cell);
  };

  const handleAttack = () => {
    if (!targetCell?.holder) return;
    attackMutation.mutate(targetCell.holder.participantId);
  };

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl border border-border-medium p-6 flex items-center justify-center h-36">
        <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="bg-surface rounded-2xl border border-border-medium p-6 text-center">
        <p className="text-xs text-text-tertiary">Territory board not yet initialized</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border-medium p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Territory Board
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-rose-200 inline-block" />
            Elimination zone
          </span>
          {myParticipantId && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-accent-primary/20 inline-block" />
              Your cell
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
      >
        {board.grid.flatMap((row, ri) =>
          row.map((cell, ci) => {
            if (!cell) return <div key={`${ri}-${ci}`} className="h-14" />;

            const isMe = cell.holder?.participantId === myParticipantId;
            const isTarget = targetCell?.id === cell.id;
            const isClickable = myParticipantId && cell.holder && !isMe;

            return (
              <motion.button
                key={cell.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (ri * board.cols + ci) * 0.02, duration: 0.25 }}
                onClick={() => handleCellClick(cell)}
                disabled={!isClickable}
                className={`relative rounded-lg border px-1.5 py-1.5 h-14 flex flex-col justify-between transition-all
                  ${cellBg(cell, isMe, isTarget)}
                  ${isClickable ? "cursor-pointer hover:border-amber-400 hover:shadow-sm" : "cursor-default"}
                  ${cell.isEliminationZone ? "border-l-2 border-l-rose-400" : ""}
                `}
              >
                {/* Cell label */}
                <span className="text-xs font-mono text-text-tertiary/70 leading-none">{cell.label}</span>

                {cell.holder ? (
                  <>
                    {/* Username */}
                    <span className={`text-xs font-semibold truncate leading-tight ${isMe ? "text-accent-primary" : "text-text-primary"}`}>
                      {cell.holder.username ?? cell.holder.participantId.slice(0, 6)}
                    </span>
                    {/* PnL */}
                    <span className={`text-xs font-mono leading-none ${pnlColor(cell.holder.currentPnlPercent)}`}>
                      {cell.holder.currentPnlPercent >= 0 ? "+" : ""}
                      {(cell.holder.currentPnlPercent * 100).toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary/50 italic">empty</span>
                )}

                {/* Bonus indicator */}
                {cell.pnlBonusPercent > 0 && (
                  <span className="absolute top-0.5 right-1 text-[8px] text-emerald-500/70 font-mono">
                    +{cell.pnlBonusPercent.toFixed(0)}%
                  </span>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Attack Confirmation */}
      <AnimatePresence>
        {targetCell && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 space-y-2"
          >
            <p className="text-xs font-semibold text-amber-800">
              Attack{" "}
              <span className="font-mono">
                {targetCell.holder?.username ?? targetCell.holder?.participantId.slice(0, 8)}
              </span>{" "}
              on {targetCell.label}?
            </p>
            <p className="text-xs text-amber-700/70">
              You need ≥15% PnL lead over them to win. Declaration opens window — resolution happens next skirmish cycle.
            </p>
            {attackError && (
              <p className="text-xs text-rose-600 font-semibold">{attackError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAttack}
                disabled={attackMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {attackMutation.isPending ? "Declaring…" : "⚔ Declare Attack"}
              </button>
              <button
                onClick={() => { setTargetCell(null); setAttackError(null); }}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {attackSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-300/50 bg-emerald-50 px-4 py-2"
          >
            <p className="text-xs font-semibold text-emerald-700">Attack declared! Resolves next skirmish cycle.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend: modifiers */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border-medium">
        <div className="text-center">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Top row</p>
          <p className="text-xs font-semibold text-emerald-600">Best bonuses</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Middle</p>
          <p className="text-xs font-semibold text-text-secondary">Balanced</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Bottom row</p>
          <p className="text-xs font-semibold text-rose-500">Elimination risk</p>
        </div>
      </div>
    </div>
  );
}

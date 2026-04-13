"use client";

import { DrawdownBar } from "./DrawdownBar";
import { LootBadge } from "./LootBadge";

interface TraderCardProps {
  rank: number;
  traderId: string;
  pnlPct: number;
  drawdownPct: number;
  status: "active" | "danger" | "eliminated";
  hasWideZone?: boolean;
  hasSecondLife?: boolean;
  isMe?: boolean;
}

export function TraderCard({
  rank,
  traderId,
  pnlPct,
  drawdownPct,
  status,
  hasWideZone = false,
  hasSecondLife = false,
  isMe = false,
}: TraderCardProps) {
  const isEliminated = status === "eliminated";
  const isDanger = status === "danger";

  const rankColor = rank === 1 ? "#fff" : rank === 2 ? "#888" : rank === 3 ? "#CD7F32" : "#555";

  return (
    <div
      className="brut-card p-4 relative"
      style={{
        opacity: isEliminated ? 0.35 : 1,
        borderColor: isEliminated
          ? "#333"
          : isDanger
          ? "#FF0000"
          : isMe
          ? "#FF0000"
          : "#fff",
      }}
    >
      {isMe && (
        <div
          className="absolute top-2 right-2 text-[8px] font-semibold tracking-widest uppercase"
          style={{ color: "#FF0000", fontFamily: "'JetBrains Mono', monospace" }}
        >
          YOU
        </div>
      )}

      {isEliminated && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <span
            className="text-xs font-bold tracking-widest"
            style={{
              color: "#EF4444",
              fontFamily: "'Clash Display', system-ui, sans-serif",
              transform: "rotate(-20deg)",
              border: "1px solid #EF4444",
              padding: "2px 8px",
            }}
          >
            ELIMINATED
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="text-lg font-bold leading-none pt-0.5"
          style={{
            fontFamily: "'Clash Display', system-ui, sans-serif",
            color: rankColor,
            minWidth: "24px",
          }}
        >
          #{rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold truncate"
              style={{
                fontFamily: "'Clash Display', system-ui, sans-serif",
                color: isEliminated ? "#555" : "#fff",
                textDecoration: isEliminated ? "line-through" : "none",
              }}
            >
              {traderId}
            </span>
            {isEliminated && (
              <span
                className="mono text-[8px] font-bold tracking-wider px-2 py-0.5"
                style={{ color: "#555", border: "1px solid #333", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}
              >
                OUT
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="section-label" style={{ fontSize: "9px" }}>PnL</span>
            <span
              className="mono text-sm font-semibold"
              style={{
                color: pnlPct >= 0 ? "#22C55E" : "#EF4444",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </span>
          </div>

          <div className="mb-2">
            <DrawdownBar value={drawdownPct} showLabel size="sm" />
          </div>

          {(hasWideZone || hasSecondLife) && (
            <div className="flex gap-1.5 mt-2">
              {hasWideZone && <LootBadge type="wide-zone" />}
              {hasSecondLife && <LootBadge type="second-life" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";

const ROUNDS = [
  { round: 1, name: "OPEN FIELD", leverage: "20x", drawdown: "20%", pairs: "ALL", duration: "5 MIN", color: "#555555", elim: "30% ELIM" },
  { round: 2, name: "THE STORM", leverage: "15x", drawdown: "15%", pairs: "BTC/ETH", duration: "2 HR", color: "#E57C03", elim: "40% ELIM" },
  { round: 3, name: "FINAL CIRCLE", leverage: "10x", drawdown: "10%", pairs: "BTC", duration: "24 HR", color: "#FFFFFF", elim: "50% ELIM" },
  { round: 4, name: "SUDDEN DEATH", leverage: "5x", drawdown: "8%", pairs: "BTC", duration: "7 DAY", color: "#FF0000", elim: "WINNER" },
];

interface ArenaFeatureIllustrationProps {
  className?: string;
}

export function ArenaFeatureIllustration({ className }: ArenaFeatureIllustrationProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 460 390"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        {[0, 80, 160, 240, 320, 400, 460].map((xPos) => (
          <line key={xPos} x1={xPos} y1={390} x2={390} y2={140} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {[0, 1, 2].map((i) => {
          const x1 = [20, 130, 240][i] + 80;
          const y1 = [325, 275, 220][i];
          const x2 = [130, 240, 350][i];
          const y2 = [275, 220, 165][i];
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={hovered !== null && i < hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.08)"}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {ROUNDS.map((r, i) => {
          const xs = [20, 130, 240, 350];
          const ys = [325, 275, 220, 165];
          const x = xs[i];
          const y = ys[i];
          const isHovered = hovered === r.round;
          const isPast = hovered !== null && r.round < hovered;
          const isFuture = hovered !== null && r.round > hovered;

          return (
            <g
              key={r.round}
              onMouseEnter={() => setHovered(r.round)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x} y={y} width={90} height={40}
                fill={isHovered ? `${r.color}15` : isPast ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)"}
                stroke={isHovered ? r.color : isPast ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isHovered ? 2 : 1}
              />
              <rect x={x} y={y} width={90} height={2} fill={isHovered || isFuture ? r.color : "rgba(255,255,255,0.1)"} />
              <text
                x={x + 45} y={y + 20}
                textAnchor="middle"
                fill={isHovered || isFuture ? r.color : "rgba(255,255,255,0.3)"}
                fontSize="12"
                fontFamily="'Clash Display', system-ui"
                fontWeight="700"
              >
                R{r.round}
              </text>
              <text
                x={x + 45} y={y + 32}
                textAnchor="middle"
                fill={isHovered ? r.color : "rgba(255,255,255,0.2)"}
                fontSize="7"
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="1"
              >
                {r.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && (() => {
        const round = ROUNDS[hovered - 1];
        return (
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "50%",
              transform: "translateX(-50%) translateY(-8px)",
              background: "#000",
              border: `2px solid ${round.color}`,
              padding: "16px",
              minWidth: "180px",
              zIndex: 50,
            }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: round.color, letterSpacing: "0.2em", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              R{round.round} — {round.name}
            </div>
            {[
              ["LEV", round.leverage],
              ["DD", round.drawdown],
              ["PAIR", round.pairs],
              ["TIME", round.duration],
              ["ELIM", round.elim],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "6px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#555", letterSpacing: "0.1em" }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: round.color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            <div style={{ position: "absolute", bottom: "-8px", left: "50%", transform: "translateX(-50%)", width: "0", height: "0", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${round.color}` }} />
          </div>
        );
      })()}
    </div>
  );
}
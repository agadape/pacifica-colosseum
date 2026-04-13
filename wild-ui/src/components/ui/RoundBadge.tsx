"use client";

interface RoundBadgeProps {
  round: 1 | 2 | 3 | 4;
  active?: boolean;
  completed?: boolean;
}

export function RoundBadge({ round, active = false, completed = false }: RoundBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold tracking-wider"
      style={{
        background: active ? "#FF0000" : completed ? "#111" : "transparent",
        color: active ? "#fff" : completed ? "#333" : "#888",
        border: `1px solid ${active ? "#FF0000" : completed ? "#222" : "#333"}`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.08em",
      }}
    >
      R{round}
    </span>
  );
}
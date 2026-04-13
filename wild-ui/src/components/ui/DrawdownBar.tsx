"use client";

interface DrawdownBarProps {
  value: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function DrawdownBar({ value, showLabel = false, size = "sm" }: DrawdownBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const isDanger = pct >= 70;
  const isWarning = pct >= 40 && pct < 70;

  const fillColor = isDanger ? "#EF4444" : isWarning ? "#FF0000" : "#22C55E";

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          height: size === "sm" ? "3px" : "5px",
          background: "#222",
          flex: 1,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fillColor,
          }}
        />
      </div>
      {showLabel && (
        <span
          className="mono text-[10px] font-medium"
          style={{ color: fillColor, minWidth: "32px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
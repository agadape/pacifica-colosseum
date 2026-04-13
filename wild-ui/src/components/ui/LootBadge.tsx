"use client";

interface LootBadgeProps {
  type: "wide-zone" | "second-life";
}

export function LootBadge({ type }: LootBadgeProps) {
  if (type === "wide-zone") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-semibold tracking-wider"
        style={{
          background: "transparent",
          color: "#fff",
          border: "1px solid #fff",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        WIDE ZONE
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-semibold tracking-wider"
      style={{
        background: "transparent",
        color: "#FF0000",
        border: "1px solid #FF0000",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      SECOND LIFE
    </span>
  );
}
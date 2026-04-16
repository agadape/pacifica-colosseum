"use client";

import { useCountdown } from "@/hooks/use-countdown";

interface TimerProps {
  targetDate: string | Date;
  label?: string;
  className?: string;
}

export default function Timer({ targetDate, label, className = "" }: TimerProps) {
  const { formatted, isExpired, minutes, seconds } = useCountdown(targetDate);
  const totalSeconds = minutes * 60 + seconds;
  const isUrgent = !isExpired && totalSeconds < 60;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">
          {label}
        </span>
      )}
      <span
        className={`font-mono text-sm font-bold tabular-nums tracking-wider transition-colors ${
          isExpired
            ? "text-[var(--color-text-tertiary)]"
            : isUrgent
            ? "text-[var(--color-danger)]"
            : "text-[var(--color-neon-cyan)]"
        }`}
        style={{
          fontFamily: "var(--font-mono)",
          textShadow: isExpired ? "none" : isUrgent ? "0 0 8px rgba(255,51,51,0.6)" : "0 0 8px rgba(0,240,255,0.4)",
        }}
      >
        {formatted}
      </span>
    </div>
  );
}

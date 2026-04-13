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
        <span className="text-xs text-text-tertiary uppercase tracking-wider">
          {label}
        </span>
      )}
      <span
        className={`font-mono text-sm font-semibold tabular-nums transition-colors ${
          isExpired
            ? "text-text-tertiary"
            : isUrgent
            ? "text-danger animate-pulse"
            : "text-text-primary"
        }`}
      >
        {formatted}
      </span>
    </div>
  );
}
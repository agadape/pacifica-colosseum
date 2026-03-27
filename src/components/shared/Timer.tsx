"use client";

import { useCountdown } from "@/hooks/use-countdown";

interface TimerProps {
  targetDate: string | Date;
  label?: string;
  className?: string;
  onExpire?: () => void;
}

export default function Timer({ targetDate, label, className = "" }: TimerProps) {
  const { formatted, isExpired } = useCountdown(targetDate);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs text-text-tertiary uppercase tracking-wider">
          {label}
        </span>
      )}
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          isExpired ? "text-text-tertiary" : "text-text-primary"
        }`}
      >
        {formatted}
      </span>
    </div>
  );
}

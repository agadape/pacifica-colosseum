"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetSeconds: number;
  label?: string;
  size?: "sm" | "lg";
  onExpire?: () => void;
}

function padTwo(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function CountdownTimer({
  targetSeconds,
  label,
  size = "sm",
  onExpire,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(targetSeconds);

  useEffect(() => {
    setRemaining(targetSeconds);
  }, [targetSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          onExpire?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const isUrgent = remaining <= 60 && remaining > 0;
  const isExpired = remaining <= 0;

  const color = isExpired ? "#EF4444" : isUrgent ? "#FF0000" : "#fff";
  const fontSize = size === "lg" ? "36px" : "14px";

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="section-label mb-1" style={{ fontSize: "9px" }}>
          {label}
        </span>
      )}
      <div
        className="mono font-semibold tabular-nums"
        style={{
          fontSize,
          color,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1,
          letterSpacing: "0.05em",
        }}
      >
        {h > 0 && `${padTwo(h)}:`}
        {padTwo(m)}:{padTwo(s)}
      </div>
    </div>
  );
}
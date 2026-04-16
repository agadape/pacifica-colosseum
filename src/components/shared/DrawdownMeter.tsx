"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface DrawdownMeterProps {
  current: number;
  max: number;
  className?: string;
}

interface LevelConfig {
  colorStart: string;
  colorEnd: string;
  glow: string;
  segments: number;
  borderColor: string;
}

const LEVEL_CONFIG: Record<string, LevelConfig> = {
  safe: {
    colorStart: "#5DD9A8",
    colorEnd: "#3FA882",
    glow: "rgba(93,217,168,0.5)",
    segments: 10,
    borderColor: "rgba(93,217,168,0.3)",
  },
  caution: {
    colorStart: "#E8A836",
    colorEnd: "#B8862A",
    glow: "rgba(232,168,54,0.5)",
    segments: 8,
    borderColor: "rgba(232,168,54,0.3)",
  },
  danger: {
    colorStart: "#D97B4A",
    colorEnd: "#A85A30",
    glow: "rgba(217,123,74,0.5)",
    segments: 6,
    borderColor: "rgba(217,123,74,0.3)",
  },
  critical: {
    colorStart: "#E85353",
    colorEnd: "#B83A3A",
    glow: "rgba(232,83,83,0.6)",
    segments: 4,
    borderColor: "rgba(232,83,83,0.4)",
  },
};

function GenshinHPBar({ percent, config }: { percent: number; config: LevelConfig }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current || typeof window === "undefined") return;

    let animeLib: typeof import("animejs").default | null = null;

    async function animate() {
      const mod = await import("animejs");
      animeLib = mod.default;
      if (!barRef.current) return;

      animeLib({
        targets: barRef.current,
        width: [`0%`, `${percent}%`],
        duration: 1200,
        easing: "easeOutExpo",
      });
    }

    animate();

    return () => {
      if (animeLib && barRef.current) {
        animeLib.remove(barRef.current);
      }
    };
  }, [percent]);

  const filledSegments = Math.round((percent / 100) * config.segments);
  const segmentWidth = 100 / config.segments;

  return (
    <div className="relative h-full rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}>
      <div
        ref={barRef}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: "0%",
          background: `linear-gradient(90deg, ${config.colorStart}, ${config.colorEnd})`,
          boxShadow: `0 0 8px ${config.glow}, 0 0 4px ${config.glow}`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent calc(${segmentWidth}% - 1px),
            rgba(0,0,0,0.35) calc(${segmentWidth}% - 1px),
            rgba(0,0,0,0.35) ${segmentWidth}%
          )`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
        }}
      />
    </div>
  );
}

export default function DrawdownMeter({ current, max, className = "" }: DrawdownMeterProps) {
  const ratio = max > 0 ? Math.min(current / max, 1.2) : 0;
  const percent = Math.min(ratio * 100, 100);

  let level: LevelConfig;
  if (ratio < 0.5) {
    level = LEVEL_CONFIG.safe;
  } else if (ratio < 0.75) {
    level = LEVEL_CONFIG.caution;
  } else if (ratio < 0.9) {
    level = LEVEL_CONFIG.danger;
  } else {
    level = LEVEL_CONFIG.critical;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
        >
          Drawdown
        </span>
        <span
          className="font-mono text-xs font-bold"
          style={{
            color: level.colorStart,
            fontFamily: "var(--font-display)",
            textShadow: `0 0 8px ${level.glow}`,
          }}
        >
          {current.toFixed(1)}% / {max}%
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden border"
        style={{
          borderColor: level.borderColor,
          boxShadow: `inset 0 1px 3px rgba(0,0,0,0.5), 0 0 6px ${level.glow}20`,
        }}
      >
        <GenshinHPBar percent={percent} config={level} />
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface MarketContextProps {
  arenaId: string;
  symbols: string[];
}

interface Sentiment {
  symbol: string;
  score: number;
  label: "bearish" | "neutral" | "bullish";
  volume: number;
}

const labelColors: Record<string, string> = {
  bullish: "text-neon-cyan",
  neutral: "text-text-secondary",
  bearish: "text-neon-magenta",
};

export default function MarketContext({ arenaId, symbols }: MarketContextProps) {
  const { data: commentaryData } = useQuery({
    queryKey: ["commentary", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/markets/commentary/${arenaId}`);
      return res.json();
    },
    refetchInterval: 300_000, // 5 minutes
  });

  const { data: sentimentData } = useQuery({
    queryKey: ["sentiment", symbols],
    queryFn: async () => {
      const results = await Promise.all(
        symbols.map(async (s) => {
          const res = await fetch(`/api/markets/sentiment/${s}`);
          const json = await res.json();
          return json.data as Sentiment;
        })
      );
      return results;
    },
    refetchInterval: 300_000,
  });

  const commentary = commentaryData?.data?.text;
  const sentiments = sentimentData ?? [];

  return (
    <div className="bg-surface rounded-2xl border border-border-medium p-5">
      <h3 className="font-display text-sm font-700 text-text-primary mb-3">
        Market Context
      </h3>

      {/* AI Commentary */}
      {commentary && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-text-secondary italic mb-4 leading-relaxed"
        >
          &ldquo;{commentary}&rdquo;
        </motion.p>
      )}

      {/* Sentiment */}
      {sentiments.length > 0 && (
        <div className="space-y-2">
          {sentiments.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-text-primary">
                {s.symbol}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${labelColors[s.label]}`}>
                  {s.label}
                </span>
                <span className="font-mono text-xs text-text-tertiary">
                  {s.score > 0 ? "+" : ""}{s.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

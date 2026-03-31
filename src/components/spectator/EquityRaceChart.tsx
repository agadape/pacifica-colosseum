"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import { useEquitySnapshots, type EquitySnapshot } from "@/hooks/use-leaderboard";

const STARTING_CAPITAL = 1000;

// 6 distinct colors for traders
const COLORS = [
  "#6366F1", // indigo
  "#22C55E", // green
  "#F59E0B", // amber
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#8B5CF6", // violet
];

interface Participant {
  id: string;
  subaccount_address: string;
  status: string;
  total_pnl_percent: number;
  users?: { username: string | null; wallet_address: string } | null;
}

interface EquityRaceChartProps {
  arenaId: string;
  participants: Participant[];
  maxDrawdown: number;
  currentRound: number;
}

export default function EquityRaceChart({
  arenaId,
  participants,
  maxDrawdown,
  currentRound,
}: EquityRaceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMap = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const initializedRef = useRef(false);
  const [hasData, setHasData] = useState(false);

  const { data: snapshotsMap } = useEquitySnapshots(arenaId);

  // Build chart once participants are loaded
  useEffect(() => {
    if (!containerRef.current || participants.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9CA3AF",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(243,244,246,0.04)" },
        horzLines: { color: "rgba(243,244,246,0.08)" },
      },
      crosshair: {
        vertLine: { color: "rgba(99,102,241,0.2)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(99,102,241,0.2)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: "#E5E7EB" },
      timeScale: {
        borderColor: "#E5E7EB",
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: false },
    });

    // Add one LineSeries per participant
    participants.forEach((p, i) => {
      const color = COLORS[i % COLORS.length];
      const isElim = p.status === "eliminated";
      const name = (p.users?.username ?? p.subaccount_address).split(" ")[0];

      const series = chart.addSeries(LineSeries, {
        color: isElim ? `${color}35` : color,
        lineWidth: isElim ? 1 : 2,
        priceLineVisible: false,
        lastValueVisible: !isElim,
        title: name,
      });
      seriesMap.current.set(p.id, series);

      // Add death / warning / zero price lines onto the first series
      if (i === 0) {
        series.createPriceLine({
          price: -maxDrawdown,
          color: "#EF4444",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `DEATH −${maxDrawdown}%`,
        });
        series.createPriceLine({
          price: -(maxDrawdown * 0.7),
          color: "#F59E0B",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        series.createPriceLine({
          price: 0,
          color: "rgba(107,114,128,0.25)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
      }
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesMap.current.clear();
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length > 0]); // init once when participants arrive

  // Feed snapshot data into series, filtered to current round
  useEffect(() => {
    if (!snapshotsMap || snapshotsMap.size === 0) return;
    let anyData = false;

    for (const [participantId, snapshots] of snapshotsMap) {
      const series = seriesMap.current.get(participantId);
      if (!series) continue;

      // Filter to current round for per-round view
      const roundSnaps = snapshots.filter((s: EquitySnapshot) => s.round_number === currentRound);
      if (roundSnaps.length < 1) continue;

      anyData = true;

      // Compute pnl% from round-start equity (first snapshot of this round)
      const roundStartEquity = roundSnaps[0].equity;

      const chartData = roundSnaps.map((s: EquitySnapshot) => ({
        time: Math.floor(
          new Date(s.recorded_at).getTime() / 1000
        ) as unknown as import("lightweight-charts").Time,
        value:
          Math.round(
            ((s.equity - roundStartEquity) / roundStartEquity) * 10000
          ) / 100,
      }));

      series.setData(chartData);
    }

    if (anyData) {
      setHasData(true);
      chartRef.current?.timeScale().fitContent();
    }
  }, [snapshotsMap, currentRound]);

  // Legend from participants (ordered same as COLORS)
  const legend = participants.map((p, i) => ({
    id: p.id,
    name: (p.users?.username ?? p.subaccount_address).split(" ")[0],
    color: COLORS[i % COLORS.length],
    pnl: p.total_pnl_percent,
    eliminated: p.status === "eliminated",
  }));

  return (
    <div className="bg-surface rounded-2xl border border-border-light overflow-hidden">
      {/* Header + legend */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-light flex-wrap">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex-shrink-0">
          Equity Race · Round {currentRound}
        </span>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {legend.map((l) => (
            <div
              key={l.id}
              className={`flex items-center gap-1.5 transition-opacity ${l.eliminated ? "opacity-25" : ""}`}
            >
              <span
                className="w-3 h-0.5 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-[10px] font-medium text-text-secondary">{l.name}</span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  l.eliminated
                    ? "text-text-tertiary"
                    : l.pnl >= 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {l.pnl >= 0 ? "+" : ""}
                {l.pnl.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        <div ref={containerRef} className="w-full h-[220px]" />
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <p className="text-xs text-text-tertiary">
              Chart fills in after ~15s of trading
            </p>
            <p className="text-[10px] text-text-tertiary/50 font-mono">
              snapshots every 15s
            </p>
          </div>
        )}
      </div>

      {/* Footer labels */}
      <div className="flex items-center gap-5 px-5 py-2 border-t border-border-light">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-px bg-danger inline-block" />
          <span className="text-[10px] text-danger/70 font-mono">
            −{maxDrawdown}% death
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-px bg-warning inline-block opacity-70" />
          <span className="text-[10px] text-warning/70 font-mono">warning</span>
        </div>
        <span className="text-[10px] text-text-tertiary/60 font-mono ml-auto">
          % change from round start
        </span>
      </div>
    </div>
  );
}

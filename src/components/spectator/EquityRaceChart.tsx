"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useEquitySnapshots, type EquitySnapshot } from "@/hooks/use-leaderboard";

const COLORS = ["#00F0FF", "#FF006E", "#FFD700", "#8888AA", "#00FF88", "#FF6B35"];

const VW = 1000;
const VH = 260;
const PAD = { top: 24, right: 12, bottom: 28, left: 48 };
const IW = VW - PAD.left - PAD.right; // inner width
const IH = VH - PAD.top - PAD.bottom; // inner height

function polyline(points: [number, number][]): string {
  if (points.length < 2) return "";
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

function fillPath(points: [number, number][], baseY: number): string {
  if (points.length < 2) return "";
  const line = polyline(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last[0].toFixed(1)} ${baseY.toFixed(1)} L ${first[0].toFixed(1)} ${baseY.toFixed(1)} Z`;
}

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
  eliminationPercent: number;
}

export default function EquityRaceChart({
  arenaId,
  participants,
  maxDrawdown,
  currentRound,
  eliminationPercent,
}: EquityRaceChartProps) {
  const { data: snapshotsMap } = useEquitySnapshots(arenaId);

  const chart = useMemo(() => {
    if (!snapshotsMap || snapshotsMap.size === 0) return null;

    // Build per-participant series for current round
    const rawSeries: Array<{
      id: string;
      color: string;
      name: string;
      eliminated: boolean;
      pts: Array<{ t: number; pnl: number }>;
    }> = [];

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const snaps = snapshotsMap.get(p.id) ?? [];
      const round = snaps.filter((s: EquitySnapshot) => s.round_number === currentRound);
      if (round.length < 1) continue;

      const base = round[0].equity;
      rawSeries.push({
        id: p.id,
        color: COLORS[i % COLORS.length],
        name: (p.users?.username ?? p.subaccount_address).split(" ")[0],
        eliminated: p.status === "eliminated",
        pts: round.map((s: EquitySnapshot) => ({
          t: new Date(s.recorded_at).getTime(),
          pnl: ((s.equity - base) / base) * 100,
        })),
      });
    }

    if (rawSeries.length === 0) return null;

    // Y bounds: always include 0 and death zone
    let minPnl = -maxDrawdown - 3;
    let maxPnl = 3;
    rawSeries.forEach((s) => s.pts.forEach((p) => {
      minPnl = Math.min(minPnl, p.pnl);
      maxPnl = Math.max(maxPnl, p.pnl);
    }));
    // Add 10% headroom
    const pnlRange = (maxPnl - minPnl) * 1.1;
    const pnlMin = minPnl - pnlRange * 0.05;
    const pnlMax = pnlMin + pnlRange;

    // Time bounds
    const allTimes = rawSeries.flatMap((s) => s.pts.map((p) => p.t));
    const tMin = Math.min(...allTimes);
    const tMax = Math.max(...allTimes);
    const tRange = tMax - tMin || 1;

    const toX = (t: number) => PAD.left + ((t - tMin) / tRange) * IW;
    const toY = (pnl: number) => PAD.top + IH - ((pnl - pnlMin) / (pnlMax - pnlMin)) * IH;
    const baseY = toY(pnlMin);

    // Compute SVG points
    const series = rawSeries.map((s) => ({
      ...s,
      svgPts: s.pts.map((p): [number, number] => [toX(p.t), toY(p.pnl)]),
      lastPnl: s.pts[s.pts.length - 1]?.pnl ?? 0,
    }));

    const deathY = toY(-maxDrawdown);
    const warnY = toY(-maxDrawdown * 0.7);
    const zeroY = toY(0);

    // Ranking cutline: pnl of the trader at the elimination threshold
    const activeSeries = series.filter((s) => !s.eliminated);
    const sorted = [...activeSeries].sort((a, b) => a.lastPnl - b.lastPnl);
    const cutIdx = Math.ceil(sorted.length * (eliminationPercent / 100)) - 1;
    const cutPnl = sorted[cutIdx]?.lastPnl ?? null;
    const cutlineY = cutPnl !== null ? toY(cutPnl) : null;
    const cutlineName = sorted[cutIdx]?.name ?? null;

    // Y-axis labels
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const pnl = pnlMin + (i / (tickCount - 1)) * (pnlMax - pnlMin);
      return { y: toY(pnl), label: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}%` };
    });

    return { series, deathY, warnY, zeroY, baseY, ticks, cutlineY, cutlineName };
  }, [snapshotsMap, currentRound, participants, maxDrawdown, eliminationPercent]);

  // Persist last valid chart so we can freeze it instead of blanking out
  const lastChartRef = useRef(chart);
  useEffect(() => {
    if (chart) lastChartRef.current = chart;
  }, [chart]);
  const frozen = !chart && !!lastChartRef.current;
  const display = chart ?? lastChartRef.current;

  // Sort for rendering: eliminated first (behind), then by pnl asc (losers behind winners)
  const sorted = display
    ? [...display.series].sort((a, b) => {
        if (a.eliminated && !b.eliminated) return -1;
        if (!a.eliminated && b.eliminated) return 1;
        return a.lastPnl - b.lastPnl;
      })
    : [];

  const leader = display?.series.filter((s) => !s.eliminated).sort((a, b) => b.lastPnl - a.lastPnl)[0];

  if (!display) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAF8", border: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="px-5 py-3 border-b border-black/[0.05]">
          <span className="text-xs font-semibold uppercase tracking-widest text-black/25">
            Equity Race · Round {currentRound}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <div className="flex gap-2 mb-1">
            {participants.slice(0, 6).map((p, i) => (
              <span key={p.id} className="w-2 h-2 rounded-full inline-block opacity-40"
                style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            ))}
          </div>
          <p className="text-sm text-black/30">Chart fills in after ~15s of trading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAF8", border: "1px solid rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-black/[0.05] flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-black/25">
            Equity Race · Round {currentRound}
          </span>
          {frozen ? (
            <span className="text-xs font-mono text-amber-500/70 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5">
              ⏸ waiting for data
            </span>
          ) : (
            <span className="text-xs font-mono text-black/20 bg-black/[0.03] rounded px-1.5 py-0.5">
              ↻ updates every 15s
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {[...display.series].sort((a, b) => b.lastPnl - a.lastPnl).map((s) => (
            <div key={s.id} className={`flex items-center gap-1.5 transition-opacity ${s.eliminated ? "opacity-20" : ""}`}>
              <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-black/40">{s.name}</span>
              <span className={`text-xs font-mono font-bold ${s.lastPnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {s.lastPnl >= 0 ? "+" : ""}{s.lastPnl.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: VH, display: "block" }}>
        <defs>
          {sorted.map((s) => (
            <linearGradient key={s.id} id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={s.eliminated ? "0.03" : "0.18"} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          {/* Death zone gradient */}
          <linearGradient id="death-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.18" />
          </linearGradient>
          {/* Leader glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y-axis ticks */}
        {display.ticks.map((tick, i) => (
          <g key={i}>
            <line x1={PAD.left - 4} y1={tick.y} x2={PAD.left} y2={tick.y}
              stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
            <text x={PAD.left - 6} y={tick.y + 3} textAnchor="end"
              fontSize="8" fill="rgba(0,0,0,0.35)" fontFamily="monospace">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Y-axis line */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH}
          stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

        {/* Death zone fill */}
        {display.deathY < display.baseY && (
          <rect x={PAD.left} y={display.deathY}
            width={IW} height={display.baseY - display.deathY}
            fill="url(#death-bg)" />
        )}

        {/* Zero line */}
        {display.zeroY > PAD.top && display.zeroY < PAD.top + IH && (
          <line x1={PAD.left} y1={display.zeroY} x2={PAD.left + IW} y2={display.zeroY}
            stroke="rgba(0,0,0,0.12)" strokeWidth="1" strokeDasharray="4 4" />
        )}

        {/* Warning line */}
        {display.warnY > PAD.top && display.warnY < PAD.top + IH && (
          <line x1={PAD.left} y1={display.warnY} x2={PAD.left + IW} y2={display.warnY}
            stroke="rgba(251,191,36,0.25)" strokeWidth="1" strokeDasharray="3 5" />
        )}

        {/* Ranking cutline — dynamic, moves with leaderboard */}
        {display.cutlineY !== null && display.cutlineY > PAD.top && display.cutlineY < PAD.top + IH && (
          <>
            <line x1={PAD.left} y1={display.cutlineY} x2={PAD.left + IW} y2={display.cutlineY}
              stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeDasharray="6 3" />
            <text x={PAD.left + IW - 4} y={display.cutlineY - 4}
              textAnchor="end" fontSize="7.5" fill="rgba(168,85,247,0.7)" fontFamily="monospace">
              ELIM ZONE ▲{display.cutlineName ? ` · ${display.cutlineName}` : ""}
            </text>
          </>
        )}

        {/* Death line */}
        {display.deathY > PAD.top && display.deathY < PAD.top + IH && (
          <>
            <line x1={PAD.left} y1={display.deathY} x2={PAD.left + IW} y2={display.deathY}
              stroke="#EF4444" strokeWidth="1" opacity="0.5" />
            <text x={PAD.left + 6} y={display.deathY - 5}
              fontSize="8" fill="rgba(239,68,68,0.6)" fontFamily="monospace">
              DEATH −{maxDrawdown}%
            </text>
          </>
        )}

        {/* Gradient fills */}
        {sorted.map((s) => (
          s.svgPts.length >= 2 && (
            <path key={`f-${s.id}-${s.svgPts.length}`}
              d={fillPath(s.svgPts, display.baseY)}
              fill={`url(#g-${s.id})`} />
          )
        ))}

        {/* Lines — key includes pt count so animation replays on each new data point */}
        {sorted.map((s) => (
          s.svgPts.length >= 2 && (
            <motion.path
              key={`l-${s.id}-${s.svgPts.length}`}
              d={polyline(s.svgPts)}
              fill="none"
              stroke={s.color}
              strokeWidth={leader?.id === s.id ? 2.5 : s.eliminated ? 1 : 1.8}
              strokeOpacity={s.eliminated ? 0.2 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={leader?.id === s.id ? "url(#glow)" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          )
        ))}

        {/* All active endpoint dots — pulse continuously to show live data */}
        {sorted.filter((s) => !s.eliminated && s.svgPts.length > 0).map((s) => {
          const pt = s.svgPts[s.svgPts.length - 1];
          const isLeader = leader?.id === s.id;
          return (
            <g key={`dot-${s.id}`}>
              {/* Pulse ring */}
              <motion.circle
                cx={pt[0]} cy={pt[1]}
                r={isLeader ? 8 : 5}
                fill="none" stroke={s.color} strokeWidth="1.5"
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: Math.random() * 1 }}
              />
              {/* Solid dot */}
              <motion.circle
                cx={pt[0]} cy={pt[1]}
                r={isLeader ? 4.5 : 3}
                fill={s.color}
                key={`${s.id}-${pt[0].toFixed(0)}-${pt[1].toFixed(0)}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              />
            </g>
          );
        })}
      </svg>

      {/* Footer */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-t border-black/[0.05]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-sm inline-block opacity-50" style={{ background: "linear-gradient(to right, #EF444400, #EF4444)" }} />
          <span className="text-xs font-mono text-red-500/50">death zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-px inline-block opacity-40 border-t border-dashed border-yellow-500" />
          <span className="text-xs font-mono text-yellow-600/50">warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-px inline-block opacity-60 border-t border-dashed border-purple-500" />
          <span className="text-xs font-mono text-purple-500/60">elim cutline</span>
        </div>
        <span className="text-xs font-mono text-black/20 ml-auto">% from round start</span>
      </div>
    </div>
  );
}

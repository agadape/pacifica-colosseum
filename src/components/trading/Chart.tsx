"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType, LineSeries } from "lightweight-charts";
import { useWSStore } from "@/stores/ws-store";

interface ChartProps {
  symbol: string;
  className?: string;
}

export default function Chart({ symbol, className = "" }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { prices } = useWSStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#55556E",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1E1E3A" },
        horzLines: { color: "#1E1E3A" },
      },
      crosshair: {
        vertLine: { color: "#00F0FF30", width: 1, style: 2 },
        horzLine: { color: "#00F0FF30", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#1E1E3A",
      },
      timeScale: {
        borderColor: "#1E1E3A",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#00F0FF",
      lineWidth: 2,
      priceLineVisible: true,
      priceLineColor: "#00F0FF80",
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]);

  useEffect(() => {
    const price = prices.get(symbol);
    if (!price || !seriesRef.current) return;

    seriesRef.current.update({
      time: Math.floor(price.timestamp / 1000) as unknown as import("lightweight-charts").Time,
      value: price.markPrice,
    });
  }, [prices, symbol]);

  return (
    <div className={`bg-surface rounded-2xl border border-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold text-text-primary">{symbol}-PERP</span>
          <span className="font-mono text-sm font-bold text-neon-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">
            {prices.get(symbol)?.markPrice.toFixed(2) ?? "—"}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[300px] md:h-[400px]" />
    </div>
  );
}
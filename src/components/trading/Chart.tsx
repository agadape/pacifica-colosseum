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

  // Create chart — destroy and recreate when symbol changes
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6B7280",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#F3F4F6" },
        horzLines: { color: "#F3F4F6" },
      },
      crosshair: {
        vertLine: { color: "#6366f140", width: 1, style: 2 },
        horzLine: { color: "#6366f140", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#E5E7EB",
      },
      timeScale: {
        borderColor: "#E5E7EB",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      priceLineVisible: true,
      priceLineColor: "#6366f180",
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

  // Update data from WS prices
  useEffect(() => {
    const price = prices.get(symbol);
    if (!price || !seriesRef.current) return;

    seriesRef.current.update({
      time: Math.floor(price.timestamp / 1000) as unknown as import("lightweight-charts").Time,
      value: price.markPrice,
    });
  }, [prices, symbol]);

  return (
    <div className={`bg-surface rounded-2xl border border-border-light overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-light">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-700 text-text-primary">{symbol}-PERP</span>
          <span className="font-mono text-sm text-accent-primary font-semibold">
            {prices.get(symbol)?.markPrice.toFixed(2) ?? "—"}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[300px] md:h-[400px]" />
    </div>
  );
}

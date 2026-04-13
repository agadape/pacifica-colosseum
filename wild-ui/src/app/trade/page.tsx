"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const PAIRS = ["SOL-PERP", "BTC-PERP", "ETH-PERP", "AVAX-PERP", "LINK-PERP"];
const INTERVALS = ["1H", "4H", "1D", "1W"];
const LEVERAGE_OPTIONS = [1, 5, 10, 20, 50];

const MOCK_POSITIONS = [
  { pair: "SOL-PERP", side: "LONG", size: 150, entry: 142.5, pnl: 1240.5, pnlPct: 8.2 },
  { pair: "BTC-PERP", side: "SHORT", size: 0.5, entry: 68420, pnl: -840.25, pnlPct: -2.4 },
];

function generatePath(data: number[], w: number, h: number) {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function generateArea(data: number[], w: number, h: number) {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${pts.join(" L ")} L ${w} ${h} L 0 ${h} Z`;
}

export default function TradePage() {
  const [selectedPair, setSelectedPair] = useState("SOL-PERP");
  const [interval, setInterval] = useState("1H");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("100");
  const [leverage, setLeverage] = useState(10);
  const [price, setPrice] = useState(142.5);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef(142.5);
  const [chartData, setChartData] = useState<number[]>([138, 141, 139, 143, 141, 145, 144, 147, 146, 148, 147, 150, 149, 152, 151, 154, 153, 156, 155, 158]);
  const [orders, setOrders] = useState<Array<{ id: string; pair: string; side: string; size: number; price: number; status: string }>>([]);

  const basePrice = selectedPair === "SOL-PERP" ? 142.5 : selectedPair === "BTC-PERP" ? 68420 : 3240;

  useEffect(() => {
    const initial = Array.from({ length: 20 }, (_, i) => basePrice * (0.95 + (i / 20) * 0.08 + (Math.random() - 0.5) * 0.01));
    setChartData(initial);
    setPrice(initial[initial.length - 1]);
  }, [selectedPair, basePrice]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setPrice((p) => {
        const delta = (Math.random() - 0.48) * (basePrice * 0.001);
        const next = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, p + delta));
        if (next > p) {
          setPriceFlash("up");
          setTimeout(() => setPriceFlash(null), 600);
        } else if (next < p) {
          setPriceFlash("down");
          setTimeout(() => setPriceFlash(null), 600);
        }
        prevPriceRef.current = p;
        return next;
      });
      setChartData((prev) => {
        const last = prev[prev.length - 1] || basePrice;
        const delta = (Math.random() - 0.48) * (basePrice * 0.001);
        const next = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, last + delta));
        return [...prev.slice(-39), next];
      });
    }, 800);
    return () => clearInterval(iv);
  }, [basePrice]);

  function handleSubmit() {
    const p = chartData.length > 0 ? chartData[chartData.length - 1] : price;
    setOrders((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), pair: selectedPair, side, size: parseFloat(size), price: p, status: "PENDING" },
    ]);
    setTimeout(() => {
      setOrders((prev) => prev.map((o) => (o.status === "PENDING" ? { ...o, status: "FILLED" } : o)));
    }, 1200);
  }

  const priceChange = chartData.length > 1 ? chartData[chartData.length - 1] - chartData[0] : 0;
  const priceChangePct = chartData.length > 1 ? ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100 : 0;
  const lineColor = side === "long" ? "#22C55E" : "#EF4444";
  const linePath = generatePath(chartData, 100, 100);
  const areaPath = generateArea(chartData, 100, 100);
  const chartMin = Math.min(...chartData);
  const chartMax = Math.max(...chartData);
  const margin = parseFloat(size || "0") / leverage;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-void)", fontFamily: "'Satoshi', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "#0D0D0D", borderBottom: "2px solid #fff" }}
      >
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xs font-medium tracking-widest" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
                ← BACK
              </Link>
              <div className="h-4 w-px" style={{ background: "#fff" }} />
              <span className="section-label">TRADE</span>
            </div>
            <div className="flex gap-1">
              {PAIRS.map((pair) => (
                <button
                  key={pair}
                  onClick={() => setSelectedPair(pair)}
                  className="px-3 py-1.5 text-xs font-semibold tracking-wider transition-all"
                  style={{
                    background: selectedPair === pair ? "#FF0000" : "transparent",
                    color: selectedPair === pair ? "#fff" : "#555",
                    border: "2px solid",
                    borderColor: selectedPair === pair ? "#FF0000" : "#333",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          <div className="col-span-12 lg:col-span-8 space-y-6">

            <div className="brut-card overflow-hidden" style={{ borderTop: "3px solid #FF0000" }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "2px solid #fff" }}>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold" style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}>
                    {selectedPair}
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={price.toFixed(2)}
                      initial={{ opacity: 0.5, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.15 }}
                      className="mono text-lg font-semibold"
                      style={{
                        color: priceChange >= 0 ? "#22C55E" : "#EF4444",
                        fontFamily: "'JetBrains Mono', monospace",
                        display: "inline-block",
                      }}
                    >
                      ${price.toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                  <span
                    className="mono text-xs font-medium"
                    style={{ color: priceChange >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {priceChange >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex gap-1">
                  {INTERVALS.map((iv) => (
                    <button
                      key={iv}
                      onClick={() => setInterval(iv)}
                      className="px-3 py-1 text-[10px] font-semibold tracking-wider"
                      style={{
                        color: interval === iv ? "#FF0000" : "#555",
                        fontFamily: "'JetBrains Mono', monospace",
                        background: "transparent",
                        border: "none",
                      }}
                    >
                      {iv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative h-[300px] px-4 pt-2 pb-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#chartFill)" />
                  <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute top-4 right-6 text-[9px] mono" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
                  {chartMax.toFixed(2)}
                </div>
                <div className="absolute bottom-6 right-6 text-[9px] mono" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
                  {chartMin.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="brut-card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: "2px solid #fff" }}>
                <span className="section-label">OPEN POSITIONS</span>
              </div>
              {MOCK_POSITIONS.length === 0 ? (
                <div className="text-center py-10">
                  <span className="section-label">NO POSITIONS</span>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PAIR</th>
                      <th>SIDE</th>
                      <th className="text-right">SIZE</th>
                      <th className="text-right">ENTRY</th>
                      <th className="text-right">PNL</th>
                      <th className="text-right">PNL %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_POSITIONS.map((pos) => (
                      <tr key={pos.pair}>
                        <td className="font-semibold" style={{ color: "#fff" }}>{pos.pair}</td>
                        <td>
                          <span
                            className="mono text-xs font-semibold"
                            style={{ color: pos.side === "LONG" ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {pos.side}
                          </span>
                        </td>
                        <td className="text-right mono" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{pos.size}</td>
                        <td className="text-right mono" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>${pos.entry.toFixed(2)}</td>
                        <td
                          className="text-right mono font-semibold"
                          style={{ color: pos.pnl >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                        </td>
                        <td
                          className="text-right mono font-semibold"
                          style={{ color: pos.pnlPct >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="brut-card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: "2px solid #fff" }}>
                <span className="section-label">ORDER HISTORY</span>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <span className="section-label">NO ORDERS YET</span>
                </div>
              ) : (
                <div>
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: "1px solid #222" }}>
                      <span className="text-xs w-24" style={{ color: "#888" }}>{o.pair}</span>
                      <span className="mono text-[10px] font-semibold" style={{ color: o.side === "long" ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>
                        {o.side.toUpperCase()}
                      </span>
                      <span className="text-xs flex-1" style={{ color: "#888" }}>{o.size}</span>
                      <span className="mono text-xs" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>@ ${o.price.toFixed(2)}</span>
                      <span
                        className="text-[9px] font-semibold tracking-wider px-2 py-0.5"
                        style={{
                          color: o.status === "FILLED" ? "#22C55E" : "#FF0000",
                          background: "transparent",
                          border: `1px solid ${o.status === "FILLED" ? "#22C55E" : "#FF0000"}`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">

            <div className="brut-card overflow-hidden" style={{ borderTop: "3px solid #FF0000" }}>
              <div className="flex">
                <button
                  onClick={() => setSide("long")}
                  className="flex-1 py-4 text-xs font-bold tracking-widest transition-all"
                  style={{
                    background: side === "long" ? "#22C55E" : "transparent",
                    color: side === "long" ? "#000" : "#555",
                    border: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  LONG ↑
                </button>
                <button
                  onClick={() => setSide("short")}
                  className="flex-1 py-4 text-xs font-bold tracking-widest transition-all"
                  style={{
                    background: side === "short" ? "#EF4444" : "transparent",
                    color: side === "short" ? "#fff" : "#555",
                    border: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  SHORT ↓
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="section-label mb-2 block">SIZE (USD)</label>
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full"
                    style={{
                      background: "#000",
                      border: "2px solid #333",
                      color: "#fff",
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: "8px 12px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label className="section-label mb-2 block">LEVERAGE</label>
                  <div className="grid grid-cols-5 gap-1">
                    {LEVERAGE_OPTIONS.map((lev) => (
                      <button
                        key={lev}
                        onClick={() => setLeverage(lev)}
                        className="py-2 text-[10px] font-bold"
                        style={{
                          background: leverage === lev ? "#FF0000" : "transparent",
                          color: leverage === lev ? "#fff" : "#555",
                          border: `2px solid ${leverage === lev ? "#FF0000" : "#333"}`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4" style={{ background: "#000", border: "2px solid #333" }}>
                  {[
                    { label: "MARGIN", value: `$${margin.toFixed(2)}`, color: "#FF0000" },
                    { label: "AVAILABLE", value: "$12,450.00", color: "#888" },
                    { label: "PRICE", value: `$${price.toFixed(2)}`, color: "#fff" },
                    { label: "LIQ PRICE", value: `$${(price * (side === "long" ? 0.9 : 1.1)).toFixed(2)}`, color: "#EF4444" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="section-label mb-1">{item.label}</div>
                      <div
                        className="mono text-sm font-medium"
                        style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={handleSubmit}
                  className="w-full py-4 text-xs font-bold tracking-widest"
                  style={{
                    background: side === "long" ? "#22C55E" : "#EF4444",
                    color: side === "long" ? "#000" : "#fff",
                    border: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {side === "long" ? "OPEN LONG" : "OPEN SHORT"} →
                </motion.button>
              </div>
            </div>

            <div className="brut-card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: "2px solid #fff" }}>
                <span className="section-label">ACCOUNT</span>
              </div>
              <div className="grid grid-cols-2">
                {[
                  { label: "EQUITY", value: "$13,690.50", color: "#fff" },
                  { label: "uPnL", value: "+$400.25", color: "#22C55E" },
                  { label: "DRAWDOWN", value: "-2.1%", color: "#FF0000" },
                  { label: "ROUND", value: "R2 / 4", color: "#888" },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="p-4"
                    style={{
                      borderRight: i % 2 === 0 ? "2px solid #222" : "none",
                      borderBottom: i < 2 ? "2px solid #222" : "none",
                    }}
                  >
                    <div className="section-label mb-1">{item.label}</div>
                    <div
                      className="mono text-sm font-semibold"
                      style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4" style={{ borderTop: "2px solid #222" }}>
                <div className="section-label mb-2">DRAWDOWN LIMIT</div>
                <div style={{ height: 5, background: "#222", marginBottom: 4 }}>
                  <div style={{ width: "21%", height: "100%", background: "#FF0000" }} />
                </div>
                <div className="flex justify-between text-[9px]" style={{ color: "#555" }}>
                  <span>0%</span>
                  <span style={{ color: "#FF0000" }}>2.1% / 8%</span>
                  <span>8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
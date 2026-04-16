"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTradingStore } from "@/stores/trading-store";
import { useSubmitOrder } from "@/hooks/use-trading";
import { useWSStore } from "@/stores/ws-store";

interface OrderFormProps {
  arenaId: string;
  symbol: string;
  maxLeverage: number;
}

export default function OrderForm({ arenaId, symbol, maxLeverage }: OrderFormProps) {
  const {
    orderType, side, size, price, leverage, reduceOnly,
    setOrderType, setSide, setSize, setPrice, setLeverage, setReduceOnly, reset,
  } = useTradingStore();

  const submitOrder = useSubmitOrder(arenaId);
  const { prices } = useWSStore();
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const markPrice = prices.get(symbol)?.markPrice ?? 0;
  const sizeUSD = parseFloat(size) || 0;
  const contracts = markPrice > 0 ? sizeUSD / markPrice : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuccess(false);

    if (!size || parseFloat(size) <= 0) {
      setError("Enter a valid size");
      return;
    }

    if (leverage > maxLeverage) {
      setError(`Leverage capped at ${maxLeverage}x`);
      return;
    }

    const result = await submitOrder.mutateAsync({
      type: orderType,
      symbol,
      side,
      size,
      price: orderType === "limit" ? price : undefined,
      leverage,
      reduce_only: reduceOnly,
      slippage_percent: "1",
    });

    if (result.error) {
      setError(typeof result.error === "string" ? result.error : JSON.stringify(result.error));
    } else {
      reset();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="font-display text-sm font-bold text-text-primary mb-4">Order</h3>

      <div className="flex gap-1 mb-5 bg-bg-primary rounded-lg p-0.5">
        {(["market", "limit"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setOrderType(type)}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-neon-cyan ${
              orderType === type
                ? "bg-surface text-text-primary shadow-sm border border-border"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setSide("bid")}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-neon-cyan ${
            side === "bid"
              ? "bg-neon-cyan text-bg-primary shadow-[0_0_16px_rgba(0,240,255,0.4)]"
              : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary border border-border"
          }`}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => setSide("ask")}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-neon-magenta ${
            side === "ask"
              ? "bg-neon-magenta text-white shadow-[0_0_16px_rgba(255,0,110,0.4)]"
              : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary border border-border"
          }`}
        >
          Short
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-text-secondary font-medium">Size (USD)</label>
          {contracts > 0 && (
            <span className="text-xs font-mono text-text-tertiary">
              ≈ {contracts.toFixed(4)} {symbol}
            </span>
          )}
        </div>
        <input
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="100"
          className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-text-primary font-mono text-sm focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/20 placeholder:text-text-tertiary"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {["25", "50", "100", "250"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSize(v)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-text-secondary bg-bg-primary border border-border hover:border-neon-cyan hover:text-neon-cyan transition-all focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            ${v}
          </button>
        ))}
      </div>

      {orderType === "limit" && (
        <div className="mb-4">
          <label className="block text-xs text-text-secondary font-medium mb-2">Price</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-text-primary font-mono text-sm focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/20 placeholder:text-text-tertiary"
          />
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-text-secondary font-medium">
            Leverage <span className="text-text-tertiary">(max {maxLeverage}x)</span>
          </label>
          <span className="font-mono text-sm font-bold text-neon-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={maxLeverage}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-neon-cyan"
        />
      </div>

      <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
        Opposite side closes existing position (net mode)
      </p>

      <label className="flex items-center gap-2.5 mb-5 cursor-pointer group">
        <input
          type="checkbox"
          checked={reduceOnly}
          onChange={(e) => setReduceOnly(e.target.checked)}
          className="accent-neon-cyan w-4 h-4 rounded"
        />
        <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">Reduce only</span>
      </label>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="submit"
        disabled={submitOrder.isPending}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
          side === "bid"
            ? "bg-neon-cyan text-bg-primary hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.4)] focus-visible:ring-neon-cyan"
            : "bg-neon-magenta text-white hover:brightness-110 shadow-[0_0_20px_rgba(255,0,110,0.4)] focus-visible:ring-neon-magenta"
        }`}
      >
        {submitOrder.isPending
          ? "Submitting..."
          : `${side === "bid" ? "Long" : "Short"} ${symbol}`}
      </motion.button>

      {showSuccess && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-xs text-neon-cyan text-center font-medium drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]"
        >
          Order placed ✓
        </motion.p>
      )}
      {error && !showSuccess && (
        <p className="mt-3 text-xs text-danger text-center">{error}</p>
      )}
    </form>
  );
}
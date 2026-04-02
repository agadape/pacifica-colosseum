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
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border-light p-5">
      <h3 className="font-display text-sm font-700 text-text-primary mb-4">Order</h3>

      {/* Type tabs */}
      <div className="flex gap-1 mb-4 bg-bg-primary rounded-lg p-0.5">
        {(["market", "limit"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setOrderType(type)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              orderType === type
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Side buttons */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSide("bid")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            side === "bid"
              ? "bg-success/10 text-success border-2 border-success"
              : "bg-bg-primary text-text-tertiary border-2 border-transparent"
          }`}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => setSide("ask")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            side === "ask"
              ? "bg-danger/10 text-danger border-2 border-danger"
              : "bg-bg-primary text-text-tertiary border-2 border-transparent"
          }`}
        >
          Short
        </button>
      </div>

      {/* Size */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-text-tertiary">Size (USD)</label>
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
          className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-light text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
        />
      </div>

      {/* Quick size presets */}
      <div className="flex gap-1 mb-3">
        {["25", "50", "100", "250"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSize(v)}
            className="flex-1 py-1 rounded-md text-[10px] font-semibold text-text-tertiary hover:text-accent-primary bg-bg-primary border border-border-light transition-colors"
          >
            ${v}
          </button>
        ))}
      </div>

      {/* Price (limit only) */}
      {orderType === "limit" && (
        <div className="mb-3">
          <label className="block text-xs text-text-tertiary mb-1">Price</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-light text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
          />
        </div>
      )}

      {/* Leverage slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-text-tertiary">Leverage <span className="text-text-tertiary/50">(max {maxLeverage}x)</span></label>
          <span className="font-mono text-xs font-semibold text-text-primary">{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={maxLeverage}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-accent-primary"
        />
      </div>

      {/* Net position hint */}
      <p className="text-[10px] text-text-tertiary/60 mb-2">
        Opposite side closes existing position (net mode)
      </p>

      {/* Reduce only */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={reduceOnly}
          onChange={(e) => setReduceOnly(e.target.checked)}
          className="accent-accent-primary"
        />
        <span className="text-xs text-text-secondary">Reduce only</span>
      </label>

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="submit"
        disabled={submitOrder.isPending}
        className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50 ${
          side === "bid"
            ? "bg-success hover:bg-success/90"
            : "bg-danger hover:bg-danger/90"
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
          className="mt-3 text-xs text-success text-center"
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

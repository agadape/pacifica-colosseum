import { create } from "zustand";

interface TradingStore {
  orderType: "market" | "limit";
  side: "bid" | "ask";
  size: string;
  price: string;
  leverage: number;
  reduceOnly: boolean;
  slippagePercent: string;

  setOrderType: (type: "market" | "limit") => void;
  setSide: (side: "bid" | "ask") => void;
  setSize: (size: string) => void;
  setPrice: (price: string) => void;
  setLeverage: (leverage: number) => void;
  setReduceOnly: (reduceOnly: boolean) => void;
  reset: () => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  orderType: "market",
  side: "bid",
  size: "",
  price: "",
  leverage: 5,
  reduceOnly: false,
  slippagePercent: "1",

  setOrderType: (orderType) => set({ orderType }),
  setSide: (side) => set({ side }),
  setSize: (size) => set({ size }),
  setPrice: (price) => set({ price }),
  setLeverage: (leverage) => set({ leverage }),
  setReduceOnly: (reduceOnly) => set({ reduceOnly }),
  reset: () => set({ size: "", price: "", reduceOnly: false }),
}));

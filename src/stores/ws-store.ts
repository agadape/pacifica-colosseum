import { create } from "zustand";

interface PriceEntry {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  timestamp: number;
}

interface WSStore {
  connected: boolean;
  prices: Map<string, PriceEntry>;

  setConnected: (connected: boolean) => void;
  updatePrice: (entry: PriceEntry) => void;
  getPrice: (symbol: string) => PriceEntry | undefined;
}

export const useWSStore = create<WSStore>((set, get) => ({
  connected: false,
  prices: new Map(),

  setConnected: (connected) => set({ connected }),
  updatePrice: (entry) =>
    set((state) => {
      const prices = new Map(state.prices);
      prices.set(entry.symbol, entry);
      return { prices };
    }),
  getPrice: (symbol) => get().prices.get(symbol),
}));

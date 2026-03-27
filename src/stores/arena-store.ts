import { create } from "zustand";

interface ArenaFilters {
  status: string | null;
  preset: string | null;
  page: number;
}

interface ArenaStore {
  filters: ArenaFilters;
  setStatus: (status: string | null) => void;
  setPreset: (preset: string | null) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

const defaultFilters: ArenaFilters = {
  status: null,
  preset: null,
  page: 1,
};

export const useArenaStore = create<ArenaStore>((set) => ({
  filters: { ...defaultFilters },
  setStatus: (status) => set((s) => ({ filters: { ...s.filters, status, page: 1 } })),
  setPreset: (preset) => set((s) => ({ filters: { ...s.filters, preset, page: 1 } })),
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));

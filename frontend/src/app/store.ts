import { create } from "zustand";
import type { SearchFilters } from "../types/models";

export type ViewMode = "list" | "tile";
export type SortMode = "manual" | "az";

interface UIState {
  activeWorkspaceSlug: string | null;
  selectedCardId: number | null;
  search: string;
  filters: SearchFilters;
  viewMode: ViewMode;
  sortMode: SortMode;
  showSummary: boolean;
  showCover: boolean;
  dividerRatio: number;
  schemaStudioOpen: boolean;
  setActiveWorkspaceSlug: (slug: string | null) => void;
  setSelectedCardId: (cardId: number | null) => void;
  setSearch: (value: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setShowSummary: (value: boolean) => void;
  setShowCover: (value: boolean) => void;
  setDividerRatio: (value: number) => void;
  setSchemaStudioOpen: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspaceSlug: null,
  selectedCardId: null,
  search: "",
  filters: {},
  viewMode: "list",
  sortMode: "manual",
  showSummary: false,
  showCover: false,
  dividerRatio: 0.39,
  schemaStudioOpen: false,
  setActiveWorkspaceSlug: (slug) => set({ activeWorkspaceSlug: slug, selectedCardId: null }),
  setSelectedCardId: (cardId) => set({ selectedCardId: cardId }),
  setSearch: (value) => set({ search: value }),
  setFilters: (filters) => set({ filters }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setShowSummary: (value) => set({ showSummary: value }),
  setShowCover: (value) => set({ showCover: value }),
  setDividerRatio: (value) => set({ dividerRatio: Math.min(0.8, Math.max(0.2, value)) }),
  setSchemaStudioOpen: (value) => set({ schemaStudioOpen: value }),
}));


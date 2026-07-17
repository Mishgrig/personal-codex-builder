import { create } from "zustand";
import type { SearchFilters } from "../types/models";

export type ViewMode = "list" | "tile";
export type SortMode = "manual" | "az";
export type DetailPanePosition = "right" | "bottom";
export type WorkspaceScreen = "home" | "atlas" | "characters" | "locations" | "plots" | "chapters" | "campaign" | "board" | "table";

interface UIState {
  activeWorkspaceSlug: string | null;
  selectedCardId: number | null;
  activeScreen: WorkspaceScreen;
  selectedCardTypeSlug: string | null;
  search: string;
  filters: SearchFilters;
  viewMode: ViewMode;
  sortMode: SortMode;
  showSummary: boolean;
  showCover: boolean;
  groupByCategory: boolean;
  dividerRatio: number;
  detailPanePosition: DetailPanePosition;
  showNotebook: boolean;
  notebookRatio: number;
  showWorkspaceManager: boolean;
  schemaStudioOpen: boolean;
  setActiveWorkspaceSlug: (slug: string | null) => void;
  setSelectedCardId: (cardId: number | null) => void;
  setActiveScreen: (screen: WorkspaceScreen) => void;
  setSelectedCardTypeSlug: (slug: string | null) => void;
  setSearch: (value: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setShowSummary: (value: boolean) => void;
  setShowCover: (value: boolean) => void;
  setGroupByCategory: (value: boolean) => void;
  setDividerRatio: (value: number) => void;
  setDetailPanePosition: (value: DetailPanePosition) => void;
  setShowNotebook: (value: boolean) => void;
  setNotebookRatio: (value: number) => void;
  setShowWorkspaceManager: (value: boolean) => void;
  setSchemaStudioOpen: (value: boolean) => void;
}

type WorkspacePrefs = Pick<
  UIState,
  | "activeScreen"
  | "selectedCardTypeSlug"
  | "viewMode"
  | "sortMode"
  | "showSummary"
  | "showCover"
  | "groupByCategory"
  | "dividerRatio"
  | "detailPanePosition"
  | "showNotebook"
  | "notebookRatio"
>;

const STORAGE_KEY = "personal-codex-builder-ui-state";
const defaultPrefs: WorkspacePrefs = {
  activeScreen: "home",
  selectedCardTypeSlug: null,
  viewMode: "list",
  sortMode: "manual",
  showSummary: false,
  showCover: false,
  groupByCategory: true,
  dividerRatio: 0.39,
  detailPanePosition: "right",
  showNotebook: true,
  notebookRatio: 0.22,
};

function loadStoredState(): { activeWorkspaceSlug: string | null; workspacePrefs: Record<string, WorkspacePrefs> } {
  if (typeof window === "undefined") {
    return { activeWorkspaceSlug: null, workspacePrefs: {} };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    const rawPrefs = parsed.workspacePrefs ?? {};
    const workspacePrefs = Object.fromEntries(
      Object.entries(rawPrefs).map(([slug, prefs]) => [slug, normalizeWorkspacePrefs(prefs as Partial<WorkspacePrefs>)]),
    ) as Record<string, WorkspacePrefs>;
    return {
      activeWorkspaceSlug: parsed.activeWorkspaceSlug ?? null,
      workspacePrefs,
    };
  } catch {
    return { activeWorkspaceSlug: null, workspacePrefs: {} };
  }
}

function normalizeWorkspacePrefs(prefs: Partial<WorkspacePrefs> | undefined): WorkspacePrefs {
  const next = { ...defaultPrefs, ...(prefs ?? {}) };
  if (next.activeScreen === "campaign") {
    next.activeScreen = "chapters";
  }
  return next;
}

function persistState(activeWorkspaceSlug: string | null, state: UIState) {
  if (typeof window === "undefined") {
    return;
  }
  const loaded = loadStoredState();
  const workspacePrefs = { ...loaded.workspacePrefs };
  if (activeWorkspaceSlug) {
    workspacePrefs[activeWorkspaceSlug] = {
      activeScreen: state.activeScreen,
      selectedCardTypeSlug: state.selectedCardTypeSlug,
      viewMode: state.viewMode,
      sortMode: state.sortMode,
      showSummary: state.showSummary,
      showCover: state.showCover,
      groupByCategory: state.groupByCategory,
      dividerRatio: state.dividerRatio,
      detailPanePosition: state.detailPanePosition,
      showNotebook: state.showNotebook,
      notebookRatio: state.notebookRatio,
    };
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activeWorkspaceSlug,
      workspacePrefs,
    }),
  );
}

const stored = loadStoredState();
export const useUIStore = create<UIState>((set, get) => ({
  activeWorkspaceSlug: stored.activeWorkspaceSlug,
  selectedCardId: null,
  search: "",
  filters: {},
  ...(stored.activeWorkspaceSlug ? stored.workspacePrefs[stored.activeWorkspaceSlug] ?? defaultPrefs : defaultPrefs),
  showWorkspaceManager: false,
  schemaStudioOpen: false,
  setActiveWorkspaceSlug: (slug) =>
    set((state) => {
      const nextPrefs = slug ? normalizeWorkspacePrefs(stored.workspacePrefs[slug]) : defaultPrefs;
      const nextState = {
        ...state,
        activeWorkspaceSlug: slug,
        selectedCardId: null,
        ...nextPrefs,
      };
      persistState(slug, nextState as UIState);
      return nextState;
    }),
  setSelectedCardId: (cardId) => set({ selectedCardId: cardId }),
  setActiveScreen: (screen) =>
    set((state) => {
      const nextState = { ...state, activeScreen: screen };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setSelectedCardTypeSlug: (slug) =>
    set((state) => {
      const nextState = { ...state, selectedCardTypeSlug: slug };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setSearch: (value) => set({ search: value }),
  setFilters: (filters) => set({ filters }),
  setViewMode: (mode) =>
    set((state) => {
      const nextState = { ...state, viewMode: mode };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setSortMode: (mode) =>
    set((state) => {
      const nextState = { ...state, sortMode: mode };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setShowSummary: (value) =>
    set((state) => {
      const nextState = { ...state, showSummary: value };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setShowCover: (value) =>
    set((state) => {
      const nextState = { ...state, showCover: value };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setGroupByCategory: (value) =>
    set((state) => {
      const nextState = { ...state, groupByCategory: value };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setDividerRatio: (value) =>
    set((state) => {
      const nextState = { ...state, dividerRatio: Math.min(0.8, Math.max(0.2, value)) };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setDetailPanePosition: (value) =>
    set((state) => {
      const nextState = { ...state, detailPanePosition: value };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setShowNotebook: (value) =>
    set((state) => {
      const nextState = { ...state, showNotebook: value };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setNotebookRatio: (value) =>
    set((state) => {
      const nextState = { ...state, notebookRatio: Math.min(0.68, Math.max(0.06, value)) };
      persistState(state.activeWorkspaceSlug, nextState as UIState);
      return nextState;
    }),
  setShowWorkspaceManager: (value) => set({ showWorkspaceManager: value }),
  setSchemaStudioOpen: (value) => set({ schemaStudioOpen: value }),
}));

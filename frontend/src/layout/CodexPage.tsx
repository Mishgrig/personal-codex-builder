import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { queryClient } from "../app/queryClient";
import { useUIStore } from "../app/store";
import type { WorkspaceScreen } from "../app/store";
import { AtlasPane } from "../features/atlas/AtlasPane";
import { DetailPane } from "../features/detail/DetailPane";
import { WorkspaceHomePane } from "../features/home/WorkspaceHomePane";
import { WorkspaceControls } from "../features/workspaces/WorkspaceControls";
import { WorkspacePageAnchor } from "./WorkspacePageAnchor";
import { StateNotice } from "../shared/components/StateNotice";
import type { CardCreatePayload, CardListItem, CardSchema, WorkspaceNotebook } from "../types/models";

const SchemaStudio = lazy(() =>
  import("../components/SchemaStudio").then((module) => ({ default: module.SchemaStudio })),
);
const TableViewPane = lazy(() =>
  import("../features/table/TableViewPane").then((module) => ({ default: module.TableViewPane })),
);
const PlotsPane = lazy(() =>
  import("../features/plots/PlotsPane").then((module) => ({ default: module.PlotsPane })),
);
const BoardPane = lazy(() =>
  import("../features/board/BoardPane").then((module) => ({ default: module.BoardPane })),
);
const ChaptersPane = lazy(() =>
  import("../features/chapters/ChaptersPane").then((module) => ({ default: module.ChaptersPane })),
);
const CharacterGraphPane = lazy(() =>
  import("../features/characters/CharacterGraphPane").then((module) => ({ default: module.CharacterGraphPane })),
);
const WorkspaceManagerPanel = lazy(() =>
  import("../features/workspaces/WorkspaceManagerPanel").then((module) => ({ default: module.WorkspaceManagerPanel })),
);
const WorkspaceNotebookPanel = lazy(() =>
  import("../features/workspaces/WorkspaceNotebookPanel").then((module) => ({ default: module.WorkspaceNotebookPanel })),
);
const CategoryManagerPanel = lazy(() =>
  import("../features/taxonomy/CategoryManagerPanel").then((module) => ({ default: module.CategoryManagerPanel })),
);

export function CodexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const notebookDividerRef = useRef<HTMLDivElement | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSortBy, setTableSortBy] = useState("manual");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("asc");
  const [tableStatusFilter, setTableStatusFilter] = useState("");
  const [assetLibrarySearch, setAssetLibrarySearch] = useState("");
  const [assetLibraryType, setAssetLibraryType] = useState("");
  const [categoryManagerCategory, setCategoryManagerCategory] = useState<string | null>(null);
  const [characterRoleFilter, setCharacterRoleFilter] = useState("");
  const [characterGroupFilter, setCharacterGroupFilter] = useState("");
  const [characterWorkspaceMode, setCharacterWorkspaceMode] = useState<"directory" | "graph">("directory");
  const [locationRegionFilter, setLocationRegionFilter] = useState("");
  const [locationClimateFilter, setLocationClimateFilter] = useState("");
  const [locationDangerFilter, setLocationDangerFilter] = useState("");
  const {
    activeWorkspaceSlug,
    selectedCardId,
    activeScreen,
    selectedCardTypeSlug,
    search,
    filters,
    viewMode,
    sortMode,
    showSummary,
    showCover,
    groupByCategory,
    dividerRatio,
    detailPanePosition,
    showNotebook,
    notebookRatio,
    showWorkspaceManager,
    schemaStudioOpen,
    setActiveWorkspaceSlug,
    setSelectedCardId,
    setActiveScreen,
    setSelectedCardTypeSlug,
    setSearch,
    setFilters,
    setViewMode,
    setSortMode,
    setShowSummary,
    setShowCover,
    setGroupByCategory,
    setDividerRatio,
    setDetailPanePosition,
    setShowNotebook,
    setNotebookRatio,
    setShowWorkspaceManager,
    setSchemaStudioOpen,
  } = useUIStore();

  const deferredSearch = useDeferredValue(search);
  const ensuredCoreCardTypesRef = useRef("");

  const backendHealthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 15_000,
  });

  const appInfoQuery = useQuery({
    queryKey: ["app-info"],
    queryFn: api.appInfo,
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces", "all"],
    queryFn: () => api.listWorkspaces(true),
  });

  const allWorkspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);
  const activeWorkspaces = useMemo(
    () => allWorkspaces.filter((workspace) => !workspace.archived),
    [allWorkspaces],
  );
  const archivedWorkspaces = useMemo(
    () => allWorkspaces.filter((workspace) => workspace.archived),
    [allWorkspaces],
  );
  const activeWorkspace =
    activeWorkspaces.find((workspace) => workspace.slug === activeWorkspaceSlug) ??
    activeWorkspaces[0] ??
    null;
  const activeAccentColor = accentColor(String(activeWorkspace?.ui_preferences.accent_color ?? "blue"));
  const activeDensity = workspaceDensity(String(activeWorkspace?.ui_preferences.density ?? "comfortable"));
  const activeTextScale = textScale(String(activeWorkspace?.ui_preferences.text_scale ?? "100"));
  const activeTypography = typographyPreset(String(activeWorkspace?.ui_preferences.typography_preset ?? "literary"));

  useEffect(() => {
    const activeWorkspaceExists = Boolean(
      activeWorkspaceSlug &&
        allWorkspaces.some(
          (workspace) => workspace.slug === activeWorkspaceSlug && !workspace.archived,
        ),
    );

    if (activeWorkspaceExists) {
      return;
    }

    const nextActiveWorkspaceSlug = activeWorkspaces[0]?.slug ?? null;

    if (activeWorkspaceSlug !== nextActiveWorkspaceSlug) {
      setActiveWorkspaceSlug(nextActiveWorkspaceSlug);
    }
  }, [activeWorkspaceSlug, activeWorkspaces, allWorkspaces, setActiveWorkspaceSlug]);

  const workspaceSlug = activeWorkspace?.slug ?? null;

  useEffect(() => {
    if (!workspaceSlug) {
      return;
    }
    void api.openWorkspace(workspaceSlug)
      .then(() => queryClient.invalidateQueries({ queryKey: ["workspaces"] }))
      .catch(() => undefined);
  }, [workspaceSlug]);

  useEffect(() => {
    const preferredPlacement = activeWorkspace?.ui_preferences.preferred_detail_placement;
    if (preferredPlacement === "right" || preferredPlacement === "bottom") {
      setDetailPanePosition(preferredPlacement);
    }
  }, [activeWorkspace?.slug]);

  const taxonomyQuery = useQuery({
    queryKey: ["taxonomy", workspaceSlug],
    queryFn: () => api.listTaxonomy(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const schemasQuery = useQuery({
    queryKey: ["schemas", workspaceSlug],
    queryFn: () => api.listSchemas(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const cardsQuery = useQuery({
    queryKey: ["cards", workspaceSlug, deferredSearch, filters, sortMode],
    queryFn: () => api.searchCards(workspaceSlug!, filters, deferredSearch, sortMode),
    enabled: Boolean(workspaceSlug),
  });
  const plotEventsQuery = useQuery({
    queryKey: ["plot-events", workspaceSlug],
    queryFn: () => api.listPlotEvents(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });
  const boardsQuery = useQuery({
    queryKey: ["boards", workspaceSlug],
    queryFn: () => api.listBoards(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });
  const chaptersQuery = useQuery({
    queryKey: ["chapters", workspaceSlug],
    queryFn: () => api.listChapters(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });
  const characterGraphQuery = useQuery({
    queryKey: ["character-graph", workspaceSlug],
    queryFn: () => api.getCharacterGraph(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });
  const allVisibleCards = cardsQuery.data?.items ?? [];
  const baseRoomCards = useMemo(
    () => filterCardsForScreen(allVisibleCards, activeScreen),
    [activeScreen, allVisibleCards],
  );
  const roomCards = useMemo(
    () =>
      applyRoomFilters(baseRoomCards, activeScreen, {
        characterRole: characterRoleFilter,
        characterGroup: characterGroupFilter,
        locationRegion: locationRegionFilter,
        locationClimate: locationClimateFilter,
        locationDanger: locationDangerFilter,
      }),
    [
      activeScreen,
      baseRoomCards,
      characterGroupFilter,
      characterRoleFilter,
      locationClimateFilter,
      locationDangerFilter,
      locationRegionFilter,
    ],
  );
  const roomFilters = useMemo(
    () =>
      buildRoomFilters(baseRoomCards, activeScreen, {
        characterRole: characterRoleFilter,
        characterGroup: characterGroupFilter,
        locationRegion: locationRegionFilter,
        locationClimate: locationClimateFilter,
        locationDanger: locationDangerFilter,
      }, {
        setCharacterRole: setCharacterRoleFilter,
        setCharacterGroup: setCharacterGroupFilter,
        setLocationRegion: setLocationRegionFilter,
        setLocationClimate: setLocationClimateFilter,
        setLocationDanger: setLocationDangerFilter,
      }),
    [
      activeScreen,
      baseRoomCards,
      characterGroupFilter,
      characterRoleFilter,
      locationClimateFilter,
      locationDangerFilter,
      locationRegionFilter,
    ],
  );
  const roomMeta = roomMetadata(activeScreen);
  const pinnedCardIds = readPinnedCardIds(activeWorkspace?.ui_preferences);
  const pinnedCards = useMemo(
    () => pinnedCardIds.map((id) => allVisibleCards.find((card) => card.id === id)).filter((card): card is CardListItem => Boolean(card)),
    [allVisibleCards, pinnedCardIds],
  );

  useEffect(() => {
    if (!workspaceSlug || !schemasQuery.data) {
      return;
    }
    const templates = coreCardTypeTemplates();
    const missing = templates.filter((template) => !schemasQuery.data.some((schema) => schema.id === template.id));
    if (!missing.length) {
      return;
    }
    const missingKey = `${workspaceSlug}:${missing.map((template) => template.id).join(",")}`;
    if (ensuredCoreCardTypesRef.current === missingKey) {
      return;
    }
    ensuredCoreCardTypesRef.current = missingKey;
    void Promise.all(missing.map((template) => api.putSchema(workspaceSlug, template)))
      .then(refreshWorkspace)
      .catch(() => {
        ensuredCoreCardTypesRef.current = "";
      });
  }, [schemasQuery.data, workspaceSlug]);

  const backupsQuery = useQuery({
    queryKey: ["backups", workspaceSlug],
    queryFn: () => api.listBackups(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceHealthQuery = useQuery({
    queryKey: ["workspace-health", workspaceSlug],
    queryFn: () => api.getWorkspaceHealth(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspacePortabilityQuery = useQuery({
    queryKey: ["workspace-portability", workspaceSlug],
    queryFn: () => api.getWorkspacePortability(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceAssetHealthQuery = useQuery({
    queryKey: ["workspace-asset-health", workspaceSlug],
    queryFn: () => api.getWorkspaceAssetHealth(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceNotebookQuery = useQuery({
    queryKey: ["workspace-notebook", workspaceSlug],
    queryFn: () => api.getWorkspaceNotebook(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const workspaceAssetsQuery = useQuery({
    queryKey: ["workspace-assets", workspaceSlug],
    queryFn: () => api.listWorkspaceAssets(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  const cardTypesQuery = useQuery({
    queryKey: ["card-types", workspaceSlug],
    queryFn: () => api.listCardTypes(workspaceSlug!),
    enabled: Boolean(workspaceSlug),
  });

  useEffect(() => {
    if (!cardTypesQuery.data?.length) {
      return;
    }
    const selectedExists = selectedCardTypeSlug
      ? cardTypesQuery.data.some((item) => item.slug === selectedCardTypeSlug)
      : false;
    if (!selectedExists) {
      setSelectedCardTypeSlug(cardTypesQuery.data[0].slug);
    }
  }, [cardTypesQuery.data, selectedCardTypeSlug, setSelectedCardTypeSlug]);

  const tableDataQuery = useQuery({
    queryKey: [
      "card-type-table",
      workspaceSlug,
      selectedCardTypeSlug,
      tableSearch,
      tableSortBy,
      tableSortDir,
      tableStatusFilter,
    ],
    queryFn: () =>
      api.getCardTypeTable(
        workspaceSlug!,
        selectedCardTypeSlug!,
        tableSearch,
        tableSortBy,
        tableSortDir,
        tableStatusFilter,
      ),
    enabled: Boolean(workspaceSlug && selectedCardTypeSlug),
  });

  const selectedIdFromRoute = (() => {
    const match = location.pathname.match(/^\/cards\/(\d+)$/);
    return match ? Number(match[1]) : null;
  })();
  const effectiveSelectedCardId = selectedIdFromRoute ?? selectedCardId;

  useEffect(() => {
    if (!workspaceSlug || !cardsQuery.data) {
      return;
    }
    if (!cardsQuery.data.items.length) {
      setSelectedCardId(null);
      navigate("/", { replace: true });
      return;
    }
    const routedExists = selectedIdFromRoute
      ? cardsQuery.data.items.some((item) => item.id === selectedIdFromRoute)
      : false;
    if (routedExists && selectedIdFromRoute !== selectedCardId) {
      setSelectedCardId(selectedIdFromRoute);
      return;
    }
    if (selectedIdFromRoute) {
      return;
    }
    const currentExists = effectiveSelectedCardId
      ? cardsQuery.data.items.some((item) => item.id === effectiveSelectedCardId)
      : false;
    if (!currentExists) {
      const nextId = cardsQuery.data.items[0].id;
      setSelectedCardId(nextId);
      navigate(`/cards/${nextId}`, { replace: true });
    }
  }, [
    cardsQuery.data,
    effectiveSelectedCardId,
    navigate,
    selectedCardId,
    selectedIdFromRoute,
    setSelectedCardId,
    workspaceSlug,
  ]);

  const cardQuery = useQuery({
    queryKey: ["card", workspaceSlug, effectiveSelectedCardId],
    queryFn: () => api.getCard(workspaceSlug!, effectiveSelectedCardId!),
    enabled: Boolean(workspaceSlug && effectiveSelectedCardId),
  });

  const refreshWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app-info"] }),
      queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
      queryClient.invalidateQueries({ queryKey: ["taxonomy", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["schemas", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["plot-events", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["chapters", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["character-graph", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card", workspaceSlug, effectiveSelectedCardId] }),
      queryClient.invalidateQueries({ queryKey: ["backups", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-health", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-portability", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-notebook", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card-types", workspaceSlug] }),
      queryClient.invalidateQueries({ queryKey: ["card-type-table", workspaceSlug] }),
    ]);
  };

  const createWorkspaceMutation = useMutation({
    mutationFn: api.createWorkspace,
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Workspace "${workspace.name}" is ready.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const importWorkspaceMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => api.importWorkspace(file, name),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Imported "${workspace.name}" from a local archive.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const copyWorkspaceMutation = useMutation({
    mutationFn: ({ slug, name }: { slug: string; name: string }) => api.copyWorkspace(slug, name),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Copied workspace as "${workspace.name}".`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.deleteWorkspace(slug),
    onSuccess: async () => {
      setWorkspaceMessage("Database deleted. A safety archive was created before removal.");
      setActiveWorkspaceSlug(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const archiveWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.archiveWorkspace(slug),
    onSuccess: async () => {
      setWorkspaceMessage("Workspace moved to archive.");
      setActiveWorkspaceSlug(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const unarchiveWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.unarchiveWorkspace(slug),
    onSuccess: async (workspace) => {
      setWorkspaceMessage(`Workspace "${workspace.name}" is active again.`);
      setActiveWorkspaceSlug(workspace.slug);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["app-info"] });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: (slug: string) => api.createBackup(slug),
    onSuccess: async (backup) => {
      setWorkspaceMessage(`Backup created: ${backup.filename}`);
      await refreshWorkspace();
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: ({ slug, filename }: { slug: string; filename: string }) => api.deleteBackup(slug, filename),
    onSuccess: async () => {
      setWorkspaceMessage("Backup deleted.");
      await refreshWorkspace();
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: ({ slug, filename }: { slug: string; filename: string }) => api.restoreBackup(slug, filename),
    onSuccess: async (result) => {
      setWorkspaceMessage(`Workspace restored. Safety backup: ${result.safety_backup.filename}`);
      setActiveWorkspaceSlug(result.workspace.slug);
      await refreshWorkspace();
    },
  });

  const exportWorkspaceMutation = useMutation({
    mutationFn: (slug: string) => api.exportWorkspace(slug),
    onSuccess: async (result) => {
      setWorkspaceMessage(`Workspace export created at ${result.path}`);
      await refreshWorkspace();
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (payload: CardCreatePayload = { title: "Untitled Card" }) => api.createCard(workspaceSlug!, payload),
    onSuccess: async (card) => {
      await refreshWorkspace();
      setSelectedCardId(card.id);
      navigate(`/cards/${card.id}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => api.reorderCards(workspaceSlug!, orderedIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] });
    },
  });

  const detailWidth = `${Math.round((1 - dividerRatio) * 100)}%`;
  const atlasWidth = `${Math.round(dividerRatio * 100)}%`;
  const workspaceBusy =
    createWorkspaceMutation.isPending ||
    importWorkspaceMutation.isPending ||
    copyWorkspaceMutation.isPending ||
    deleteWorkspaceMutation.isPending ||
    archiveWorkspaceMutation.isPending ||
    unarchiveWorkspaceMutation.isPending ||
    createBackupMutation.isPending ||
    deleteBackupMutation.isPending ||
    restoreBackupMutation.isPending ||
    exportWorkspaceMutation.isPending;

  function beginDividerDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = dividerRatio;
    const onMove = (moveEvent: MouseEvent) => {
      if (detailPanePosition === "bottom") {
        const delta = moveEvent.clientY - startY;
        const height = window.innerHeight;
        setDividerRatio(initial + delta / height);
        return;
      }
      const delta = moveEvent.clientX - startX;
      const width = window.innerWidth;
      setDividerRatio(initial + delta / width);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function beginNotebookDividerDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const initial = notebookRatio;
    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const width = window.innerWidth;
      setNotebookRatio(initial + delta / width);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const filteredAssets = useMemo(() => {
    const items = workspaceAssetsQuery.data?.items ?? [];
    return items.filter((asset) => {
      const queryMatches =
        !assetLibrarySearch ||
        `${asset.id} ${asset.original_filename} ${asset.stored_filename}`
          .toLowerCase()
          .includes(assetLibrarySearch.toLowerCase());
      const typeMatches = !assetLibraryType || asset.asset_type === assetLibraryType;
      return queryMatches && typeMatches;
    });
  }, [assetLibrarySearch, assetLibraryType, workspaceAssetsQuery.data]);

  function downloadExportArtifact(exported: {
    filename: string;
    format: string;
    content_text?: string;
    content_json?: Array<Record<string, unknown>>;
    content_base64?: string;
  }) {
    let blob: Blob;
    if (exported.format === "xlsx" && exported.content_base64) {
      const binary = atob(exported.content_base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else if (exported.format === "json") {
      blob = new Blob([JSON.stringify(exported.content_json ?? [], null, 2)], {
        type: "application/json",
      });
    } else {
      blob = new Blob([exported.content_text ?? ""], {
        type: "text/csv;charset=utf-8",
      });
    }
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  async function exportCardTypeStructure(format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !selectedCardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeStructure(workspaceSlug, selectedCardTypeSlug, format);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportCardTypeStructureForSlug(cardTypeSlug: string, format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !cardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeStructure(workspaceSlug, cardTypeSlug, format);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportCardTypeTable(format: "json" | "csv" | "xlsx") {
    if (!workspaceSlug || !selectedCardTypeSlug) {
      return;
    }
    const exported = await api.exportCardTypeTable(
      workspaceSlug,
      selectedCardTypeSlug,
      format,
      tableSearch,
    );
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  async function exportWorkspaceData(
    format: "json" | "csv",
    includeAssetIds: boolean,
    selectedCardIds: number[] = [],
  ) {
    if (!workspaceSlug) {
      return;
    }
    const exported = await api.exportWorkspaceData(workspaceSlug, format, includeAssetIds, selectedCardIds);
    downloadExportArtifact(exported);
    setWorkspaceMessage(`Created ${exported.filename}`);
  }

  function updateWorkspacePreferences(patch: Record<string, unknown>) {
    if (!workspaceSlug || !activeWorkspace) {
      return;
    }
    const nextPreferences = {
      ...(activeWorkspace.ui_preferences ?? {}),
      ...patch,
    };
    if (patch.preferred_detail_placement === "right" || patch.preferred_detail_placement === "bottom") {
      setDetailPanePosition(patch.preferred_detail_placement);
    }
    void api.updateWorkspace(workspaceSlug, { ui_preferences: nextPreferences }).then(refreshWorkspace);
  }

  function togglePinnedCard(cardId: number) {
    const nextPinnedCardIds = pinnedCardIds.includes(cardId)
      ? pinnedCardIds.filter((id) => id !== cardId)
      : [cardId, ...pinnedCardIds].slice(0, 24);
    updateWorkspacePreferences({ pinned_card_ids: nextPinnedCardIds });
  }

  async function createCardForCurrentRoom() {
    if (!workspaceSlug) {
      return;
    }
    if (activeScreen === "characters") {
      await ensureCardType(workspaceSlug, schemasQuery.data ?? [], characterSchemaTemplate());
      await createCardMutation.mutateAsync({
        title: "Untitled Character",
        schema_id: "character",
      });
      return;
    }
    if (activeScreen === "locations") {
      await ensureCardType(workspaceSlug, schemasQuery.data ?? [], locationSchemaTemplate());
      await createCardMutation.mutateAsync({
        title: "Untitled Location",
        schema_id: "location",
      });
      return;
    }
    await ensureCardType(workspaceSlug, schemasQuery.data ?? [], wikiLoreSchemaTemplate());
    await createCardMutation.mutateAsync({ title: "Untitled Wiki Card", schema_id: "lore" });
  }

  function exportSelectedMarkdown() {
    const card = cardQuery.data;
    if (!card) {
      setWorkspaceMessage("Choose a Wiki card first.");
      return;
    }
    const markdown = [
      `# ${card.title}`,
      card.summary ? `\n${card.summary}` : "",
      card.body_text ? `\n${card.body_text}` : "",
      card.sources.length
        ? `\n## Sources\n${card.sources.map((source) => `- ${source.title}${source.url ? `: ${source.url}` : ""}`).join("\n")}`
        : "",
    ].join("\n").trimEnd() + "\n";
    downloadTextFile(`${safeFilename(card.slug || card.title)}.md`, markdown, "text/markdown;charset=utf-8");
  }

  async function importMarkdown(file: File) {
    if (!workspaceSlug) {
      return;
    }
    const markdown = await file.text();
    const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.name.replace(/\.(md|markdown)$/i, "");
    const summary = markdown
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? "";
    const created = await api.createCard(workspaceSlug, {
      title,
      summary,
      status: "draft",
    });
    await api.updateCard(workspaceSlug, created.id, {
      body_json: markdownToDoc(markdown),
    });
    await refreshWorkspace();
    setSelectedCardId(created.id);
    setActiveScreen("atlas");
    navigate(`/cards/${created.id}`);
    setWorkspaceMessage(`Imported ${file.name} as a Wiki card.`);
  }

  async function appendNotebookTextToCurrentCard(text: string) {
    if (!workspaceSlug || !cardQuery.data) {
      setWorkspaceMessage("Choose a card before sending Notebook text.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const updated = await api.updateCard(workspaceSlug, cardQuery.data.id, {
      body_json: appendTextToDoc(cardQuery.data.body_json, trimmed),
    });
    queryClient.setQueryData(["card", workspaceSlug, cardQuery.data.id], updated);
    await refreshWorkspace();
    setWorkspaceMessage(`Notebook text added to "${updated.title}".`);
  }

  return (
    <div
      className={`app-shell theme-${activeWorkspace?.theme ?? "fantasy"} density-${activeDensity} typography-${activeTypography}`}
      style={{
        ["--accent" as string]: activeAccentColor,
        ["--text-scale" as string]: activeTextScale,
      }}
    >
      <div className="constellation" />
      <WorkspaceControls
        workspaces={activeWorkspaces}
        activeWorkspace={activeWorkspace}
        archivedCount={archivedWorkspaces.length}
        search={search}
        activeScreen={activeScreen}
        filters={filters}
        taxonomyTerms={taxonomyQuery.data ?? []}
        onSearchChange={setSearch}
        onScreenChange={setActiveScreen}
        onSelectWorkspace={(slug) => {
          setActiveWorkspaceSlug(slug || null);
          setWorkspaceMessage(null);
        }}
        onToggleWorkspaceManager={() => setShowWorkspaceManager(!showWorkspaceManager)}
        workspaceManagerOpen={showWorkspaceManager}
        onManageCategory={(category) => setCategoryManagerCategory(category)}
        onFiltersChange={setFilters}
      />

      {showWorkspaceManager ? (
        <Suspense fallback={<div className="modal-backdrop"><div className="modal-card compact-modal"><h2>Loading workspace tools…</h2></div></div>}>
          <WorkspaceManagerPanel
          appInfo={appInfoQuery.data ?? null}
          backendStatus={backendHealthQuery.data?.status ?? "offline"}
          workspaces={activeWorkspaces}
          activeWorkspace={activeWorkspace}
          selectedCard={cardQuery.data ?? null}
          archivedWorkspaces={archivedWorkspaces}
          backups={backupsQuery.data ?? []}
          health={workspaceHealthQuery.data ?? null}
          portability={workspacePortabilityQuery.data ?? null}
          assetHealth={workspaceAssetHealthQuery.data ?? null}
          assets={filteredAssets}
          message={workspaceMessage}
          busy={workspaceBusy}
          assetLibraryQuery={assetLibrarySearch}
          assetLibraryType={assetLibraryType}
          onClose={() => setShowWorkspaceManager(false)}
          onSelectWorkspace={(slug) => {
            setActiveWorkspaceSlug(slug);
            setWorkspaceMessage(null);
          }}
          onCreateWorkspace={async (payload) => {
            const workspace = await createWorkspaceMutation.mutateAsync(payload);
            setShowWorkspaceManager(false);
            return workspace;
          }}
          onReorderWorkspaces={async (orderedSlugs) => {
            await api.reorderWorkspaces(orderedSlugs);
            await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
          }}
          onAssetLibraryQueryChange={setAssetLibrarySearch}
          onAssetLibraryTypeChange={setAssetLibraryType}
          onAttachAsset={async (assetId, role) => {
            if (!workspaceSlug || !effectiveSelectedCardId) {
              setWorkspaceMessage("Choose a card first.");
              return;
            }
            await api.attachWorkspaceAsset(workspaceSlug, assetId, {
              card_id: effectiveSelectedCardId,
              role,
              set_as_cover: role === "gallery",
            });
            await refreshWorkspace();
            setWorkspaceMessage(`Asset attached to ${role}.`);
          }}
          onAttachSourceAsset={async (assetId, sourceId) => {
            if (!workspaceSlug) {
              return;
            }
            await api.attachExistingSourceAsset(workspaceSlug, sourceId, assetId);
            await refreshWorkspace();
            setWorkspaceMessage("Asset attached to source.");
          }}
          onDeleteAsset={async (assetId) => {
            if (!workspaceSlug) {
              return;
            }
            await api.deleteWorkspaceAsset(workspaceSlug, assetId);
            await refreshWorkspace();
            setWorkspaceMessage("Unused asset deleted.");
          }}
          onRepairWorkspaceHealth={async (action) => {
            if (!workspaceSlug) {
              return;
            }
            const result = await api.repairWorkspaceHealth(workspaceSlug, action);
            await refreshWorkspace();
            setWorkspaceMessage(result.message);
          }}
          onRepairAssetHealth={async (action) => {
            if (!workspaceSlug) {
              return;
            }
            const result = await api.repairWorkspaceAssetHealth(workspaceSlug, action);
            await refreshWorkspace();
            setWorkspaceMessage(result.message);
          }}
          onRenameWorkspace={async (name, description) => {
            if (!workspaceSlug) {
              return;
            }
            await api.updateWorkspace(workspaceSlug, { name, description });
            await refreshWorkspace();
            setWorkspaceMessage(`World "${name}" updated.`);
          }}
          onUpdateWorkspacePreferences={updateWorkspacePreferences}
          onDuplicateWorkspace={async (name) => {
            if (!workspaceSlug) {
              return;
            }
            await copyWorkspaceMutation.mutateAsync({ slug: workspaceSlug, name });
          }}
          onDeleteWorkspace={async () => {
            if (!workspaceSlug || !activeWorkspace) {
              return;
            }
            const confirmed = window.confirm(
              `Delete "${activeWorkspace.name}" permanently? A safety archive will be created first.`,
            );
            if (!confirmed) {
              return;
            }
            await deleteWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onCreateBackup={async () => {
            if (!workspaceSlug) {
              return;
            }
            await createBackupMutation.mutateAsync(workspaceSlug);
          }}
          onExportWorkspace={async () => {
            if (!workspaceSlug) {
              return;
            }
            await exportWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onExportWorkspaceData={async (includeAssetIds) => {
            await exportWorkspaceData("json", includeAssetIds);
          }}
          onShareSelectedCard={async (targetWorkspaceSlug, mode) => {
            if (!workspaceSlug || !effectiveSelectedCardId) {
              setWorkspaceMessage("Choose a card before sharing.");
              return;
            }
            const result = await api.shareWorkspaceEntity(workspaceSlug, {
              target_workspace_slug: targetWorkspaceSlug,
              entity_type: "card",
              entity_id: effectiveSelectedCardId,
              mode,
            });
            await refreshWorkspace();
            await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            setWorkspaceMessage(
              result.mode === "snapshot"
                ? `Snapshot copied to ${targetWorkspaceSlug}.`
                : `Canonical link registered in ${targetWorkspaceSlug}.`,
            );
          }}
          onArchiveWorkspace={async () => {
            if (!workspaceSlug || !activeWorkspace) {
              return;
            }
            const confirmed = window.confirm(
              `Archive "${activeWorkspace.name}"? Its local files will stay on disk, but it will leave the active list.`,
            );
            if (!confirmed) {
              return;
            }
            await archiveWorkspaceMutation.mutateAsync(workspaceSlug);
          }}
          onUnarchiveWorkspace={async (slug) => {
            await unarchiveWorkspaceMutation.mutateAsync(slug);
          }}
          onImportWorkspace={(file, name) => importWorkspaceMutation.mutateAsync({ file, name })}
          onRestoreBackup={async (filename) => {
            if (!workspaceSlug) {
              return;
            }
            const confirmed = window.confirm(
              "Restore this backup? Current data will be replaced and a safety backup will be created first.",
            );
            if (!confirmed) {
              return;
            }
            await restoreBackupMutation.mutateAsync({ slug: workspaceSlug, filename });
          }}
          onDeleteBackup={async (filename) => {
            if (!workspaceSlug) {
              return;
            }
            const confirmed = window.confirm("Delete this backup permanently?");
            if (!confirmed) {
              return;
            }
            await deleteBackupMutation.mutateAsync({ slug: workspaceSlug, filename });
          }}
          />
        </Suspense>
      ) : null}

      {activeWorkspace && workspaceSlug ? (
        <main className="workspace-main-layout">
          {showNotebook ? (
            <>
              <div className="notebook-column" style={{ width: `${Math.round(notebookRatio * 100)}%` }}>
                <Suspense fallback={<div className="empty-block">Loading notebook…</div>}>
                  <WorkspaceNotebookPanel
                    notebook={workspaceNotebookQuery.data ?? null}
                    visible={showNotebook}
                    onToggleVisible={() => setShowNotebook(false)}
                    onSave={async (payload) => {
                      await api.updateWorkspaceNotebook(workspaceSlug, payload);
                      await refreshWorkspace();
                      setWorkspaceMessage("Notebook saved.");
                    }}
                    onUploadAsset={async (file) => {
                      const asset = await api.uploadWorkspaceAsset(workspaceSlug, file);
                      await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                      await queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] });
                      return asset;
                    }}
                    onDeleteAsset={async (assetId) => {
                      try {
                        await api.deleteWorkspaceAsset(workspaceSlug, assetId);
                        await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                        await queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] });
                      } catch {
                        await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                      }
                    }}
                    assets={workspaceAssetsQuery.data?.items ?? []}
                    currentCardTitle={cardQuery.data?.title ?? null}
                    onAppendToCurrentCard={(text) => appendNotebookTextToCurrentCard(text)}
                  />
                </Suspense>
              </div>
              <div
                ref={notebookDividerRef}
                className="drag-divider notebook-divider"
                onMouseDown={beginNotebookDividerDrag}
                role="separator"
                aria-orientation="vertical"
              />
            </>
          ) : (
            <Suspense fallback={<div className="empty-block">Loading notebook…</div>}>
              <WorkspaceNotebookPanel
                notebook={workspaceNotebookQuery.data ?? null}
                visible={showNotebook}
                onToggleVisible={() => setShowNotebook(true)}
                onSave={async (payload) => {
                  await api.updateWorkspaceNotebook(workspaceSlug, payload);
                  await refreshWorkspace();
                  setWorkspaceMessage("Notebook saved.");
                }}
                onUploadAsset={async (file) => {
                  const asset = await api.uploadWorkspaceAsset(workspaceSlug, file);
                  await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                  await queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] });
                  return asset;
                }}
                onDeleteAsset={async (assetId) => {
                  try {
                    await api.deleteWorkspaceAsset(workspaceSlug, assetId);
                    await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                    await queryClient.invalidateQueries({ queryKey: ["workspace-asset-health", workspaceSlug] });
                  } catch {
                    await queryClient.invalidateQueries({ queryKey: ["workspace-assets", workspaceSlug] });
                  }
                }}
                assets={workspaceAssetsQuery.data?.items ?? []}
                currentCardTitle={cardQuery.data?.title ?? null}
                onAppendToCurrentCard={(text) => appendNotebookTextToCurrentCard(text)}
              />
            </Suspense>
          )}
          <div className="workspace-content-column">
            {activeScreen !== "home" ? (
              <WorkspacePageAnchor
                workspaceName={activeWorkspace.name}
                workspaceDescription={activeWorkspace.description}
                activeScreen={activeScreen}
                onScreenChange={setActiveScreen}
                onOpenManager={() => setShowWorkspaceManager(true)}
              />
            ) : null}
            {activeScreen === "home" ? (
              <WorkspaceHomePane
                workspace={activeWorkspace}
                cards={allVisibleCards}
                pinnedCards={pinnedCards}
                assets={workspaceAssetsQuery.data?.items ?? []}
                assetHealth={workspaceAssetHealthQuery.data ?? null}
                notebook={workspaceNotebookQuery.data ?? null}
                chapters={chaptersQuery.data?.items ?? []}
                onOpenWiki={() => setActiveScreen("atlas")}
                onOpenCharacters={() => setActiveScreen("characters")}
                onOpenLocations={() => setActiveScreen("locations")}
                onOpenPlots={() => setActiveScreen("plots")}
                onOpenChapters={() => setActiveScreen("chapters")}
                onOpenBoard={() => setActiveScreen("board")}
                onOpenTable={() => setActiveScreen("table")}
                onOpenManager={() => setShowWorkspaceManager(true)}
                onSelectCard={(cardId) => {
                  setSelectedCardId(cardId);
                  setActiveScreen(screenForCard(allVisibleCards.find((card) => card.id === cardId) ?? null));
                  navigate(`/cards/${cardId}`);
                }}
                onPinCard={togglePinnedCard}
                onUnpinCard={togglePinnedCard}
                onSaveQuickNote={async (text) => {
                  await api.updateWorkspaceNotebook(
                    workspaceSlug,
                    appendPlainTextNotebookItem(workspaceNotebookQuery.data ?? null, text),
                  );
                  await refreshWorkspace();
                  setWorkspaceMessage("Quick note saved to Notebook.");
                }}
                onUpdatePreferences={updateWorkspacePreferences}
              />
            ) : activeScreen === "plots" ? (
              <Suspense fallback={<div className="empty-block">Loading plots…</div>}>
                <PlotsPane
                  events={plotEventsQuery.data?.items ?? []}
                  cards={allVisibleCards}
                  onCreateEvent={async (payload) => {
                    const event = await api.createPlotEvent(workspaceSlug, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage(`Plot event "${event.title}" created.`);
                    return event;
                  }}
                  onUpdateEvent={async (eventId, payload) => {
                    const event = await api.updatePlotEvent(workspaceSlug, eventId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage(`Plot event "${event.title}" saved.`);
                    return event;
                  }}
                  onDeleteEvent={async (eventId) => {
                    await api.deletePlotEvent(workspaceSlug, eventId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Plot event deleted.");
                  }}
                  onAddCardLink={async (eventId, payload) => {
                    const event = await api.addPlotEventCardLink(workspaceSlug, eventId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Card linked to plot event.");
                    return event;
                  }}
                  onDeleteCardLink={async (linkId) => {
                    const event = await api.deletePlotEventCardLink(workspaceSlug, linkId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Card link removed.");
                    return event;
                  }}
                  onAddEventLink={async (eventId, payload) => {
                    const event = await api.addPlotEventLink(workspaceSlug, eventId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Plot events connected.");
                    return event;
                  }}
                  onDeleteEventLink={async (linkId) => {
                    const event = await api.deletePlotEventLink(workspaceSlug, linkId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Plot event link removed.");
                    return event;
                  }}
                  onUpdateLayout={async (eventId, payload) => {
                    const event = await api.updatePlotEventLayout(workspaceSlug, eventId, payload);
                    await refreshWorkspace();
                    return event;
                  }}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId);
                    setActiveScreen(screenForCard(allVisibleCards.find((card) => card.id === cardId) ?? null));
                    navigate(`/cards/${cardId}`);
                  }}
                />
              </Suspense>
            ) : activeScreen === "chapters" || activeScreen === "campaign" ? (
              <Suspense fallback={<div className="empty-block">Loading chapters…</div>}>
                <ChaptersPane
                  workspace={activeWorkspace}
                  chapters={chaptersQuery.data?.items ?? []}
                  cards={allVisibleCards}
                  assets={workspaceAssetsQuery.data?.items ?? []}
                  boards={boardsQuery.data?.items ?? []}
                  events={plotEventsQuery.data?.items ?? []}
                  onCreateChapter={async (payload) => {
                    const chapter = await api.createChapter(workspaceSlug, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage(`Chapter "${chapter.title}" created.`);
                    return chapter;
                  }}
                  onUpdateChapter={async (chapterId, payload) => {
                    const chapter = await api.updateChapter(workspaceSlug, chapterId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage(`Chapter "${chapter.title}" saved.`);
                    return chapter;
                  }}
                  onDeleteChapter={async (chapterId) => {
                    await api.deleteChapter(workspaceSlug, chapterId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Chapter deleted.");
                  }}
                  onAddChapterReference={async (chapterId, payload) => {
                    const chapter = await api.addChapterReference(workspaceSlug, chapterId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Chapter material linked.");
                    return chapter;
                  }}
                  onDeleteChapterReference={async (referenceId) => {
                    const chapter = await api.deleteChapterReference(workspaceSlug, referenceId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Chapter material unlinked.");
                    return chapter;
                  }}
                  onCreateScene={async (chapterId, payload) => {
                    const chapter = await api.createScene(workspaceSlug, chapterId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene created.");
                    return chapter;
                  }}
                  onUpdateScene={async (sceneId, payload) => {
                    const chapter = await api.updateScene(workspaceSlug, sceneId, payload);
                    await refreshWorkspace();
                    return chapter;
                  }}
                  onDeleteScene={async (sceneId) => {
                    const chapter = await api.deleteScene(workspaceSlug, sceneId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene deleted.");
                    return chapter;
                  }}
                  onAddSceneReference={async (sceneId, payload) => {
                    const chapter = await api.addSceneReference(workspaceSlug, sceneId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene material linked.");
                    return chapter;
                  }}
                  onDeleteSceneReference={async (referenceId) => {
                    const chapter = await api.deleteSceneReference(workspaceSlug, referenceId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene material unlinked.");
                    return chapter;
                  }}
                  onCreateSceneToken={async (sceneId, payload) => {
                    const chapter = await api.createSceneToken(workspaceSlug, sceneId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene token added.");
                    return chapter;
                  }}
                  onUpdateSceneToken={async (tokenId, payload) => {
                    const chapter = await api.updateSceneToken(workspaceSlug, tokenId, payload);
                    await refreshWorkspace();
                    return chapter;
                  }}
                  onDeleteSceneToken={async (tokenId) => {
                    const chapter = await api.deleteSceneToken(workspaceSlug, tokenId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Scene token removed.");
                    return chapter;
                  }}
                  onCreateSceneDiceShortcut={async (sceneId, payload) => {
                    const chapter = await api.createSceneDiceShortcut(workspaceSlug, sceneId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Dice shortcut added.");
                    return chapter;
                  }}
                  onUpdateDiceShortcut={async (shortcutId, payload) => {
                    const chapter = await api.updateDiceShortcut(workspaceSlug, shortcutId, payload);
                    await refreshWorkspace();
                    return chapter;
                  }}
                  onDeleteDiceShortcut={async (shortcutId) => {
                    const chapter = await api.deleteDiceShortcut(workspaceSlug, shortcutId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Dice shortcut removed.");
                    return chapter;
                  }}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId);
                    setActiveScreen(screenForCard(allVisibleCards.find((card) => card.id === cardId) ?? null));
                    navigate(`/cards/${cardId}`);
                  }}
                />
              </Suspense>
            ) : activeScreen === "board" ? (
              <Suspense fallback={<div className="empty-block">Loading board…</div>}>
                <BoardPane
                  boards={boardsQuery.data?.items ?? []}
                  cards={allVisibleCards}
                  assets={workspaceAssetsQuery.data?.items ?? []}
                  onCreateBoard={async (payload) => {
                    const board = await api.createBoard(workspaceSlug, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage(`Board "${board.title}" created.`);
                    return board;
                  }}
                  onCreateItem={async (boardId, payload) => {
                    const board = await api.createBoardItem(workspaceSlug, boardId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Board item created.");
                    return board;
                  }}
                  onUpdateItem={async (itemId, payload) => {
                    const board = await api.updateBoardItem(workspaceSlug, itemId, payload);
                    await refreshWorkspace();
                    return board;
                  }}
                  onDeleteItem={async (itemId) => {
                    const board = await api.deleteBoardItem(workspaceSlug, itemId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Board item deleted.");
                    return board;
                  }}
                  onCreateEdge={async (boardId, payload) => {
                    const board = await api.createBoardEdge(workspaceSlug, boardId, payload);
                    await refreshWorkspace();
                    setWorkspaceMessage("Board items connected.");
                    return board;
                  }}
                  onDeleteEdge={async (edgeId) => {
                    const board = await api.deleteBoardEdge(workspaceSlug, edgeId);
                    await refreshWorkspace();
                    setWorkspaceMessage("Board connection removed.");
                    return board;
                  }}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId);
                    setActiveScreen(screenForCard(allVisibleCards.find((card) => card.id === cardId) ?? null));
                    navigate(`/cards/${cardId}`);
                  }}
                />
              </Suspense>
            ) : (
              <div className={`atlas-layout ${detailPanePosition === "bottom" ? "stacked" : ""}`}>
                <div className="atlas-column" style={{ width: atlasWidth }}>
                  {activeScreen === "characters" ? (
                    <div className="character-workspace-switch">
                      <div className="segmented-control">
                        <button className={characterWorkspaceMode === "directory" ? "active" : ""} onClick={() => setCharacterWorkspaceMode("directory")}>
                          Directory
                        </button>
                        <button className={characterWorkspaceMode === "graph" ? "active" : ""} onClick={() => setCharacterWorkspaceMode("graph")}>
                          Relationship Graph
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {activeScreen === "characters" && characterWorkspaceMode === "graph" ? (
                    <Suspense fallback={<div className="empty-block">Loading character graph…</div>}>
                      <CharacterGraphPane
                        graph={characterGraphQuery.data ?? null}
                        onCreateGroup={async (payload) => {
                          const group = await api.createCharacterGroup(workspaceSlug, payload);
                          await refreshWorkspace();
                          setWorkspaceMessage(`Character group "${group.name}" created.`);
                          return group;
                        }}
                        onUpdateLayout={async (payload) => {
                          const graph = await api.updateCharacterGraphLayout(workspaceSlug, payload);
                          await refreshWorkspace();
                          return graph;
                        }}
                        onOpenCard={(cardId) => {
                          setSelectedCardId(cardId);
                          navigate(`/cards/${cardId}`);
                        }}
                      />
                    </Suspense>
                  ) : activeScreen === "table" ? (
                  <Suspense fallback={<div className="empty-block">Loading table view…</div>}>
                    <TableViewPane
                      cardTypes={cardTypesQuery.data ?? []}
                      selectedCardTypeSlug={selectedCardTypeSlug}
                      tableData={tableDataQuery.data ?? null}
                      query={tableSearch}
                      sortBy={tableSortBy}
                      sortDir={tableSortDir}
                      statusFilter={tableStatusFilter}
                      onCardTypeChange={(slug) => setSelectedCardTypeSlug(slug || null)}
                      onQueryChange={setTableSearch}
                      onSortChange={(sortBy, sortDir) => {
                        setTableSortBy(sortBy);
                        setTableSortDir(sortDir);
                      }}
                      onStatusFilterChange={setTableStatusFilter}
                      onSelectCard={(cardId) => {
                        setSelectedCardId(cardId);
                        navigate(`/cards/${cardId}`);
                      }}
                      onExportStructure={exportCardTypeStructure}
                      onExportTable={exportCardTypeTable}
                      onExportSelected={(selectedCardIds, includeAssetIds) =>
                        exportWorkspaceData("json", includeAssetIds, selectedCardIds)
                      }
                      onCreateRow={async (payload) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.createCardTypeRow(workspaceSlug, selectedCardTypeSlug, payload);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row created.");
                        return result;
                      }}
                      onUpdateRow={async (cardId, payload) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.updateCardTypeRow(workspaceSlug, selectedCardTypeSlug, cardId, payload);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row saved.");
                        return result;
                      }}
                      onDeleteRow={async (cardId) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        await api.deleteCardTypeRow(workspaceSlug, selectedCardTypeSlug, cardId);
                        await refreshWorkspace();
                        setWorkspaceMessage("Table row archived.");
                      }}
                      onPreviewImport={async (format, contentText, contentBase64, filename) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        return api.previewCardTypeImport(
                          workspaceSlug,
                          selectedCardTypeSlug,
                          format,
                          contentText,
                          contentBase64,
                          filename,
                        );
                      }}
                      onApplyImport={async (format, contentText, contentBase64, filename) => {
                        if (!workspaceSlug || !selectedCardTypeSlug) {
                          throw new Error("Choose a card type first.");
                        }
                        const result = await api.applyCardTypeImport(
                          workspaceSlug,
                          selectedCardTypeSlug,
                          format,
                          contentText,
                          contentBase64,
                          filename,
                        );
                        await refreshWorkspace();
                        setWorkspaceMessage(
                          `Import complete: ${result.rows_created} created, ${result.rows_updated} updated, ${result.rows_skipped} skipped.`,
                        );
                        return result;
                      }}
                    />
                  </Suspense>
                  ) : (
                    <AtlasPane
                    cards={roomCards}
                    totalCards={roomCards.length}
                    title={roomMeta.title}
                    description={roomMeta.description}
                    addCardLabel={roomMeta.addLabel}
                    query={deferredSearch}
                    filters={filters}
                    selectedCardId={effectiveSelectedCardId}
                    viewMode={viewMode}
                    sortMode={sortMode}
                    showSummary={showSummary}
                    showCover={showCover}
                    groupByCategory={groupByCategory}
                    schemas={schemasQuery.data ?? []}
                    roomFilters={roomFilters}
                    detailPanePosition={detailPanePosition}
                    onSelectCard={(cardId) => {
                      setSelectedCardId(cardId);
                      navigate(`/cards/${cardId}`);
                    }}
                    onReorderGroup={(orderedIds) => reorderMutation.mutate(orderedIds)}
                    onViewModeChange={setViewMode}
                    onSortModeChange={setSortMode}
                    onShowSummaryChange={setShowSummary}
                    onShowCoverChange={setShowCover}
                    onGroupByCategoryChange={setGroupByCategory}
                    onCreateCard={() => void createCardForCurrentRoom()}
                    onOpenCardTypeStudio={() => setSchemaStudioOpen(true)}
                    onExportSelectedCardTypeStructure={(schemaId) => {
                      void exportCardTypeStructureForSlug(schemaId, "csv");
                    }}
                    onExportSelectedMarkdown={activeScreen === "atlas" ? exportSelectedMarkdown : undefined}
                    onImportMarkdown={activeScreen === "atlas" ? (file) => void importMarkdown(file) : undefined}
                    onDetailPanePositionChange={(value) => updateWorkspacePreferences({ preferred_detail_placement: value })}
                    onOpenTableView={() => setActiveScreen("table")}
                    />
                  )}
                </div>
                <div
                  ref={dividerRef}
                  className="drag-divider"
                  onMouseDown={beginDividerDrag}
                  role="separator"
                  aria-orientation={detailPanePosition === "bottom" ? "horizontal" : "vertical"}
                />
                <div className="detail-column" style={detailPanePosition === "bottom" ? { height: detailWidth } : { width: detailWidth }}>
                  <DetailPane
                  workspaceSlug={workspaceSlug}
                  card={cardQuery.data ?? null}
                  query={deferredSearch}
                  taxonomyTerms={taxonomyQuery.data ?? []}
                  schemas={schemasQuery.data ?? []}
                  allCards={allVisibleCards}
                  pinned={effectiveSelectedCardId ? pinnedCardIds.includes(effectiveSelectedCardId) : false}
                  onRefresh={refreshWorkspace}
                  onTogglePinned={togglePinnedCard}
                  onDeleteCurrent={async () => {
                    if (!workspaceSlug || !effectiveSelectedCardId) {
                      return;
                    }
                    const confirmed = window.confirm("Delete this card?");
                    if (!confirmed) {
                      return;
                    }
                    await api.deleteCard(workspaceSlug, effectiveSelectedCardId);
                    await refreshWorkspace();
                  }}
                  onOpenCard={(cardId) => {
                    setSelectedCardId(cardId);
                    navigate(`/cards/${cardId}`);
                  }}
                  onOpenCategoryManager={() => setCategoryManagerCategory("domain")}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        <section className="empty-stage">
          {workspacesQuery.isLoading || (workspacesQuery.isFetching && !workspacesQuery.data) ? (
            <StateNotice
              title="Loading worlds"
              description="Checking local workspace registry and opening the last active world."
            />
          ) : workspacesQuery.isError ? (
            <StateNotice
              title="Workspace service unavailable"
              description="Start the local backend, then refresh this page to load your worlds."
            />
          ) : (
            <StateNotice
              title="No active workspace selected"
              description="Create a new workspace, import a local archive, or unarchive an existing workspace to continue."
            />
          )}
        </section>
      )}

      {schemaStudioOpen && workspaceSlug ? (
        <Suspense fallback={<div className="modal-backdrop"><div className="modal-card compact-modal"><h2>Loading studio…</h2></div></div>}>
          <SchemaStudio
            workspaceSlug={workspaceSlug}
            schemas={schemasQuery.data ?? []}
            onClose={() => setSchemaStudioOpen(false)}
            onSaved={refreshWorkspace}
          />
        </Suspense>
      ) : null}

      {categoryManagerCategory && workspaceSlug && activeWorkspace ? (
        <Suspense fallback={<div className="modal-backdrop"><div className="modal-card compact-modal"><h2>Loading category manager…</h2></div></div>}>
          <CategoryManagerPanel
            workspaceSlug={workspaceSlug}
            activeWorkspace={activeWorkspace}
            terms={taxonomyQuery.data ?? []}
            initialCategory={categoryManagerCategory}
            onClose={() => setCategoryManagerCategory(null)}
            onSaved={refreshWorkspace}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function accentColor(value: string) {
  if (value === "teal") return "#2dd4bf";
  if (value === "cyan") return "#67e8f9";
  if (value === "indigo") return "#818cf8";
  if (value === "ice") return "#bae6fd";
  if (value === "gold") return "#c9a14c";
  if (value === "slate") return "#94a3b8";
  return "#4ba8d6";
}

function workspaceDensity(value: string) {
  if (value === "compact" || value === "balanced") return value;
  return "comfortable";
}

function textScale(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "1";
  return String(Math.min(1.18, Math.max(0.9, numeric / 100)));
}

function typographyPreset(value: string) {
  if (value === "crisp" || value === "editorial" || value === "technical") return value;
  return "literary";
}

function roomMetadata(screen: WorkspaceScreen) {
  if (screen === "characters") {
    return {
      title: "Characters",
      description: "Player characters, NPCs, creatures, roles and relationship-ready profiles.",
      addLabel: "Add character",
    };
  }
  if (screen === "locations") {
    return {
      title: "Locations",
      description: "Places, regions, settlements and map-ready location notes.",
      addLabel: "Add location",
    };
  }
  return {
    title: "Wiki",
    description: "Broad knowledge base for lore, factions, items, history and custom entities.",
    addLabel: "Add Wiki entity",
  };
}

function filterCardsForScreen(cards: CardListItem[], screen: string) {
  if (screen === "characters") {
    return cards.filter((card) => card.schema_id === "character" || card.schema_id === "npc");
  }
  if (screen === "locations") {
    return cards.filter((card) => card.schema_id === "location");
  }
  if (screen === "atlas") {
    return cards.filter((card) => !["character", "npc", "location"].includes(card.schema_id ?? ""));
  }
  return cards;
}

function applyRoomFilters(
  cards: CardListItem[],
  screen: string,
  filters: {
    characterRole: string;
    characterGroup: string;
    locationRegion: string;
    locationClimate: string;
    locationDanger: string;
  },
) {
  if (screen === "characters") {
    return cards.filter(
      (card) =>
        matchesField(card, "role", filters.characterRole) &&
        matchesField(card, "group", filters.characterGroup),
    );
  }
  if (screen === "locations") {
    return cards.filter(
      (card) =>
        matchesField(card, "region", filters.locationRegion) &&
        matchesField(card, "climate", filters.locationClimate) &&
        matchesField(card, "danger", filters.locationDanger),
    );
  }
  return cards;
}

function buildRoomFilters(
  cards: CardListItem[],
  screen: string,
  values: {
    characterRole: string;
    characterGroup: string;
    locationRegion: string;
    locationClimate: string;
    locationDanger: string;
  },
  actions: {
    setCharacterRole: (value: string) => void;
    setCharacterGroup: (value: string) => void;
    setLocationRegion: (value: string) => void;
    setLocationClimate: (value: string) => void;
    setLocationDanger: (value: string) => void;
  },
) {
  if (screen === "characters") {
    return [
      {
        label: "Role",
        value: values.characterRole,
        options: uniqueFieldValues(cards, "role", values.characterRole),
        onChange: actions.setCharacterRole,
      },
      {
        label: "Group",
        value: values.characterGroup,
        options: uniqueFieldValues(cards, "group", values.characterGroup),
        onChange: actions.setCharacterGroup,
      },
    ];
  }
  if (screen === "locations") {
    return [
      {
        label: "Region",
        value: values.locationRegion,
        options: uniqueFieldValues(cards, "region", values.locationRegion),
        onChange: actions.setLocationRegion,
      },
      {
        label: "Climate",
        value: values.locationClimate,
        options: uniqueFieldValues(cards, "climate", values.locationClimate),
        onChange: actions.setLocationClimate,
      },
      {
        label: "Danger",
        value: values.locationDanger,
        options: uniqueFieldValues(cards, "danger", values.locationDanger),
        onChange: actions.setLocationDanger,
      },
    ];
  }
  return [];
}

function matchesField(card: CardListItem, fieldId: string, expected: string) {
  if (!expected) {
    return true;
  }
  return String(card.dynamic_fields[fieldId] ?? "").toLowerCase() === expected.toLowerCase();
}

function uniqueFieldValues(cards: CardListItem[], fieldId: string, selectedValue = "") {
  const values = cards
    .map((card) => String(card.dynamic_fields[fieldId] ?? "").trim())
    .filter(Boolean);
  if (selectedValue.trim()) {
    values.push(selectedValue.trim());
  }
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function screenForCard(card: CardListItem | null) {
  if (card?.schema_id === "character" || card?.schema_id === "npc") return "characters";
  if (card?.schema_id === "location") return "locations";
  return "atlas";
}

function readPinnedCardIds(preferences: Record<string, unknown> | undefined) {
  const value = preferences?.pinned_card_ids;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
}

function coreCardTypeTemplates(): CardSchema[] {
  return [
    characterSchemaTemplate(),
    npcSchemaTemplate(),
    creatureSchemaTemplate(),
    locationSchemaTemplate(),
    schemaTemplate("organization", "Organization", "Factions, guilds, orders, governments and social powers.", [
      fieldTemplate("type", "Type"),
      fieldTemplate("agenda", "Agenda", "long_text"),
      fieldTemplate("members", "Members", "long_text"),
    ]),
    schemaTemplate("deity", "Deity", "Gods, patrons, saints, spirits and mythic powers.", [
      fieldTemplate("domain", "Domain"),
      fieldTemplate("symbol", "Symbol"),
      fieldTemplate("followers", "Followers", "long_text"),
      fieldTemplate("rites", "Rites", "long_text"),
    ]),
    schemaTemplate("item", "Item", "Artifacts, equipment, resources and meaningful possessions.", [
      fieldTemplate("item_type", "Item type"),
      fieldTemplate("owner", "Owner"),
      fieldTemplate("properties", "Properties", "long_text"),
    ]),
    wikiLoreSchemaTemplate(),
    schemaTemplate("magic", "Magic", "Spells, rituals, supernatural systems and magical rules.", [
      fieldTemplate("tradition", "Tradition"),
      fieldTemplate("effect", "Effect", "long_text"),
      fieldTemplate("cost", "Cost"),
    ]),
    schemaTemplate("note", "Note", "Loose notes, session thoughts and temporary prep material.", [
      fieldTemplate("context", "Context"),
      fieldTemplate("status", "Status"),
      fieldTemplate("body", "Body", "long_text"),
    ]),
  ];
}

function characterSchemaTemplate() {
  return schemaTemplate("character", "Character", "Player characters, protagonists and important people.", [
    fieldTemplate("role", "Role", "text", true),
    fieldTemplate("group", "Group", "text", true),
    fieldTemplate("motivation", "Motivation", "long_text"),
    fieldTemplate("relationships", "Relationships", "long_text"),
  ]);
}

function npcSchemaTemplate() {
  return schemaTemplate("npc", "NPC", "Non-player characters, patrons, rivals and allies.", [
    fieldTemplate("affiliation", "Affiliation"),
    fieldTemplate("role", "Role", "text", true),
    fieldTemplate("location", "Location"),
  ]);
}

function creatureSchemaTemplate() {
  return schemaTemplate("creature", "Creature", "Creatures, monsters, species and encounter-ready beings.", [
    fieldTemplate("habitat", "Habitat"),
    fieldTemplate("threat", "Threat"),
    fieldTemplate("traits", "Traits", "long_text"),
  ]);
}

function locationSchemaTemplate() {
  return schemaTemplate("location", "Location", "Regions, settlements, landmarks, rooms and map-ready places.", [
    fieldTemplate("region", "Region", "text", true),
    fieldTemplate("climate", "Climate", "text", true),
    fieldTemplate("danger", "Danger", "number", true),
  ]);
}

function wikiLoreSchemaTemplate() {
  return schemaTemplate("lore", "Lore", "General world facts, myths, history and encyclopedic notes.", [
    fieldTemplate("topic", "Topic"),
    fieldTemplate("source", "Source"),
    fieldTemplate("details", "Details", "long_text"),
  ]);
}

function schemaTemplate(id: string, label: string, description: string, fields: CardSchema["fields"]): CardSchema {
  const now = new Date().toISOString();
  return {
    id,
    label,
    description,
    icon: "✦",
    field_order: fields.map((field) => field.field_id),
    layout_json: {},
    is_active: true,
    fields: fields.map((field, index) => ({ ...field, sort_order: index })),
    created_at: now,
    updated_at: now,
  };
}

function fieldTemplate(fieldId: string, label: string, kind = "text", showInFilters = false): CardSchema["fields"][number] {
  return {
    field_id: fieldId,
    label,
    kind,
    description: "",
    required: false,
    repeatable: false,
    default_value: "",
    options: [],
    placeholder: "",
    show_in_card: true,
    show_in_list: kind !== "long_text",
    show_in_filters: showInFilters,
    validation: {},
    sort_order: 0,
    is_active: true,
  };
}

async function ensureCardType(workspaceSlug: string, schemas: CardSchema[], template: CardSchema) {
  if (schemas.some((schema) => schema.id === template.id)) {
    return;
  }
  await api.putSchema(workspaceSlug, template);
}

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "entity";
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markdownToDoc(markdown: string): Record<string, unknown> {
  const content = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        return {
          type: "heading",
          attrs: { level: heading[1].length },
          content: [{ type: "text", text: heading[2] }],
        };
      }
      return paragraphNode(block.replace(/\n/g, " "));
    });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function appendTextToDoc(bodyJson: Record<string, unknown>, text: string): Record<string, unknown> {
  const existingContent = Array.isArray(bodyJson.content) ? bodyJson.content : [];
  const appended = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraphNode(block.replace(/\n/g, " ")));
  return {
    ...bodyJson,
    type: "doc",
    content: [...existingContent, ...appended],
  };
}

function paragraphNode(text: string) {
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : undefined,
  };
}

function appendPlainTextNotebookItem(notebook: WorkspaceNotebook | null, text: string): WorkspaceNotebook {
  const now = new Date().toISOString();
  const items = notebook?.items ?? [];
  const nextItems = [
    ...items,
    {
      id: `quick-${crypto.randomUUID().slice(0, 8)}`,
      type: "plain_text",
      title: `Quick note ${formatShortTimestamp(now)}`,
      sort_order: items.length,
      text,
      body_text: text,
    },
  ];
  const bodyText = [notebook?.body_text ?? "", text].filter((value) => value.trim()).join("\n\n");
  return {
    body_json: notebook?.body_json ?? { type: "doc", content: [{ type: "paragraph" }] },
    body_text: bodyText,
    items: nextItems,
  };
}

function formatShortTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

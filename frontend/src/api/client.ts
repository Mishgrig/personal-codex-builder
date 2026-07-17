import type {
  ActionStatus,
  AppInfo,
  Board,
  BoardCreatePayload,
  BoardItemCreatePayload,
  BoardItemUpdatePayload,
  BoardList,
  BoardUpdatePayload,
  CardCreatePayload,
  CardDetail,
  CardSchema,
  CharacterGraph,
  CharacterGroup,
  CardTypeDefinition,
  CardTypeImportPreview,
  CardTypeImportResult,
  CardTypeStructureExport,
  CardTypeTableExport,
  CardTypeTable,
  CardSource,
  CardUpdatePayload,
  Chapter,
  ChapterCreatePayload,
  ChapterList,
  ChapterUpdatePayload,
  DiceShortcutCreatePayload,
  DiceShortcutUpdatePayload,
  PlotEvent,
  PlotEventCreatePayload,
  PlotEventList,
  PlotEventUpdatePayload,
  ReferenceCreatePayload,
  SearchFilters,
  SearchResult,
  SceneCreatePayload,
  SceneTokenCreatePayload,
  SceneTokenUpdatePayload,
  SceneUpdatePayload,
  TaxonomyTerm,
  WorkspaceAssetLibrary,
  WorkspaceBackup,
  WorkspaceCreatePayload,
  WorkspaceAssetHealth,
  WorkspaceAsset,
  WorkspaceExport,
  WorkspaceDataExport,
  WorkspaceHealth,
  WorkspaceNotebook,
  WorkspacePortability,
  WorkspaceRestoreResult,
  WorkspaceRepairResult,
  WorkspaceSummary,
  WorkspaceShareMode,
  WorkspaceShareRegistry,
  WorkspaceShareResult,
} from "../types/models";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

interface RequestOptions {
  method?: string;
  body?: BodyInit | null;
  json?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.detail ?? "Request failed.");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return normalizeMediaUrls(payload?.data ?? payload) as T;
}

function normalizeMediaUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return value.startsWith("/media/") ? `${API_ORIGIN}${value}` : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaUrls(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeMediaUrls(item)]),
    );
  }
  return value;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  appInfo: () => request<AppInfo>("/app-info"),
  listWorkspaces: (includeArchived = true) =>
    request<WorkspaceSummary[]>(`/workspaces?include_archived=${includeArchived ? "true" : "false"}`),
  getWorkspace: (workspaceSlug: string) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}`),
  openWorkspace: (workspaceSlug: string) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}/open`, { method: "POST" }),
  createWorkspace: (payload: WorkspaceCreatePayload) =>
    request<WorkspaceSummary>("/workspaces", { method: "POST", json: payload }),
  reorderWorkspaces: (orderedSlugs: string[]) =>
    request<ActionStatus>("/workspaces/reorder", {
      method: "POST",
      json: { ordered_slugs: orderedSlugs },
    }),
  importWorkspace: (file: File, name?: string) => {
    const form = new FormData();
    form.append("upload", file);
    if (name) {
      form.append("name", name);
    }
    return request<WorkspaceSummary>("/workspaces/import", {
      method: "POST",
      body: form,
    });
  },
  copyWorkspace: (workspaceSlug: string, name: string) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}/copy`, {
      method: "POST",
      json: { name },
    }),
  deleteWorkspace: (workspaceSlug: string) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}`, { method: "DELETE" }),
  updateWorkspace: (
    workspaceSlug: string,
    payload: Partial<WorkspaceCreatePayload> & { taxonomy_labels?: Record<string, string>; ui_preferences?: Record<string, unknown> },
  ) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}`, {
      method: "PATCH",
      json: payload,
    }),
  uploadWorkspaceLogo: (workspaceSlug: string, file: File) => {
    const form = new FormData();
    form.append("upload", file);
    return request<WorkspaceSummary>(`/workspaces/${workspaceSlug}/logo`, {
      method: "POST",
      body: form,
    });
  },
  archiveWorkspace: (workspaceSlug: string) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}/archive`, { method: "POST" }),
  unarchiveWorkspace: (workspaceSlug: string) =>
    request<WorkspaceSummary>(`/workspaces/${workspaceSlug}/unarchive`, { method: "POST" }),
  listBackups: (workspaceSlug: string) =>
    request<WorkspaceBackup[]>(`/workspaces/${workspaceSlug}/backups`),
  createBackup: (workspaceSlug: string, reason = "manual") =>
    request<WorkspaceBackup>(`/workspaces/${workspaceSlug}/backup`, {
      method: "POST",
      json: { reason },
    }),
  deleteBackup: (workspaceSlug: string, filename: string) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/backups/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    }),
  restoreBackup: (workspaceSlug: string, filename: string) =>
    request<WorkspaceRestoreResult>(`/workspaces/${workspaceSlug}/restore`, {
      method: "POST",
      json: { filename },
    }),
  exportWorkspace: (workspaceSlug: string) =>
    request<WorkspaceExport>(`/workspaces/${workspaceSlug}/export`, {
      method: "POST",
    }),
  getWorkspaceSharing: (workspaceSlug: string) =>
    request<WorkspaceShareRegistry>(`/workspaces/${workspaceSlug}/sharing`),
  shareWorkspaceEntity: (
    workspaceSlug: string,
    payload: {
      target_workspace_slug: string;
      entity_type: "card";
      entity_id: number;
      mode: WorkspaceShareMode;
    },
  ) =>
    request<WorkspaceShareResult>(`/workspaces/${workspaceSlug}/sharing`, {
      method: "POST",
      json: payload,
    }),
  exportWorkspaceData: (
    workspaceSlug: string,
    format: "json" | "csv" = "json",
    includeAssetIds = false,
    cardIds: number[] = [],
  ) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (includeAssetIds) params.set("include_asset_ids", "true");
    if (cardIds.length) params.set("card_ids", cardIds.join(","));
    return request<WorkspaceDataExport>(`/workspaces/${workspaceSlug}/data-export?${params.toString()}`);
  },
  getWorkspaceHealth: (workspaceSlug: string) =>
    request<WorkspaceHealth>(`/workspaces/${workspaceSlug}/health`),
  getWorkspacePortability: (workspaceSlug: string) =>
    request<WorkspacePortability>(`/workspaces/${workspaceSlug}/portability`),
  repairWorkspaceHealth: (workspaceSlug: string, action: string) =>
    request<WorkspaceRepairResult>(`/workspaces/${workspaceSlug}/health/repair`, {
      method: "POST",
      json: { action },
    }),
  getWorkspaceAssetHealth: (workspaceSlug: string) =>
    request<WorkspaceAssetHealth>(`/workspaces/${workspaceSlug}/asset-health`),
  repairWorkspaceAssetHealth: (workspaceSlug: string, action: string) =>
    request<WorkspaceRepairResult>(`/workspaces/${workspaceSlug}/asset-health/repair`, {
      method: "POST",
      json: { action },
    }),
  listWorkspaceAssets: (workspaceSlug: string, q = "", assetType?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (assetType) params.set("asset_type", assetType);
    const query = params.toString();
    return request<WorkspaceAssetLibrary>(`/workspaces/${workspaceSlug}/assets${query ? `?${query}` : ""}`);
  },
  uploadWorkspaceAsset: (workspaceSlug: string, file: File) => {
    const form = new FormData();
    form.append("upload", file);
    return request<WorkspaceAsset>(`/workspaces/${workspaceSlug}/assets/upload`, {
      method: "POST",
      body: form,
    });
  },
  attachWorkspaceAsset: (
    workspaceSlug: string,
    assetId: string,
    payload: { card_id: number; role: "gallery" | "attachment"; set_as_cover?: boolean },
  ) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/assets/${assetId}/attach`, {
      method: "POST",
      json: payload,
    }),
  deleteWorkspaceAsset: (workspaceSlug: string, assetId: string) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/assets/${assetId}`, { method: "DELETE" }),
  getWorkspaceNotebook: (workspaceSlug: string) =>
    request<WorkspaceNotebook>(`/workspaces/${workspaceSlug}/notebook`),
  updateWorkspaceNotebook: (workspaceSlug: string, payload: WorkspaceNotebook) =>
    request<WorkspaceNotebook>(`/workspaces/${workspaceSlug}/notebook`, {
      method: "PATCH",
      json: payload,
    }),
  listTaxonomy: (workspaceSlug: string) =>
    request<TaxonomyTerm[]>(`/workspaces/${workspaceSlug}/taxonomy`),
  createTaxonomyTerm: (workspaceSlug: string, payload: Partial<TaxonomyTerm> & { category: string; slug: string; label: string }) =>
    request<TaxonomyTerm>(`/workspaces/${workspaceSlug}/taxonomy`, { method: "POST", json: payload }),
  updateTaxonomyTerm: (workspaceSlug: string, termId: number, payload: Partial<TaxonomyTerm>) =>
    request<TaxonomyTerm>(`/workspaces/${workspaceSlug}/taxonomy/${termId}`, { method: "PATCH", json: payload }),
  deleteTaxonomyTerm: (workspaceSlug: string, termId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/taxonomy/${termId}`, { method: "DELETE" }),
  listSchemas: (workspaceSlug: string) =>
    request<CardSchema[]>(`/workspaces/${workspaceSlug}/schemas`),
  putSchema: (workspaceSlug: string, schema: CardSchema) =>
    request<CardSchema>(`/workspaces/${workspaceSlug}/schemas/${schema.id}`, { method: "PUT", json: schema }),
  listCardTypes: (workspaceSlug: string) =>
    request<CardTypeDefinition[]>(`/workspaces/${workspaceSlug}/card-types`),
  getCardTypeTable: (
    workspaceSlug: string,
    cardTypeSlug: string,
    q = "",
    sortBy = "manual",
    sortDir: "asc" | "desc" = "asc",
    status = "",
  ) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sortBy) params.set("sort_by", sortBy);
    if (sortDir) params.set("sort_dir", sortDir);
    if (status) params.set("status", status);
    const query = params.toString();
    return request<CardTypeTable>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/table${query ? `?${query}` : ""}`,
    );
  },
  createCardTypeRow: (
    workspaceSlug: string,
    cardTypeSlug: string,
    payload: { title: string; summary: string; status: string; values: Record<string, unknown> },
  ) =>
    request<CardTypeTable>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/rows`,
      { method: "POST", json: payload },
    ),
  updateCardTypeRow: (
    workspaceSlug: string,
    cardTypeSlug: string,
    cardId: number,
    payload: { title: string; summary: string; status: string; values: Record<string, unknown> },
  ) =>
    request<CardTypeTable>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/rows/${cardId}`,
      { method: "PATCH", json: payload },
    ),
  deleteCardTypeRow: (workspaceSlug: string, cardTypeSlug: string, cardId: number) =>
    request<{ card_id: number; deleted: boolean }>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/rows/${cardId}`,
      { method: "DELETE" },
    ),
  exportCardTypeStructure: (workspaceSlug: string, cardTypeSlug: string, format: "json" | "csv" | "xlsx" = "json") =>
    request<CardTypeStructureExport>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/structure-export?format=${format}`,
    ),
  exportCardTypeTable: (workspaceSlug: string, cardTypeSlug: string, format: "json" | "csv" | "xlsx" = "json", q = "") =>
    request<CardTypeTableExport>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/table-export?format=${format}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  previewCardTypeImport: (
    workspaceSlug: string,
    cardTypeSlug: string,
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64 = "",
    filename = "",
  ) =>
    request<CardTypeImportPreview>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/import-preview`,
      { method: "POST", json: { format, content_text: contentText, content_base64: contentBase64, filename } },
    ),
  applyCardTypeImport: (
    workspaceSlug: string,
    cardTypeSlug: string,
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64 = "",
    filename = "",
  ) =>
    request<CardTypeImportResult>(
      `/workspaces/${workspaceSlug}/card-types/${encodeURIComponent(cardTypeSlug)}/import-apply`,
      { method: "POST", json: { format, content_text: contentText, content_base64: contentBase64, filename } },
    ),
  searchCards: (workspaceSlug: string, filters: SearchFilters, q: string, sort: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.domain) params.set("domain", String(filters.domain));
    if (filters.type) params.set("type", String(filters.type));
    if (filters.subtype) params.set("subtype", String(filters.subtype));
    if (filters.layer) params.set("layer", String(filters.layer));
    params.set("sort", sort);
    return request<SearchResult>(`/workspaces/${workspaceSlug}/cards?${params.toString()}`);
  },
  listPlotEvents: (workspaceSlug: string, status = "", q = "") => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const query = params.toString();
    return request<PlotEventList>(`/workspaces/${workspaceSlug}/plot-events${query ? `?${query}` : ""}`);
  },
  createPlotEvent: (workspaceSlug: string, payload: PlotEventCreatePayload) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events`, { method: "POST", json: payload }),
  updatePlotEvent: (workspaceSlug: string, eventId: number, payload: PlotEventUpdatePayload) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/${eventId}`, { method: "PATCH", json: payload }),
  deletePlotEvent: (workspaceSlug: string, eventId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/plot-events/${eventId}`, { method: "DELETE" }),
  addPlotEventCardLink: (workspaceSlug: string, eventId: number, payload: { card_id: number; role?: string }) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/${eventId}/card-links`, {
      method: "POST",
      json: payload,
    }),
  deletePlotEventCardLink: (workspaceSlug: string, linkId: number) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/card-links/${linkId}`, { method: "DELETE" }),
  addPlotEventLink: (
    workspaceSlug: string,
    eventId: number,
    payload: { target_event_id: number; relation_type?: string; note?: string },
  ) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/${eventId}/event-links`, {
      method: "POST",
      json: payload,
    }),
  deletePlotEventLink: (workspaceSlug: string, linkId: number) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/event-links/${linkId}`, { method: "DELETE" }),
  updatePlotEventLayout: (
    workspaceSlug: string,
    eventId: number,
    payload: { view_id?: string; x: number; y: number; width: number; height: number },
  ) =>
    request<PlotEvent>(`/workspaces/${workspaceSlug}/plot-events/${eventId}/layout`, {
      method: "PATCH",
      json: payload,
    }),
  listChapters: (workspaceSlug: string) =>
    request<ChapterList>(`/workspaces/${workspaceSlug}/chapters`),
  createChapter: (workspaceSlug: string, payload: ChapterCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters`, { method: "POST", json: payload }),
  updateChapter: (workspaceSlug: string, chapterId: number, payload: ChapterUpdatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/${chapterId}`, { method: "PATCH", json: payload }),
  deleteChapter: (workspaceSlug: string, chapterId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/chapters/${chapterId}`, { method: "DELETE" }),
  addChapterReference: (workspaceSlug: string, chapterId: number, payload: ReferenceCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/${chapterId}/references`, { method: "POST", json: payload }),
  deleteChapterReference: (workspaceSlug: string, referenceId: number) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/references/${referenceId}`, { method: "DELETE" }),
  createScene: (workspaceSlug: string, chapterId: number, payload: SceneCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/${chapterId}/scenes`, { method: "POST", json: payload }),
  updateScene: (workspaceSlug: string, sceneId: number, payload: SceneUpdatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/${sceneId}`, { method: "PATCH", json: payload }),
  deleteScene: (workspaceSlug: string, sceneId: number) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/${sceneId}`, { method: "DELETE" }),
  addSceneReference: (workspaceSlug: string, sceneId: number, payload: ReferenceCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/${sceneId}/references`, { method: "POST", json: payload }),
  deleteSceneReference: (workspaceSlug: string, referenceId: number) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/references/${referenceId}`, { method: "DELETE" }),
  createSceneToken: (workspaceSlug: string, sceneId: number, payload: SceneTokenCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/${sceneId}/tokens`, { method: "POST", json: payload }),
  updateSceneToken: (workspaceSlug: string, tokenId: number, payload: SceneTokenUpdatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/tokens/${tokenId}`, { method: "PATCH", json: payload }),
  deleteSceneToken: (workspaceSlug: string, tokenId: number) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/tokens/${tokenId}`, { method: "DELETE" }),
  createChapterDiceShortcut: (workspaceSlug: string, chapterId: number, payload: DiceShortcutCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/${chapterId}/dice-shortcuts`, { method: "POST", json: payload }),
  createSceneDiceShortcut: (workspaceSlug: string, sceneId: number, payload: DiceShortcutCreatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/scenes/${sceneId}/dice-shortcuts`, { method: "POST", json: payload }),
  updateDiceShortcut: (workspaceSlug: string, shortcutId: number, payload: DiceShortcutUpdatePayload) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/dice-shortcuts/${shortcutId}`, { method: "PATCH", json: payload }),
  deleteDiceShortcut: (workspaceSlug: string, shortcutId: number) =>
    request<Chapter>(`/workspaces/${workspaceSlug}/chapters/dice-shortcuts/${shortcutId}`, { method: "DELETE" }),
  listBoards: (workspaceSlug: string) =>
    request<BoardList>(`/workspaces/${workspaceSlug}/boards`),
  createBoard: (workspaceSlug: string, payload: BoardCreatePayload) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards`, { method: "POST", json: payload }),
  updateBoard: (workspaceSlug: string, boardId: number, payload: BoardUpdatePayload) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/${boardId}`, { method: "PATCH", json: payload }),
  deleteBoard: (workspaceSlug: string, boardId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/boards/${boardId}`, { method: "DELETE" }),
  createBoardItem: (workspaceSlug: string, boardId: number, payload: BoardItemCreatePayload) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/${boardId}/items`, { method: "POST", json: payload }),
  updateBoardItem: (workspaceSlug: string, itemId: number, payload: BoardItemUpdatePayload) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/items/${itemId}`, { method: "PATCH", json: payload }),
  deleteBoardItem: (workspaceSlug: string, itemId: number) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/items/${itemId}`, { method: "DELETE" }),
  createBoardEdge: (
    workspaceSlug: string,
    boardId: number,
    payload: { source_item_id: number; target_item_id: number; relation_type?: string; label?: string },
  ) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/${boardId}/edges`, { method: "POST", json: payload }),
  updateBoardEdge: (
    workspaceSlug: string,
    edgeId: number,
    payload: { relation_type?: string; label?: string },
  ) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/edges/${edgeId}`, { method: "PATCH", json: payload }),
  deleteBoardEdge: (workspaceSlug: string, edgeId: number) =>
    request<Board>(`/workspaces/${workspaceSlug}/boards/edges/${edgeId}`, { method: "DELETE" }),
  listCharacterGroups: (workspaceSlug: string) =>
    request<CharacterGroup[]>(`/workspaces/${workspaceSlug}/characters/groups`),
  createCharacterGroup: (
    workspaceSlug: string,
    payload: { name: string; slug: string; color?: string; description?: string },
  ) =>
    request<CharacterGroup>(`/workspaces/${workspaceSlug}/characters/groups`, { method: "POST", json: payload }),
  updateCharacterGroup: (
    workspaceSlug: string,
    groupId: number,
    payload: Partial<{ name: string; slug: string; color: string; description: string; sort_order: number }>,
  ) =>
    request<CharacterGroup>(`/workspaces/${workspaceSlug}/characters/groups/${groupId}`, { method: "PATCH", json: payload }),
  deleteCharacterGroup: (workspaceSlug: string, groupId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/characters/groups/${groupId}`, { method: "DELETE" }),
  getCharacterGraph: (workspaceSlug: string, graphId = "default") =>
    request<CharacterGraph>(`/workspaces/${workspaceSlug}/characters/graph?graph_id=${encodeURIComponent(graphId)}`),
  updateCharacterGraphLayout: (
    workspaceSlug: string,
    payload: { graph_id?: string; card_id: number; x: number; y: number; width?: number; height?: number },
  ) =>
    request<CharacterGraph>(`/workspaces/${workspaceSlug}/characters/graph/layout`, { method: "PATCH", json: payload }),
  getCard: (workspaceSlug: string, cardId: number) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}`),
  createCard: (workspaceSlug: string, payload: CardCreatePayload) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards`, { method: "POST", json: payload }),
  updateCard: (workspaceSlug: string, cardId: number, payload: CardUpdatePayload) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}`, { method: "PATCH", json: payload }),
  deleteCard: (workspaceSlug: string, cardId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/cards/${cardId}`, { method: "DELETE" }),
  reorderCards: (workspaceSlug: string, orderedIds: number[]) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/cards/reorder`, {
      method: "POST",
      json: { ordered_ids: orderedIds },
    }),
  addSource: (workspaceSlug: string, cardId: number, payload: Omit<CardSource, "id" | "assets" | "created_at" | "updated_at">) =>
    request<CardSource>(`/workspaces/${workspaceSlug}/cards/${cardId}/sources`, {
      method: "POST",
      json: payload,
    }),
  updateSource: (workspaceSlug: string, sourceId: number, payload: Omit<CardSource, "id" | "assets" | "created_at" | "updated_at">) =>
    request<CardSource>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}`, {
      method: "PUT",
      json: payload,
    }),
  deleteSource: (workspaceSlug: string, sourceId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}`, { method: "DELETE" }),
  uploadSourceAsset: (workspaceSlug: string, sourceId: number, file: File) => {
    const form = new FormData();
    form.append("upload", file);
    return request<CardDetail>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}/assets`, {
      method: "POST",
      body: form,
    });
  },
  attachExistingSourceAsset: (workspaceSlug: string, sourceId: number, assetId: string) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}/assets/${assetId}`, {
      method: "POST",
    }),
  deleteSourceAsset: (workspaceSlug: string, sourceId: number, assetId: string) =>
    request<CardDetail>(
      `/workspaces/${workspaceSlug}/cards/sources/assets/${assetId}?source_id=${sourceId}`,
      { method: "DELETE" },
    ),
  addRelation: (
    workspaceSlug: string,
    cardId: number,
    targetCardId: number,
    relationType = "one-to-one",
    note = "",
  ) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}/relations`, {
      method: "POST",
      json: { target_card_id: targetCardId, relation_type: relationType, note },
    }),
  deleteRelation: (workspaceSlug: string, relationId: number, cardId: number) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/relations/${relationId}?card_id=${cardId}`, {
      method: "DELETE",
    }),
  uploadAsset: (workspaceSlug: string, cardId: number, kind: "gallery" | "attachment", file: File) => {
    const form = new FormData();
    form.append("upload", file);
    return request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}/assets/${kind}`, {
      method: "POST",
      body: form,
    });
  },
  deleteAsset: (workspaceSlug: string, assetId: number | string, cardId: number) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/assets/${assetId}?card_id=${cardId}`, {
      method: "DELETE",
    }),
  reorderGallery: (workspaceSlug: string, cardId: number, orderedIds: Array<number | string>) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}/gallery/reorder`, {
      method: "POST",
      json: { ordered_ids: orderedIds },
    }),
};

import type {
  ActionStatus,
  AppInfo,
  CardCreatePayload,
  CardDetail,
  CardSchema,
  CardSource,
  CardUpdatePayload,
  SearchFilters,
  SearchResult,
  TaxonomyTerm,
  WorkspaceBackup,
  WorkspaceCreatePayload,
  WorkspaceExport,
  WorkspaceHealth,
  WorkspaceRestoreResult,
  WorkspaceSummary,
} from "../types/models";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

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
  return (payload?.data ?? payload) as T;
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
    payload: Partial<WorkspaceCreatePayload> & { taxonomy_labels?: Record<string, string> },
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
  getWorkspaceHealth: (workspaceSlug: string) =>
    request<WorkspaceHealth>(`/workspaces/${workspaceSlug}/health`),
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
  addSource: (workspaceSlug: string, cardId: number, payload: Omit<CardSource, "id" | "created_at" | "updated_at">) =>
    request<CardSource>(`/workspaces/${workspaceSlug}/cards/${cardId}/sources`, {
      method: "POST",
      json: payload,
    }),
  updateSource: (workspaceSlug: string, sourceId: number, payload: Omit<CardSource, "id" | "created_at" | "updated_at">) =>
    request<CardSource>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}`, {
      method: "PUT",
      json: payload,
    }),
  deleteSource: (workspaceSlug: string, sourceId: number) =>
    request<ActionStatus>(`/workspaces/${workspaceSlug}/cards/sources/${sourceId}`, { method: "DELETE" }),
  addRelation: (workspaceSlug: string, cardId: number, targetCardId: number, note = "") =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}/relations`, {
      method: "POST",
      json: { target_card_id: targetCardId, note },
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
  deleteAsset: (workspaceSlug: string, assetId: number, cardId: number) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/assets/${assetId}?card_id=${cardId}`, {
      method: "DELETE",
    }),
  reorderGallery: (workspaceSlug: string, cardId: number, orderedIds: number[]) =>
    request<CardDetail>(`/workspaces/${workspaceSlug}/cards/${cardId}/gallery/reorder`, {
      method: "POST",
      json: { ordered_ids: orderedIds },
    }),
};

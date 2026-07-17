import type { CardListItem, WorkspaceAssetHealth } from "../../types/models";

export type DashboardWidgetId =
  | "recent_activity"
  | "quick_note"
  | "chapters"
  | "pinned_cards"
  | "tasks"
  | "asset_reminders"
  | "knowledge_summary"
  | "workspace_settings";

export type DashboardWidgetSize = "compact" | "normal" | "wide";

export interface DashboardWidgetLayout {
  id: DashboardWidgetId;
  enabled: boolean;
  order: number;
  size: DashboardWidgetSize;
}

export interface DashboardTask {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  note: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_WIDGET_LAYOUT: DashboardWidgetLayout[] = [
  { id: "quick_note", enabled: true, order: 10, size: "wide" },
  { id: "tasks", enabled: true, order: 20, size: "normal" },
  { id: "chapters", enabled: true, order: 30, size: "normal" },
  { id: "pinned_cards", enabled: true, order: 40, size: "normal" },
  { id: "recent_activity", enabled: true, order: 50, size: "normal" },
  { id: "asset_reminders", enabled: true, order: 60, size: "compact" },
  { id: "knowledge_summary", enabled: true, order: 70, size: "compact" },
  { id: "workspace_settings", enabled: true, order: 80, size: "compact" },
];

export function normalizeWidgetLayout(value: unknown): DashboardWidgetLayout[] {
  const existing = Array.isArray(value) ? value : [];
  const byId = new Map(
    existing
      .filter((item): item is Partial<DashboardWidgetLayout> & { id: DashboardWidgetId } => Boolean(item && typeof item === "object" && "id" in item))
      .map((item) => [item.id, item]),
  );
  return DEFAULT_WIDGET_LAYOUT.map((fallback) => {
    const stored = byId.get(fallback.id);
    const size = stored?.size === "compact" || stored?.size === "normal" || stored?.size === "wide" ? stored.size : fallback.size;
    return {
      ...fallback,
      enabled: typeof stored?.enabled === "boolean" ? stored.enabled : fallback.enabled,
      order: typeof stored?.order === "number" ? stored.order : fallback.order,
      size,
    };
  }).sort((left, right) => left.order - right.order);
}

export function normalizeDashboardTasks(value: unknown): DashboardTask[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Partial<DashboardTask> => Boolean(item && typeof item === "object"))
    .map((item, index) => {
      const now = new Date().toISOString();
      const status = item.status === "doing" || item.status === "done" ? item.status : "todo";
      return {
        id: item.id || `task-${index}`,
        title: item.title || "Untitled task",
        status,
        note: item.note || "",
        created_at: item.created_at || now,
        updated_at: item.updated_at || now,
      };
    });
}

export function assetReminderItems(assetHealth: WorkspaceAssetHealth | null) {
  if (!assetHealth) {
    return [];
  }
  return [
    { label: "Missing asset files", count: assetHealth.missing_asset_files.length },
    { label: "Orphaned files", count: assetHealth.orphaned_files.length },
    { label: "Duplicate checksums", count: assetHealth.duplicate_checksums.length },
    { label: "Unused assets", count: assetHealth.unused_assets.length },
    { label: "Broken cover links", count: assetHealth.broken_cover_asset_ids.length },
    { label: "Broken gallery links", count: assetHealth.broken_gallery_links.length },
    { label: "Broken attachment links", count: assetHealth.broken_attachment_links.length },
    { label: "Broken source links", count: assetHealth.broken_source_links.length },
  ].filter((item) => item.count > 0);
}

export function widgetLabel(widgetId: DashboardWidgetId) {
  return widgetId
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function textareaRows(value: string) {
  const lineCount = value ? value.split(/\r?\n/).length : 1;
  return Math.min(5, Math.max(1, lineCount));
}

export function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
}

export function roomLabelForCard(card: CardListItem) {
  if (card.schema_id === "character" || card.schema_id === "npc") return "Character";
  if (card.schema_id === "location") return "Location";
  return "Wiki";
}

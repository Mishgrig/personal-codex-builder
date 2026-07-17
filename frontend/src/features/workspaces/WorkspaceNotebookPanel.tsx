import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Image as ImageIcon,
  MapPin,
  NotebookPen,
  Plus,
  Save,
  Sparkles,
  Swords,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  WorkspaceAsset,
  WorkspaceNotebook,
  WorkspaceNotebookItem,
  WorkspaceNotebookItemType,
} from "../../types/models";
import { RichTextEditor } from "../editor/RichTextEditor";
import { extractPlainText } from "../../utils/richText";

interface WorkspaceNotebookPanelProps {
  notebook: WorkspaceNotebook | null;
  visible: boolean;
  onToggleVisible: () => void;
  onSave: (payload: WorkspaceNotebook) => Promise<void>;
  onUploadAsset: (file: File) => Promise<WorkspaceAsset>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  assets: WorkspaceAsset[];
  currentCardTitle?: string | null;
  onAppendToCurrentCard?: (text: string) => Promise<void>;
  recentCustomColors?: string[];
  onRememberCustomColor?: (color: string) => void;
}

const ITEM_TYPES: Array<{ type: WorkspaceNotebookItemType; label: string }> = [
  { type: "rich_text", label: "Rich text" },
  { type: "plain_text", label: "Plain text" },
  { type: "table", label: "Table" },
  { type: "link", label: "Link" },
  { type: "image", label: "Image asset" },
  { type: "file", label: "File asset" },
  { type: "asset_reference", label: "Asset reference" },
  { type: "card_reference", label: "Card reference" },
];

const NOTE_ICONS = [
  { id: "note", label: "Note", icon: NotebookPen },
  { id: "book", label: "Book", icon: BookOpen },
  { id: "spark", label: "Spark", icon: Sparkles },
  { id: "map", label: "Map", icon: MapPin },
  { id: "quest", label: "Quest", icon: Flag },
  { id: "combat", label: "Combat", icon: Swords },
  { id: "text", label: "Text", icon: Type },
] as const;

export function WorkspaceNotebookPanel({
  notebook,
  visible,
  onToggleVisible,
  onSave,
  onUploadAsset,
  onDeleteAsset,
  assets,
  recentCustomColors = [],
  onRememberCustomColor,
}: WorkspaceNotebookPanelProps) {
  const [draft, setDraft] = useState<WorkspaceNotebook | null>(normalizeNotebook(notebook));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const lastSavedNotebookRef = useRef<string>("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const normalized = normalizeNotebook(notebook);
    setDraft(normalized);
    setSelectedItemId(normalized?.items[0]?.id ?? null);
    lastSavedNotebookRef.current = normalized ? JSON.stringify(normalizeNotebookDraft(normalized)) : "";
  }, [notebook]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const normalized = normalizeNotebookDraft(draft);
    const serialized = JSON.stringify(normalized);
    if (serialized === lastSavedNotebookRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      void onSave(normalized).then(() => {
        lastSavedNotebookRef.current = serialized;
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, onSave]);

  const selectedItem = useMemo(
    () => draft?.items.find((item) => item.id === selectedItemId) ?? draft?.items[0] ?? null,
    [draft, selectedItemId],
  );

  if (!visible) {
    return (
      <button className="notebook-reveal" title="Show notebook" onClick={onToggleVisible}>
        <ChevronRight size={16} />
        Notebook
      </button>
    );
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    const normalized = normalizeNotebookDraft(draft);
    await onSave(normalized);
  }

  function createQuickNote() {
    const item = makeNotebookItem("rich_text", draft?.items.length ?? 0);
    setDraft((current) =>
      normalizeNotebookDraft({
        body_json: current?.body_json ?? emptyDoc(),
        body_text: current?.body_text ?? "",
        items: [...(current?.items ?? []), item],
      }),
    );
    setSelectedItemId(item.id);
  }

  function updateItem(itemId: string, patch: Partial<WorkspaceNotebookItem>) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      };
    });
  }

  function reorderItems(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) {
      return;
    }
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const oldIndex = current.items.findIndex((item) => item.id === activeId);
      const newIndex = current.items.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }
      return normalizeNotebookDraft({ ...current, items: arrayMove(current.items, oldIndex, newIndex) });
    });
  }

  function deleteItem(itemId: string) {
    if (!draft) {
      return;
    }
    const removedItem = draft.items.find((item) => item.id === itemId) ?? null;
    const nextItems = draft.items.filter((item) => item.id !== itemId);
    const normalized = normalizeNotebookDraft({
      ...draft,
      items: nextItems,
    });
    setDraft(normalized);
    setSelectedItemId((selected) => (selected === itemId ? normalized.items[0]?.id ?? null : selected));
    const assetIds = removedItem ? collectNotebookAssetIds(removedItem) : [];
    void onSave(normalized)
      .then(() => {
        lastSavedNotebookRef.current = JSON.stringify(normalized);
        return Promise.allSettled(assetIds.map((assetId) => onDeleteAsset(assetId)));
      })
      .catch(() => undefined);
  }

  async function removeAssetFromItem(itemId: string, assetId: string) {
    if (!draft) {
      return;
    }
    const normalized = normalizeNotebookDraft({
      ...draft,
      items: draft.items.map((item) => (item.id === itemId ? withoutNotebookAsset(item, assetId) : item)),
    });
    setDraft(normalized);
    lastSavedNotebookRef.current = JSON.stringify(normalized);
    await onSave(normalized);
    try {
      await onDeleteAsset(assetId);
    } catch {
      // If this asset is already used outside Notebook, the backend keeps it.
    }
  }

  return (
    <aside className="notebook-panel">
        <div className="pane-header">
          <div>
            <h2>Notebook</h2>
            <p>Fast notes for ideas, reminders and references</p>
          </div>
          <div className="pane-toolbar">
            <button className="icon-button" title="Hide notebook" aria-label="Hide notebook" onClick={onToggleVisible}>
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {draft ? (
          <div className="notebook-composer">
            <div className="notebook-quick-create">
              <button className="primary-button" onClick={createQuickNote}>
                <Plus size={14} />
                Add quick note
              </button>
            </div>

            <DndContext sensors={sensors} onDragEnd={reorderItems}>
              <SortableContext items={draft.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="notebook-item-list">
                  {draft.items.map((item) => (
                    <SortableNotebookItem
                      key={item.id}
                      item={item}
                      active={item.id === selectedItem?.id}
                      onSelect={() => setSelectedItemId(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {selectedItem ? (
              <NotebookItemEditor
                item={selectedItem}
                onChange={(patch) => updateItem(selectedItem.id, patch)}
                onSave={handleSave}
                onUploadAsset={onUploadAsset}
                onDeleteAsset={(assetId) => removeAssetFromItem(selectedItem.id, assetId)}
                assets={assets}
                recentCustomColors={recentCustomColors}
                onRememberCustomColor={onRememberCustomColor}
              />
            ) : (
              <button className="empty-state compact notebook-empty-action" onClick={createQuickNote}>
                <NotebookPen size={18} />
                <p>Add a quick note to start capturing ideas.</p>
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <NotebookPen size={18} />
            <p>Open a workspace to start writing.</p>
          </div>
        )}
      </aside>
  );
}

function SortableNotebookItem({
  item,
  active,
  onSelect,
  onDelete,
}: {
  item: WorkspaceNotebookItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${active ? "notebook-item-tab active" : "notebook-item-tab"} ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <button className="notebook-item-tab-main" onClick={onSelect}>
        <span className="notebook-item-tab-icon">{noteIcon(item.icon)}</span>
        <span className="notebook-item-tab-text">
          <strong>{notebookItemTitle(item)}</strong>
        </span>
      </button>
      <span className="notebook-item-tab-actions" onPointerDown={(event) => event.stopPropagation()}>
        <button
          className="icon-button danger"
          title="Delete item"
          aria-label={`Delete ${notebookItemTitle(item)}`}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      </span>
    </div>
  );
}

function NotebookItemEditor({
  item,
  onChange,
  onSave,
  onUploadAsset,
  onDeleteAsset,
  assets,
  recentCustomColors,
  onRememberCustomColor,
}: {
  item: WorkspaceNotebookItem;
  onChange: (patch: Partial<WorkspaceNotebookItem>) => void;
  onSave: () => Promise<void>;
  onUploadAsset: (file: File) => Promise<WorkspaceAsset>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  assets: WorkspaceAsset[];
  recentCustomColors: string[];
  onRememberCustomColor?: (color: string) => void;
}) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const itemAssetIds = collectNotebookAssetIds(item);
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const linkedAssets = itemAssetIds.map((assetId) => assetMap.get(assetId) ?? null);

  async function insertAssets(files: File[]) {
    if (!files.length) {
      return;
    }
    setUploadState("uploading");
    try {
      const uploadedAssets = [];
      for (const file of files) {
        uploadedAssets.push(await onUploadAsset(file));
      }
      onChange({ asset_ids: Array.from(new Set([...(item.asset_ids ?? []), ...uploadedAssets.map((asset) => asset.id)])) });
      setUploadState("uploaded");
    } catch {
      setUploadState("error");
    }
  }

  async function saveNotebook() {
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="notebook-item-editor">
      <div className="notebook-editor-header">
        <div>
          <strong>{notebookItemTitle(item)}</strong>
        </div>
        <div className="notebook-editor-tools">
          <label className="secondary-button small notebook-upload-button">
            <Upload size={14} />
            <span className="sr-only">{uploadState === "uploading" ? "Adding file" : "Add file"}</span>
            <input
              type="file"
              multiple
              hidden
              aria-label={`Add files to ${notebookItemTitle(item)}`}
              onChange={(event) => {
                void insertAssets(Array.from(event.target.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            className="icon-button notebook-save-icon"
            title="Save now"
            aria-label={`Save ${notebookItemTitle(item)}`}
            onClick={() => void saveNotebook()}
          >
            <Save size={14} />
          </button>
          <details className="notebook-icon-picker">
            <summary className="secondary-button small" title="Choose note icon">
              {noteIcon(item.icon)}
            </summary>
            <div className="notebook-icon-menu">
              {NOTE_ICONS.map((option) => (
                <NotebookIconButton
                  key={option.id}
                  active={item.icon === option.id}
                  label={option.label}
                  icon={option.icon}
                  onClick={() => onChange({ icon: option.id })}
                />
              ))}
            </div>
          </details>
        </div>
      </div>

      {itemAssetIds.length ? (
        <div className="notebook-attachment-list">
          {itemAssetIds.map((assetId, index) => {
            const asset = linkedAssets[index];
            const isImage = asset?.mime_type?.startsWith("image/");
            return (
              <div
                className="notebook-attachment"
                key={`${assetId}-${index}`}
                role={asset?.url ? "button" : undefined}
                tabIndex={asset?.url ? 0 : undefined}
                title={asset?.url ? "Open file" : undefined}
                onClick={() => {
                  if (asset?.url) {
                    window.open(asset.url, "_blank", "noopener,noreferrer");
                  }
                }}
                onKeyDown={(event) => {
                  if (!asset?.url || (event.key !== "Enter" && event.key !== " ")) {
                    return;
                  }
                  event.preventDefault();
                  window.open(asset.url, "_blank", "noopener,noreferrer");
                }}
              >
                <span className="notebook-attachment-icon">
                  {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
                </span>
                <span className="notebook-attachment-text">
                  <strong>{asset?.original_filename ?? assetId}</strong>
                  <small>{asset ? `${asset.mime_type || "file"} · ${formatBytes(asset.size_bytes)}` : "Uploaded asset"}</small>
                </span>
                <button
                  className="icon-button danger"
                  title="Delete file"
                  aria-label={`Remove ${asset?.original_filename ?? assetId} from ${notebookItemTitle(item)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteAsset(assetId);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <RichTextEditor
        className="notebook-rich-editor-shell"
        density="compact"
        toolbarMode="popover"
        value={item.body_json ?? textToDoc(notebookItemToText(item))}
        recentCustomColors={recentCustomColors}
        onRememberCustomColor={onRememberCustomColor}
        placeholder="First line becomes the note title. Drop a scene idea, task, reference note or reminder..."
        onChange={(bodyJson) =>
          onChange({
            type: "rich_text",
            body_json: bodyJson,
            icon: item.icon,
            asset_ids: item.asset_ids,
          })
        }
        onTextChange={(bodyText) =>
          onChange({
            type: "rich_text",
            title: deriveNotebookTitle(bodyText),
            body_text: bodyText,
            icon: item.icon,
            asset_ids: item.asset_ids,
          })
        }
      />

      {uploadState === "error" || saveState === "error" ? (
        <span className="inline-message error">
          {uploadState === "error" ? "Could not add file." : "Save failed."}
        </span>
      ) : null}
    </div>
  );
}

function normalizeNotebook(notebook: WorkspaceNotebook | null): WorkspaceNotebook | null {
  if (!notebook) {
    return null;
  }
  return normalizeNotebookDraft(notebook);
}

function normalizeNotebookDraft(notebook: WorkspaceNotebook): WorkspaceNotebook {
  const items = notebook.items.map((item, index) => {
    const normalized = normalizeNotebookItem(item, index);
    return {
      ...normalized,
      sort_order: index,
    };
  });
  const primaryRichText = items.find((item) => item.type === "rich_text") ?? items[0];
  const body_json = primaryRichText?.body_json ?? notebook.body_json ?? emptyDoc();
  const body_text = items.map(notebookItemToText).filter(Boolean).join("\n\n");
  return {
    items,
    body_json,
    body_text,
  };
}

function makeNotebookItem(type: WorkspaceNotebookItemType, sortOrder: number): WorkspaceNotebookItem {
  return {
    ...makeNotebookTypePatch(type),
    id: `note-${crypto.randomUUID().slice(0, 8)}`,
    type,
    title: type === "plain_text" ? "Quick note" : itemTypeLabel(type),
    sort_order: sortOrder,
  };
}

function normalizeNotebookItem(item: WorkspaceNotebookItem, index: number): WorkspaceNotebookItem {
  const text = notebookItemToText(item);
  const bodyJson = item.type === "rich_text" && item.body_json ? item.body_json : textToDoc(text);
  const bodyText = item.type === "rich_text" ? item.body_text || extractPlainText(bodyJson) : text;
  const derivedTitle = deriveNotebookTitle(bodyText);
  return {
    id: item.id || `note-${crypto.randomUUID().slice(0, 8)}`,
    type: "rich_text",
    title: derivedTitle === "Quick note" ? item.title || derivedTitle : derivedTitle,
    sort_order: index,
    body_json: bodyJson,
    body_text: bodyText,
    asset_ids: Array.from(new Set([...(item.asset_ids ?? []), item.asset_id].filter((assetId): assetId is string => Boolean(assetId)))),
    icon: item.icon,
  };
}

function makeNotebookTypePatch(
  type: WorkspaceNotebookItemType,
  previous?: Partial<WorkspaceNotebookItem>,
): WorkspaceNotebookItem {
  return {
    id: previous?.id ?? "",
    type,
    title: previous?.title ?? itemTypeLabel(type),
    sort_order: previous?.sort_order ?? 0,
    body_json: type === "rich_text" ? previous?.body_json ?? emptyDoc() : undefined,
    body_text:
      type === "rich_text"
        ? previous?.body_text ?? extractPlainText(previous?.body_json ?? emptyDoc())
        : previous?.body_text,
    text: type === "plain_text" ? previous?.text ?? "" : undefined,
    columns: type === "table" ? previous?.columns ?? ["Column 1", "Column 2"] : undefined,
    rows: type === "table" ? previous?.rows ?? [["", ""]] : undefined,
    asset_id:
      type === "image" || type === "file" || type === "asset_reference" ? previous?.asset_id ?? "" : undefined,
    href: type === "link" ? previous?.href ?? "" : undefined,
    label: type === "link" ? previous?.label ?? "" : undefined,
    card_id: type === "card_reference" ? previous?.card_id ?? null : undefined,
    note:
      type === "link" || type === "card_reference" || type === "image" || type === "file" || type === "asset_reference"
        ? previous?.note ?? ""
        : undefined,
  };
}

function emptyDoc() {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

function textToDoc(text: string) {
  const lines = text.split(/\r?\n/);
  const content = lines.length
    ? lines.map((line) => (line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }))
    : [{ type: "paragraph" }];
  return {
    type: "doc",
    content,
  };
}

function deriveNotebookTitle(text: string) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 80) : "Quick note";
}

function notebookItemTitle(item: WorkspaceNotebookItem) {
  const derived = deriveNotebookTitle(notebookItemToText(item));
  return derived === "Quick note" ? item.title || derived : derived;
}

function itemTypeLabel(type: string) {
  return ITEM_TYPES.find((item) => item.type === type)?.label ?? type.replaceAll("_", " ");
}

function NotebookIconButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button className={active ? "icon-button active" : "icon-button"} title={label} onClick={onClick}>
      <Icon size={14} />
    </button>
  );
}

function noteIcon(icon?: string | null) {
  const Icon = NOTE_ICONS.find((item) => item.id === icon)?.icon ?? NOTE_ICONS[0].icon;
  return <Icon size={14} />;
}

function collectNotebookAssetIds(item: WorkspaceNotebookItem) {
  const assetIds = new Set<string>();
  for (const assetId of item.asset_ids ?? []) {
    if (assetId) assetIds.add(String(assetId));
  }
  if (item.asset_id) {
    assetIds.add(String(item.asset_id));
  }
  for (const value of [item.text, item.body_text, item.note]) {
    if (typeof value !== "string") continue;
    for (const match of value.matchAll(/asset:([A-Za-z0-9_-]+)/g)) {
      assetIds.add(match[1]);
    }
  }
  return Array.from(assetIds);
}

function withoutNotebookAsset(item: WorkspaceNotebookItem, assetId: string): WorkspaceNotebookItem {
  const next: WorkspaceNotebookItem = {
    ...item,
    asset_ids: (item.asset_ids ?? []).filter((currentAssetId) => currentAssetId !== assetId),
  };
  if (next.asset_id === assetId) {
    next.asset_id = undefined;
  }
  next.text = removeAssetReferenceFromText(next.text, assetId);
  next.body_text = removeAssetReferenceFromText(next.body_text, assetId);
  next.note = removeAssetReferenceFromText(next.note, assetId);
  return next;
}

function removeAssetReferenceFromText(value: string | undefined, assetId: string) {
  if (!value) {
    return value;
  }
  const token = `asset:${assetId}`;
  return value
    .split(/\r?\n/)
    .filter((line) => !line.includes(token))
    .join("\n")
    .replaceAll(token, "")
    .trim();
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function notebookItemToText(item: WorkspaceNotebookItem) {
  if (item.type === "rich_text") return item.body_text || extractPlainText(item.body_json ?? emptyDoc());
  if (item.type === "plain_text") return item.text || item.body_text || "";
  if (item.type === "table") {
    const columns = item.columns?.length ? `${item.columns.join(" | ")}\n${item.columns.map(() => "---").join(" | ")}` : "";
    const rows = (item.rows ?? []).map((row) => row.join(" | ")).join("\n");
    return [item.title, columns, rows].filter(Boolean).join("\n");
  }
  if (item.type === "link") return [item.label, item.href, item.note].filter(Boolean).join("\n");
  if (item.type === "card_reference") return [`Card #${item.card_id ?? ""}`, item.note].filter(Boolean).join("\n");
  if (item.type === "image" || item.type === "file" || item.type === "asset_reference") {
    return [`Asset ${item.asset_id ?? ""}`, item.note].filter(Boolean).join("\n");
  }
  return [item.title, item.body_text, item.text, item.note].filter(Boolean).join("\n");
}

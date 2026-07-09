import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Link2,
  NotebookPen,
  Plus,
  Save,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import type {
  WorkspaceNotebook,
  WorkspaceNotebookItem,
  WorkspaceNotebookItemType,
} from "../../types/models";
import { extractPlainText } from "../../utils/richText";

const RichTextEditor = lazy(() =>
  import("../editor/RichTextEditor").then((module) => ({ default: module.RichTextEditor })),
);

interface WorkspaceNotebookPanelProps {
  notebook: WorkspaceNotebook | null;
  visible: boolean;
  onToggleVisible: () => void;
  onSave: (payload: WorkspaceNotebook) => Promise<void>;
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

export function WorkspaceNotebookPanel({
  notebook,
  visible,
  onToggleVisible,
  onSave,
}: WorkspaceNotebookPanelProps) {
  const [draft, setDraft] = useState<WorkspaceNotebook | null>(normalizeNotebook(notebook));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WorkspaceNotebookItem | null>(null);

  useEffect(() => {
    const normalized = normalizeNotebook(notebook);
    setDraft(normalized);
    setSelectedItemId(normalized?.items[0]?.id ?? null);
  }, [notebook]);

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

  function createItem(type: WorkspaceNotebookItemType) {
    const item = makeNotebookItem(type, draft?.items.length ?? 0);
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

  function moveItem(itemId: string, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const index = current.items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.items.length) {
        return current;
      }
      const items = [...current.items];
      const [moved] = items.splice(index, 1);
      items.splice(nextIndex, 0, moved);
      return normalizeNotebookDraft({ ...current, items });
    });
  }

  function confirmDeleteItem() {
    if (!itemToDelete) {
      return;
    }
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const nextItems = current.items.filter((item) => item.id !== itemToDelete.id);
      const normalized = normalizeNotebookDraft({
        ...current,
        items: nextItems.length ? nextItems : [makeNotebookItem("rich_text", 0)],
      });
      setSelectedItemId(normalized.items[0]?.id ?? null);
      return normalized;
    });
    setItemToDelete(null);
  }

  return (
    <>
      <aside className="notebook-panel">
        <div className="pane-header">
          <div>
            <h2>Notebook</h2>
            <p>Workspace notes can now combine rich text, quick notes, links, tables, and asset references.</p>
          </div>
          <div className="pane-toolbar">
            <button className="icon-button" title="Hide notebook" onClick={onToggleVisible}>
              <ChevronLeft size={16} />
            </button>
            <button className="secondary-button" title="Save notebook" disabled={!draft} onClick={() => void handleSave()}>
              <Save size={14} />
              Save
            </button>
          </div>
        </div>

        {draft ? (
          <div className="notebook-composer">
            <div className="notebook-item-toolbar">
              {ITEM_TYPES.map((item) => (
                <button
                  key={item.type}
                  className="secondary-button small"
                  onClick={() => createItem(item.type)}
                >
                  <Plus size={14} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="notebook-item-list">
              {draft.items.map((item, index) => (
                <button
                  key={item.id}
                  className={item.id === selectedItem?.id ? "notebook-item-tab active" : "notebook-item-tab"}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <span className="notebook-item-tab-icon">{itemIcon(item.type)}</span>
                  <span className="notebook-item-tab-text">
                    <strong>{item.title || itemTypeLabel(item.type)}</strong>
                    <small>{itemTypeLabel(item.type)}</small>
                  </span>
                  <span className="notebook-item-tab-actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="icon-button"
                      title="Move item up"
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      title="Move item down"
                      disabled={index === draft.items.length - 1}
                      onClick={() => moveItem(item.id, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button className="icon-button danger" title="Delete item" onClick={() => setItemToDelete(item)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                </button>
              ))}
            </div>

            {selectedItem ? (
              <NotebookItemEditor item={selectedItem} onChange={(patch) => updateItem(selectedItem.id, patch)} />
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <NotebookPen size={18} />
            <p>Open a workspace to start writing.</p>
          </div>
        )}
      </aside>

      {itemToDelete ? (
        <ConfirmDialog
          title="Delete notebook item?"
          description={`"${itemToDelete.title || itemTypeLabel(itemToDelete.type)}" will be removed from this workspace notebook.`}
          confirmLabel="Delete item"
          danger
          onConfirm={confirmDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />
      ) : null}
    </>
  );
}

function NotebookItemEditor({
  item,
  onChange,
}: {
  item: WorkspaceNotebookItem;
  onChange: (patch: Partial<WorkspaceNotebookItem>) => void;
}) {
  return (
    <div className="notebook-item-editor">
      <div className="field-row">
        <label className="field-stack">
          <span>Section title</span>
          <input
            className="themed-input"
            value={item.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={itemTypeLabel(item.type)}
          />
        </label>
        <label className="field-stack">
          <span>Type</span>
          <select
            className="themed-select"
            value={item.type}
            onChange={(event) => onChange(makeNotebookTypePatch(event.target.value as WorkspaceNotebookItemType, item))}
          >
            {ITEM_TYPES.map((entry) => (
              <option key={entry.type} value={entry.type}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {item.type === "rich_text" ? (
        <Suspense fallback={<div className="editor-shell loading">Preparing editor…</div>}>
          <RichTextEditor
            value={item.body_json ?? emptyDoc()}
            onChange={(body_json) =>
              onChange({
                body_json,
                body_text: extractPlainText(body_json),
              })
            }
          />
        </Suspense>
      ) : null}

      {item.type === "plain_text" ? (
        <label className="field-stack">
          <span>Plain text</span>
          <textarea
            className="themed-textarea notebook-plain-text"
            rows={10}
            value={item.text ?? ""}
            onChange={(event) => onChange({ text: event.target.value, body_text: event.target.value })}
            placeholder="Quick notes, raw snippets, or checklists in plain text."
          />
        </label>
      ) : null}

      {item.type === "table" ? (
        <div className="stack-form compact-top-gap">
          <label className="field-stack">
            <span>Columns</span>
            <input
              className="themed-input"
              value={(item.columns ?? []).join(", ")}
              onChange={(event) => onChange({ columns: splitCsv(event.target.value) })}
              placeholder="Name, Status, Notes"
            />
          </label>
          <label className="field-stack">
            <span>Rows</span>
            <textarea
              className="themed-textarea notebook-plain-text"
              rows={8}
              value={(item.rows ?? []).map((row) => row.join(" | ")).join("\n")}
              onChange={(event) => onChange({ rows: parseTableRows(event.target.value) })}
              placeholder={"One row per line\nCell 1 | Cell 2 | Cell 3"}
            />
          </label>
          <p className="helper-text">Use one row per line and separate cells with the `|` symbol.</p>
        </div>
      ) : null}

      {item.type === "link" ? (
        <div className="stack-form compact-top-gap">
          <label className="field-stack">
            <span>URL</span>
            <input
              className="themed-input"
              value={item.href ?? ""}
              onChange={(event) => onChange({ href: event.target.value })}
              placeholder="https://example.com"
            />
          </label>
          <label className="field-stack">
            <span>Label</span>
            <input
              className="themed-input"
              value={item.label ?? ""}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="Reference link"
            />
          </label>
          <label className="field-stack">
            <span>Note</span>
            <textarea
              className="themed-textarea"
              rows={4}
              value={item.note ?? ""}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="Why this link matters."
            />
          </label>
        </div>
      ) : null}

      {item.type === "card_reference" ? (
        <div className="stack-form compact-top-gap">
          <label className="field-stack">
            <span>Card id</span>
            <input
              className="themed-input"
              value={item.card_id ?? ""}
              onChange={(event) => onChange({ card_id: event.target.value ? Number(event.target.value) : null })}
              placeholder="123"
            />
          </label>
          <label className="field-stack">
            <span>Note</span>
            <textarea
              className="themed-textarea"
              rows={4}
              value={item.note ?? ""}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="What to revisit in this card."
            />
          </label>
        </div>
      ) : null}

      {item.type === "image" || item.type === "file" || item.type === "asset_reference" ? (
        <div className="stack-form compact-top-gap">
          <label className="field-stack">
            <span>Asset id</span>
            <input
              className="themed-input"
              value={item.asset_id ?? ""}
              onChange={(event) => onChange({ asset_id: event.target.value })}
              placeholder="img-ab12cd"
            />
          </label>
          <label className="field-stack">
            <span>Note</span>
            <textarea
              className="themed-textarea"
              rows={4}
              value={item.note ?? ""}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="How this file is used inside the workspace."
            />
          </label>
          <p className="helper-text">Notebook asset ids are now counted by the Asset Library and protected from accidental deletion.</p>
        </div>
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
  const items = (notebook.items.length ? notebook.items : [makeNotebookItem("rich_text", 0)]).map((item, index) => {
    const normalized = makeNotebookTypePatch((item.type as WorkspaceNotebookItemType) || "rich_text", item);
    return {
      ...normalized,
      ...item,
      id: item.id || `note-${crypto.randomUUID().slice(0, 8)}`,
      title: item.title || itemTypeLabel(item.type),
      sort_order: index,
    };
  });
  const primaryRichText = items.find((item) => item.type === "rich_text") ?? items[0];
  const body_json = primaryRichText.body_json ?? notebook.body_json ?? emptyDoc();
  const body_text =
    primaryRichText.body_text ??
    (primaryRichText.type === "plain_text" ? primaryRichText.text ?? "" : notebook.body_text) ??
    "";
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
    title: itemTypeLabel(type),
    sort_order: sortOrder,
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

function itemTypeLabel(type: string) {
  return ITEM_TYPES.find((item) => item.type === type)?.label ?? type.replaceAll("_", " ");
}

function itemIcon(type: string) {
  if (type === "rich_text") return <NotebookPen size={14} />;
  if (type === "plain_text") return <Type size={14} />;
  if (type === "table") return <Table2 size={14} />;
  if (type === "link") return <Link2 size={14} />;
  if (type === "image") return <ImageIcon size={14} />;
  if (type === "file" || type === "asset_reference") return <FileText size={14} />;
  return <NotebookPen size={14} />;
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTableRows(value: string) {
  return value
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split("|").map((cell) => cell.trim()));
}

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  FileText,
  Image,
  Link2,
  MousePointer2,
  Palette,
  Plus,
  Quote,
  Square,
  Table2,
  Trash2,
} from "lucide-react";
import type {
  Board,
  BoardItem,
  BoardItemCreatePayload,
  BoardItemType,
  BoardItemUpdatePayload,
  CardListItem,
  WorkspaceAsset,
} from "../../types/models";

interface BoardPaneProps {
  boards: Board[];
  cards: CardListItem[];
  assets: WorkspaceAsset[];
  onCreateBoard: (payload: { title?: string; description?: string }) => Promise<Board>;
  onCreateItem: (boardId: number, payload: BoardItemCreatePayload) => Promise<Board>;
  onUpdateItem: (itemId: number, payload: BoardItemUpdatePayload) => Promise<Board>;
  onDeleteItem: (itemId: number) => Promise<Board>;
  onCreateEdge: (
    boardId: number,
    payload: { source_item_id: number; target_item_id: number; relation_type?: string; label?: string },
  ) => Promise<Board>;
  onDeleteEdge: (edgeId: number) => Promise<Board>;
  onOpenCard: (cardId: number) => void;
}

type DragState = { itemId: number; mode: "move" | "resize"; offsetX: number; offsetY: number };

const DEFAULT_BOARD_SIZE = { width: 1800, height: 1200 };
const ITEM_SIZE = { width: 260, height: 160 };

const itemTypes: Array<{ type: BoardItemType; label: string; icon: React.ReactNode }> = [
  { type: "text", label: "Text", icon: <FileText size={14} /> },
  { type: "quote", label: "Quote", icon: <Quote size={14} /> },
  { type: "color", label: "Color", icon: <Palette size={14} /> },
  { type: "link", label: "Link", icon: <Link2 size={14} /> },
  { type: "table", label: "Table", icon: <Table2 size={14} /> },
  { type: "image", label: "Image", icon: <Image size={14} /> },
  { type: "card", label: "Entity", icon: <Square size={14} /> },
];

export function BoardPane({
  boards,
  cards,
  assets,
  onCreateBoard,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onCreateEdge,
  onDeleteEdge,
  onOpenCard,
}: BoardPaneProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(boards[0]?.id ?? null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<number, BoardItem>>({});
  const [zoom, setZoom] = useState(0.9);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [cardToAdd, setCardToAdd] = useState("");
  const [assetToAdd, setAssetToAdd] = useState("");

  const activeBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null;
  const itemMap = useMemo(() => new Map(activeBoard?.items.map((item) => [item.id, item]) ?? []), [activeBoard]);
  const selectedItems = selectedItemIds.map((id) => itemMap.get(id)).filter((item): item is BoardItem => Boolean(item));

  useEffect(() => {
    if (!activeBoard && boards[0]) {
      setSelectedBoardId(boards[0].id);
      return;
    }
    setItemDrafts(Object.fromEntries(activeBoard?.items.map((item) => [item.id, item]) ?? []));
  }, [activeBoard, boards]);

  async function ensureBoard() {
    if (activeBoard) {
      return activeBoard;
    }
    return onCreateBoard({ title: "Moodboard", description: "Visual references and spatial notes." });
  }

  async function createBoard() {
    const board = await onCreateBoard({
      title: newBoardTitle.trim() || "Moodboard",
      description: "Visual references and spatial notes.",
    });
    setNewBoardTitle("");
    setSelectedBoardId(board.id);
  }

  async function addItem(type: BoardItemType, point = { x: 120, y: 120 }) {
    const board = await ensureBoard();
    const payload = defaultItemPayload(type, point);
    const updated = await onCreateItem(board.id, payload);
    setSelectedBoardId(updated.id);
    setSelectedItemIds([updated.items.at(-1)?.id ?? 0].filter(Boolean));
  }

  async function addCardItem() {
    if (!cardToAdd) {
      return;
    }
    const card = cards.find((item) => item.id === Number(cardToAdd));
    const board = await ensureBoard();
    await onCreateItem(board.id, {
      item_type: "card",
      title: card?.title ?? "Linked entity",
      body_text: card?.summary ?? "",
      card_id: Number(cardToAdd),
      x: 160,
      y: 160,
      width: 280,
      height: 170,
      color: "#7dd3fc",
    });
    setCardToAdd("");
  }

  async function addAssetItem() {
    if (!assetToAdd) {
      return;
    }
    const asset = assets.find((item) => item.id === assetToAdd);
    const board = await ensureBoard();
    await onCreateItem(board.id, {
      item_type: asset?.asset_type === "images" ? "image" : "file",
      title: asset?.original_filename ?? "Asset",
      asset_id: assetToAdd,
      x: 220,
      y: 220,
      width: 300,
      height: 210,
      color: "#38bdf8",
    });
    setAssetToAdd("");
  }

  function selectItem(itemId: number, additive: boolean) {
    setSelectedItemIds((current) => {
      if (!additive) {
        return [itemId];
      }
      return current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId];
    });
  }

  async function duplicateSelected() {
    if (!activeBoard || !selectedItems.length) {
      return;
    }
    const createdIds: number[] = [];
    for (const item of selectedItems) {
      const updated = await onCreateItem(activeBoard.id, {
        item_type: item.item_type,
        title: `${item.title || item.item_type} copy`,
        body_text: item.body_text,
        body_json: item.body_json,
        card_id: item.card_id,
        asset_id: item.asset_id,
        href: item.href,
        color: item.color,
        x: item.x + 34,
        y: item.y + 34,
        width: item.width,
        height: item.height,
        z_index: item.z_index + 1,
      });
      createdIds.push(updated.items.at(-1)?.id ?? 0);
    }
    setSelectedItemIds(createdIds.filter(Boolean));
  }

  async function deleteSelected() {
    if (!selectedItems.length) {
      return;
    }
    const confirmed = window.confirm(`Delete ${selectedItems.length} selected board item${selectedItems.length === 1 ? "" : "s"}?`);
    if (!confirmed) {
      return;
    }
    for (const item of selectedItems) {
      await onDeleteItem(item.id);
    }
    setSelectedItemIds([]);
  }

  async function connectSelected() {
    if (!activeBoard || selectedItemIds.length < 2) {
      return;
    }
    await onCreateEdge(activeBoard.id, {
      source_item_id: selectedItemIds[0],
      target_item_id: selectedItemIds[1],
      relation_type: "related",
      label: "related",
    });
  }

  function startDrag(event: React.PointerEvent<HTMLElement>, item: BoardItem, mode: DragState["mode"]) {
    selectItem(item.id, event.shiftKey || event.metaKey || event.ctrlKey);
    const point = pointerToBoard(event, zoom);
    setDragState({
      itemId: item.id,
      mode,
      offsetX: point.x - (mode === "move" ? item.x : item.width),
      offsetY: point.y - (mode === "move" ? item.y : item.height),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    if (!dragState) {
      return;
    }
    const point = pointerToBoard(event, zoom);
    setItemDrafts((current) => {
      const item = current[dragState.itemId];
      if (!item) {
        return current;
      }
      return {
        ...current,
        [dragState.itemId]:
          dragState.mode === "move"
            ? { ...item, x: Math.max(24, Math.round(point.x - dragState.offsetX)), y: Math.max(24, Math.round(point.y - dragState.offsetY)) }
            : { ...item, width: Math.max(140, Math.round(point.x - dragState.offsetX)), height: Math.max(100, Math.round(point.y - dragState.offsetY)) },
      };
    });
  }

  async function endDrag(event: React.PointerEvent<HTMLElement>) {
    if (!dragState) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    const item = itemDrafts[dragState.itemId];
    setDragState(null);
    if (item) {
      await onUpdateItem(item.id, {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      });
    }
  }

  async function patchSelectedItem(patch: BoardItemUpdatePayload) {
    const item = selectedItems[0];
    if (!item) {
      return;
    }
    await onUpdateItem(item.id, patch);
  }

  return (
    <section className="board-pane">
      <div className="board-header">
        <div>
          <span className="eyebrow">Board / Moodboard</span>
          <h1>Spatial reference canvas</h1>
          <p>Collect notes, colors, quotes, files, links and entities in one visual workspace.</p>
        </div>
        <div className="board-board-controls">
          <select className="themed-select" value={activeBoard?.id ?? ""} onChange={(event) => setSelectedBoardId(Number(event.target.value))}>
            {boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}
          </select>
          <input className="themed-input" value={newBoardTitle} placeholder="New board..." onChange={(event) => setNewBoardTitle(event.target.value)} />
          <button className="primary-button" onClick={() => void createBoard()}><Plus size={14} /> Board</button>
        </div>
      </div>

      <div className="board-toolbar">
        {itemTypes.map((item) => (
          <button key={item.type} className="secondary-button small" onClick={() => void addItem(item.type)}>
            {item.icon}
            {item.label}
          </button>
        ))}
        <select className="themed-select" value={cardToAdd} onChange={(event) => setCardToAdd(event.target.value)}>
          <option value="">Linked entity...</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.title}</option>)}
        </select>
        <button className="secondary-button small" disabled={!cardToAdd} onClick={() => void addCardItem()}>Add entity</button>
        <select className="themed-select" value={assetToAdd} onChange={(event) => setAssetToAdd(event.target.value)}>
          <option value="">Asset...</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}
        </select>
        <button className="secondary-button small" disabled={!assetToAdd} onClick={() => void addAssetItem()}>Add asset</button>
        <button className="secondary-button small" disabled={selectedItemIds.length < 2} onClick={() => void connectSelected()}>Connect</button>
        <button className="secondary-button small" disabled={!selectedItemIds.length} onClick={() => void duplicateSelected()}><Copy size={14} /> Duplicate</button>
        <button className="secondary-button small" disabled={!selectedItemIds.length} onClick={() => void deleteSelected()}><Trash2 size={14} /> Delete</button>
        <div className="segmented-control compact-segmented">
          <button onClick={() => setZoom((current) => Math.max(0.55, Number((current - 0.1).toFixed(2))))}>-</button>
          <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(2))))}>+</button>
        </div>
      </div>

      <div className="board-workspace">
        <main className="board-stage">
          <div className="board-surface">
            <div
              className="board-canvas"
              style={{ width: DEFAULT_BOARD_SIZE.width, height: DEFAULT_BOARD_SIZE.height, transform: `scale(${zoom})` }}
              onDoubleClick={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                const point = pointerToBoard(event, zoom);
                void addItem("text", point);
              }}
            >
              <svg className="board-edges" aria-hidden="true">
                {activeBoard?.edges.map((edge) => {
                  const source = itemDrafts[edge.source_item_id];
                  const target = itemDrafts[edge.target_item_id];
                  if (!source || !target) {
                    return null;
                  }
                  return (
                    <g key={edge.id}>
                      <line
                        x1={source.x + source.width / 2}
                        y1={source.y + source.height / 2}
                        x2={target.x + target.width / 2}
                        y2={target.y + target.height / 2}
                      />
                      <text x={(source.x + target.x) / 2 + 80} y={(source.y + target.y) / 2 + 40}>{edge.label}</text>
                    </g>
                  );
                })}
              </svg>
              {activeBoard?.items.map((item) => {
                const draft = itemDrafts[item.id] ?? item;
                return (
                  <div
                    key={item.id}
                    className={`board-item-card type-${item.item_type} ${selectedItemIds.includes(item.id) ? "active" : ""}`}
                    style={{ left: draft.x, top: draft.y, width: draft.width, height: draft.height, borderColor: draft.color, zIndex: draft.z_index }}
                    onPointerDown={(event) => startDrag(event, draft, "move")}
                    onPointerMove={moveDrag}
                    onPointerUp={(event) => void endDrag(event)}
                    onPointerCancel={(event) => void endDrag(event)}
                  >
                    <BoardItemContent item={draft} onOpenCard={onOpenCard} />
                    <span
                      className="board-resize-handle"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        startDrag(event, draft, "resize");
                      }}
                    />
                  </div>
                );
              })}
              <div className="board-canvas-hint">
                <MousePointer2 size={14} />
                Double-click empty space for text. Scroll to pan. Shift-click selects multiple nodes.
              </div>
            </div>
          </div>
        </main>

        <aside className="board-inspector">
          <div className="section-header">
            <div>
              <h2>{selectedItems[0]?.title || "Inspector"}</h2>
              <p className="helper-text">{selectedItems.length ? `${selectedItems.length} selected item(s)` : "Select a node to edit content."}</p>
            </div>
          </div>
          {selectedItems[0] ? (
            <>
              <label className="field-stack">
                <span>Title</span>
                <input className="themed-input" value={selectedItems[0].title} onChange={(event) => void patchSelectedItem({ title: event.target.value })} />
              </label>
              <label className="field-stack">
                <span>Body / note</span>
                <textarea className="themed-textarea compact" value={selectedItems[0].body_text} onChange={(event) => void patchSelectedItem({ body_text: event.target.value })} />
              </label>
              <label className="field-stack">
                <span>URL</span>
                <input className="themed-input" value={selectedItems[0].href} onChange={(event) => void patchSelectedItem({ href: event.target.value })} />
              </label>
              <label className="field-stack">
                <span>Color</span>
                <input className="themed-input color-input" type="color" value={selectedItems[0].color} onChange={(event) => void patchSelectedItem({ color: event.target.value })} />
              </label>
              <div className="board-edge-list">
                <h3>Connections</h3>
                {activeBoard?.edges.filter((edge) => selectedItemIds.includes(edge.source_item_id) || selectedItemIds.includes(edge.target_item_id)).map((edge) => (
                  <div className="board-edge-row" key={edge.id}>
                    <span>{edge.label || edge.relation_type}</span>
                    <button className="mini-icon-button" onClick={() => void onDeleteEdge(edge.id)}>×</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-block">Select a board item to edit it here.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function BoardItemContent({ item, onOpenCard }: { item: BoardItem; onOpenCard: (cardId: number) => void }) {
  if (item.item_type === "color") {
    return (
      <div className="board-item-color" style={{ background: item.color }}>
        <strong>{item.title || item.color}</strong>
      </div>
    );
  }
  if (item.item_type === "image" && item.asset_url) {
    return <img className="board-item-image" src={item.asset_url} alt={item.title || item.asset_filename || ""} />;
  }
  if (item.item_type === "card" && item.card_id) {
    return (
      <button className="board-linked-card" onDoubleClick={() => item.card_id && onOpenCard(item.card_id)}>
        <strong>{item.card_title || item.title || "Linked entity"}</strong>
        <small>{item.body_text || "Double-click to open entity."}</small>
      </button>
    );
  }
  return (
    <>
      <strong>{item.title || labelForItemType(item.item_type)}</strong>
      <p>{item.body_text || fallbackText(item)}</p>
      {item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.href}</a> : null}
      {item.asset_filename ? <small>{item.asset_filename}</small> : null}
    </>
  );
}

function defaultItemPayload(type: BoardItemType, point: { x: number; y: number }): BoardItemCreatePayload {
  const base = { item_type: type, x: point.x, y: point.y, width: ITEM_SIZE.width, height: ITEM_SIZE.height };
  if (type === "quote") return { ...base, title: "Quote", body_text: "A line that defines the mood.", color: "#93c5fd" };
  if (type === "color") return { ...base, title: "Cold blue", body_text: "#4ba8d6", color: "#4ba8d6", height: 120 };
  if (type === "link") return { ...base, title: "Reference link", href: "https://", color: "#38bdf8" };
  if (type === "table") return { ...base, title: "Comparison table", body_text: "Column A | Column B", color: "#67e8f9" };
  if (type === "image") return { ...base, title: "Image placeholder", body_text: "Attach an image asset from the toolbar.", color: "#60a5fa" };
  return { ...base, title: "Text note", body_text: "Write a thought, scene tone or reference note.", color: "#4ba8d6" };
}

function labelForItemType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function fallbackText(item: BoardItem) {
  if (item.item_type === "file") return item.asset_filename || "File reference";
  if (item.item_type === "link") return item.href || "Reference link";
  return "Empty board item.";
}

function pointerToBoard(event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>, zoom: number) {
  const surface = event.currentTarget.parentElement;
  const rect = surface?.getBoundingClientRect();
  if (!rect) {
    return { x: event.clientX / zoom, y: event.clientY / zoom };
  }
  return {
    x: Math.round((event.clientX - rect.left) / zoom),
    y: Math.round((event.clientY - rect.top) / zoom),
  };
}

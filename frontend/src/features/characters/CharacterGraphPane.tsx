import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { GitBranch, MousePointer2, Plus, Users } from "lucide-react";
import type { CharacterGraph, CharacterGraphNode, CharacterGraphNodeLayout, CharacterGroup } from "../../types/models";

interface CharacterGraphPaneProps {
  graph: CharacterGraph | null;
  onCreateGroup: (payload: { name: string; slug: string; color?: string; description?: string }) => Promise<CharacterGroup>;
  onUpdateLayout: (payload: { graph_id?: string; card_id: number; x: number; y: number; width?: number; height?: number }) => Promise<CharacterGraph>;
  onOpenCard: (cardId: number) => void;
}

type DragState = { cardId: number; offsetX: number; offsetY: number };

export function CharacterGraphPane({ graph, onCreateGroup, onUpdateLayout, onOpenCard }: CharacterGraphPaneProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<number, CharacterGraphNodeLayout>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [groupDraft, setGroupDraft] = useState({ name: "", color: "#4ba8d6" });

  const nodes = graph?.nodes ?? [];
  const groups = graph?.groups ?? [];
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const groupColorByName = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.name, group.color])),
    [groups],
  );

  useEffect(() => {
    setLayoutDrafts(Object.fromEntries(nodes.map((node) => [node.id, node.layout])));
    if (!selectedNodeId && nodes[0]) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  async function createGroup() {
    const name = groupDraft.name.trim();
    if (!name) {
      return;
    }
    await onCreateGroup({ name, slug: slugify(name), color: groupDraft.color });
    setGroupDraft({ name: "", color: "#4ba8d6" });
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, node: CharacterGraphNode) {
    const layout = layoutDrafts[node.id] ?? node.layout;
    const point = pointerToGraph(event, zoom);
    setSelectedNodeId(node.id);
    setDragState({ cardId: node.id, offsetX: point.x - layout.x, offsetY: point.y - layout.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }
    const point = pointerToGraph(event, zoom);
    setLayoutDrafts((current) => {
      const layout = current[dragState.cardId];
      if (!layout) {
        return current;
      }
      return {
        ...current,
        [dragState.cardId]: {
          ...layout,
          x: Math.max(24, Math.round(point.x - dragState.offsetX)),
          y: Math.max(24, Math.round(point.y - dragState.offsetY)),
        },
      };
    });
  }

  async function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    const layout = layoutDrafts[dragState.cardId];
    setDragState(null);
    if (layout) {
      await onUpdateLayout({
        graph_id: graph?.graph_id ?? "default",
        card_id: dragState.cardId,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
      });
    }
  }

  return (
    <section className="character-graph-pane">
      <div className="character-graph-header">
        <div>
          <span className="eyebrow">Characters</span>
          <h2>Relationship graph</h2>
          <p>{nodes.length} characters · {graph?.edges.length ?? 0} semantic relations · saved visual layout</p>
        </div>
        <div className="segmented-control compact-segmented">
          <button onClick={() => setZoom((current) => Math.max(0.55, Number((current - 0.1).toFixed(2))))}>-</button>
          <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(2))))}>+</button>
        </div>
      </div>

      <div className="character-graph-layout">
        <aside className="character-group-panel">
          <h3><Users size={15} /> Groups</h3>
          <div className="character-group-form">
            <input className="themed-input" value={groupDraft.name} placeholder="New group..." onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} />
            <input className="themed-input color-input" type="color" value={groupDraft.color} onChange={(event) => setGroupDraft({ ...groupDraft, color: event.target.value })} />
            <button className="secondary-button small" disabled={!groupDraft.name.trim()} onClick={() => void createGroup()}>
              <Plus size={14} />
              Add
            </button>
          </div>
          <div className="character-group-list">
            {groups.map((group) => (
              <div className="character-group-row" key={group.id}>
                <span className="plot-color-dot" style={{ background: group.color }} />
                <strong>{group.name}</strong>
                <small>{group.character_count}</small>
              </div>
            ))}
          </div>
        </aside>

        <main className="character-graph-stage">
          <div className="character-graph-surface">
            <div className="character-graph-canvas" style={{ transform: `scale(${zoom})` }}>
              <svg className="character-graph-edges" aria-hidden="true">
                {graph?.edges.map((edge) => {
                  const source = layoutDrafts[edge.source_card_id];
                  const target = layoutDrafts[edge.target_card_id];
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
                      <text x={(source.x + target.x) / 2 + 86} y={(source.y + target.y) / 2 + 46}>{edge.relation_type}</text>
                    </g>
                  );
                })}
              </svg>
              {nodes.map((node) => {
                const layout = layoutDrafts[node.id] ?? node.layout;
                const color = groupColorByName[node.group] ?? "#4ba8d6";
                return (
                  <button
                    key={node.id}
                    className={`character-graph-node ${node.id === selectedNode?.id ? "active" : ""}`}
                    style={{ left: layout.x, top: layout.y, width: layout.width, minHeight: layout.height, borderColor: color }}
                    onPointerDown={(event) => startDrag(event, node)}
                    onPointerMove={moveDrag}
                    onPointerUp={(event) => void endDrag(event)}
                    onPointerCancel={(event) => void endDrag(event)}
                    onDoubleClick={() => onOpenCard(node.id)}
                  >
                    <span className="plot-card-kicker"><GitBranch size={12} /> {node.role || "character"}</span>
                    <strong>{node.title}</strong>
                    <small>{node.group || "No group"} · {node.summary || "No summary"}</small>
                  </button>
                );
              })}
              <div className="character-graph-hint">
                <MousePointer2 size={14} />
                Drag nodes to save layout. Double-click a character to open its card.
              </div>
            </div>
          </div>
        </main>

        <aside className="character-graph-inspector">
          <h3>{selectedNode?.title ?? "Character"}</h3>
          {selectedNode ? (
            <>
              <p>{selectedNode.summary || "No summary yet."}</p>
              <dl>
                <dt>Role</dt>
                <dd>{selectedNode.role || "Unassigned"}</dd>
                <dt>Group</dt>
                <dd>{selectedNode.group || "No group"}</dd>
              </dl>
              <button className="primary-button full-width" onClick={() => onOpenCard(selectedNode.id)}>Open card</button>
            </>
          ) : (
            <div className="empty-block">Create character cards to build a relationship graph.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function pointerToGraph(event: React.PointerEvent<HTMLElement>, zoom: number) {
  const surface = event.currentTarget.parentElement?.parentElement;
  const rect = surface?.getBoundingClientRect();
  if (!rect) {
    return { x: event.clientX / zoom, y: event.clientY / zoom };
  }
  return {
    x: Math.round((event.clientX - rect.left) / zoom),
    y: Math.round((event.clientY - rect.top) / zoom),
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";
}

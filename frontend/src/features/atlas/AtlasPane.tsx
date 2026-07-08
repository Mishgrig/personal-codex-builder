import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Rows2 } from "lucide-react";
import type { CardListItem, CardSchema, SearchFilters } from "../../types/models";
import type { SortMode, ViewMode } from "../../app/store";
import { groupCards, termLabel } from "../../utils/grouping";
import { highlightText } from "../../utils/highlight";

interface AtlasPaneProps {
  cards: CardListItem[];
  query: string;
  filters: SearchFilters;
  selectedCardId: number | null;
  viewMode: ViewMode;
  sortMode: SortMode;
  showSummary: boolean;
  showCover: boolean;
  schemas: CardSchema[];
  onSelectCard: (cardId: number) => void;
  onReorderGroup: (orderedIds: number[]) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortModeChange: (mode: SortMode) => void;
  onShowSummaryChange: (value: boolean) => void;
  onShowCoverChange: (value: boolean) => void;
}

export function AtlasPane({
  cards,
  query,
  filters,
  selectedCardId,
  viewMode,
  sortMode,
  showSummary,
  showCover,
  schemas,
  onSelectCard,
  onReorderGroup,
  onViewModeChange,
  onSortModeChange,
  onShowSummaryChange,
  onShowCoverChange,
}: AtlasPaneProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const groups = groupCards(cards, filters);

  return (
    <section className="atlas-pane">
      <div className="pane-header">
        <div>
          <h2>Atlas</h2>
          <p>{cards.length} cards in view</p>
        </div>
        <div className="pane-toolbar">
          <div className="segmented-control">
            <button
              className={viewMode === "list" ? "active" : ""}
              title="List mode"
              onClick={() => onViewModeChange("list")}
            >
              <Rows2 size={14} />
            </button>
            <button
              className={viewMode === "tile" ? "active" : ""}
              title="Tile mode"
              onClick={() => onViewModeChange("tile")}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <label className="tiny-toggle">
            <input type="checkbox" checked={showSummary} onChange={(event) => onShowSummaryChange(event.target.checked)} />
            <span>summary</span>
          </label>
          <label className="tiny-toggle">
            <input type="checkbox" checked={showCover} onChange={(event) => onShowCoverChange(event.target.checked)} />
            <span>cover</span>
          </label>
          <select className="mini-select" value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>
            <option value="manual">Manual</option>
            <option value="az">A-Z</option>
          </select>
        </div>
      </div>

      <div className={`atlas-groups ${viewMode}`}>
        {groups.map((group) => (
          <section key={group.key} className="atlas-group">
            <header className="group-header">
              <span>{group.label}</span>
            </header>
            <DndContext
              sensors={sensors}
              onDragEnd={(event) => handleDragEnd(event, group.cards, sortMode, onReorderGroup)}
            >
              <SortableContext items={group.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                <div className={`results-grid ${viewMode}`}>
                  {group.cards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      query={query}
                      selected={selectedCardId === card.id}
                      viewMode={viewMode}
                      showSummary={showSummary}
                      showCover={showCover}
                      schema={schemas.find((schema) => schema.id === card.schema_id) ?? null}
                      onSelect={() => onSelectCard(card.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        ))}
      </div>
    </section>
  );
}

function handleDragEnd(
  event: DragEndEvent,
  cards: CardListItem[],
  sortMode: SortMode,
  onReorderGroup: (orderedIds: number[]) => void,
) {
  if (sortMode !== "manual") {
    return;
  }
  const { active, over } = event;
  if (!over || active.id === over.id) {
    return;
  }
  const oldIndex = cards.findIndex((card) => card.id === active.id);
  const newIndex = cards.findIndex((card) => card.id === over.id);
  if (oldIndex < 0 || newIndex < 0) {
    return;
  }
  const ordered = arrayMove(cards, oldIndex, newIndex).map((card) => card.id);
  onReorderGroup(ordered);
}

function SortableCard({
  card,
  query,
  selected,
  viewMode,
  showSummary,
  showCover,
  schema,
  onSelect,
}: {
  card: CardListItem;
  query: string;
  selected: boolean;
  viewMode: ViewMode;
  showSummary: boolean;
  showCover: boolean;
  schema: CardSchema | null;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const listFields = schema?.fields.filter((field) => field.show_in_list) ?? [];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`result-card ${selected ? "selected" : ""} ${viewMode}`}
      onClick={onSelect}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      {showCover && card.cover_url ? (
        <div className="result-cover-shell">
          <img src={card.cover_url} alt={card.title} className="result-cover" />
        </div>
      ) : null}
      <div className="result-main">
        <div className="result-title-row">
          <h3>{highlightText(card.title, query)}</h3>
          {query ? <span className="mention-pill">{card.mention_count} mentions</span> : null}
        </div>
        <div className="result-tags">
          {card.taxonomy_terms.map((term) => (
            <span className={`tag-chip ${term.category}`} key={`${card.id}-${term.id}`}>
              {term.label}
            </span>
          ))}
        </div>
        {(showSummary || viewMode === "tile") && card.summary ? (
          <p className="result-summary">{highlightText(card.summary, query)}</p>
        ) : null}
        {listFields.length ? (
          <dl className="list-fields">
            {listFields.map((field) => (
              <div key={field.field_id}>
                <dt>{field.label}</dt>
                <dd>{String(card.dynamic_fields[field.field_id] ?? "—")}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}

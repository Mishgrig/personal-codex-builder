import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, BookPlus, Eye, GripVertical, LayoutGrid, PanelBottom, PanelRight, Plus, Rows2, Wrench } from "lucide-react";
import type { CardListItem, CardSchema, SearchFilters } from "../../types/models";
import type { DetailPanePosition, SortMode, ViewMode } from "../../app/store";
import { PopoverMenu } from "../../shared/components/PopoverMenu";
import { groupCards, termLabel } from "../../utils/grouping";
import { highlightText } from "../../utils/highlight";

interface AtlasPaneProps {
  cards: CardListItem[];
  totalCards: number;
  query: string;
  filters: SearchFilters;
  selectedCardId: number | null;
  viewMode: ViewMode;
  sortMode: SortMode;
  showSummary: boolean;
  showCover: boolean;
  groupByCategory: boolean;
  schemas: CardSchema[];
  roomFilters?: Array<{
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }>;
  detailPanePosition: DetailPanePosition;
  title?: string;
  description?: string;
  addCardLabel?: string;
  onSelectCard: (cardId: number) => void;
  onReorderGroup: (orderedIds: number[]) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortModeChange: (mode: SortMode) => void;
  onShowSummaryChange: (value: boolean) => void;
  onShowCoverChange: (value: boolean) => void;
  onGroupByCategoryChange: (value: boolean) => void;
  onCreateCard: () => void;
  onOpenCardTypeStudio: () => void;
  onExportSelectedCardTypeStructure: (schemaId: string) => void;
  onExportSelectedMarkdown?: () => void;
  onImportMarkdown?: (file: File) => void;
  onDetailPanePositionChange: (value: DetailPanePosition) => void;
  onOpenTableView: () => void;
}

export function AtlasPane({
  cards,
  totalCards,
  query,
  filters,
  selectedCardId,
  viewMode,
  sortMode,
  showSummary,
  showCover,
  groupByCategory,
  schemas,
  roomFilters = [],
  detailPanePosition,
  title = "Wiki",
  description,
  addCardLabel = "Add card",
  onSelectCard,
  onReorderGroup,
  onViewModeChange,
  onSortModeChange,
  onShowSummaryChange,
  onShowCoverChange,
  onGroupByCategoryChange,
  onCreateCard,
  onOpenCardTypeStudio,
  onExportSelectedCardTypeStructure,
  onExportSelectedMarkdown,
  onImportMarkdown,
  onDetailPanePositionChange,
  onOpenTableView,
}: AtlasPaneProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const groups = groupCards(cards, filters, groupByCategory);
  const selectedCard = cards.find((item) => item.id === selectedCardId) ?? null;
  const selectedCardType = selectedCard?.schema_id ?? "";

  return (
    <section className="atlas-pane">
      <div className="pane-header">
        <div>
          <h2>{title}</h2>
          <p>{description ? `${description} · ` : ""}Total {totalCards} · Shown {cards.length}</p>
        </div>
        <div className="pane-toolbar">
          <button className="secondary-button atlas-add-card-button" title="Create a new Wiki card" onClick={onCreateCard}>
            <Plus size={14} />
            {addCardLabel}
          </button>
          <PopoverMenu icon={<Wrench size={14} />} label="Card tools">
            <div className="popover-action-grid">
              <button className="secondary-button" title="Open Card Type Studio to edit card structures" onClick={onOpenCardTypeStudio}>
                <BookPlus size={14} />
                Card Type Studio
              </button>
              <button
                className="secondary-button"
                disabled={!selectedCardType}
                title={selectedCardType ? "Export selected card type structure" : "Select a card with a card type first"}
                onClick={() => selectedCardType && onExportSelectedCardTypeStructure(selectedCardType)}
              >
                <BookPlus size={14} />
                Export Card Type structure
              </button>
              {onExportSelectedMarkdown ? (
                <button
                  className="secondary-button"
                  disabled={!selectedCard}
                  title={selectedCard ? "Export selected Wiki card as Markdown" : "Select a card first"}
                  onClick={onExportSelectedMarkdown}
                >
                  <BookPlus size={14} />
                  Export Markdown
                </button>
              ) : null}
              {onImportMarkdown ? (
                <label className="secondary-button" title="Import a Markdown file as a Wiki card">
                  <BookPlus size={14} />
                  Import Markdown
                  <input
                    type="file"
                    accept=".md,.markdown,text/markdown,text/plain"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file) {
                        onImportMarkdown(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              ) : null}
              <button className="secondary-button" title="Open the spreadsheet-style table view" onClick={onOpenTableView}>
                <LayoutGrid size={14} />
                Open Table View
              </button>
              <button
                className={`secondary-button ${detailPanePosition === "right" ? "active" : ""}`}
                title="Show selected card to the right of the results"
                onClick={() => onDetailPanePositionChange("right")}
              >
                <PanelRight size={14} />
                Panel Right
              </button>
              <button
                className={`secondary-button ${detailPanePosition === "bottom" ? "active" : ""}`}
                title="Show selected card below the results"
                onClick={() => onDetailPanePositionChange("bottom")}
              >
                <PanelBottom size={14} />
                Panel Bottom
              </button>
            </div>
          </PopoverMenu>

          <PopoverMenu icon={<Eye size={14} />} label="View options">
            <div className="popover-action-grid">
              <div className="segmented-control full-width">
                <button
                  className={viewMode === "list" ? "active" : ""}
                  title="List mode"
                  onClick={() => onViewModeChange("list")}
                >
                  <Rows2 size={14} />
                  List
                </button>
                <button
                  className={viewMode === "tile" ? "active" : ""}
                  title="Tile mode"
                  onClick={() => onViewModeChange("tile")}
                >
                  <LayoutGrid size={14} />
                  Tile
                </button>
              </div>
              <label className="tiny-toggle">
                <input type="checkbox" checked={showSummary} onChange={(event) => onShowSummaryChange(event.target.checked)} />
                <span>Summary</span>
              </label>
              <label className="tiny-toggle">
                <input type="checkbox" checked={showCover} onChange={(event) => onShowCoverChange(event.target.checked)} />
                <span>Cover</span>
              </label>
              <label className="tiny-toggle">
                <input
                  type="checkbox"
                  checked={groupByCategory}
                  onChange={(event) => onGroupByCategoryChange(event.target.checked)}
                />
                <span>Group by category</span>
              </label>
            </div>
          </PopoverMenu>

          <PopoverMenu icon={<ArrowUpDown size={14} />} label="Sort options">
            <div className="popover-action-grid">
              <button
                className={`secondary-button ${sortMode === "manual" ? "active" : ""}`}
                onClick={() => onSortModeChange("manual")}
              >
                Manual
              </button>
              <button
                className={`secondary-button ${sortMode === "az" ? "active" : ""}`}
                onClick={() => onSortModeChange("az")}
              >
                A-Z
              </button>
            </div>
          </PopoverMenu>
        </div>
      </div>

      {roomFilters.length ? (
        <div className="room-filter-bar" aria-label={`${title} filters`}>
          {roomFilters.map((filter) => (
            <label className="room-filter" key={filter.label}>
              <span>{filter.label}</span>
              <select className="themed-select" value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

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
                      sortableEnabled={sortMode === "manual"}
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
  sortableEnabled,
  schema,
  onSelect,
}: {
  card: CardListItem;
  query: string;
  selected: boolean;
  viewMode: ViewMode;
  showSummary: boolean;
  showCover: boolean;
  sortableEnabled: boolean;
  schema: CardSchema | null;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
    disabled: !sortableEnabled,
  });
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
      {sortableEnabled ? (
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
      ) : null}
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
        {showSummary && card.summary ? (
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

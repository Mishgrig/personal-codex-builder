import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Database,
  EyeOff,
  FolderOpen,
  Home,
  Images,
  MapPin,
  Milestone,
  NotebookPen,
  Pin,
  Settings2,
  SlidersHorizontal,
  Swords,
  Table2,
  Trash2,
  Users,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type {
  CardListItem,
  Chapter,
  WorkspaceAsset,
  WorkspaceAssetHealth,
  WorkspaceNotebook,
  WorkspaceSummary,
} from "../../types/models";
import { ColorPalettePicker } from "../../shared/components/ColorPalettePicker";
import {
  assetReminderItems,
  formatBytes,
  formatDate,
  normalizeDashboardTasks,
  normalizeWidgetLayout,
  roomLabelForCard,
  textareaRows,
  truncate,
  widgetLabel,
  type DashboardTask,
  type DashboardWidgetId,
  type DashboardWidgetLayout,
  type DashboardWidgetSize,
} from "./dashboardModel";

type WidgetTint = "system" | `#${string}`;

interface WorkspaceHomePaneProps {
  workspace: WorkspaceSummary;
  cards: CardListItem[];
  pinnedCards: CardListItem[];
  assets: WorkspaceAsset[];
  assetHealth: WorkspaceAssetHealth | null;
  notebook: WorkspaceNotebook | null;
  chapters: Chapter[];
  onOpenWiki: () => void;
  onOpenCharacters: () => void;
  onOpenLocations: () => void;
  onOpenPlots: () => void;
  onOpenChapters: () => void;
  onOpenBoard: () => void;
  onOpenTable: () => void;
  onOpenManager: () => void;
  onSelectCard: (cardId: number) => void;
  onPinCard: (cardId: number) => void;
  onUnpinCard: (cardId: number) => void;
  onSaveQuickNote: (text: string) => Promise<void>;
  onUpdatePreferences: (patch: Record<string, unknown>) => void;
}

export function WorkspaceHomePane({
  workspace,
  cards,
  pinnedCards,
  assets,
  assetHealth,
  notebook,
  chapters,
  onOpenWiki,
  onOpenCharacters,
  onOpenLocations,
  onOpenPlots,
  onOpenChapters,
  onOpenBoard,
  onOpenTable,
  onOpenManager,
  onSelectCard,
  onPinCard,
  onUnpinCard,
  onSaveQuickNote,
  onUpdatePreferences,
}: WorkspaceHomePaneProps) {
  const [quickNote, setQuickNote] = useState("");
  const [quickNoteState, setQuickNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [taskTitle, setTaskTitle] = useState("");
  const [pinnedSearch, setPinnedSearch] = useState("");
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false);
  const widgetLayout = normalizeWidgetLayout(workspace.ui_preferences.dashboard_widget_layout);
  const widgetTints = normalizeWidgetTints(workspace.ui_preferences.dashboard_widget_tints);
  const tasks = normalizeDashboardTasks(workspace.ui_preferences.dashboard_tasks);
  const enabledWidgets = widgetLayout.filter((widget) => widget.enabled).sort((left, right) => left.order - right.order);
  const pinnedSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const recentCards = [...cards]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, 5);
  const recentAssets = [...assets]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, 3);
  const activityItems = useMemo(
    () =>
      [
        ...recentCards.map((card) => ({
          id: `card-${card.id}`,
          kind: roomLabelForCard(card),
          title: card.title,
          detail: `${card.schema_label || "entity"} · updated ${formatDate(card.updated_at)}`,
          updatedAt: card.updated_at,
          cardId: card.id,
          coverUrl: card.cover_url,
        })),
        ...recentAssets.map((asset) => ({
          id: `asset-${asset.id}`,
          kind: "Asset",
          title: asset.original_filename,
          detail: `${asset.asset_type} · ${formatBytes(asset.size_bytes)} · ${asset.usage_count} links`,
          updatedAt: asset.updated_at,
          cardId: null,
          coverUrl: asset.asset_type === "images" ? asset.url : null,
        })),
      ]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .slice(0, 7),
    [recentAssets, recentCards],
  );
  const relationCount = cards.reduce((sum, card) => sum + card.mention_count, 0);
  const todoCount = tasks.filter((task) => task.status !== "done").length;
  const assetReminderCount = assetReminderItems(assetHealth).length;
  const chapterView = workspace.ui_preferences.dashboard_chapters_view === "cards" ? "cards" : "list";
  const pinnedView = workspace.ui_preferences.dashboard_pinned_view === "cards" ? "cards" : "list";
  const pinnedSearchResults = cards
    .filter((card) => !pinnedCards.some((pinned) => pinned.id === card.id))
    .filter((card) => {
      const query = pinnedSearch.trim().toLowerCase();
      if (!query) return false;
      return `${card.title} ${card.schema_label ?? ""} ${roomLabelForCard(card)}`.toLowerCase().includes(query);
    })
    .slice(0, 6);

  function handleSubmitKey(event: React.KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    submit();
  }

  async function saveQuickNote() {
    const text = quickNote.trim();
    if (!text || quickNoteState === "saving") {
      return;
    }
    setQuickNoteState("saving");
    try {
      await onSaveQuickNote(text);
      setQuickNote("");
      setQuickNoteState("saved");
    } catch (_error) {
      setQuickNoteState("error");
    }
  }

  function updateWidgetLayout(nextLayout: DashboardWidgetLayout[]) {
    onUpdatePreferences({ dashboard_widget_layout: nextLayout });
  }

  function patchWidget(widgetId: DashboardWidgetId, patch: Partial<DashboardWidgetLayout>) {
    updateWidgetLayout(widgetLayout.map((widget) => (widget.id === widgetId ? { ...widget, ...patch } : widget)));
  }

  function moveWidget(widgetId: DashboardWidgetId, direction: -1 | 1) {
    const sorted = [...widgetLayout].sort((left, right) => left.order - right.order);
    const index = sorted.findIndex((widget) => widget.id === widgetId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
      return;
    }
    const next = [...sorted];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    updateWidgetLayout(next.map((widget, order) => ({ ...widget, order: (order + 1) * 10 })));
  }

  function patchWidgetTint(widgetId: DashboardWidgetId, tint: WidgetTint) {
    onUpdatePreferences({
      dashboard_widget_tints: {
        ...widgetTints,
        [widgetId]: tint,
      },
    });
  }

  function widgetTint(widgetId: DashboardWidgetId) {
    return widgetTints[widgetId] ?? "system";
  }

  function updateTasks(nextTasks: DashboardTask[]) {
    onUpdatePreferences({ dashboard_tasks: nextTasks });
  }

  function addTask() {
    const title = taskTitle.trim();
    if (!title) {
      return;
    }
    const now = new Date().toISOString();
    updateTasks([
      {
        id: `task-${crypto.randomUUID().slice(0, 8)}`,
        title,
        status: "todo",
        note: "",
        created_at: now,
        updated_at: now,
      },
      ...tasks,
    ]);
    setTaskTitle("");
  }

  function patchTask(taskId: string, patch: Partial<DashboardTask>) {
    updateTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...patch, updated_at: new Date().toISOString() } : task)));
  }

  function deleteTask(taskId: string) {
    updateTasks(tasks.filter((task) => task.id !== taskId));
  }

  function reorderPinnedCards(event: DragEndEvent) {
    const activeId = Number(String(event.active.id).replace("pinned-", ""));
    const overId = event.over ? Number(String(event.over.id).replace("pinned-", "")) : NaN;
    if (!Number.isFinite(activeId) || !Number.isFinite(overId) || activeId === overId) {
      return;
    }
    const pinnedIds = pinnedCards.map((card) => card.id);
    const oldIndex = pinnedIds.indexOf(activeId);
    const newIndex = pinnedIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    onUpdatePreferences({ pinned_card_ids: arrayMove(pinnedIds, oldIndex, newIndex) });
  }

  function renderWidget(widget: DashboardWidgetLayout) {
    if (widget.id === "recent_activity") {
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Recent Activity" description="Recently updated entities and local assets." icon={<Activity size={18} />}>
          {activityItems.length ? (
            <div className="home-card-list">
              {activityItems.map((item) => (
                <button
                  key={item.id}
                  className="home-card-row"
                  disabled={!item.cardId}
                  onClick={() => item.cardId && onSelectCard(item.cardId)}
                >
                  {item.coverUrl ? <img src={item.coverUrl} alt="" /> : <span className="home-card-fallback">{item.title.slice(0, 1)}</span>}
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.kind} · {item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyWidget icon={<BookOpen size={16} />} text="No entities or assets yet. Create the first Wiki entity to start this world." />
          )}
        </DashboardWidget>
      );
    }

    if (widget.id === "quick_note") {
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Quick Note" description="Capture a thought directly into Notebook." icon={<NotebookPen size={18} />}>
          <div className="quick-note-card">
            <textarea
              className="themed-textarea"
              aria-label="Quick note"
              value={quickNote}
              placeholder="Catch a thought before it wanders..."
              onChange={(event) => {
                setQuickNote(event.target.value);
                setQuickNoteState("idle");
              }}
              onKeyDown={(event) => handleSubmitKey(event, () => void saveQuickNote())}
            />
            {quickNoteState === "error" ? <p className="inline-message error">Could not save note.</p> : null}
          </div>
        </DashboardWidget>
      );
    }

    if (widget.id === "pinned_cards") {
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Pinned Cards" description="Important entities from Wiki, Characters and Locations." icon={<Pin size={18} />}>
          <div className="dashboard-widget-toolbar">
            <div className="segmented-control compact">
              <button
                className={pinnedView === "list" ? "active" : ""}
                onClick={() => onUpdatePreferences({ dashboard_pinned_view: "list" })}
              >
                List
              </button>
              <button
                className={pinnedView === "cards" ? "active" : ""}
                onClick={() => onUpdatePreferences({ dashboard_pinned_view: "cards" })}
              >
                Cards
              </button>
            </div>
          </div>
          <div className="pinned-search">
            <input
              className="themed-input"
              aria-label="Search cards to pin"
              value={pinnedSearch}
              placeholder="Search Wiki, Characters, Locations..."
              onChange={(event) => setPinnedSearch(event.target.value)}
            />
            {pinnedSearch.trim() ? (
              <div className="pinned-search-results">
                {pinnedSearchResults.length ? (
                  pinnedSearchResults.map((card) => (
                    <button
                      className="home-card-row split"
                      key={card.id}
                      onClick={() => {
                        onPinCard(card.id);
                        setPinnedSearch("");
                      }}
                    >
                      <span>
                        <strong>{card.title}</strong>
                        <small>{roomLabelForCard(card)} · {card.schema_label || "entity"}</small>
                      </span>
                      <Pin size={14} />
                    </button>
                  ))
                ) : (
                  <p className="helper-text">No matching entities.</p>
                )}
              </div>
            ) : null}
          </div>
          {pinnedCards.length ? (
            <DndContext sensors={pinnedSensors} collisionDetection={closestCenter} onDragEnd={reorderPinnedCards}>
              <SortableContext items={pinnedCards.map((card) => `pinned-${card.id}`)} strategy={rectSortingStrategy}>
                <div className={pinnedView === "cards" ? `pinned-card-grid ${widget.size}` : "home-card-list pinned-card-list"}>
                  {pinnedCards.map((card) => (
                    <SortablePinnedCard
                      key={card.id}
                      card={card}
                      onSelect={() => onSelectCard(card.id)}
                      onUnpin={() => onUnpinCard(card.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <EmptyWidget icon={<Pin size={16} />} text="Pin entities from Wiki, Characters or Locations to keep your main anchors here." />
          )}
        </DashboardWidget>
      );
    }

    if (widget.id === "chapters") {
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Chapters" description={`${chapters.length} prepared chapters in this world.`} icon={<Swords size={18} />}>
          <div className="dashboard-widget-toolbar">
            <div className="segmented-control compact">
              <button
                className={chapterView === "list" ? "active" : ""}
                onClick={() => onUpdatePreferences({ dashboard_chapters_view: "list" })}
              >
                List
              </button>
              <button
                className={chapterView === "cards" ? "active" : ""}
                onClick={() => onUpdatePreferences({ dashboard_chapters_view: "cards" })}
              >
                Cards
              </button>
            </div>
            <button className="secondary-button small" onClick={onOpenChapters}>
              <Swords size={14} />
              Open
            </button>
          </div>
          {chapters.length ? (
            <div className={chapterView === "cards" ? "home-chapter-grid" : "home-chapter-list"}>
              {chapters.map((chapter) => (
                <button className="home-chapter-item" key={chapter.id} onClick={onOpenChapters}>
                  {chapter.cover_asset_url ? <img src={chapter.cover_asset_url} alt="" /> : <span className="home-card-fallback">{chapter.title.slice(0, 1)}</span>}
                  <span>
                    <strong>{chapter.title}</strong>
                    <small>{chapter.status || "draft"} · {chapter.scenes.length} scenes · updated {formatDate(chapter.updated_at)}</small>
                    {chapterView === "cards" ? <em>{truncate(chapter.description || chapter.notes_text || "No chapter description yet.", 96)}</em> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyWidget icon={<Swords size={16} />} text="No chapters yet. Create chapters to prepare scenes for Play Mode." />
          )}
        </DashboardWidget>
      );
    }

    if (widget.id === "tasks") {
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Tasks" description={`${todoCount} open tasks stored in this world.`} icon={<CheckCircle2 size={18} />}>
          <div className="dashboard-inline-form">
            <textarea
              className="themed-textarea dashboard-task-input"
              aria-label="New task title"
              value={taskTitle}
              placeholder="Add a task..."
              rows={textareaRows(taskTitle)}
              onChange={(event) => setTaskTitle(event.target.value)}
              onKeyDown={(event) => handleSubmitKey(event, addTask)}
            />
            <button className="secondary-button small" disabled={!taskTitle.trim()} onClick={addTask}>
              Add
            </button>
          </div>
          <div className="dashboard-task-list">
            {tasks.length ? (
              tasks.map((task) => (
                <div className={`dashboard-task-row ${task.status}`} key={task.id}>
                  <button
                    className={task.status === "done" ? "task-check done" : "task-check"}
                    title={task.status === "done" ? "Mark task open" : "Mark task done"}
                    aria-label={`${task.status === "done" ? "Mark open" : "Mark done"}: ${task.title}`}
                    onClick={() => patchTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
                  >
                    {task.status === "done" ? <Check size={11} strokeWidth={3} /> : null}
                  </button>
                  <label className="dashboard-task-title">
                    <textarea
                      className="themed-textarea dashboard-task-edit"
                      aria-label={`Edit task: ${task.title}`}
                      value={task.title}
                      rows={textareaRows(task.title)}
                      onChange={(event) => patchTask(task.id, { title: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <small>Created {formatDate(task.created_at)}</small>
                  </label>
                  <button
                    className="mini-icon-button"
                    title="Delete task"
                    aria-label={`Delete task: ${task.title}`}
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <EmptyWidget icon={<CheckCircle2 size={16} />} text="No tasks yet. Add a lightweight reminder for this project." />
            )}
          </div>
        </DashboardWidget>
      );
    }

    if (widget.id === "asset_reminders") {
      const reminders = assetReminderItems(assetHealth);
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Asset Reminders" description={`${assetReminderCount} file-health reminders.`} icon={<Database size={18} />}>
          {reminders.length ? (
            <div className="dashboard-reminder-list">
              {reminders.map((reminder) => (
                <button className="dashboard-reminder-row" key={reminder.label} onClick={onOpenManager}>
                  <strong>{reminder.count}</strong>
                  <span>{reminder.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyWidget icon={<Database size={16} />} text="No asset reminders right now. Local files look tidy." />
          )}
        </DashboardWidget>
      );
    }

    if (widget.id === "knowledge_summary") {
      const characterCount = cards.filter((card) => card.schema_id === "character" || card.schema_id === "npc").length;
      const locationCount = cards.filter((card) => card.schema_id === "location").length;
      return (
        <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Knowledge Summary" description="A lightweight knowledge graph pulse." icon={<FolderOpen size={18} />}>
          <div className="dashboard-stat-grid">
            <MiniStat label="Wiki entities" value={String(cards.length - characterCount - locationCount)} />
            <MiniStat label="Characters" value={String(characterCount)} />
            <MiniStat label="Locations" value={String(locationCount)} />
            <MiniStat label="Search mentions" value={String(relationCount)} />
          </div>
        </DashboardWidget>
      );
    }

    return (
      <DashboardWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title="Workspace Settings" description="Preferences that travel with this local world." icon={<Settings2 size={18} />}>
        <div className="home-settings-grid">
          <div className="theme-preview-card">
            <span className="theme-preview-dot" />
            <strong>{String(workspace.ui_preferences.typography_preset ?? "literary")} · {String(workspace.ui_preferences.text_scale ?? "100")}%</strong>
            <small>{String(workspace.ui_preferences.density ?? "comfortable")} density · world-backed</small>
          </div>
          <label className="field-stack">
            <span>Accent color</span>
            <select className="themed-select" aria-label="Accent color" value={String(workspace.ui_preferences.accent_color ?? "blue")} onChange={(event) => onUpdatePreferences({ accent_color: event.target.value })}>
              <option value="blue">Cold blue</option>
              <option value="cyan">Glacier cyan</option>
              <option value="indigo">Quiet indigo</option>
              <option value="ice">Ice mist</option>
              <option value="teal">Teal</option>
              <option value="gold">Gold</option>
              <option value="slate">Slate</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Density</span>
            <select className="themed-select" aria-label="Density" value={String(workspace.ui_preferences.density ?? "comfortable")} onChange={(event) => onUpdatePreferences({ density: event.target.value })}>
              <option value="comfortable">Comfortable</option>
              <option value="balanced">Balanced</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Text scale</span>
            <select className="themed-select" aria-label="Text scale" value={String(workspace.ui_preferences.text_scale ?? "100")} onChange={(event) => onUpdatePreferences({ text_scale: event.target.value })}>
              <option value="90">90%</option>
              <option value="95">95%</option>
              <option value="100">100%</option>
              <option value="105">105%</option>
              <option value="110">110%</option>
              <option value="118">118%</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Typography</span>
            <select className="themed-select" aria-label="Typography" value={String(workspace.ui_preferences.typography_preset ?? "literary")} onChange={(event) => onUpdatePreferences({ typography_preset: event.target.value })}>
              <option value="literary">Literary serif</option>
              <option value="editorial">Editorial</option>
              <option value="crisp">Crisp sans</option>
              <option value="technical">Technical mono</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Detail placement</span>
            <select className="themed-select" aria-label="Detail placement" value={String(workspace.ui_preferences.preferred_detail_placement ?? "right")} onChange={(event) => onUpdatePreferences({ preferred_detail_placement: event.target.value })}>
              <option value="right">Right side</option>
              <option value="bottom">Below results</option>
            </select>
          </label>
        </div>
      </DashboardWidget>
    );
  }

  return (
    <section className="workspace-home-pane">
      <div className="home-hero">
        <div className="home-hero-utility">
          <button className="secondary-button" onClick={() => setWidgetSettingsOpen((current) => !current)}>
            <SlidersHorizontal size={14} />
            {widgetSettingsOpen ? "Hide widget settings" : "Customize widgets"}
          </button>
          <button className="secondary-button" title="Open world management" onClick={onOpenManager}>
            <Settings2 size={14} />
            Manage world
          </button>
        </div>
        <div>
          <span className="eyebrow">{workspace.name}</span>
          <h1>Homepage</h1>
          <p>Sweet home of your mind.</p>
          <div className="home-hero-actions">
            <button className="primary-button" title="Current screen">
              <Home size={14} />
              Homepage
            </button>
            <button className="secondary-button" title="Open Chapters and scenes" onClick={onOpenChapters}>
              <Swords size={14} />
              Chapters
            </button>
            <button className="secondary-button" title="Open Wiki workspace" onClick={onOpenWiki}>
              <BookOpen size={14} />
              Wiki
            </button>
            <button className="secondary-button" title="Open Characters" onClick={onOpenCharacters}>
              <Users size={14} />
              Characters
            </button>
            <button className="secondary-button" title="Open Locations" onClick={onOpenLocations}>
              <MapPin size={14} />
              Locations
            </button>
            <button className="secondary-button" title="Open Plots and Chronology workspace" onClick={onOpenPlots}>
              <Milestone size={14} />
              Plots
            </button>
            <button className="secondary-button" title="Open Boards and Moodboards workspace" onClick={onOpenBoard}>
              <Images size={14} />
              Boards
            </button>
            <button className="secondary-button" title="Open table view" onClick={onOpenTable}>
              <Table2 size={14} />
              Table View
            </button>
          </div>
        </div>
      </div>

      {widgetSettingsOpen ? (
        <section className="home-panel dashboard-settings-panel">
          <div className="section-header">
            <div>
              <h2>Dashboard widgets</h2>
              <p className="helper-text">Enable, resize and reorder the Home widgets. These preferences stay in this local world.</p>
            </div>
            <SlidersHorizontal size={18} />
          </div>
          <div className="dashboard-widget-settings-list">
            {[...widgetLayout].sort((left, right) => left.order - right.order).map((widget, index) => (
              <div className="dashboard-widget-setting-row" key={widget.id}>
                <label className="tiny-toggle">
                  <input type="checkbox" checked={widget.enabled} onChange={(event) => patchWidget(widget.id, { enabled: event.target.checked })} />
                  <span>{widgetLabel(widget.id)}</span>
                </label>
                <select className="mini-select" value={widget.size} onChange={(event) => patchWidget(widget.id, { size: event.target.value as DashboardWidgetSize })}>
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
                <ColorPalettePicker
                  value={widgetTint(widget.id) === "system" ? undefined : widgetTint(widget.id)}
                  label={`Widget color: ${widgetLabel(widget.id)}`}
                  align="right"
                  triggerClassName="widget-tint-trigger"
                  onChange={(color) => patchWidgetTint(widget.id, color as WidgetTint)}
                  onClear={() => patchWidgetTint(widget.id, "system")}
                />
                <button className="mini-icon-button" title="Move widget up" disabled={index === 0} onClick={() => moveWidget(widget.id, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button className="mini-icon-button" title="Move widget down" disabled={index === widgetLayout.length - 1} onClick={() => moveWidget(widget.id, 1)}>
                  <ArrowDown size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="dashboard-widget-grid">
        {enabledWidgets.length ? enabledWidgets.map(renderWidget) : (
          <section className="home-panel dashboard-widget wide">
            <EmptyWidget icon={<EyeOff size={16} />} text="All widgets are hidden. Open Customize widgets to bring them back." />
          </section>
        )}
      </div>
    </section>
  );
}

function DashboardWidget({
  widget,
  tint,
  title,
  description,
  icon,
  children,
}: {
  widget: DashboardWidgetLayout;
  tint: WidgetTint;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const customTint = tint !== "system" ? tint : "";
  return (
    <section
      className={`home-panel dashboard-widget dashboard-widget-${widget.id} ${widget.size} ${customTint ? "tint-custom" : "tint-system"}`}
      style={customTint ? ({ "--widget-tint": customTint } as React.CSSProperties) : undefined}
    >
      <div className="section-header">
        <div>
          <h2 className="dashboard-widget-title">
            <span>{title}</span>
            <span className="dashboard-widget-title-icon">{icon}</span>
          </h2>
          <p className="helper-text">{description}</p>
        </div>
      </div>
      <div className={`dashboard-widget-content ${widget.size}`}>{children}</div>
    </section>
  );
}

function EmptyWidget({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty-state compact">
      {icon}
      <p>{text}</p>
    </div>
  );
}

function SortablePinnedCard({
  card,
  onSelect,
  onUnpin,
}: {
  card: CardListItem;
  onSelect: () => void;
  onUnpin: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `pinned-${card.id}` });
  return (
    <div
      ref={setNodeRef}
      className={`home-card-row split pinned-card-item${isDragging ? " dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <button className="home-card-link" onClick={onSelect}>
        {card.cover_url ? <img src={card.cover_url} alt="" /> : <span className="home-card-fallback">{card.title.slice(0, 1)}</span>}
        <span>
          <strong>{card.title}</strong>
          <small>{roomLabelForCard(card)} · {card.schema_label || "entity"}</small>
        </span>
      </button>
      <button
        className="mini-icon-button"
        title="Unpin entity"
        onClick={(event) => {
          event.stopPropagation();
          onUnpin();
        }}
      >
        ×
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function normalizeWidgetTints(value: unknown): Partial<Record<DashboardWidgetId, WidgetTint>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [DashboardWidgetId, WidgetTint] =>
        isWidgetId(entry[0]) && isWidgetTint(entry[1]),
    ),
  );
}

function isWidgetId(value: string): value is DashboardWidgetId {
  return [
    "recent_activity",
    "quick_note",
    "chapters",
    "pinned_cards",
    "tasks",
    "asset_reminders",
    "knowledge_summary",
    "workspace_settings",
  ].includes(value);
}

function isWidgetTint(value: unknown): value is WidgetTint {
  return value === "system" || isHexColor(value);
}

function isHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

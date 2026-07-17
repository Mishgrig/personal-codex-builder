import { useEffect, useRef, useState } from "react";
import type React from "react";
import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Check,
  Dice5,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Info,
  Layers3,
  Link2,
  Map as MapIcon,
  NotebookPen,
  Play,
  ScrollText,
  Settings2,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Board,
  CardListItem,
  Chapter,
  ChapterCreatePayload,
  ChapterUpdatePayload,
  DiceShortcutCreatePayload,
  DiceShortcutUpdatePayload,
  PlotEvent,
  ReferenceCreatePayload,
  Scene,
  SceneCreatePayload,
  SceneTokenCreatePayload,
  SceneTokenUpdatePayload,
  SceneUpdatePayload,
  WorkspaceAsset,
  WorkspaceSummary,
} from "../../types/models";
import { ColorPalettePicker } from "../../shared/components/ColorPalettePicker";
import { IconButton } from "../../shared/components/IconButton";

interface ChaptersPaneProps {
  workspace: WorkspaceSummary;
  chapters: Chapter[];
  cards: CardListItem[];
  assets: WorkspaceAsset[];
  boards: Board[];
  events: PlotEvent[];
  onCreateChapter: (payload: ChapterCreatePayload) => Promise<Chapter>;
  onUpdateChapter: (chapterId: number, payload: ChapterUpdatePayload) => Promise<Chapter>;
  onDeleteChapter: (chapterId: number) => Promise<void>;
  onAddChapterReference: (chapterId: number, payload: ReferenceCreatePayload) => Promise<Chapter>;
  onDeleteChapterReference: (referenceId: number) => Promise<Chapter>;
  onCreateScene: (chapterId: number, payload: SceneCreatePayload) => Promise<Chapter>;
  onUpdateScene: (sceneId: number, payload: SceneUpdatePayload) => Promise<Chapter>;
  onDeleteScene: (sceneId: number) => Promise<Chapter>;
  onAddSceneReference: (sceneId: number, payload: ReferenceCreatePayload) => Promise<Chapter>;
  onDeleteSceneReference: (referenceId: number) => Promise<Chapter>;
  onCreateSceneToken: (sceneId: number, payload: SceneTokenCreatePayload) => Promise<Chapter>;
  onUpdateSceneToken: (tokenId: number, payload: SceneTokenUpdatePayload) => Promise<Chapter>;
  onDeleteSceneToken: (tokenId: number) => Promise<Chapter>;
  onCreateSceneDiceShortcut: (sceneId: number, payload: DiceShortcutCreatePayload) => Promise<Chapter>;
  onUpdateDiceShortcut: (shortcutId: number, payload: DiceShortcutUpdatePayload) => Promise<Chapter>;
  onDeleteDiceShortcut: (shortcutId: number) => Promise<Chapter>;
  onOpenCard: (cardId: number) => void;
  onUpdatePreferences: (patch: Record<string, unknown>) => void;
}

interface DiceRoll {
  id: string;
  formula: string;
  total: number;
  detail: string;
}

type ChaptersWidgetId = "shelf" | "chapter_prep" | "linked_materials" | "scenes" | "scene_materials";
type ChaptersWidgetSize = "compact" | "normal" | "wide";
type ChaptersWidgetTint = "system" | `#${string}`;
type ChaptersWidgetTintMap = Record<string, ChaptersWidgetTint>;
type ChaptersWidgetIconMap = Record<string, ChaptersWidgetIconId>;

interface ChaptersWidgetLayout {
  id: ChaptersWidgetId;
  enabled: boolean;
  order: number;
  size: ChaptersWidgetSize;
  title?: string;
}

const DEFAULT_CHAPTERS_WIDGET_LAYOUT: ChaptersWidgetLayout[] = [
  { id: "shelf", enabled: true, order: 10, size: "compact" },
  { id: "chapter_prep", enabled: true, order: 20, size: "wide" },
  { id: "linked_materials", enabled: true, order: 30, size: "compact" },
  { id: "scenes", enabled: true, order: 40, size: "wide" },
  { id: "scene_materials", enabled: true, order: 50, size: "compact" },
];

const CHAPTERS_WIDGET_INFO: Record<ChaptersWidgetId, string> = {
  shelf: "Create, select, and organize chapters in this world.",
  chapter_prep: "Edit the selected chapter's title, status, description, and prep notes.",
  linked_materials: "Attach world materials and references to the selected chapter.",
  scenes: "Create, select, and prepare scenes inside the selected chapter.",
  scene_materials: "Attach scene references, tokens, and player/GM-visible materials.",
};

const CHAPTERS_WIDGET_ICON_OPTIONS = [
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "scroll", label: "Scroll", Icon: ScrollText },
  { id: "layers", label: "Layers", Icon: Layers3 },
  { id: "link", label: "Link", Icon: Link2 },
  { id: "map", label: "Map", Icon: MapIcon },
  { id: "note", label: "Notebook", Icon: NotebookPen },
  { id: "settings", label: "Settings", Icon: Settings2 },
  { id: "users", label: "Users", Icon: Users },
] as const satisfies ReadonlyArray<{ id: string; label: string; Icon: LucideIcon }>;

type ChaptersWidgetIconId = (typeof CHAPTERS_WIDGET_ICON_OPTIONS)[number]["id"];

const CHAPTERS_WIDGET_ICON_IDS = new Set<string>(CHAPTERS_WIDGET_ICON_OPTIONS.map((option) => option.id));

const DEFAULT_CHAPTERS_WIDGET_ICONS: Record<ChaptersWidgetId, ChaptersWidgetIconId> = {
  shelf: "book",
  chapter_prep: "scroll",
  linked_materials: "link",
  scenes: "layers",
  scene_materials: "map",
};

export function ChaptersPane({
  workspace,
  chapters,
  cards,
  assets,
  boards,
  events,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onAddChapterReference,
  onDeleteChapterReference,
  onCreateScene,
  onUpdateScene,
  onDeleteScene,
  onAddSceneReference,
  onDeleteSceneReference,
  onCreateSceneToken,
  onUpdateSceneToken,
  onDeleteSceneToken,
  onCreateSceneDiceShortcut,
  onUpdateDiceShortcut,
  onDeleteDiceShortcut,
  onOpenCard,
  onUpdatePreferences,
}: ChaptersPaneProps) {
  const [selectedChapterId, setSelectedChapterId] = useNumericSelection(chapters[0]?.id ?? null, chapters.map((chapter) => chapter.id));
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0] ?? null;
  const [selectedSceneId, setSelectedSceneId] = useNumericSelection(
    selectedChapter?.scenes[0]?.id ?? null,
    selectedChapter?.scenes.map((scene) => scene.id) ?? [],
  );
  const selectedScene = selectedChapter?.scenes.find((scene) => scene.id === selectedSceneId) ?? selectedChapter?.scenes[0] ?? null;
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [targetType, setTargetType] = useState<ReferenceCreatePayload["target_type"]>("entity");
  const [targetId, setTargetId] = useState("");
  const [referenceRole, setReferenceRole] = useState("related");
  const [referenceVisibility, setReferenceVisibility] = useState("gm");
  const [tokenCardId, setTokenCardId] = useState("");
  const [tokenAssetId, setTokenAssetId] = useState("");
  const [diceLabel, setDiceLabel] = useState("");
  const [diceFormula, setDiceFormula] = useState("d20");
  const [quickNote, setQuickNote] = useState("");
  const [playView, setPlayView] = useState<"gm" | "players">("gm");
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false);
  const [diceLog, setDiceLog] = useState<DiceRoll[]>([]);
  const widgetLayout = normalizeChaptersWidgetLayout(workspace.ui_preferences.chapters_widget_layout);
  const widgetTints = normalizeChaptersWidgetTints(workspace.ui_preferences.chapters_widget_tints);
  const widgetIcons = normalizeChaptersWidgetIcons(workspace.ui_preferences.chapters_widget_icons);
  const enabledWidgets = widgetLayout.filter((widget) => widget.enabled).sort((left, right) => left.order - right.order);
  const widgetSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const materialOptions = buildReferenceOptions(targetType, cards, assets, boards, events);
  const visibleSceneReferences = selectedScene?.references.filter((reference) => playView === "gm" || reference.visibility === "players") ?? [];
  const visibleTokens = selectedScene?.tokens.filter((token) => playView === "gm" || token.visibility === "players") ?? [];
  const visibleDice = selectedScene?.dice_shortcuts.filter((shortcut) => playView === "gm" || shortcut.visibility === "players") ?? [];
  const characterCards = cards.filter((card) => ["character", "npc", "creature"].includes(card.schema_id ?? ""));

  async function createChapter() {
    const title = newChapterTitle.trim() || `Chapter ${chapters.length + 1}`;
    const chapter = await onCreateChapter({ title, status: "prep" });
    setNewChapterTitle("");
    setSelectedChapterId(chapter.id);
  }

  async function createScene() {
    if (!selectedChapter) return;
    const title = newSceneTitle.trim() || `Scene ${selectedChapter.scenes.length + 1}`;
    const chapter = await onCreateScene(selectedChapter.id, { title, status: "prep" });
    setNewSceneTitle("");
    setSelectedSceneId(chapter.scenes.at(-1)?.id ?? null);
  }

  async function addReference(scope: "chapter" | "scene") {
    if (!targetId.trim()) return;
    const payload = {
      target_type: targetType,
      target_id: targetId,
      role: referenceRole.trim() || "related",
      visibility: referenceVisibility,
    };
    if (scope === "chapter" && selectedChapter) {
      await onAddChapterReference(selectedChapter.id, payload);
    }
    if (scope === "scene" && selectedScene) {
      await onAddSceneReference(selectedScene.id, payload);
    }
  }

  async function addSceneToken() {
    if (!selectedScene) return;
    const cardId = tokenCardId ? Number(tokenCardId) : null;
    const assetId = tokenAssetId || null;
    const card = cards.find((item) => item.id === cardId);
    const asset = assets.find((item) => item.id === assetId);
    await onCreateSceneToken(selectedScene.id, {
      label: card?.title ?? asset?.original_filename ?? "Scene token",
      card_id: cardId,
      asset_id: assetId,
      visibility: "gm",
      x: 120 + selectedScene.tokens.length * 22,
      y: 120 + selectedScene.tokens.length * 18,
    });
  }

  async function addDiceShortcut() {
    if (!selectedScene || !diceFormula.trim()) return;
    await onCreateSceneDiceShortcut(selectedScene.id, {
      label: diceLabel.trim() || diceFormula.trim(),
      formula: diceFormula.trim(),
      visibility: "gm",
    });
    setDiceLabel("");
    setDiceFormula("d20");
  }

  async function saveQuickNote() {
    if (!selectedScene || !quickNote.trim()) return;
    const note = {
      id: `note-${crypto.randomUUID().slice(0, 8)}`,
      text: quickNote.trim(),
      visibility: "gm",
      created_at: new Date().toISOString(),
    };
    await onUpdateScene(selectedScene.id, {
      quick_notes_json: [...selectedScene.quick_notes_json, note],
    });
    setQuickNote("");
  }

  function rollDice(formula: string) {
    const result = evaluateDice(formula);
    setDiceLog((current) => [{ id: `roll-${crypto.randomUUID().slice(0, 8)}`, formula, ...result }, ...current].slice(0, 12));
  }

  function updateWidgetLayout(nextLayout: ChaptersWidgetLayout[]) {
    onUpdatePreferences({ chapters_widget_layout: nextLayout });
  }

  function patchWidget(widgetId: ChaptersWidgetId, patch: Partial<ChaptersWidgetLayout>) {
    updateWidgetLayout(widgetLayout.map((widget) => (widget.id === widgetId ? { ...widget, ...patch } : widget)));
  }

  function reorderWidgets(event: DragEndEvent) {
    const activeId = String(event.active.id) as ChaptersWidgetId;
    const overId = event.over ? (String(event.over.id) as ChaptersWidgetId) : "";
    if (!overId || activeId === overId) {
      return;
    }
    const sorted = [...widgetLayout].sort((left, right) => left.order - right.order);
    const oldIndex = sorted.findIndex((widget) => widget.id === activeId);
    const newIndex = sorted.findIndex((widget) => widget.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    updateWidgetLayout(arrayMove(sorted, oldIndex, newIndex).map((widget, order) => ({ ...widget, order: (order + 1) * 10 })));
  }

  function patchWidgetTint(widgetId: ChaptersWidgetId, tint: ChaptersWidgetTint) {
    onUpdatePreferences({ chapters_widget_tints: { ...widgetTints, [widgetId]: tint } });
  }

  function patchWidgetIcon(widgetId: ChaptersWidgetId, iconId: ChaptersWidgetIconId) {
    onUpdatePreferences({ chapters_widget_icons: { ...widgetIcons, [widgetId]: iconId } });
  }

  function widgetTint(widgetId: ChaptersWidgetId) {
    return widgetTints[widgetId] ?? "system";
  }

  function widgetIconId(widgetId: ChaptersWidgetId) {
    return widgetIcons[widgetId] ?? DEFAULT_CHAPTERS_WIDGET_ICONS[widgetId];
  }

  function renderChaptersWidget(widget: ChaptersWidgetLayout) {
    const title = chaptersWidgetLabel(widget);
    const icon = <ChaptersWidgetIcon iconId={widgetIconId(widget.id)} size={18} />;
    if (widget.id === "shelf") {
      return (
        <ChapterWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title={title}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shelf</span>
              <h2>{title}</h2>
            </div>
            <span className="chapter-widget-heading-icon">{icon}</span>
          </div>
          <div className="dashboard-inline-form">
            <input className="themed-input" value={newChapterTitle} placeholder="New chapter..." onChange={(event) => setNewChapterTitle(event.target.value)} />
            <button className="primary-button small" onClick={() => void createChapter()}>Add</button>
          </div>
          <div className="reference-list">
            {chapters.map((chapter) => (
              <button className={`reference-card ${chapter.id === selectedChapter?.id ? "active" : ""}`} key={chapter.id} onClick={() => setSelectedChapterId(chapter.id)}>
                <strong>{chapter.title}</strong>
                <span>{chapter.scenes.length} scenes · {chapter.references.length} linked materials</span>
              </button>
            ))}
            {!chapters.length ? <p className="helper-text">Create the first Chapter to gather entities, scenes, maps, boards and dice shortcuts.</p> : null}
          </div>
        </ChapterWidget>
      );
    }
    if (widget.id === "chapter_prep") {
      return (
        <ChapterWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title={title}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Chapter Prep</span>
              <h2>{selectedChapter?.title ?? "No chapter selected"}</h2>
            </div>
            <div className="chapter-widget-heading-actions">
              <span className="chapter-widget-heading-icon">{icon}</span>
              {selectedChapter ? <button className="secondary-button danger small" onClick={() => void onDeleteChapter(selectedChapter.id)}>Delete</button> : null}
            </div>
          </div>
          {selectedChapter ? (
            <div className="form-grid two">
              <label>
                <span>Title</span>
                <input
                  className="themed-input"
                  defaultValue={selectedChapter.title}
                  key={`chapter-title-${selectedChapter.id}`}
                  onBlur={(event) => void onUpdateChapter(selectedChapter.id, { title: event.currentTarget.value })}
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  className="themed-select"
                  defaultValue={selectedChapter.status}
                  key={`chapter-status-${selectedChapter.id}`}
                  onChange={(event) => void onUpdateChapter(selectedChapter.id, { status: event.currentTarget.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="prep">Prep</option>
                  <option value="ready">Ready</option>
                  <option value="played">Played</option>
                </select>
              </label>
              <label className="campaign-span-2">
                <span>Description</span>
                <textarea
                  className="themed-textarea compact"
                  defaultValue={selectedChapter.description}
                  key={`chapter-description-${selectedChapter.id}`}
                  placeholder="What this chapter is about, what it gathers, and what the table should feel."
                  onBlur={(event) => void onUpdateChapter(selectedChapter.id, { description: event.currentTarget.value })}
                />
              </label>
              <label className="campaign-span-2">
                <span>Prep notes</span>
                <textarea
                  className="themed-textarea compact"
                  defaultValue={selectedChapter.notes_text}
                  key={`chapter-notes-${selectedChapter.id}`}
                  placeholder="Hooks, open questions, prep reminders..."
                  onBlur={(event) => void onUpdateChapter(selectedChapter.id, { notes_text: event.currentTarget.value })}
                />
              </label>
            </div>
          ) : (
            <p className="helper-text">No chapter selected.</p>
          )}
        </ChapterWidget>
      );
    }
    if (widget.id === "linked_materials") {
      return (
        <ChapterWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title={title}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Linked Materials</span>
              <h2>{title}</h2>
            </div>
            <span className="chapter-widget-heading-icon">{icon}</span>
          </div>
          <ReferencePicker
            targetType={targetType}
            targetId={targetId}
            role={referenceRole}
            visibility={referenceVisibility}
            options={materialOptions}
            onTargetTypeChange={setTargetType}
            onTargetIdChange={setTargetId}
            onRoleChange={setReferenceRole}
            onVisibilityChange={setReferenceVisibility}
            onAdd={() => void addReference("chapter")}
          />
          <ReferenceList references={selectedChapter?.references ?? []} onDelete={(id) => void onDeleteChapterReference(id)} />
        </ChapterWidget>
      );
    }
    if (widget.id === "scenes") {
      return (
        <ChapterWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title={title}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Scenes</span>
              <h2>{title}</h2>
            </div>
            <div className="chapter-widget-heading-actions">
              <span className="chapter-widget-heading-icon">{icon}</span>
              <div className="dashboard-inline-form">
                <input className="themed-input" value={newSceneTitle} placeholder="New scene..." onChange={(event) => setNewSceneTitle(event.target.value)} />
                <button className="primary-button small" disabled={!selectedChapter} onClick={() => void createScene()}>Add scene</button>
              </div>
            </div>
          </div>
          <div className="chapter-scene-layout">
            <div className="reference-list">
              {selectedChapter?.scenes.map((scene) => (
                <button className={`reference-card ${scene.id === selectedScene?.id ? "active" : ""}`} key={scene.id} onClick={() => setSelectedSceneId(scene.id)}>
                  <strong>{scene.title}</strong>
                  <span>{scene.tokens.length} tokens · {scene.dice_shortcuts.length} dice · {scene.references.length} refs</span>
                </button>
              ))}
              {selectedChapter && !selectedChapter.scenes.length ? <p className="helper-text">Add scenes that can be opened in Play mode.</p> : null}
            </div>
            <SceneEditor scene={selectedScene} assets={assets} onUpdateScene={onUpdateScene} onDeleteScene={onDeleteScene} />
          </div>
        </ChapterWidget>
      );
    }
    return (
      <ChapterWidget key={widget.id} widget={widget} tint={widgetTint(widget.id)} title={title}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Scene Materials</span>
            <h2>{title}</h2>
          </div>
          <span className="chapter-widget-heading-icon">{icon}</span>
        </div>
        <ReferencePicker
          targetType={targetType}
          targetId={targetId}
          role={referenceRole}
          visibility={referenceVisibility}
          options={materialOptions}
          onTargetTypeChange={setTargetType}
          onTargetIdChange={setTargetId}
          onRoleChange={setReferenceRole}
          onVisibilityChange={setReferenceVisibility}
          onAdd={() => void addReference("scene")}
          showVisibility
        />
        <ReferenceList references={selectedScene?.references ?? []} onDelete={(id) => void onDeleteSceneReference(id)} />
        <div className="form-grid two">
          <select className="themed-select" value={tokenCardId} onChange={(event) => setTokenCardId(event.target.value)}>
            <option value="">Token entity...</option>
            {characterCards.map((card) => <option key={card.id} value={card.id}>{card.title}</option>)}
          </select>
          <select className="themed-select" value={tokenAssetId} onChange={(event) => setTokenAssetId(event.target.value)}>
            <option value="">Token asset...</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}
          </select>
          <button className="secondary-button small campaign-span-2" disabled={!selectedScene} onClick={() => void addSceneToken()}>
            <Users size={14} />
            Add token
          </button>
        </div>
        <div className="reference-list">
          {selectedScene?.tokens.map((token) => (
            <div className="reference-card" key={token.id}>
              <strong>{token.label || token.card_title || token.asset_filename || "Token"}</strong>
              <span>{token.visibility} · x {Math.round(token.x)} / y {Math.round(token.y)}</span>
              <div className="dice-presets">
                <button className="secondary-button small" onClick={() => void onUpdateSceneToken(token.id, { visibility: token.visibility === "players" ? "gm" : "players" })}>
                  {token.visibility === "players" ? "GM only" : "Players"}
                </button>
                <button className="secondary-button danger small" onClick={() => void onDeleteSceneToken(token.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </ChapterWidget>
    );
  }

  const widgetSettingsPanel = (
    <>
      <div className="workspace-manager-header">
        <div>
          <h2 className="dashboard-widget-title">
            <span>Chapters widgets</span>
            <span className="dashboard-widget-title-icon"><SlidersHorizontal size={18} /></span>
          </h2>
          <p>Enable, resize and reorder the Chapters widgets. These preferences stay in this local world.</p>
        </div>
        <IconButton title="Close widget settings" aria-label="Close widget settings" onClick={() => setWidgetSettingsOpen(false)}>
          <X size={16} />
        </IconButton>
      </div>
      <DndContext sensors={widgetSensors} collisionDetection={closestCenter} onDragEnd={reorderWidgets}>
        <SortableContext items={[...widgetLayout].sort((left, right) => left.order - right.order).map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
          <div className="dashboard-widget-settings-list">
            {[...widgetLayout].sort((left, right) => left.order - right.order).map((widget) => (
              <SortableChaptersWidgetSettingRow key={widget.id} widget={widget}>
                <div className="widget-setting-title">
                  <label className="tiny-toggle widget-enabled-toggle" aria-label={`Show ${chaptersWidgetLabel(widget)}`}>
                    <input type="checkbox" checked={widget.enabled} onChange={(event) => patchWidget(widget.id, { enabled: event.target.checked })} />
                  </label>
                  <EditableChaptersWidgetTitle
                    value={widget.title ?? ""}
                    placeholder={chaptersWidgetLabel(widget.id)}
                    ariaLabel={`Widget title: ${chaptersWidgetLabel(widget)}`}
                    onCommit={(title) => patchWidget(widget.id, { title })}
                  />
                  <ChaptersWidgetInfo label={chaptersWidgetLabel(widget.id)} description={CHAPTERS_WIDGET_INFO[widget.id]} />
                </div>
                <ChaptersWidgetSizePicker value={widget.size} onChange={(size) => patchWidget(widget.id, { size })} />
                <ColorPalettePicker
                  value={widgetTint(widget.id) === "system" ? undefined : widgetTint(widget.id)}
                  label={`Widget color: ${chaptersWidgetLabel(widget)}`}
                  paletteVariant="widget"
                  align="right"
                  triggerClassName="widget-tint-trigger"
                  onChange={(color) => patchWidgetTint(widget.id, color as ChaptersWidgetTint)}
                  onClear={() => patchWidgetTint(widget.id, "system")}
                  displayColor={chapterWidgetDisplayColor(widgetTint(widget.id))}
                  mapDisplayColor={chapterWidgetDisplayColor}
                />
                <ChaptersWidgetIconPicker value={widgetIconId(widget.id)} onChange={(iconId) => patchWidgetIcon(widget.id, iconId)} />
              </SortableChaptersWidgetSettingRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );

  return (
    <section className="campaign-workspace chapters-workspace">
      <div className="campaign-hero">
        <div>
          <span className="eyebrow">World / Chapters</span>
          <h1>{workspace.name}</h1>
          <p>Prep playable chapters from canonical entities, then run each scene locally with a GM screen and player preview.</p>
        </div>
        <div className="chapters-hero-actions">
          <button className="secondary-button" onClick={() => setWidgetSettingsOpen(true)} aria-expanded={widgetSettingsOpen} aria-controls="chapters-widget-settings">
            <SlidersHorizontal size={14} />
            Customize widgets
          </button>
          <div className="segmented-control">
            <button className="active">
              <BookOpen size={14} />
              Prep
            </button>
            <button disabled title="Open a scene below to use Play mode">
              <Play size={14} />
              Play
            </button>
          </div>
        </div>
      </div>

      <div className="campaign-grid chapters-widget-grid">
        {enabledWidgets.map(renderChaptersWidget)}

        <article className="content-card campaign-span-2">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Play Mode</span>
              <h2>{selectedScene?.title ?? "Select a scene"}</h2>
            </div>
            <div className="segmented-control">
              <button className={playView === "gm" ? "active" : ""} onClick={() => setPlayView("gm")}><EyeOff size={14} /> GM</button>
              <button className={playView === "players" ? "active" : ""} onClick={() => setPlayView("players")}><Eye size={14} /> Player preview</button>
            </div>
          </div>
          <div className="play-stage" style={selectedScene?.background_asset_url ? { backgroundImage: `linear-gradient(rgba(5, 10, 20, 0.5), rgba(5, 10, 20, 0.78)), url(${selectedScene.background_asset_url})` } : undefined}>
            <div className="play-stage-panel">
              <span className="eyebrow">{playView === "gm" ? "GM screen" : "Player preview"}</span>
              <h3>{selectedScene?.title ?? "No scene selected"}</h3>
              <p>{playView === "gm" ? selectedScene?.gm_notes_text || selectedScene?.summary : selectedScene?.player_notes_text || selectedScene?.summary}</p>
            </div>
            <div className="play-token-layer">
              {visibleTokens.map((token) => (
                <button
                  className="play-token"
                  key={token.id}
                  style={{ left: token.x, top: token.y, width: token.width, height: token.height }}
                  title={token.notes || token.label}
                  onClick={() => token.card_id ? onOpenCard(token.card_id) : undefined}
                >
                  {token.asset_url ? <img src={token.asset_url} alt="" /> : <span>{(token.label || token.card_title || "?").slice(0, 2)}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="campaign-grid">
            <div className="content-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Scene links</span>
                  <h2>Visible materials</h2>
                </div>
                <Image size={18} />
              </div>
              <ReferenceList references={visibleSceneReferences} onDelete={(id) => void onDeleteSceneReference(id)} readonly={playView === "players"} />
            </div>
            <div className="content-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Quick notes</span>
                  <h2>Runtime notes</h2>
                </div>
                <NotebookPen size={18} />
              </div>
              <textarea className="themed-textarea compact" value={quickNote} placeholder="What happened at the table..." onChange={(event) => setQuickNote(event.target.value)} />
              <button className="secondary-button small" disabled={!selectedScene || !quickNote.trim()} onClick={() => void saveQuickNote()}>Save note</button>
              <div className="reference-list">
                {selectedScene?.quick_notes_json.map((note) => (
                  <div className="reference-card" key={String(note.id ?? note.created_at ?? note.text)}>
                    <strong>{String(note.text ?? "")}</strong>
                    <span>{String(note.visibility ?? "gm")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="content-card campaign-span-2">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Dice</span>
                  <h2>Shortcuts</h2>
                </div>
                <Dice5 size={18} />
              </div>
              <div className="form-grid two">
                <input className="themed-input" value={diceLabel} placeholder="Attack, skill check..." onChange={(event) => setDiceLabel(event.target.value)} />
                <input className="themed-input" value={diceFormula} placeholder="1d20+5" onChange={(event) => setDiceFormula(event.target.value)} />
                <button className="secondary-button small campaign-span-2" disabled={!selectedScene} onClick={() => void addDiceShortcut()}>Save shortcut</button>
              </div>
              <div className="dice-presets">
                {visibleDice.map((shortcut) => (
                  <button className="secondary-button small" key={shortcut.id} onClick={() => rollDice(shortcut.formula)}>
                    {shortcut.label}: {shortcut.formula}
                  </button>
                ))}
                {selectedScene?.dice_shortcuts.map((shortcut) => (
                  <button className="icon-button danger" key={`delete-${shortcut.id}`} title="Remove dice shortcut" onClick={() => void onDeleteDiceShortcut(shortcut.id)}>×</button>
                ))}
              </div>
              <div className="dice-log">
                {diceLog.map((roll) => (
                  <div className="dice-roll" key={roll.id}>
                    <strong>{roll.formula}: {roll.total}</strong>
                    <span>{roll.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
      {widgetSettingsOpen ? (
        <div className="modal-backdrop" onClick={() => setWidgetSettingsOpen(false)}>
          <section
            id="chapters-widget-settings"
            className="modal-card workspace-manager-modal dashboard-settings-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {widgetSettingsPanel}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ChapterWidget({
  widget,
  tint,
  title,
  children,
}: {
  widget: ChaptersWidgetLayout;
  tint: ChaptersWidgetTint;
  title: string;
  children: React.ReactNode;
}) {
  const customTint = tint !== "system" ? tint : "";
  return (
    <article
      className={`content-card chapter-widget chapter-widget-${widget.id} ${widget.size} ${customTint ? "tint-custom" : "tint-system"}`}
      aria-label={`${title} widget`}
      style={customTint ? ({ "--chapter-widget-tint": customTint } as React.CSSProperties) : undefined}
    >
      {children}
    </article>
  );
}

function EditableChaptersWidgetTitle({
  value,
  placeholder,
  ariaLabel,
  onCommit,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);

  useEffect(() => {
    setDraft(value);
    lastCommitted.current = value;
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      commitChaptersWidgetTitle(draft, lastCommitted, onCommit);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, onCommit]);

  return (
    <input
      className="widget-title-input"
      aria-label={ariaLabel}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commitChaptersWidgetTitle(draft, lastCommitted, onCommit)}
    />
  );
}

function commitChaptersWidgetTitle(
  draft: string,
  lastCommitted: React.MutableRefObject<string>,
  onCommit: (value: string) => void,
) {
  const next = draft.trim();
  if (next === lastCommitted.current) {
    return;
  }
  lastCommitted.current = next;
  onCommit(next);
}

function ChaptersWidgetIcon({ iconId, size = 18 }: { iconId: ChaptersWidgetIconId; size?: number }) {
  const option = CHAPTERS_WIDGET_ICON_OPTIONS.find((item) => item.id === iconId) ?? CHAPTERS_WIDGET_ICON_OPTIONS[0];
  const Icon = option.Icon;
  return <Icon size={size} />;
}

function ChaptersWidgetIconPicker({ value, onChange }: { value: ChaptersWidgetIconId; onChange: (value: ChaptersWidgetIconId) => void }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const current = CHAPTERS_WIDGET_ICON_OPTIONS.find((option) => option.id === value) ?? CHAPTERS_WIDGET_ICON_OPTIONS[0];
  return (
    <details ref={detailsRef} className="widget-icon-picker">
      <summary className="widget-icon-trigger" aria-label={`Widget icon: ${current.label}`} title={`Widget icon: ${current.label}`}>
        <ChaptersWidgetIcon iconId={current.id} size={16} />
      </summary>
      <div className="widget-icon-menu" role="menu" aria-label="Widget icons">
        {CHAPTERS_WIDGET_ICON_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? "active" : ""}
            aria-label={`Use ${option.label} icon`}
            title={option.label}
            onClick={() => {
              onChange(option.id);
              if (detailsRef.current) {
                detailsRef.current.open = false;
              }
            }}
          >
            <ChaptersWidgetIcon iconId={option.id} size={16} />
          </button>
        ))}
      </div>
    </details>
  );
}

function ChaptersWidgetInfo({ label, description }: { label: string; description: string }) {
  return (
    <span className="widget-info">
      <button type="button" className="widget-info-button" aria-label={`${label} widget info`}>
        <Info size={14} />
      </button>
      <span className="widget-info-popover" role="tooltip">
        {description}
      </span>
    </span>
  );
}

function ChaptersWidgetSizePicker({ value, onChange }: { value: ChaptersWidgetSize; onChange: (value: ChaptersWidgetSize) => void }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const options: ChaptersWidgetSize[] = ["compact", "normal", "wide"];
  const labels: Record<ChaptersWidgetSize, string> = {
    compact: "Square widget",
    normal: "Double-width widget",
    wide: "Full-width widget",
  };
  return (
    <details ref={detailsRef} className="widget-size-picker">
      <summary className="widget-size-trigger" aria-label={labels[value]} title={labels[value]}>
        <ChaptersWidgetSizeIcon size={value} />
      </summary>
      <div className="widget-size-menu">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? "active" : ""}
            aria-label={`Set ${labels[option].toLowerCase()}`}
            title={labels[option]}
            onClick={() => {
              onChange(option);
              if (detailsRef.current) {
                detailsRef.current.open = false;
              }
            }}
          >
            <ChaptersWidgetSizeIcon size={option} />
          </button>
        ))}
      </div>
    </details>
  );
}

function ChaptersWidgetSizeIcon({ size }: { size: ChaptersWidgetSize }) {
  return (
    <span className={`widget-size-icon ${size}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SortableChaptersWidgetSettingRow({
  widget,
  children,
}: {
  widget: ChaptersWidgetLayout;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  return (
    <div
      ref={setNodeRef}
      className={`dashboard-widget-setting-row${isDragging ? " dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button className="mini-icon-button drag-handle" title={`Reorder ${chaptersWidgetLabel(widget)}`} aria-label={`Reorder ${chaptersWidgetLabel(widget)}`} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

const CHAPTERS_WIDGET_LABELS: Record<ChaptersWidgetId, string> = {
  shelf: "Shelf",
  chapter_prep: "Chapter Prep",
  linked_materials: "Linked Materials",
  scenes: "Scenes",
  scene_materials: "Scene Materials",
};

function chaptersWidgetLabel(widget: ChaptersWidgetLayout | ChaptersWidgetId) {
  if (typeof widget === "string") {
    return CHAPTERS_WIDGET_LABELS[widget];
  }
  return widget.title?.trim() || CHAPTERS_WIDGET_LABELS[widget.id];
}

function normalizeChaptersWidgetLayout(value: unknown): ChaptersWidgetLayout[] {
  const source = Array.isArray(value) ? value : [];
  const fromPrefs = new Map<string, Partial<ChaptersWidgetLayout>>();
  for (const item of source) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (!isChaptersWidgetId(record.id)) {
      continue;
    }
    fromPrefs.set(record.id, {
      id: record.id,
      enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
      order: Number.isFinite(Number(record.order)) ? Number(record.order) : undefined,
      size: isChaptersWidgetSize(record.size) ? record.size : undefined,
      title: typeof record.title === "string" ? record.title : undefined,
    });
  }
  return DEFAULT_CHAPTERS_WIDGET_LAYOUT.map((fallback) => {
    const saved = fromPrefs.get(fallback.id) ?? {};
    return {
      ...fallback,
      ...saved,
      id: fallback.id,
      enabled: saved.enabled ?? fallback.enabled,
      order: saved.order ?? fallback.order,
      size: saved.size ?? fallback.size,
    };
  }).sort((left, right) => left.order - right.order);
}

function normalizeChaptersWidgetTints(value: unknown): ChaptersWidgetTintMap {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, ChaptersWidgetTint] => isChaptersWidgetId(entry[0]) && isChaptersWidgetTint(entry[1]),
    ),
  );
}

function normalizeChaptersWidgetIcons(value: unknown): ChaptersWidgetIconMap {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([widgetId, iconId]) => [widgetId, typeof iconId === "string" && CHAPTERS_WIDGET_ICON_IDS.has(iconId) ? iconId : ""] as const)
      .filter((entry): entry is [string, ChaptersWidgetIconId] => isChaptersWidgetId(entry[0]) && CHAPTERS_WIDGET_ICON_IDS.has(entry[1])),
  );
}

function isChaptersWidgetId(value: unknown): value is ChaptersWidgetId {
  return typeof value === "string" && value in CHAPTERS_WIDGET_LABELS;
}

function isChaptersWidgetSize(value: unknown): value is ChaptersWidgetSize {
  return value === "compact" || value === "normal" || value === "wide";
}

function isChaptersWidgetTint(value: unknown): value is ChaptersWidgetTint {
  return value === "system" || isHexColor(value);
}

function isHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function chapterWidgetDisplayColor(color: string) {
  return isHexColor(color) ? `color-mix(in srgb, ${color} 14%, #fffaf3)` : "transparent";
}

function SceneEditor({
  scene,
  assets,
  onUpdateScene,
  onDeleteScene,
}: {
  scene: Scene | null;
  assets: WorkspaceAsset[];
  onUpdateScene: (sceneId: number, payload: SceneUpdatePayload) => Promise<Chapter>;
  onDeleteScene: (sceneId: number) => Promise<Chapter>;
}) {
  if (!scene) {
    return <p className="helper-text">Select or create a scene.</p>;
  }
  return (
    <div className="form-grid">
      <div className="form-grid two">
        <label>
          <span>Scene title</span>
          <input className="themed-input" defaultValue={scene.title} key={`scene-title-${scene.id}`} onBlur={(event) => void onUpdateScene(scene.id, { title: event.currentTarget.value })} />
        </label>
        <label>
          <span>Status</span>
          <select className="themed-select" defaultValue={scene.status} key={`scene-status-${scene.id}`} onChange={(event) => void onUpdateScene(scene.id, { status: event.currentTarget.value })}>
            <option value="prep">Prep</option>
            <option value="ready">Ready</option>
            <option value="playing">Playing</option>
            <option value="played">Played</option>
          </select>
        </label>
      </div>
      <label>
        <span>Summary</span>
        <textarea className="themed-textarea compact" defaultValue={scene.summary} key={`scene-summary-${scene.id}`} onBlur={(event) => void onUpdateScene(scene.id, { summary: event.currentTarget.value })} />
      </label>
      <div className="form-grid two">
        <label>
          <span>Background</span>
          <select className="themed-select" defaultValue={scene.background_asset_id ?? ""} key={`scene-bg-${scene.id}`} onChange={(event) => void onUpdateScene(scene.id, { background_asset_id: event.currentTarget.value || null })}>
            <option value="">No background</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}
          </select>
        </label>
        <label>
          <span>Map</span>
          <select className="themed-select" defaultValue={scene.map_asset_id ?? ""} key={`scene-map-${scene.id}`} onChange={(event) => void onUpdateScene(scene.id, { map_asset_id: event.currentTarget.value || null })}>
            <option value="">No map</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          <span>GM notes</span>
          <textarea className="themed-textarea compact" defaultValue={scene.gm_notes_text} key={`scene-gm-${scene.id}`} onBlur={(event) => void onUpdateScene(scene.id, { gm_notes_text: event.currentTarget.value })} />
        </label>
        <label>
          <span>Player notes</span>
          <textarea className="themed-textarea compact" defaultValue={scene.player_notes_text} key={`scene-player-${scene.id}`} onBlur={(event) => void onUpdateScene(scene.id, { player_notes_text: event.currentTarget.value })} />
        </label>
      </div>
      <button className="secondary-button danger small" onClick={() => void onDeleteScene(scene.id)}>Delete scene</button>
    </div>
  );
}

function ReferencePicker({
  targetType,
  targetId,
  role,
  visibility,
  options,
  onTargetTypeChange,
  onTargetIdChange,
  onRoleChange,
  onVisibilityChange,
  onAdd,
  showVisibility = false,
}: {
  targetType: ReferenceCreatePayload["target_type"];
  targetId: string;
  role: string;
  visibility: string;
  options: Array<{ id: string; label: string }>;
  onTargetTypeChange: (value: ReferenceCreatePayload["target_type"]) => void;
  onTargetIdChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onAdd: () => void;
  showVisibility?: boolean;
}) {
  return (
    <div className="form-grid">
      <div className="form-grid two">
        <select
          className="themed-select"
          value={targetType}
          onChange={(event) => {
            onTargetTypeChange(event.target.value);
            onTargetIdChange("");
          }}
        >
          <option value="entity">Entity</option>
          <option value="asset">Asset</option>
          <option value="board">Board</option>
          <option value="event">Timeline event</option>
          <option value="map">Map asset</option>
        </select>
        <select className="themed-select" value={targetId} onChange={(event) => onTargetIdChange(event.target.value)}>
          <option value="">Choose material...</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>
      <div className="form-grid two">
        <input className="themed-input" value={role} placeholder="Role: cast, map, handout..." onChange={(event) => onRoleChange(event.target.value)} />
        {showVisibility ? (
          <select className="themed-select" value={visibility} onChange={(event) => onVisibilityChange(event.target.value)}>
            <option value="gm">GM only</option>
            <option value="players">Players</option>
          </select>
        ) : null}
      </div>
      <button className="secondary-button small" disabled={!targetId} onClick={onAdd}>Link material</button>
    </div>
  );
}

function ReferenceList({
  references,
  onDelete,
  readonly = false,
}: {
  references: Array<{ id: number; label: string; target_title: string | null; target_type: string; role: string; visibility?: string }>;
  onDelete: (id: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="reference-list">
      {references.map((reference) => (
        <div className="reference-card" key={reference.id}>
          <strong>{reference.label || reference.target_title || `${reference.target_type} #${reference.id}`}</strong>
          <span>{reference.target_type} · {reference.role}{reference.visibility ? ` · ${reference.visibility}` : ""}</span>
          {!readonly ? <button className="secondary-button danger small" onClick={() => onDelete(reference.id)}>Unlink</button> : null}
        </div>
      ))}
      {!references.length ? <p className="helper-text">No linked materials yet.</p> : null}
    </div>
  );
}

function buildReferenceOptions(
  targetType: ReferenceCreatePayload["target_type"],
  cards: CardListItem[],
  assets: WorkspaceAsset[],
  boards: Board[],
  events: PlotEvent[],
) {
  if (targetType === "asset" || targetType === "map") {
    return assets.map((asset) => ({ id: asset.id, label: asset.original_filename }));
  }
  if (targetType === "board") {
    return boards.map((board) => ({ id: String(board.id), label: board.title }));
  }
  if (targetType === "event") {
    return events.map((event) => ({ id: String(event.id), label: event.title }));
  }
  return cards.map((card) => ({ id: String(card.id), label: card.title }));
}

function evaluateDice(formula: string): Omit<DiceRoll, "id" | "formula"> {
  const match = formula.trim().toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) {
    return { total: 0, detail: "Use formulas like d20, 2d6 or 4d6+2." };
  }
  const count = Math.min(20, Math.max(1, Number(match[1] || 1)));
  const sides = Math.min(1000, Math.max(2, Number(match[2])));
  const modifier = Number(match[3] ?? 0);
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  const modifierLabel = modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : "";
  return { total, detail: `${rolls.join(" + ")}${modifierLabel}` };
}

function useNumericSelection(initialValue: number | null, validIds: number[]) {
  const [value, setValue] = useState<number | null>(initialValue);
  useEffect(() => {
    if (value && validIds.includes(value)) return;
    setValue(validIds[0] ?? null);
  }, [validIds.join(","), value]);
  return [value, setValue] as const;
}

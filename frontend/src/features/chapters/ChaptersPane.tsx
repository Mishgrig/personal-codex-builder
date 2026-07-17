import { useEffect, useState } from "react";
import { BookOpen, Dice5, Eye, EyeOff, Image, Link2, Map, NotebookPen, Play, Plus, Users } from "lucide-react";
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
}

interface DiceRoll {
  id: string;
  formula: string;
  total: number;
  detail: string;
}

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
  const [diceLog, setDiceLog] = useState<DiceRoll[]>([]);
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

  return (
    <section className="campaign-workspace chapters-workspace">
      <div className="campaign-hero">
        <div>
          <span className="eyebrow">World / Chapters</span>
          <h1>{workspace.name}</h1>
          <p>Prep playable chapters from canonical entities, then run each scene locally with a GM screen and player preview.</p>
        </div>
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

      <div className="campaign-grid">
        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shelf</span>
              <h2>Chapters</h2>
            </div>
            <Plus size={18} />
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
        </article>

        <article className="content-card campaign-span-2">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Chapter Prep</span>
              <h2>{selectedChapter?.title ?? "No chapter selected"}</h2>
            </div>
            {selectedChapter ? <button className="secondary-button danger small" onClick={() => void onDeleteChapter(selectedChapter.id)}>Delete</button> : null}
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
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Linked Materials</span>
              <h2>Chapter references</h2>
            </div>
            <Link2 size={18} />
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
        </article>

        <article className="content-card campaign-span-2">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Scenes</span>
              <h2>Scene prep</h2>
            </div>
            <div className="dashboard-inline-form">
              <input className="themed-input" value={newSceneTitle} placeholder="New scene..." onChange={(event) => setNewSceneTitle(event.target.value)} />
              <button className="primary-button small" disabled={!selectedChapter} onClick={() => void createScene()}>Add scene</button>
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
            <SceneEditor
              scene={selectedScene}
              assets={assets}
              onUpdateScene={onUpdateScene}
              onDeleteScene={onDeleteScene}
            />
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Scene Materials</span>
              <h2>Refs and tokens</h2>
            </div>
            <Map size={18} />
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
        </article>

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
    </section>
  );
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

import { BookOpen, Dice5, Eye, EyeOff, FileText, ListChecks, ScrollText, Shield, Swords, UserRound } from "lucide-react";
import type { CardListItem, WorkspaceSummary } from "../../types/models";

interface CampaignPaneProps {
  workspace: WorkspaceSummary;
  cards: CardListItem[];
  onUpdatePreferences: (patch: Record<string, unknown>) => void;
  onOpenCard: (cardId: number) => void;
}

interface CampaignQuest {
  id: string;
  title: string;
  status: "active" | "completed" | "hidden";
  visibility: "gm" | "players";
}

interface CampaignSession {
  id: string;
  title: string;
  date: string;
  notes: string;
}

interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  hp: string;
  visibility: "gm" | "players";
}

interface DiceRoll {
  id: string;
  formula: string;
  total: number;
  detail: string;
}

interface CampaignState {
  visibilityMode: "gm" | "players";
  currentArc: string;
  partyGoal: string;
  quests: CampaignQuest[];
  sessions: CampaignSession[];
  initiative: InitiativeEntry[];
  diceLog: DiceRoll[];
}

const DEFAULT_CAMPAIGN: CampaignState = {
  visibilityMode: "gm",
  currentArc: "",
  partyGoal: "",
  quests: [],
  sessions: [],
  initiative: [],
  diceLog: [],
};

export function CampaignPane({ workspace, cards, onUpdatePreferences, onOpenCard }: CampaignPaneProps) {
  const campaign = normalizeCampaign(workspace.ui_preferences.campaign_mode);
  const characters = cards.filter((card) => card.schema_id === "character" || card.schema_id === "npc");
  const handouts = cards.filter((card) => !["character", "npc"].includes(card.schema_id ?? "")).slice(0, 12);
  const visibleQuests = campaign.quests.filter((quest) => campaign.visibilityMode === "gm" || quest.visibility === "players");
  const visibleInitiative = campaign.initiative.filter((entry) => campaign.visibilityMode === "gm" || entry.visibility === "players");

  function save(next: CampaignState) {
    onUpdatePreferences({ campaign_mode: next });
  }

  function patch(patchValue: Partial<CampaignState>) {
    save({ ...campaign, ...patchValue });
  }

  function addQuest() {
    patch({
      quests: [
        {
          id: makeId("quest"),
          title: "New quest or contract",
          status: "active",
          visibility: "gm",
        },
        ...campaign.quests,
      ],
    });
  }

  function updateQuest(id: string, patchValue: Partial<CampaignQuest>) {
    patch({ quests: campaign.quests.map((quest) => (quest.id === id ? { ...quest, ...patchValue } : quest)) });
  }

  function removeQuest(id: string) {
    patch({ quests: campaign.quests.filter((quest) => quest.id !== id) });
  }

  function addSession() {
    patch({
      sessions: [
        {
          id: makeId("session"),
          title: `Session ${campaign.sessions.length + 1}`,
          date: new Date().toISOString().slice(0, 10),
          notes: "",
        },
        ...campaign.sessions,
      ],
    });
  }

  function updateSession(id: string, patchValue: Partial<CampaignSession>) {
    patch({ sessions: campaign.sessions.map((session) => (session.id === id ? { ...session, ...patchValue } : session)) });
  }

  function removeSession(id: string) {
    patch({ sessions: campaign.sessions.filter((session) => session.id !== id) });
  }

  function addInitiativeEntry() {
    patch({
      initiative: [
        ...campaign.initiative,
        {
          id: makeId("turn"),
          name: "Creature",
          initiative: 10,
          hp: "",
          visibility: "gm" as const,
        },
      ].sort((left, right) => right.initiative - left.initiative),
    });
  }

  function updateInitiativeEntry(id: string, patchValue: Partial<InitiativeEntry>) {
    patch({
      initiative: campaign.initiative
        .map((entry) => (entry.id === id ? { ...entry, ...patchValue } : entry))
        .sort((left, right) => right.initiative - left.initiative),
    });
  }

  function removeInitiativeEntry(id: string) {
    patch({ initiative: campaign.initiative.filter((entry) => entry.id !== id) });
  }

  function rollDice(formula: string) {
    const result = evaluateDice(formula);
    patch({
      diceLog: [{ id: makeId("roll"), formula, ...result }, ...campaign.diceLog].slice(0, 16),
    });
  }

  return (
    <section className="campaign-workspace">
      <div className="campaign-hero">
        <div>
          <span className="eyebrow">Campaign cockpit</span>
          <h1>{workspace.name}</h1>
          <p>GM-first workspace for quests, sessions, NPC references, player handouts, initiative and quick dice.</p>
        </div>
        <div className="segmented-control">
          <button className={campaign.visibilityMode === "gm" ? "active" : ""} onClick={() => patch({ visibilityMode: "gm" })}>
            <EyeOff size={14} />
            GM
          </button>
          <button className={campaign.visibilityMode === "players" ? "active" : ""} onClick={() => patch({ visibilityMode: "players" })}>
            <Eye size={14} />
            Players
          </button>
        </div>
      </div>

      <div className="campaign-grid">
        <article className="content-card campaign-span-2">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Overview</span>
              <h2>Current arc</h2>
            </div>
            <Shield size={18} />
          </div>
          <div className="form-grid two">
            <label>
              <span>Arc name</span>
              <input className="themed-input" value={campaign.currentArc} placeholder="The frozen crown, Chapter II..." onChange={(event) => patch({ currentArc: event.target.value })} />
            </label>
            <label>
              <span>Party goal</span>
              <input className="themed-input" value={campaign.partyGoal} placeholder="Find the missing heir before the moon festival" onChange={(event) => patch({ partyGoal: event.target.value })} />
            </label>
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Quests</span>
              <h2>Contracts</h2>
            </div>
            <button className="secondary-button small" onClick={addQuest}>Add quest</button>
          </div>
          <div className="campaign-list">
            {visibleQuests.length ? visibleQuests.map((quest) => (
              <div className="campaign-row" key={quest.id}>
                <input className="themed-input" value={quest.title} onChange={(event) => updateQuest(quest.id, { title: event.target.value })} />
                <select className="mini-select" value={quest.status} onChange={(event) => updateQuest(quest.id, { status: event.target.value as CampaignQuest["status"] })}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="hidden">Hidden</option>
                </select>
                <select className="mini-select" value={quest.visibility} onChange={(event) => updateQuest(quest.id, { visibility: event.target.value as CampaignQuest["visibility"] })}>
                  <option value="gm">GM only</option>
                  <option value="players">Players</option>
                </select>
                <button className="icon-button danger" title="Remove quest" onClick={() => removeQuest(quest.id)}>×</button>
              </div>
            )) : <p className="helper-text">No visible quests yet. Add one to start tracking contracts and hooks.</p>}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">NPCs</span>
              <h2>Character shortlist</h2>
            </div>
            <UserRound size={18} />
          </div>
          <div className="reference-list">
            {characters.slice(0, 10).map((card) => (
              <button className="reference-card" key={card.id} onClick={() => onOpenCard(card.id)}>
                <strong>{card.title}</strong>
                <span>{card.schema_label ?? "Character"}</span>
              </button>
            ))}
            {!characters.length ? <p className="helper-text">Create Character cards and they will appear here as campaign NPCs.</p> : null}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Sessions</span>
              <h2>Chronicle</h2>
            </div>
            <button className="secondary-button small" onClick={addSession}>Add session</button>
          </div>
          <div className="campaign-list">
            {campaign.sessions.map((session) => (
              <div className="session-card" key={session.id}>
                <div className="form-grid two">
                  <input className="themed-input" value={session.title} onChange={(event) => updateSession(session.id, { title: event.target.value })} />
                  <input className="themed-input" type="date" value={session.date} onChange={(event) => updateSession(session.id, { date: event.target.value })} />
                </div>
                <textarea className="themed-textarea compact" value={session.notes} placeholder="Recap, unresolved hooks, rewards, cliffhangers..." onChange={(event) => updateSession(session.id, { notes: event.target.value })} />
                <button className="secondary-button danger small" onClick={() => removeSession(session.id)}>Remove session</button>
              </div>
            ))}
            {!campaign.sessions.length ? <p className="helper-text">Session notes stay inside this local workspace database.</p> : null}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Handouts</span>
              <h2>Wiki references</h2>
            </div>
            <FileText size={18} />
          </div>
          <div className="reference-list">
            {handouts.map((card) => (
              <button className="reference-card" key={card.id} onClick={() => onOpenCard(card.id)}>
                <strong>{card.title}</strong>
                <span>{card.schema_label ?? "Wiki card"}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="content-card campaign-span-2">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Encounter</span>
              <h2>Initiative tracker</h2>
            </div>
            <button className="secondary-button small" onClick={addInitiativeEntry}>Add turn</button>
          </div>
          <div className="initiative-table">
            {visibleInitiative.map((entry) => (
              <div className="initiative-row" key={entry.id}>
                <input className="themed-input" value={entry.name} onChange={(event) => updateInitiativeEntry(entry.id, { name: event.target.value })} />
                <input className="mini-input" type="number" value={entry.initiative} onChange={(event) => updateInitiativeEntry(entry.id, { initiative: Number(event.target.value) || 0 })} />
                <input className="mini-input" value={entry.hp} placeholder="HP" onChange={(event) => updateInitiativeEntry(entry.id, { hp: event.target.value })} />
                <select className="mini-select" value={entry.visibility} onChange={(event) => updateInitiativeEntry(entry.id, { visibility: event.target.value as InitiativeEntry["visibility"] })}>
                  <option value="gm">GM only</option>
                  <option value="players">Players</option>
                </select>
                <button className="icon-button danger" title="Remove turn" onClick={() => removeInitiativeEntry(entry.id)}>×</button>
              </div>
            ))}
            {!visibleInitiative.length ? <p className="helper-text">Add creatures and PCs, then switch to Players mode for a safe visible subset.</p> : null}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Dice</span>
              <h2>Quick roller</h2>
            </div>
            <Dice5 size={18} />
          </div>
          <div className="dice-presets">
            {["d20", "2d6", "d100", "4d6+2"].map((formula) => (
              <button className="secondary-button small" key={formula} onClick={() => rollDice(formula)}>{formula}</button>
            ))}
          </div>
          <div className="dice-log">
            {campaign.diceLog.map((roll) => (
              <div className="dice-roll" key={roll.id}>
                <strong>{roll.formula}: {roll.total}</strong>
                <span>{roll.detail}</span>
              </div>
            ))}
            {!campaign.diceLog.length ? <p className="helper-text">Rolls are local and kept only in this workspace.</p> : null}
          </div>
        </article>
      </div>

      <div className="campaign-footer">
        <span><ListChecks size={14} /> Quests/contracts</span>
        <span><ScrollText size={14} /> Session chronicle</span>
        <span><BookOpen size={14} /> Handouts from Wiki</span>
        <span><Swords size={14} /> Initiative</span>
      </div>
    </section>
  );
}

function normalizeCampaign(value: unknown): CampaignState {
  if (!value || typeof value !== "object") {
    return DEFAULT_CAMPAIGN;
  }
  const raw = value as Partial<CampaignState>;
  return {
    visibilityMode: raw.visibilityMode === "players" ? "players" : "gm",
    currentArc: typeof raw.currentArc === "string" ? raw.currentArc : "",
    partyGoal: typeof raw.partyGoal === "string" ? raw.partyGoal : "",
    quests: Array.isArray(raw.quests) ? raw.quests.map(normalizeQuest) : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions.map(normalizeSession) : [],
    initiative: Array.isArray(raw.initiative) ? raw.initiative.map(normalizeInitiative).sort((left, right) => right.initiative - left.initiative) : [],
    diceLog: Array.isArray(raw.diceLog) ? raw.diceLog.map(normalizeRoll).slice(0, 16) : [],
  };
}

function normalizeQuest(value: unknown): CampaignQuest {
  const raw = value && typeof value === "object" ? value as Partial<CampaignQuest> : {};
  return {
    id: typeof raw.id === "string" ? raw.id : makeId("quest"),
    title: typeof raw.title === "string" ? raw.title : "Untitled quest",
    status: raw.status === "completed" || raw.status === "hidden" ? raw.status : "active",
    visibility: raw.visibility === "players" ? "players" : "gm",
  };
}

function normalizeSession(value: unknown): CampaignSession {
  const raw = value && typeof value === "object" ? value as Partial<CampaignSession> : {};
  return {
    id: typeof raw.id === "string" ? raw.id : makeId("session"),
    title: typeof raw.title === "string" ? raw.title : "Session",
    date: typeof raw.date === "string" ? raw.date : new Date().toISOString().slice(0, 10),
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

function normalizeInitiative(value: unknown): InitiativeEntry {
  const raw = value && typeof value === "object" ? value as Partial<InitiativeEntry> : {};
  return {
    id: typeof raw.id === "string" ? raw.id : makeId("turn"),
    name: typeof raw.name === "string" ? raw.name : "Creature",
    initiative: typeof raw.initiative === "number" ? raw.initiative : Number(raw.initiative ?? 0) || 0,
    hp: typeof raw.hp === "string" ? raw.hp : "",
    visibility: raw.visibility === "players" ? "players" : "gm",
  };
}

function normalizeRoll(value: unknown): DiceRoll {
  const raw = value && typeof value === "object" ? value as Partial<DiceRoll> : {};
  return {
    id: typeof raw.id === "string" ? raw.id : makeId("roll"),
    formula: typeof raw.formula === "string" ? raw.formula : "d20",
    total: typeof raw.total === "number" ? raw.total : 0,
    detail: typeof raw.detail === "string" ? raw.detail : "",
  };
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

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Pin, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { queryClient } from "../../app/queryClient";
import { AutoResizeTextarea } from "../../shared/components/AutoResizeTextarea";
import { CollapsibleSection } from "../../shared/components/CollapsibleSection";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { IconButton } from "../../shared/components/IconButton";
import { GallerySection } from "../media/GallerySection";
import { AttachmentsSection } from "../media/AttachmentsSection";
import { SourcesSection } from "../sources/SourcesSection";
import { RelationsSection } from "../relations/RelationsSection";
import type { CardDetail, CardListItem, CardSchema, TaxonomyTerm } from "../../types/models";
import { highlightText } from "../../utils/highlight";

const RichTextEditor = lazy(() =>
  import("../editor/RichTextEditor").then((module) => ({ default: module.RichTextEditor })),
);

interface DetailPaneProps {
  workspaceSlug: string | null;
  card: CardDetail | null;
  query: string;
  taxonomyTerms: TaxonomyTerm[];
  schemas: CardSchema[];
  allCards: CardListItem[];
  pinned: boolean;
  onRefresh: () => Promise<void>;
  onTogglePinned: (cardId: number) => void;
  onDeleteCurrent: () => Promise<void>;
  onOpenCard: (cardId: number) => void;
  onOpenCategoryManager: () => void;
  recentCustomColors?: string[];
  onRememberCustomColor?: (color: string) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function DetailPane({
  workspaceSlug,
  card,
  query,
  taxonomyTerms,
  schemas,
  allCards,
  pinned,
  onRefresh,
  onTogglePinned,
  onDeleteCurrent,
  onOpenCard,
  onOpenCategoryManager,
  recentCustomColors = [],
  onRememberCustomColor,
}: DetailPaneProps) {
  const [draft, setDraft] = useState<CardDetail | null>(card);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const lastSavedSnapshot = useRef("");

  useEffect(() => {
    if (!card) {
      setDraft(null);
      lastSavedSnapshot.current = "";
      return;
    }
    setDraft(card);
    lastSavedSnapshot.current = snapshot(card);
  }, [card]);

  useEffect(() => {
    if (!draft || !workspaceSlug) {
      return;
    }
    const currentSnapshot = snapshot(draft);
    if (currentSnapshot === lastSavedSnapshot.current) {
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const updated = await api.updateCard(workspaceSlug, draft.id, toPayload(draft));
        setDraft(updated);
        setSaveState("saved");
        lastSavedSnapshot.current = snapshot(updated);
        queryClient.setQueryData(["card", workspaceSlug, draft.id], updated);
        await queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] });
      } catch (_error) {
        setSaveState("error");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, workspaceSlug]);

  const schema = draft?.schema_id ? schemas.find((item) => item.id === draft.schema_id) ?? null : null;
  const coverUrl = draft?.cover_url ?? draft?.gallery[0]?.url ?? null;
  const mentionCandidates = allCards.filter((item) => item.id !== draft?.id);
  const provenance = readProvenance(draft?.dynamic_fields?._provenance);

  if (!draft || !workspaceSlug) {
    return (
      <section className="detail-pane empty">
        <div className="empty-state">
          <h2>No entity selected</h2>
          <p>Choose an entity on the left, or create a new one to begin your Wiki.</p>
        </div>
      </section>
    );
  }

  function setTaxonomyIds(nextIds: number[]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            taxonomy_terms: taxonomyTerms.filter((term) => nextIds.includes(term.id)),
          }
        : current,
    );
  }

  function applyRemoteCard(updated: CardDetail) {
    setDraft(updated);
    lastSavedSnapshot.current = snapshot(updated);
    queryClient.setQueryData(["card", workspaceSlug, updated.id], updated);
    void queryClient.invalidateQueries({ queryKey: ["cards", workspaceSlug] });
  }

  const searchMatches = buildSearchMatches(draft, query);
  const mentionedCards = findMentionedCards(draft.body_text, allCards, draft.id);

  return (
    <section className="detail-pane">
      <div className="pane-header detail-header">
        <div>
          <h2>Entity</h2>
          <p>{saveLabel(saveState, draft.updated_at, draft.created_at)}</p>
        </div>
        <div className="detail-header-actions">
          <IconButton title={pinned ? "Unpin entity from Home" : "Pin entity to Home"} onClick={() => onTogglePinned(draft.id)}>
            <Pin size={16} fill={pinned ? "currentColor" : "none"} />
          </IconButton>
          <IconButton danger title="Archive entity" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <article className="detail-card">
        {provenance ? (
          <div className="provenance-banner">
            <strong>{provenance.mode === "snapshot" ? "Snapshot copy" : "Linked canon"}</strong>
            <span>
              From {provenance.source_workspace_name || provenance.source_workspace_slug}: {provenance.source_card_title}
            </span>
          </div>
        ) : null}
        <div className="detail-topline">
          <div className="title-stack">
            <input
              className="title-input"
              value={draft.title}
              placeholder="Untitled entity"
              onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
            />
            <AutoResizeTextarea
              className="summary-input"
              value={draft.summary}
              onChange={(event) => setDraft((current) => (current ? { ...current, summary: event.target.value } : current))}
              placeholder="Summary"
            />
            <div className="detail-meta-grid">
              <label className="field-stack">
                <span>Status</span>
                <select
                  className="themed-select"
                  value={draft.status}
                  onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value } : current))}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Entity Type</span>
                <select
                  className="themed-select"
                  value={draft.schema_id ?? ""}
                  onChange={(event) => {
                    const nextSchemaId = event.target.value || null;
                    const nextSchema = schemas.find((item) => item.id === nextSchemaId);
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            schema_id: nextSchemaId,
                            schema: nextSchema ?? null,
                          }
                        : current,
                    );
                  }}
                >
                  <option value="">No entity type</option>
                  {schemas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-stack">
                <span>Created</span>
                <strong>{formatDateTime(draft.created_at)}</strong>
              </div>
              <div className="field-stack">
                <span>Updated</span>
                <strong>{formatDateTime(draft.updated_at)}</strong>
              </div>
            </div>
          </div>
          <button
            className={`cover-frame compact ${coverUrl ? "" : "placeholder"}`}
            type="button"
            onClick={() => coverUrl && setCoverPreviewOpen(true)}
            title={coverUrl ? "Open cover preview" : "No cover selected yet"}
          >
            {coverUrl ? (
              <img src={coverUrl} alt={draft.title} className="cover-image" />
            ) : (
              <span>No cover</span>
            )}
          </button>
        </div>

        <div className="tag-zone">
          <div className="section-header">
            <h3>Categories & tags</h3>
            <IconButton title="Manage categories and tags" aria-label="Manage categories and tags" onClick={onOpenCategoryManager}>
              <Plus size={14} />
            </IconButton>
          </div>
          {["domain", "type", "subtype", "layer"].map((category) => (
            <div className="taxonomy-editor" key={category}>
              <span className="field-label">{capitalize(category)}</span>
              <div className="tag-row">
                {draft.taxonomy_terms
                  .filter((term) => term.category === category)
                  .map((term) => (
                    <span className={`tag-chip ${category}`} key={term.id}>
                      {term.label}
                      <button
                        className="tag-remove"
                        onClick={() =>
                          setTaxonomyIds(draft.taxonomy_terms.filter((item) => item.id !== term.id).map((item) => item.id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <select
                  className="mini-select"
                  value=""
                  onChange={(event) => {
                    const termId = Number(event.target.value);
                    if (!termId) {
                      return;
                    }
                    const nextIds = Array.from(new Set([...draft.taxonomy_terms.map((item) => item.id), termId]));
                    setTaxonomyIds(nextIds);
                    event.currentTarget.value = "";
                  }}
                >
                  <option value="">Add {category}</option>
                  {taxonomyTerms
                    .filter((term) => term.category === category)
                    .map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {schema?.fields.length ? (
          <CollapsibleSection title="Fields">
            <div className="dynamic-grid">
              {schema.fields
                .filter((field) => field.show_in_card)
                .map((field) => (
                  <DynamicFieldEditor
                    key={field.field_id}
                    field={field}
                    value={draft.dynamic_fields[field.field_id]}
                    onChange={(nextValue) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              dynamic_fields: { ...current.dynamic_fields, [field.field_id]: nextValue },
                            }
                          : current,
                      )
                    }
                  />
                ))}
            </div>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection title="Gallery">
          <GallerySection workspaceSlug={workspaceSlug} card={draft} onUpdated={applyRemoteCard} />
        </CollapsibleSection>
        <CollapsibleSection title="Attachments">
          <AttachmentsSection workspaceSlug={workspaceSlug} card={draft} onUpdated={applyRemoteCard} />
        </CollapsibleSection>

        {query && searchMatches.length ? (
          <section className="detail-section">
            <div className="section-header">
              <h3>Search matches</h3>
            </div>
            <div className="search-preview-list">
              {searchMatches.map((match) => (
                <p className="search-preview" key={match.label}>
                  <strong>{match.label}:</strong> {highlightText(match.text, query)}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {mentionedCards.length ? (
          <section className="detail-section">
            <div className="section-header">
              <h3>Mentions</h3>
            </div>
            <div className="mention-chip-row">
              {mentionedCards.map((mentionedCard) => (
                <button className="mention-chip" key={mentionedCard.id} onClick={() => onOpenCard(mentionedCard.id)}>
                  @{mentionedCard.title}
                  <span className="mention-preview">
                    <strong>{mentionedCard.title}</strong>
                    <small>{roomLabelForCard(mentionedCard)} · {mentionedCard.schema_label || "entity"}</small>
                    <em>{mentionedCard.summary || "No summary yet."}</em>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <CollapsibleSection title="Body">
          <div className="mention-tools">
            <label className="field-stack compact-field">
              <span>Insert @ mention</span>
              <select
                className="themed-select"
                value=""
                onChange={(event) => {
                  const targetId = Number(event.target.value);
                  const target = mentionCandidates.find((item) => item.id === targetId);
                  if (!target) {
                    return;
                  }
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          body_json: appendMentionToDoc(current.body_json, target.title),
                          body_text: appendMentionToText(current.body_text, target.title),
                        }
                      : current,
                  );
                  event.currentTarget.value = "";
                }}
              >
                <option value="">Choose a Wiki, Character or Location entity…</option>
                {mentionCandidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {roomLabelForCard(item)} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Suspense fallback={<div className="editor-shell loading">Preparing editor…</div>}>
            <RichTextEditor
              value={draft.body_json}
              recentCustomColors={recentCustomColors}
              onRememberCustomColor={onRememberCustomColor}
              onChange={(bodyJson) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        body_json: bodyJson,
                      }
                    : current,
                )
              }
            />
          </Suspense>
        </CollapsibleSection>

        <CollapsibleSection title="Sources">
          <SourcesSection workspaceSlug={workspaceSlug} card={draft} onRefresh={onRefresh} />
        </CollapsibleSection>
        <CollapsibleSection title="Relations">
          <RelationsSection
            workspaceSlug={workspaceSlug}
            card={draft}
            candidates={allCards}
            onUpdated={applyRemoteCard}
            onOpenCard={onOpenCard}
          />
        </CollapsibleSection>

      </article>

      {coverPreviewOpen && coverUrl ? (
        <div className="modal-backdrop" onClick={() => setCoverPreviewOpen(false)}>
          <div className="modal-card compact-media-modal" onClick={(event) => event.stopPropagation()}>
            <img src={coverUrl} alt={draft.title} className="detail-cover-preview" />
          </div>
        </div>
      ) : null}
      {deleteConfirmOpen ? (
        <ConfirmDialog
          title="Archive entity"
          description="The entity will be hidden from normal views but stay recoverable in the local world."
          confirmLabel="Archive entity"
          danger
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            void onDeleteCurrent();
          }}
        />
      ) : null}
    </section>
  );
}

function DynamicFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CardSchema["fields"][number];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <label className="field-stack">
        <span>{field.label}</span>
        <label className="tiny-toggle">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          <span>{field.placeholder || "Enabled"}</span>
        </label>
      </label>
    );
  }

  if (field.kind === "long_text" || field.kind === "markdown") {
    return (
      <label className="field-stack">
        <span>{field.label}</span>
        <AutoResizeTextarea
          className="themed-textarea"
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="field-stack">
        <span>{field.label}</span>
        <select className="themed-select" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "multi_select") {
    const selectedValues = Array.isArray(value) ? value.map(String) : [];
    return (
      <label className="field-stack">
        <span>{field.label}</span>
        <select
          className="themed-select"
          multiple
          value={selectedValues}
          onChange={(event) =>
            onChange(
              Array.from(event.target.selectedOptions).map((option) => option.value),
            )
          }
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field-stack">
      <span>{field.label}</span>
      <input
        className="themed-input"
        type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : field.kind === "url" ? "url" : "text"}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.kind === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}

function snapshot(card: CardDetail) {
  return JSON.stringify(toPayload(card));
}

function toPayload(card: CardDetail) {
  return {
    title: card.title,
    summary: card.summary,
    status: card.status,
    schema_id: card.schema_id,
    cover_asset_id: card.cover_asset_id ?? null,
    body_json: card.body_json,
    dynamic_fields: card.dynamic_fields,
    taxonomy_term_ids: card.taxonomy_terms.map((term) => term.id),
  };
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function saveLabel(saveState: SaveState, updatedAt?: string, createdAt?: string) {
  if (saveState === "saving") return "Saving changes…";
  if (saveState === "saved") return `Updated ${formatDateTime(updatedAt)}`;
  if (saveState === "error") return "Save failed";
  return `Created ${formatDateTime(createdAt)}`;
}

function buildSearchMatches(card: CardDetail, query: string) {
  const matches: Array<{ label: string; text: string }> = [];
  const title = buildExcerpt(card.title, query, 0, 180);
  const summary = buildExcerpt(card.summary, query, 40, 220);
  const body = buildExcerpt(card.body_text, query, 80, 180);
  if (title) matches.push({ label: "Title", text: title });
  if (summary) matches.push({ label: "Summary", text: summary });
  if (body) matches.push({ label: "Body", text: body });
  return matches;
}

function buildExcerpt(bodyText: string, query: string, before = 80, after = 180) {
  if (!query.trim() || !bodyText?.trim()) {
    return "";
  }
  const lowerBody = bodyText.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchIndex = terms.map((term) => lowerBody.indexOf(term)).find((index) => index >= 0) ?? -1;
  if (matchIndex < 0) {
    return "";
  }
  const start = Math.max(0, matchIndex - before);
  const end = Math.min(bodyText.length, matchIndex + after);
  return `${start > 0 ? "…" : ""}${bodyText.slice(start, end)}${end < bodyText.length ? "…" : ""}`;
}

function findMentionedCards(bodyText: string, allCards: CardListItem[], currentCardId: number) {
  if (!bodyText.trim()) {
    return [];
  }
  const normalizedBody = bodyText.toLowerCase();
  return allCards
    .filter((card) => card.id !== currentCardId)
    .filter((card) => normalizedBody.includes(`@${card.title}`.toLowerCase()))
    .slice(0, 12);
}

function appendMentionToText(bodyText: string, title: string) {
  const mention = `@${title}`;
  const trimmed = bodyText.trim();
  return trimmed ? `${trimmed}\n${mention}` : mention;
}

function appendMentionToDoc(bodyJson: Record<string, unknown>, title: string) {
  const content = Array.isArray(bodyJson.content) ? bodyJson.content : [];
  return {
    ...bodyJson,
    type: "doc",
    content: [
      ...content,
      {
        type: "paragraph",
        content: [{ type: "text", text: `@${title}` }],
      },
    ],
  };
}

function roomLabelForCard(card: CardListItem) {
  if (card.schema_id === "character" || card.schema_id === "npc") return "Character";
  if (card.schema_id === "location") return "Location";
  return "Wiki";
}

function readProvenance(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    mode: String(raw.mode ?? "snapshot"),
    source_workspace_slug: String(raw.source_workspace_slug ?? ""),
    source_workspace_name: String(raw.source_workspace_name ?? ""),
    source_card_title: String(raw.source_card_title ?? "Shared card"),
  };
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

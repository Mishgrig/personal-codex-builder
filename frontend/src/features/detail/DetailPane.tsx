import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { queryClient } from "../../app/queryClient";
import { RichTextEditor } from "../editor/RichTextEditor";
import { GallerySection } from "../media/GallerySection";
import { AttachmentsSection } from "../media/AttachmentsSection";
import { SourcesSection } from "../sources/SourcesSection";
import { RelationsSection } from "../relations/RelationsSection";
import type { CardDetail, CardListItem, CardSchema, TaxonomyTerm } from "../../types/models";
import { highlightText } from "../../utils/highlight";

interface DetailPaneProps {
  workspaceSlug: string | null;
  card: CardDetail | null;
  query: string;
  taxonomyTerms: TaxonomyTerm[];
  schemas: CardSchema[];
  allCards: CardListItem[];
  onRefresh: () => Promise<void>;
  onDeleteCurrent: () => Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function DetailPane({
  workspaceSlug,
  card,
  query,
  taxonomyTerms,
  schemas,
  allCards,
  onRefresh,
  onDeleteCurrent,
}: DetailPaneProps) {
  const [draft, setDraft] = useState<CardDetail | null>(card);
  const [saveState, setSaveState] = useState<SaveState>("idle");
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

  if (!draft || !workspaceSlug) {
    return (
      <section className="detail-pane empty">
        <div className="empty-state">
          <h2>No card selected</h2>
          <p>Choose a card on the left, or create a new one to begin your atlas.</p>
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

  const searchExcerpt = buildExcerpt(draft.body_text, query);

  return (
    <section className="detail-pane">
      <div className="pane-header detail-header">
        <div>
          <h2>Card Detail</h2>
          <p>{saveLabel(saveState)}</p>
        </div>
        <button className="icon-button danger" title="Delete card" onClick={() => void onDeleteCurrent()}>
          <Trash2 size={16} />
        </button>
      </div>

      <article className="detail-card">
        <div className="detail-topline">
          <div className="title-stack">
            <input
              className="title-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
            />
            <textarea
              className="summary-input"
              rows={2}
              value={draft.summary}
              onChange={(event) => setDraft((current) => (current ? { ...current, summary: event.target.value } : current))}
              placeholder="Summary"
            />
          </div>
          {draft.gallery[0] ? (
            <div className="cover-frame">
              <img src={draft.gallery[0].url} alt={draft.title} className="cover-image" />
            </div>
          ) : (
            <div className="cover-frame placeholder">No cover</div>
          )}
        </div>

        <div className="metadata-grid">
          <label className="field-stack">
            <span>Slug</span>
            <input
              className="themed-input"
              value={draft.slug}
              onChange={(event) => setDraft((current) => (current ? { ...current, slug: event.target.value } : current))}
            />
          </label>
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
            <span>Schema</span>
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
              <option value="">No schema</option>
              {schemas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="tag-zone">
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
          <section className="detail-section">
            <div className="section-header">
              <h3>Dynamic Fields</h3>
            </div>
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
          </section>
        ) : null}

        <GallerySection workspaceSlug={workspaceSlug} card={draft} onUpdated={applyRemoteCard} />
        <AttachmentsSection workspaceSlug={workspaceSlug} card={draft} onUpdated={applyRemoteCard} />

        {query && searchExcerpt ? (
          <section className="detail-section">
            <div className="section-header">
              <h3>Search Mentions</h3>
            </div>
            <p className="search-preview">{highlightText(searchExcerpt, query)}</p>
          </section>
        ) : null}

        <section className="detail-section">
          <div className="section-header">
            <h3>Body</h3>
          </div>
          <RichTextEditor
            value={draft.body_json}
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
        </section>

        <SourcesSection workspaceSlug={workspaceSlug} card={draft} onRefresh={onRefresh} />
        <RelationsSection workspaceSlug={workspaceSlug} card={draft} candidates={allCards} onUpdated={applyRemoteCard} />

        <footer className="card-footer">
          <span>UID {draft.uid}</span>
          <span>Slug {draft.slug}</span>
        </footer>
      </article>
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
        <textarea
          className="themed-textarea"
          rows={3}
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
    slug: card.slug,
    summary: card.summary,
    status: card.status,
    schema_id: card.schema_id,
    body_json: card.body_json,
    dynamic_fields: card.dynamic_fields,
    taxonomy_term_ids: card.taxonomy_terms.map((term) => term.id),
  };
}

function saveLabel(saveState: SaveState) {
  if (saveState === "saving") return "Saving changes…";
  if (saveState === "saved") return "Saved";
  if (saveState === "error") return "Save failed";
  return "Local reader mode";
}

function buildExcerpt(bodyText: string, query: string) {
  if (!query.trim() || !bodyText.trim()) {
    return "";
  }
  const lowerBody = bodyText.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchIndex = terms.map((term) => lowerBody.indexOf(term)).find((index) => index >= 0) ?? -1;
  if (matchIndex < 0) {
    return "";
  }
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(bodyText.length, matchIndex + 180);
  return `${start > 0 ? "…" : ""}${bodyText.slice(start, end)}${end < bodyText.length ? "…" : ""}`;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

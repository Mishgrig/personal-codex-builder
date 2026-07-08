import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api/client";
import type { CardSchema, SchemaField, TaxonomyTerm } from "../types/models";

interface SchemaStudioProps {
  workspaceSlug: string;
  schemas: CardSchema[];
  terms: TaxonomyTerm[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const emptyField = (): SchemaField => ({
  field_id: "",
  label: "",
  kind: "text",
  description: "",
  required: false,
  repeatable: false,
  default_value: null,
  options: [],
  placeholder: "",
  show_in_card: true,
  show_in_list: false,
  show_in_filters: false,
  validation: {},
  sort_order: 0,
  is_active: true,
});

const emptySchema = (): CardSchema => ({
  id: "new-schema",
  label: "New Schema",
  description: "",
  icon: "✦",
  field_order: [],
  is_active: true,
  fields: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function SchemaStudio({ workspaceSlug, schemas, terms, onClose, onSaved }: SchemaStudioProps) {
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>(schemas[0]?.id ?? emptySchema().id);
  const [schemaDraft, setSchemaDraft] = useState<CardSchema>(schemas[0] ?? emptySchema());
  const [termDraft, setTermDraft] = useState<Partial<TaxonomyTerm>>({
    category: "domain",
    slug: "",
    label: "",
    description: "",
  });

  useEffect(() => {
    if (schemaDraft.id === selectedSchemaId && !schemas.some((schema) => schema.id === selectedSchemaId)) {
      return;
    }
    const current = schemas.find((schema) => schema.id === selectedSchemaId) ?? schemas[0] ?? emptySchema();
    setSchemaDraft(structuredClone(current));
  }, [schemaDraft.id, schemas, selectedSchemaId]);

  async function saveSchema() {
    const normalized = {
      ...schemaDraft,
      field_order: schemaDraft.fields.map((field) => field.field_id).filter(Boolean),
      fields: schemaDraft.fields.map((field, index) => ({ ...field, sort_order: index })),
    };
    await api.putSchema(workspaceSlug, normalized);
    await onSaved();
  }

  async function saveTerm() {
    if (!termDraft.category || !termDraft.slug || !termDraft.label) {
      return;
    }
    if (termDraft.id) {
      await api.updateTaxonomyTerm(workspaceSlug, termDraft.id, termDraft);
    } else {
      await api.createTaxonomyTerm(workspaceSlug, {
        category: termDraft.category,
        slug: termDraft.slug,
        label: termDraft.label,
        description: termDraft.description ?? "",
        parent_id: termDraft.parent_id ?? null,
        sort_order: termDraft.sort_order ?? 0,
      });
    }
    setTermDraft({ category: "domain", slug: "", label: "", description: "" });
    await onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card schema-studio" onClick={(event) => event.stopPropagation()}>
        <div className="section-header">
          <h2>Schema Studio</h2>
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="studio-columns">
          <section className="studio-panel">
            <div className="section-header">
              <h3>Card Schemas</h3>
              <button
                className="icon-button"
                onClick={() => {
                  const fresh = emptySchema();
                  setSelectedSchemaId(fresh.id);
                  setSchemaDraft(fresh);
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="schema-tabs">
              {schemas.map((schema) => (
                <button
                  key={schema.id}
                  className={schema.id === selectedSchemaId ? "schema-tab active" : "schema-tab"}
                  onClick={() => setSelectedSchemaId(schema.id)}
                >
                  {schema.label}
                </button>
              ))}
            </div>
            <div className="stack-form">
              <input
                className="themed-input"
                value={schemaDraft.id}
                onChange={(event) => setSchemaDraft((current) => ({ ...current, id: event.target.value }))}
                placeholder="schema id"
              />
              <input
                className="themed-input"
                value={schemaDraft.label}
                onChange={(event) => setSchemaDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Label"
              />
              <textarea
                className="themed-textarea"
                rows={3}
                value={schemaDraft.description}
                onChange={(event) => setSchemaDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
              />
              <div className="field-grid">
                {schemaDraft.fields.map((field, index) => (
                  <div className="field-card" key={`${field.field_id}-${index}`}>
                    <div className="field-row">
                      <input
                        className="themed-input"
                        value={field.field_id}
                        onChange={(event) => updateField(setSchemaDraft, index, { field_id: event.target.value })}
                        placeholder="field id"
                      />
                      <input
                        className="themed-input"
                        value={field.label}
                        onChange={(event) => updateField(setSchemaDraft, index, { label: event.target.value })}
                        placeholder="label"
                      />
                    </div>
                    <div className="field-row">
                      <select
                        className="themed-select"
                        value={field.kind}
                        onChange={(event) => updateField(setSchemaDraft, index, { kind: event.target.value })}
                      >
                        {["text", "long_text", "markdown", "number", "boolean", "date", "url", "select", "multi_select", "relation", "image", "file"].map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                      <input
                        className="themed-input"
                        value={field.placeholder}
                        onChange={(event) => updateField(setSchemaDraft, index, { placeholder: event.target.value })}
                        placeholder="placeholder"
                      />
                    </div>
                    <label className="tiny-toggle">
                      <input
                        type="checkbox"
                        checked={field.show_in_card}
                        onChange={(event) => updateField(setSchemaDraft, index, { show_in_card: event.target.checked })}
                      />
                      <span>show in card</span>
                    </label>
                    <label className="tiny-toggle">
                      <input
                        type="checkbox"
                        checked={field.show_in_list}
                        onChange={(event) => updateField(setSchemaDraft, index, { show_in_list: event.target.checked })}
                      />
                      <span>show in list</span>
                    </label>
                    <button
                      className="icon-button danger"
                      onClick={() =>
                        setSchemaDraft((current) => ({
                          ...current,
                          fields: current.fields.filter((_, currentIndex) => currentIndex !== index),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="row-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    setSchemaDraft((current) => ({ ...current, fields: [...current.fields, emptyField()] }))
                  }
                >
                  <Plus size={14} />
                  Add field
                </button>
                <button className="primary-button" onClick={() => void saveSchema()}>
                  <Save size={14} />
                  Save schema
                </button>
              </div>
            </div>
          </section>

          <section className="studio-panel">
            <div className="section-header">
              <h3>Taxonomy</h3>
            </div>
            <div className="taxonomy-groups">
              {["domain", "type", "subtype", "layer"].map((category) => (
                <div key={category} className="taxonomy-group">
                  <strong>{category}</strong>
                  {terms
                    .filter((term) => term.category === category)
                    .map((term) => (
                      <button
                        className="taxonomy-pill"
                        key={term.id}
                        onClick={() => setTermDraft(term)}
                      >
                        {term.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
            <div className="stack-form">
              <select
                className="themed-select"
                value={termDraft.category ?? "domain"}
                onChange={(event) => setTermDraft((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="domain">Domain</option>
                <option value="type">Type</option>
                <option value="subtype">Subtype</option>
                <option value="layer">Layer</option>
              </select>
              <input
                className="themed-input"
                value={termDraft.slug ?? ""}
                onChange={(event) => setTermDraft((current) => ({ ...current, slug: event.target.value }))}
                placeholder="slug"
              />
              <input
                className="themed-input"
                value={termDraft.label ?? ""}
                onChange={(event) => setTermDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="label"
              />
              <textarea
                className="themed-textarea"
                rows={3}
                value={termDraft.description ?? ""}
                onChange={(event) => setTermDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="description"
              />
              <div className="row-actions">
                <button className="primary-button" onClick={() => void saveTerm()}>
                  <Save size={14} />
                  Save term
                </button>
                {termDraft.id ? (
                  <button
                    className="secondary-button danger"
                    onClick={async () => {
                      await api.deleteTaxonomyTerm(workspaceSlug, termDraft.id!);
                      setTermDraft({ category: "domain", slug: "", label: "", description: "" });
                      await onSaved();
                    }}
                  >
                    <Trash2 size={14} />
                    Delete term
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function updateField(
  setSchemaDraft: Dispatch<SetStateAction<CardSchema>>,
  index: number,
  patch: Partial<SchemaField>,
) {
  setSchemaDraft((current) => ({
    ...current,
    fields: current.fields.map((field, currentIndex) =>
      currentIndex === index ? { ...field, ...patch } : field,
    ),
  }));
}

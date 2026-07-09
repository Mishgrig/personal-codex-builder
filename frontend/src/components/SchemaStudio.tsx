import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { ConfirmDialog } from "../shared/components/ConfirmDialog";
import { ToggleSwitch } from "../shared/components/ToggleSwitch";
import { IconButton } from "../shared/components/IconButton";
import { PopoverMenu } from "../shared/components/PopoverMenu";
import type { CardSchema, SchemaField, TaxonomyTerm } from "../types/models";

interface SchemaStudioProps {
  workspaceSlug: string;
  schemas: CardSchema[];
  terms: TaxonomyTerm[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const FIELD_TYPES = [
  "text",
  "long_text",
  "markdown",
  "number",
  "boolean",
  "date",
  "url",
  "select",
  "multi_select",
  "relation",
  "image",
  "file",
] as const;

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
  id: "new-card-type",
  label: "New Card Type",
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
  const [advancedMode, setAdvancedMode] = useState(false);
  const [termDraft, setTermDraft] = useState<Partial<TaxonomyTerm>>({
    category: "domain",
    slug: "",
    label: "",
    description: "",
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (schemaDraft.id === selectedSchemaId && !schemas.some((schema) => schema.id === selectedSchemaId)) {
      return;
    }
    const current = schemas.find((schema) => schema.id === selectedSchemaId) ?? schemas[0] ?? emptySchema();
    setSchemaDraft(structuredClone(current));
  }, [schemaDraft.id, schemas, selectedSchemaId]);

  const liveTableName = useMemo(() => `card_type_${safeSlug(schemaDraft.id || schemaDraft.label, "generic")}`, [schemaDraft.id, schemaDraft.label]);

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

  function handleFieldReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = schemaDraft.fields.findIndex((field, index) => fieldKey(field, index) === active.id);
    const newIndex = schemaDraft.fields.findIndex((field, index) => fieldKey(field, index) === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    setSchemaDraft((current) => ({
      ...current,
      fields: arrayMove(current.fields, oldIndex, newIndex),
    }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card schema-studio" onClick={(event) => event.stopPropagation()}>
        <div className="section-header">
          <div>
            <h2>Card Type Studio</h2>
            <p className="helper-text">Design visible fields first, then switch to Advanced mode when you need SQL and import/export behavior details.</p>
          </div>
          <div className="row-actions">
            <button className="secondary-button" onClick={() => setAdvancedMode(!advancedMode)}>
              {advancedMode ? "Default mode" : "Advanced mode"}
            </button>
            <button className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="studio-columns">
          <section className="studio-panel">
            <div className="section-header">
              <h3>Card Types</h3>
              <button
                className="icon-button"
                title="Create card type"
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

            <div className="stack-form compact-top-gap">
              <label className="field-stack">
                <span>Name</span>
                <input
                  className="themed-input"
                  value={schemaDraft.label}
                  onChange={(event) => setSchemaDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Location"
                />
              </label>
              <label className="field-stack">
                <span>Slug</span>
                <input
                  className="themed-input"
                  value={schemaDraft.id}
                  onChange={(event) => setSchemaDraft((current) => ({ ...current, id: event.target.value }))}
                  placeholder="location"
                />
              </label>
              <label className="field-stack">
                <span>Description</span>
                <textarea
                  className="themed-textarea"
                  rows={3}
                  value={schemaDraft.description}
                  onChange={(event) => setSchemaDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="How this card type is meant to be used."
                />
              </label>

              {advancedMode ? (
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>SQL table name</span>
                    <strong>{liveTableName}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Status</span>
                    <strong>{schemaDraft.is_active ? "Active" : "Inactive"}</strong>
                  </div>
                </div>
              ) : null}

              <div className="field-row">
                <label className="tiny-toggle">
                  <input
                    type="checkbox"
                    checked={schemaDraft.is_active}
                    onChange={(event) => setSchemaDraft((current) => ({ ...current, is_active: event.target.checked }))}
                  />
                  <span>Active card type</span>
                </label>
                <label className="field-stack">
                  <span>Icon</span>
                  <input
                    className="themed-input"
                    value={schemaDraft.icon}
                    onChange={(event) => setSchemaDraft((current) => ({ ...current, icon: event.target.value }))}
                    placeholder="✦"
                  />
                </label>
              </div>

              <div className="section-header">
                <h3>Fields</h3>
                <button
                  className="secondary-button small"
                  onClick={() =>
                    setSchemaDraft((current) => ({ ...current, fields: [...current.fields, emptyField()] }))
                  }
                >
                  <Plus size={14} />
                  Add field
                </button>
              </div>

              <DndContext sensors={sensors} onDragEnd={handleFieldReorder}>
                <SortableContext
                  items={schemaDraft.fields.map((field, index) => fieldKey(field, index))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="field-grid studio-field-grid">
                    {schemaDraft.fields.map((field, index) => (
                      <FieldCard
                        key={fieldKey(field, index)}
                        id={fieldKey(field, index)}
                        field={field}
                        advancedMode={advancedMode}
                        onChange={(patch) => updateField(setSchemaDraft, index, patch)}
                        onDelete={() =>
                          setSchemaDraft((current) => ({
                            ...current,
                            fields: current.fields.filter((_, currentIndex) => currentIndex !== index),
                          }))
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="row-actions">
                <button className="primary-button" onClick={() => void saveSchema()}>
                  <Save size={14} />
                  Save card type
                </button>
              </div>
            </div>
          </section>

          <section className="studio-panel">
            <div className="section-header">
              <h3>Live preview</h3>
            </div>
            <div className="card-type-preview">
              <div className="card-type-preview-header">
                <div>
                  <strong>{schemaDraft.label || "Untitled Card Type"}</strong>
                  <p>{schemaDraft.description || "A compact preview of how this card type will read in the card pane."}</p>
                </div>
                <span className="tag-chip">Draft</span>
              </div>
              <div className="detail-meta-grid preview-meta-grid">
                <div className="field-stack">
                  <span>Card Type</span>
                  <strong>{schemaDraft.label || "None yet"}</strong>
                </div>
                <div className="field-stack">
                  <span>Created</span>
                  <strong>Now</strong>
                </div>
                <div className="field-stack">
                  <span>Updated</span>
                  <strong>When saved</strong>
                </div>
              </div>
              <div className="tag-zone compact-preview-section">
                <div className="section-header">
                  <h3>Dynamic fields</h3>
                </div>
                {schemaDraft.fields.filter((field) => field.show_in_card).length ? (
                  <div className="dynamic-grid">
                    {schemaDraft.fields
                      .filter((field) => field.show_in_card)
                      .map((field, index) => (
                        <div className="field-stack preview-field" key={fieldKey(field, index)}>
                          <span>{field.label || "Untitled field"}</span>
                          <strong>{previewFieldValue(field)}</strong>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="helper-text">Fields marked “Show in card” will appear here.</p>
                )}
              </div>
              <div className="tag-zone compact-preview-section">
                <div className="section-header">
                  <h3>Layout sections</h3>
                </div>
                <div className="asset-usage-list">
                  {["Title", "Summary", "Status", "Card Type", "Categories & tags", "Dynamic fields", "Body", "Sources", "Relations", "Gallery", "Attachments"].map((label) => (
                    <span key={label} className="tag-chip">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="section-header compact-top-gap">
                <h3>Categories</h3>
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

              <div className="stack-form compact-top-gap">
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
                  value={termDraft.label ?? ""}
                  onChange={(event) => setTermDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Name"
                />
                <input
                  className="themed-input"
                  value={termDraft.slug ?? ""}
                  onChange={(event) => setTermDraft((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Slug"
                />
                <textarea
                  className="themed-textarea"
                  rows={3}
                  value={termDraft.description ?? ""}
                  onChange={(event) => setTermDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Description"
                />
                <div className="row-actions">
                  <button className="primary-button" onClick={() => void saveTerm()}>
                    <Save size={14} />
                    Save category
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
                      Delete category
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  id,
  field,
  advancedMode,
  onChange,
  onDelete,
}: {
  id: string;
  field: SchemaField;
  advancedMode: boolean;
  onChange: (patch: Partial<SchemaField>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const visible = field.show_in_card || field.show_in_list;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div ref={setNodeRef} style={style} className="field-card studio-field-card">
        <div className="section-header">
          <div className="row-actions">
            <button className="drag-handle-button" type="button" aria-label="Reorder field" {...attributes} {...listeners}>
              <GripVertical size={14} />
            </button>
            <strong>{field.label || "New field"}</strong>
          </div>
          <div className="row-actions">
            <PopoverMenu icon={<Eye size={14} />} label="Field behavior">
              <ToggleSwitch checked={field.show_in_card} label="Show in card" onChange={(checked) => onChange({ show_in_card: checked })} />
              <ToggleSwitch checked={field.show_in_list} label="Show in Atlas / lists" onChange={(checked) => onChange({ show_in_list: checked })} />
              <ToggleSwitch checked={field.show_in_filters} label="Show in filters" onChange={(checked) => onChange({ show_in_filters: checked })} />
              <ToggleSwitch checked={field.is_active} label="Active field" onChange={(checked) => onChange({ is_active: checked })} />
              {advancedMode ? (
                <p className="helper-text no-top-margin">
                  This studio currently edits the schema bridge fields directly, so only the toggles shown here persist as separate flags.
                </p>
              ) : null}
            </PopoverMenu>
            <IconButton title="Delete field" aria-label="Delete field" danger onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        </div>

        <div className="field-row">
          <label className="field-stack">
            <span>Name</span>
            <input
              className="themed-input"
              value={field.label}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="Region"
            />
          </label>
          <label className="field-stack">
            <span>Field slug</span>
            <input
              className="themed-input"
              value={field.field_id}
              onChange={(event) => onChange({ field_id: event.target.value })}
              placeholder="region"
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field-stack">
            <span>Field type</span>
            <select className="themed-select" value={field.kind} onChange={(event) => onChange({ kind: event.target.value })}>
              {FIELD_TYPES.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span>Visible</span>
            <select
              className="themed-select"
              value={visible ? "visible" : "hidden"}
              onChange={(event) =>
                onChange(
                  event.target.value === "visible"
                    ? { show_in_card: true, is_active: true }
                    : { show_in_card: false, show_in_list: false, show_in_filters: false },
                )
              }
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="tiny-toggle">
            <input type="checkbox" checked={field.required} onChange={(event) => onChange({ required: event.target.checked })} />
            <span>Required</span>
          </label>
          <label className="tiny-toggle">
            <input type="checkbox" checked={field.repeatable} onChange={(event) => onChange({ repeatable: event.target.checked })} />
            <span>Repeatable</span>
          </label>
          <label className="tiny-toggle">
            <input type="checkbox" checked={field.is_active} onChange={(event) => onChange({ is_active: event.target.checked })} />
            <span>Active</span>
          </label>
        </div>

        <label className="field-stack">
          <span>Description</span>
          <textarea
            className="themed-textarea"
            rows={3}
            value={field.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="What this field stores."
          />
        </label>

        <label className="field-stack">
          <span>Help text</span>
          <input
            className="themed-input"
            value={field.placeholder}
            onChange={(event) => onChange({ placeholder: event.target.value })}
            placeholder="Shown inside the card editor."
          />
        </label>

        {field.kind === "select" || field.kind === "multi_select" ? (
          <label className="field-stack">
            <span>Options</span>
            <textarea
              className="themed-textarea"
              rows={4}
              value={field.options.map((option) => `${option.label}=${option.value}`).join("\n")}
              onChange={(event) => onChange({ options: parseOptions(event.target.value) })}
              placeholder={"Visible label=value\nOpen=open\nClosed=closed"}
            />
          </label>
        ) : null}

        {advancedMode ? (
          <div className="field-row">
            <label className="field-stack">
              <span>Default value (JSON)</span>
              <input
                className="themed-input"
                value={field.default_value == null ? "" : JSON.stringify(field.default_value)}
                onChange={(event) => onChange({ default_value: parseJsonValue(event.target.value) })}
                placeholder='"draft" or 0 or true'
              />
            </label>
            <div className="meta-grid">
              <div className="meta-item">
                <span>SQL column name</span>
                <strong>{`field_${safeSlug(field.field_id || field.label, "value").replaceAll("-", "_")}`}</strong>
              </div>
              <div className="meta-item">
                <span>Filter behavior</span>
                <strong>{field.show_in_filters ? "Filterable in current UI" : "Not shown in filters"}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete field?"
          description={`"${field.label || "New field"}" will be removed from this card type draft.`}
          confirmLabel="Delete field"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}

function fieldKey(field: SchemaField, index: number) {
  return `${field.field_id || "field"}-${index}`;
}

function previewFieldValue(field: SchemaField) {
  if (field.kind === "boolean") {
    return field.required ? "True / False" : "Optional toggle";
  }
  if (field.kind === "number") {
    return "123";
  }
  if (field.kind === "date") {
    return "2026-07-08";
  }
  if (field.kind === "select" || field.kind === "multi_select") {
    return "Choose from options";
  }
  return field.placeholder || "Sample value";
}

function safeSlug(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
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

function parseOptions(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, valuePart] = line.includes("=") ? line.split("=") : [line, line];
      return {
        label: labelPart.trim(),
        value: (valuePart ?? labelPart).trim(),
      };
    });
}

function parseJsonValue(value: string): unknown {
  if (!value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

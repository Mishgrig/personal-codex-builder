import { useEffect, useMemo, useState } from "react";
import { Download, FileJson, Plus, Table2, Trash2, Upload } from "lucide-react";
import type {
  CardTypeDefinition,
  CardTypeImportPreview,
  CardTypeImportResult,
  CardTypeTable,
  CardTypeTableRow,
} from "../../types/models";

interface RowDraft {
  title: string;
  summary: string;
  status: string;
  values: Record<string, unknown>;
}

interface TableViewPaneProps {
  cardTypes: CardTypeDefinition[];
  selectedCardTypeSlug: string | null;
  tableData: CardTypeTable | null;
  query: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  statusFilter: string;
  onCardTypeChange: (slug: string) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (sortBy: string, sortDir: "asc" | "desc") => void;
  onStatusFilterChange: (value: string) => void;
  onSelectCard: (cardId: number) => void;
  onExportStructure: (format: "json" | "csv" | "xlsx") => Promise<void>;
  onExportTable: (format: "json" | "csv" | "xlsx") => Promise<void>;
  onExportSelected: (selectedCardIds: number[], includeAssetIds: boolean) => Promise<void>;
  onCreateRow: (payload: RowDraft) => Promise<CardTypeTable>;
  onUpdateRow: (cardId: number, payload: RowDraft) => Promise<CardTypeTable>;
  onDeleteRow: (cardId: number) => Promise<void>;
  onPreviewImport: (
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64?: string,
    filename?: string,
  ) => Promise<CardTypeImportPreview>;
  onApplyImport: (
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64?: string,
    filename?: string,
  ) => Promise<CardTypeImportResult>;
}

const EMPTY_DRAFT: RowDraft = {
  title: "",
  summary: "",
  status: "draft",
  values: {},
};

export function TableViewPane({
  cardTypes,
  selectedCardTypeSlug,
  tableData,
  query,
  sortBy,
  sortDir,
  statusFilter,
  onCardTypeChange,
  onQueryChange,
  onSortChange,
  onStatusFilterChange,
  onSelectCard,
  onExportStructure,
  onExportTable,
  onExportSelected,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  onPreviewImport,
  onApplyImport,
}: TableViewPaneProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [importPreview, setImportPreview] = useState<CardTypeImportPreview | null>(null);
  const [importResult, setImportResult] = useState<CardTypeImportResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [creatingRow, setCreatingRow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRows((current) =>
      current.filter((cardId) => tableData?.rows.some((row) => row.card_id === cardId) ?? false),
    );
  }, [tableData]);

  const allSelected = useMemo(() => {
    if (!tableData?.rows.length) {
      return false;
    }
    return tableData.rows.every((row) => selectedRows.includes(row.card_id));
  }, [selectedRows, tableData]);

  function beginEdit(row: CardTypeTableRow) {
    setCreatingRow(false);
    setEditingCardId(row.card_id);
    setDraft({
      title: row.title,
      summary: row.summary,
      status: row.status,
      values: { ...row.values },
    });
    setInlineError(null);
  }

  function toggleSort(nextSortBy: string) {
    if (sortBy === nextSortBy) {
      onSortChange(nextSortBy, sortDir === "asc" ? "desc" : "asc");
      return;
    }
    onSortChange(nextSortBy, "asc");
  }

  async function saveDraft(cardId?: number) {
    setBusy(true);
    setInlineError(null);
    try {
      if (creatingRow) {
        await onCreateRow(draft);
        setCreatingRow(false);
      } else if (cardId) {
        await onUpdateRow(cardId, draft);
      }
      setEditingCardId(null);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Could not save this row.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveRow(cardId: number) {
    if (!window.confirm("Archive this row? The card will stay recoverable in the database.")) {
      return;
    }
    setBusy(true);
    setInlineError(null);
    try {
      await onDeleteRow(cardId);
      setSelectedRows((current) => current.filter((value) => value !== cardId));
      if (editingCardId === cardId) {
        setEditingCardId(null);
        setDraft(EMPTY_DRAFT);
      }
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Could not archive this row.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="atlas-pane table-view-pane">
      <div className="pane-header">
        <div>
          <h2>Table View</h2>
          <p>
            {tableData ? `${tableData.total} rows in ${tableData.card_type.name}` : "Choose a card type table"}
          </p>
        </div>
        <div className="table-toolbar">
          <select
            className="mini-select"
            value={selectedCardTypeSlug ?? ""}
            onChange={(event) => onCardTypeChange(event.target.value)}
          >
            <option value="">Choose card type</option>
            {cardTypes.map((cardType) => (
              <option key={cardType.slug} value={cardType.slug}>
                {cardType.name}
              </option>
            ))}
          </select>
          <input
            className="themed-input table-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search this table"
          />
          <select
            className="mini-select"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug || busy}
            onClick={() => {
              setCreatingRow(true);
              setEditingCardId(null);
              setDraft(EMPTY_DRAFT);
            }}
          >
            <Plus size={14} />
            Add row
          </button>
          <button
            className="secondary-button"
            disabled={!selectedRows.length || busy}
            onClick={() => void onExportSelected(selectedRows, false)}
          >
            <Download size={14} />
            Export selected
          </button>
          <button
            className="secondary-button"
            disabled={!selectedRows.length || busy}
            onClick={() => void onExportSelected(selectedRows, true)}
          >
            <FileJson size={14} />
            Selected + asset ids
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug || busy}
            onClick={() => void onExportStructure("csv")}
          >
            <Download size={14} />
            Export Card Type structure
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug || busy}
            onClick={() => void onExportTable("csv")}
          >
            <Download size={14} />
            Table CSV
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug || busy}
            onClick={() => void onExportTable("json")}
          >
            <FileJson size={14} />
            Table JSON
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug || busy}
            onClick={() => {
              setImportPreview(null);
              setImportResult(null);
              setImportOpen(true);
            }}
          >
            <Upload size={14} />
            Import data
          </button>
        </div>
      </div>

      {inlineError ? <p className="inline-message">{inlineError}</p> : null}

      {tableData ? (
        <div className="table-view-shell">
          <div className="table-scroll">
            <table className="table-view-grid">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) =>
                        setSelectedRows(event.target.checked ? tableData.rows.map((row) => row.card_id) : [])
                      }
                    />
                  </th>
                  <th>
                    <button className="table-sort-button" onClick={() => toggleSort("title")}>
                      Title
                    </button>
                  </th>
                  <th>
                    <button className="table-sort-button" onClick={() => toggleSort("status")}>
                      Status
                    </button>
                  </th>
                  <th>
                    <button className="table-sort-button" onClick={() => toggleSort("summary")}>
                      Summary
                    </button>
                  </th>
                  {tableData.columns.map((column) => (
                    <th key={column.field_slug}>
                      <div className="table-column-head">
                        <button className="table-sort-button" onClick={() => toggleSort(column.field_slug)}>
                          {column.name}
                        </button>
                        <span>{column.field_type}</span>
                        <div className="table-column-flags">
                          {column.searchable ? <span className="tag-chip">search</span> : null}
                          {column.filterable ? <span className="tag-chip">filter</span> : null}
                          {column.required ? <span className="tag-chip">required</span> : null}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {creatingRow ? (
                  <EditableRow
                    columns={tableData.columns}
                    draft={draft}
                    busy={busy}
                    onChange={setDraft}
                    onCancel={() => {
                      setCreatingRow(false);
                      setDraft(EMPTY_DRAFT);
                      setInlineError(null);
                    }}
                    onSave={() => void saveDraft()}
                  />
                ) : null}
                {tableData.rows.map((row) =>
                  editingCardId === row.card_id ? (
                    <EditableRow
                      key={row.card_id}
                      columns={tableData.columns}
                      draft={draft}
                      busy={busy}
                      onChange={setDraft}
                      onCancel={() => {
                        setEditingCardId(null);
                        setDraft(EMPTY_DRAFT);
                        setInlineError(null);
                      }}
                      onSave={() => void saveDraft(row.card_id)}
                    />
                  ) : (
                    <tr key={row.card_id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.card_id)}
                          onChange={(event) =>
                            setSelectedRows((current) =>
                              event.target.checked
                                ? [...current, row.card_id]
                                : current.filter((value) => value !== row.card_id),
                            )
                          }
                        />
                      </td>
                      <td onClick={() => onSelectCard(row.card_id)}>{row.title}</td>
                      <td onClick={() => onSelectCard(row.card_id)}>{row.status}</td>
                      <td onClick={() => onSelectCard(row.card_id)}>{row.summary || "—"}</td>
                      {tableData.columns.map((column) => (
                        <td key={`${row.card_id}-${column.field_slug}`} onClick={() => onSelectCard(row.card_id)}>
                          {formatTableValue(row.values[column.field_slug])}
                        </td>
                      ))}
                      <td>
                        <div className="table-row-actions">
                          <button className="secondary-button" disabled={busy} onClick={() => beginEdit(row)}>
                            Edit
                          </button>
                          <button className="secondary-button danger" disabled={busy} onClick={() => void archiveRow(row.card_id)}>
                            <Trash2 size={14} />
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <Table2 size={18} />
          <p>Pick a card type to inspect its rows, columns, and exportable structure.</p>
        </div>
      )}

      {importOpen ? (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal-card compact-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Import into Card Type</h2>
            <ImportWizard
              format={importFormat}
              onFormatChange={setImportFormat}
              onPreviewImport={onPreviewImport}
              onApplyImport={onApplyImport}
              preview={importPreview}
              result={importResult}
              onPreviewChange={setImportPreview}
              onResultChange={setImportResult}
              onClose={() => setImportOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EditableRow({
  columns,
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  columns: CardTypeTable["columns"];
  draft: RowDraft;
  busy: boolean;
  onChange: (next: RowDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <tr className="table-edit-row">
      <td>•</td>
      <td>
        <input
          className="themed-input"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="Title"
        />
      </td>
      <td>
        <select
          className="mini-select"
          value={draft.status}
          onChange={(event) => onChange({ ...draft, status: event.target.value })}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </td>
      <td>
        <input
          className="themed-input"
          value={draft.summary}
          onChange={(event) => onChange({ ...draft, summary: event.target.value })}
          placeholder="Summary"
        />
      </td>
      {columns.map((column) => (
        <td key={column.field_slug}>
          <input
            className="themed-input"
            value={String(draft.values[column.field_slug] ?? "")}
            onChange={(event) =>
              onChange({
                ...draft,
                values: {
                  ...draft.values,
                  [column.field_slug]: event.target.value,
                },
              })
            }
            placeholder={column.name}
          />
        </td>
      ))}
      <td>
        <div className="table-row-actions">
          <button className="primary-button" disabled={busy} onClick={onSave}>
            Save
          </button>
          <button className="secondary-button" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

function formatTableValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function ImportWizard({
  format,
  onFormatChange,
  onPreviewImport,
  onApplyImport,
  preview,
  result,
  onPreviewChange,
  onResultChange,
  onClose,
}: {
  format: "csv" | "json" | "xlsx";
  onFormatChange: (format: "csv" | "json" | "xlsx") => void;
  onPreviewImport: (
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64?: string,
    filename?: string,
  ) => Promise<CardTypeImportPreview>;
  onApplyImport: (
    format: "csv" | "json" | "xlsx",
    contentText: string,
    contentBase64?: string,
    filename?: string,
  ) => Promise<CardTypeImportResult>;
  preview: CardTypeImportPreview | null;
  result: CardTypeImportResult | null;
  onPreviewChange: (preview: CardTypeImportPreview | null) => void;
  onResultChange: (result: CardTypeImportResult | null) => void;
  onClose: () => void;
}) {
  const [contentText, setContentText] = useState("");
  const [binaryContent, setBinaryContent] = useState("");
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="stack-form">
      <label className="field-stack">
        <span>Format</span>
        <select
          className="themed-select"
          value={format}
          onChange={(event) => onFormatChange(event.target.value as "csv" | "json" | "xlsx")}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">XLSX</option>
        </select>
      </label>
      <label className="field-stack">
        <span>Or choose file</span>
        <input
          className="themed-input"
          type="file"
          accept=".csv,.json,.xlsx"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            setFilename(file.name);
            if (file.name.toLowerCase().endsWith(".xlsx")) {
              onFormatChange("xlsx");
              const buffer = await file.arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buffer);
              for (const byte of bytes) {
                binary += String.fromCharCode(byte);
              }
              setBinaryContent(btoa(binary));
              setContentText("");
              return;
            }
            if (file.name.toLowerCase().endsWith(".json")) {
              onFormatChange("json");
            } else if (file.name.toLowerCase().endsWith(".csv")) {
              onFormatChange("csv");
            }
            setBinaryContent("");
            setContentText(await file.text());
          }}
        />
      </label>
      <label className="field-stack">
        <span>
          {binaryContent
            ? `Loaded ${filename || "XLSX file"}`
            : format === "xlsx"
              ? "Choose an XLSX file to import"
              : `Paste ${format.toUpperCase()} data`}
        </span>
        <textarea
          className="themed-textarea"
          rows={10}
          value={contentText}
          onChange={(event) => setContentText(event.target.value)}
          disabled={Boolean(binaryContent) || format === "xlsx"}
          placeholder={
            format === "csv"
              ? "title,summary,status\nCard,Summary,active"
              : format === "json"
                ? '[{"title":"Card","summary":"Summary","status":"active"}]'
                : "XLSX imports are loaded from a file selection above."
          }
        />
      </label>
      <div className="action-strip">
        <button
          className="secondary-button"
          disabled={busy || (format === "xlsx" ? !binaryContent : (!contentText.trim() && !binaryContent))}
          onClick={async () => {
            setBusy(true);
            try {
              onResultChange(null);
              onPreviewChange(
                await onPreviewImport(binaryContent ? "xlsx" : format, contentText, binaryContent, filename),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Preview import
        </button>
        <button
          className="primary-button"
          disabled={busy || (format === "xlsx" ? !binaryContent : (!contentText.trim() && !binaryContent))}
          onClick={async () => {
            setBusy(true);
            try {
              onResultChange(
                await onApplyImport(binaryContent ? "xlsx" : format, contentText, binaryContent, filename),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Apply import
        </button>
        <button className="secondary-button" disabled={busy} onClick={onClose}>
          Close
        </button>
      </div>

      {preview ? (
        <div className="import-preview">
          <strong>{preview.row_count} rows detected</strong>
          <p>Matched columns: {Object.keys(preview.matched_columns).length}</p>
          {preview.missing_columns.length ? <p>Missing required columns: {preview.missing_columns.join(", ")}</p> : null}
          {preview.unknown_columns.length ? <p>Unknown columns: {preview.unknown_columns.join(", ")}</p> : null}
        </div>
      ) : null}

      {result ? (
        <div className="import-preview">
          <strong>Import finished</strong>
          <p>
            Created {result.rows_created}, updated {result.rows_updated}, skipped {result.rows_skipped}
          </p>
          {result.errors.length ? <p>{result.errors.join(" | ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

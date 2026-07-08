import { useState } from "react";
import { Download, FileJson, Table2, Upload } from "lucide-react";
import type {
  CardTypeDefinition,
  CardTypeImportPreview,
  CardTypeImportResult,
  CardTypeTable,
} from "../../types/models";

interface TableViewPaneProps {
  cardTypes: CardTypeDefinition[];
  selectedCardTypeSlug: string | null;
  tableData: CardTypeTable | null;
  query: string;
  onCardTypeChange: (slug: string) => void;
  onQueryChange: (value: string) => void;
  onSelectCard: (cardId: number) => void;
  onExportStructure: (format: "json" | "csv" | "xlsx") => Promise<void>;
  onExportTable: (format: "json" | "csv" | "xlsx") => Promise<void>;
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

export function TableViewPane({
  cardTypes,
  selectedCardTypeSlug,
  tableData,
  query,
  onCardTypeChange,
  onQueryChange,
  onSelectCard,
  onExportStructure,
  onExportTable,
  onPreviewImport,
  onApplyImport,
}: TableViewPaneProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [importPreview, setImportPreview] = useState<CardTypeImportPreview | null>(null);
  const [importResult, setImportResult] = useState<CardTypeImportResult | null>(null);

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
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportStructure("csv")}
          >
            <Download size={14} />
            Export Card Type structure
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportStructure("json")}
          >
            <FileJson size={14} />
            Structure JSON
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportStructure("xlsx")}
          >
            <Download size={14} />
            Structure XLSX
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportTable("csv")}
          >
            <Download size={14} />
            Table CSV
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportTable("xlsx")}
          >
            <Download size={14} />
            Table XLSX
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
            onClick={() => void onExportTable("json")}
          >
            <FileJson size={14} />
            Table JSON
          </button>
          <button
            className="secondary-button"
            disabled={!selectedCardTypeSlug}
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

      {tableData ? (
        <div className="table-view-shell">
          <div className="table-scroll">
            <table className="table-view-grid">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Summary</th>
                  {tableData.columns.map((column) => (
                    <th key={column.field_slug}>
                      <div className="table-column-head">
                        <strong>{column.name}</strong>
                        <span>{column.field_type}</span>
                        <div className="table-column-flags">
                          {column.searchable ? <span className="tag-chip">search</span> : null}
                          {column.filterable ? <span className="tag-chip">filter</span> : null}
                          {column.required ? <span className="tag-chip">required</span> : null}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row) => (
                  <tr key={row.card_id} onClick={() => onSelectCard(row.card_id)}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.summary || "—"}</td>
                    {tableData.columns.map((column) => (
                      <td key={`${row.card_id}-${column.field_slug}`}>
                        {formatTableValue(row.values[column.field_slug])}
                      </td>
                    ))}
                  </tr>
                ))}
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
          Confirm import
        </button>
        <button className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>
      {preview ? (
        <div className="detail-section">
          <div className="section-header">
            <h3>Preview</h3>
          </div>
          <p>{preview.row_count} rows detected.</p>
          <p>
            Matched columns:{" "}
            {Object.keys(preview.matched_columns).length
              ? Object.entries(preview.matched_columns)
                  .map(([source, target]) => `${source} -> ${target}`)
                  .join(", ")
              : "none"}
          </p>
          <p>Missing columns: {preview.missing_columns.length ? preview.missing_columns.join(", ") : "none"}</p>
          <p>Unknown columns: {preview.unknown_columns.length ? preview.unknown_columns.join(", ") : "none"}</p>
          {preview.sample_rows.length ? (
            <div className="table-import-samples">
              <h4>Sample rows</h4>
              <pre>{JSON.stringify(preview.sample_rows, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
      {result ? (
        <div className="detail-section">
          <div className="section-header">
            <h3>Result</h3>
          </div>
          <p>Created: {result.rows_created}</p>
          <p>Updated: {result.rows_updated}</p>
          <p>Skipped: {result.rows_skipped}</p>
          {result.errors.length ? <p>Errors: {result.errors.join(" | ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

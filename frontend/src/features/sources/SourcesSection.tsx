import { useState } from "react";
import { Download, ExternalLink, FilePlus2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardDetail, CardSource } from "../../types/models";
import { AutoResizeTextarea } from "../../shared/components/AutoResizeTextarea";
import { IconButton } from "../../shared/components/IconButton";

interface SourcesSectionProps {
  workspaceSlug: string;
  card: CardDetail;
  onRefresh: () => Promise<void>;
}

const EMPTY_SOURCE = {
  title: "",
  url: "",
  note: "",
  source_type: "web_page",
};

export function SourcesSection({ workspaceSlug, card, onRefresh }: SourcesSectionProps) {
  const [editing, setEditing] = useState<(typeof EMPTY_SOURCE) & { id?: number }>(EMPTY_SOURCE);

  async function submitSource() {
    if (!editing.title.trim()) {
      return;
    }
    if (editing.id) {
      await api.updateSource(workspaceSlug, editing.id, editing);
    } else {
      await api.addSource(workspaceSlug, card.id, editing);
    }
    setEditing(EMPTY_SOURCE);
    await onRefresh();
  }

  return (
    <section className="detail-section">
      <div className="section-header">
        <h3>Sources</h3>
      </div>
      <div className="sources-list">
        {card.sources.map((source) => (
          <div className="source-card" key={source.id}>
            <div>
              <div className="source-title-row">
                <strong>{source.title}</strong>
                {source.url ? (
                  <a className="source-inline-link" href={source.url} target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                ) : null}
              </div>
              <p>{source.note || source.source_type}</p>
              {source.assets.length ? (
                <div className="asset-row-actions">
                  {source.assets.map((asset) => (
                    <div className="attachment-row" key={asset.id}>
                      <div>
                        <strong>{asset.original_name}</strong>
                        <p>
                          {asset.mime_type} · {(asset.size / 1024).toFixed(1)} KB · asset {asset.id}
                        </p>
                      </div>
                      <div className="row-actions">
                        <a className="icon-button" href={asset.url} target="_blank" rel="noreferrer" title="Open file">
                          <ExternalLink size={14} />
                        </a>
                        <a className="icon-button" href={asset.url} download={asset.original_name} title="Download file">
                          <Download size={14} />
                        </a>
                        <IconButton
                          danger
                          title="Remove file"
                          onClick={async () => {
                            await api.deleteSourceAsset(workspaceSlug, source.id, String(asset.id));
                            await onRefresh();
                          }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="row-actions">
              <label className="icon-button" title="Add file to source">
                <FilePlus2 size={14} />
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(event) => {
                    const files = event.target.files;
                    if (!files?.length) {
                      return;
                    }
                    void (async () => {
                      for (const file of Array.from(files)) {
                        await api.uploadSourceAsset(workspaceSlug, source.id, file);
                      }
                      await onRefresh();
                    })();
                  }}
                />
              </label>
              <IconButton title="Edit source" onClick={() => setEditing(source)}>
                <Pencil size={14} />
              </IconButton>
              <IconButton
                danger
                title="Delete source"
                onClick={async () => {
                  await api.deleteSource(workspaceSlug, source.id);
                  await onRefresh();
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      <div className="subform">
        <div className="source-inline-fields">
          <input
            className="themed-input"
            placeholder="Source title"
            value={editing.title}
            onChange={(event) => setEditing((current) => ({ ...current, title: event.target.value }))}
          />
          <input
            className="themed-input"
            placeholder="URL"
            value={editing.url}
            onChange={(event) => setEditing((current) => ({ ...current, url: event.target.value }))}
          />
        </div>
        <AutoResizeTextarea
          className="themed-textarea"
          rows={2}
          placeholder="Note"
          value={editing.note}
          onChange={(event) => setEditing((current) => ({ ...current, note: event.target.value }))}
        />
        <div className="row-actions">
          <select
            className="themed-select"
            value={editing.source_type}
            onChange={(event) => setEditing((current) => ({ ...current, source_type: event.target.value }))}
          >
            <option value="web_page">Web Page</option>
            <option value="book">Book</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="note">Note</option>
            <option value="other">Other</option>
          </select>
          <button className="primary-button small" onClick={() => void submitSource()}>
            <Plus size={14} />
            {editing.id ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </section>
  );
}

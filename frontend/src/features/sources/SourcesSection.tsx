import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardDetail, CardSource } from "../../types/models";

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
              <strong>{source.title}</strong>
              <p>{source.note || source.source_type}</p>
            </div>
            <div className="row-actions">
              {source.url ? (
                <a className="icon-button" href={source.url} target="_blank" rel="noreferrer" title="Open source">
                  <ExternalLink size={14} />
                </a>
              ) : null}
              <button className="icon-button" title="Edit source" onClick={() => setEditing(source)}>
                <Pencil size={14} />
              </button>
              <button
                className="icon-button danger"
                title="Delete source"
                onClick={async () => {
                  await api.deleteSource(workspaceSlug, source.id);
                  await onRefresh();
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="subform">
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
        <textarea
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


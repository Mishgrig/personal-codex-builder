import { useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardDetail, CardListItem } from "../../types/models";

interface RelationsSectionProps {
  workspaceSlug: string;
  card: CardDetail;
  candidates: CardListItem[];
  onUpdated: (card: CardDetail) => void;
}

export function RelationsSection({ workspaceSlug, card, candidates, onUpdated }: RelationsSectionProps) {
  const [targetCardId, setTargetCardId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const available = candidates.filter((item) => item.id !== card.id);

  return (
    <section className="detail-section">
      <div className="section-header">
        <h3>Relations</h3>
      </div>
      <div className="relation-list">
        {card.relations.map((relation) => (
          <div className="relation-row" key={relation.id}>
            <div>
              <strong>{relation.target_title}</strong>
              <p>
                {relation.target_slug} · {relation.note || "linked"}
              </p>
            </div>
            <button
              className="icon-button danger"
              title="Remove relation"
              onClick={async () => {
                const updated = await api.deleteRelation(workspaceSlug, relation.id, card.id);
                onUpdated(updated);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="row-actions">
        <select
          className="themed-select"
          value={targetCardId ?? ""}
          onChange={(event) => setTargetCardId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Link another card…</option>
          {available.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title}
            </option>
          ))}
        </select>
        <input
          className="themed-input"
          placeholder="Optional note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          className="primary-button small"
          onClick={async () => {
            if (!targetCardId) {
              return;
            }
            const updated = await api.addRelation(workspaceSlug, card.id, targetCardId, note);
            setTargetCardId(null);
            setNote("");
            onUpdated(updated);
          }}
        >
          <Link2 size={14} />
          Add
        </button>
      </div>
    </section>
  );
}


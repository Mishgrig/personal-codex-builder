import { useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardDetail, CardListItem } from "../../types/models";
import { IconButton } from "../../shared/components/IconButton";

interface RelationsSectionProps {
  workspaceSlug: string;
  card: CardDetail;
  candidates: CardListItem[];
  onUpdated: (card: CardDetail) => void;
  onOpenCard: (cardId: number) => void;
}

export function RelationsSection({
  workspaceSlug,
  card,
  candidates,
  onUpdated,
  onOpenCard,
}: RelationsSectionProps) {
  const [targetCardId, setTargetCardId] = useState<number | null>(null);
  const [relationType, setRelationType] = useState("one-to-one");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [addingRelation, setAddingRelation] = useState(false);
  const available = candidates.filter(
    (item) =>
      item.id !== card.id &&
      (!search.trim() || `${item.title} ${item.summary ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())),
  );

  return (
    <section className="detail-section">
      <div className="section-header">
        <h3>Relations</h3>
      </div>
      <div className="relation-list">
        {card.relations.map((relation) => (
          <div className="relation-row" key={relation.id}>
            <button className="relation-pill" onClick={() => onOpenCard(relation.target_card_id)}>
              <span className="relation-type-badge">{relation.relation_type}</span>
              <strong>{relation.target_title}</strong>
              <p>{relation.note || relation.target_slug}</p>
            </button>
            <IconButton
              danger
              title="Remove relation"
              onClick={async () => {
                const updated = await api.deleteRelation(workspaceSlug, relation.id, card.id);
                onUpdated(updated);
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button className="secondary-button small" onClick={() => setAddingRelation((current) => !current)}>
          <Link2 size={14} />
          {addingRelation ? "Hide relation tools" : "Add relation"}
        </button>
      </div>
      {addingRelation ? (
      <div className="row-actions">
        <input
          className="themed-input"
          placeholder="Find a card"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
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
        <select
          className="mini-select"
          value={relationType}
          onChange={(event) => setRelationType(event.target.value)}
        >
          <option value="one-to-one">one-to-one</option>
          <option value="one-to-many">one-to-many</option>
          <option value="many-to-one">many-to-one</option>
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
            const updated = await api.addRelation(workspaceSlug, card.id, targetCardId, relationType, note);
            setTargetCardId(null);
            setRelationType("one-to-one");
            setNote("");
            setAddingRelation(false);
            onUpdated(updated);
          }}
        >
          <Link2 size={14} />
          Add
        </button>
      </div>
      ) : null}
    </section>
  );
}

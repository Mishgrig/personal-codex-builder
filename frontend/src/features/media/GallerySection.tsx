import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, Expand, ImagePlus, Star, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardAsset, CardDetail } from "../../types/models";
import { IconButton } from "../../shared/components/IconButton";

interface GallerySectionProps {
  workspaceSlug: string;
  card: CardDetail;
  onUpdated: (card: CardDetail) => void;
}

export function GallerySection({ workspaceSlug, card, onUpdated }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const gallery = card.gallery;

  useEffect(() => {
    setSelectedIndex(0);
  }, [card.id, gallery.length]);

  const selectedAsset = gallery[selectedIndex] ?? null;

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    let updated = card;
    for (const file of Array.from(files)) {
      updated = await api.uploadAsset(workspaceSlug, card.id, "gallery", file);
    }
    onUpdated(updated);
  }

  async function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = gallery.findIndex((asset) => asset.id === active.id);
    const newIndex = gallery.findIndex((asset) => asset.id === over.id);
    const nextIds = arrayMove(gallery, oldIndex, newIndex).map((asset) => asset.id);
    const updated = await api.reorderGallery(workspaceSlug, card.id, nextIds);
    onUpdated(updated);
  }

  return (
    <section className="detail-section">
      <div className="section-header">
        <h3>Gallery</h3>
        <label className="icon-button" title="Add images">
          <ImagePlus size={15} />
          <input type="file" accept="image/*" multiple hidden onChange={(event) => void uploadFiles(event.target.files)} />
        </label>
      </div>

      {selectedAsset ? (
        <div className="gallery-preview-shell">
          <button className="gallery-nav left" onClick={() => setSelectedIndex((current) => (current - 1 + gallery.length) % gallery.length)}>
            ‹
          </button>
          <img src={selectedAsset.url} alt={selectedAsset.original_name} className="gallery-preview" />
          <button className="gallery-nav right" onClick={() => setSelectedIndex((current) => (current + 1) % gallery.length)}>
            ›
          </button>
          <div className="gallery-actions">
            <a className="icon-button" href={selectedAsset.url} target="_blank" rel="noreferrer" title="Expand image">
              <Expand size={15} />
            </a>
            <a className="icon-button" href={selectedAsset.url} download={selectedAsset.original_name} title="Download image">
              <Download size={15} />
            </a>
            <IconButton
              title="Use as cover"
              onClick={async () => {
                const updated = await api.updateCard(workspaceSlug, card.id, {
                  cover_asset_id: String(selectedAsset.id),
                });
                onUpdated(updated);
              }}
            >
              <Star size={15} />
            </IconButton>
            <IconButton
              danger
              title="Delete image"
              onClick={async () => {
                const updated = await api.deleteAsset(workspaceSlug, selectedAsset.id, card.id);
                onUpdated(updated);
              }}
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
          <p className="asset-caption">
            {selectedAsset.original_name} · asset {selectedAsset.id}
          </p>
        </div>
      ) : (
        <div className="empty-block">Add artwork, covers, maps or references here.</div>
      )}

      {gallery.length ? (
        <DndContext sensors={sensors} onDragEnd={(event) => void handleReorder(event)}>
          <SortableContext items={gallery.map((asset) => asset.id)} strategy={horizontalListSortingStrategy}>
            <div className="thumbnail-row">
              {gallery.map((asset, index) => (
                <GalleryThumb
                  key={asset.id}
                  asset={asset}
                  active={selectedAsset?.id === asset.id}
                  cover={String(card.cover_asset_id ?? "") === String(asset.id)}
                  onSelect={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
    </section>
  );
}

function GalleryThumb({
  asset,
  active,
  cover,
  onSelect,
}: {
  asset: CardAsset;
  active: boolean;
  cover: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: asset.id });
  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`thumb-button ${active ? "active" : ""} ${cover ? "cover" : ""}`}
      title={cover ? "Current cover image" : asset.original_name}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <img src={asset.url} alt={asset.original_name} className="thumb-image" />
    </button>
  );
}

import { Download, ExternalLink, FilePlus2, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CardDetail } from "../../types/models";
import { IconButton } from "../../shared/components/IconButton";

interface AttachmentsSectionProps {
  workspaceSlug: string;
  card: CardDetail;
  onUpdated: (card: CardDetail) => void;
}

export function AttachmentsSection({ workspaceSlug, card, onUpdated }: AttachmentsSectionProps) {
  async function uploadFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    let updated = card;
    for (const file of Array.from(files)) {
      updated = await api.uploadAsset(workspaceSlug, card.id, "attachment", file);
    }
    onUpdated(updated);
  }

  return (
    <section className="detail-section">
      <div className="section-header">
        <h3>Attachments</h3>
        <label className="icon-button" title="Add attachment">
          <FilePlus2 size={15} />
          <input type="file" multiple hidden onChange={(event) => void uploadFiles(event.target.files)} />
        </label>
      </div>
      {card.attachments.length ? (
        <div className="attachment-list">
          {card.attachments.map((asset) => (
            <div className="attachment-row" key={asset.id}>
              <div>
                <strong>{asset.original_name}</strong>
                <p>
                  {asset.mime_type} · {(asset.size / 1024).toFixed(1)} KB · asset {asset.id}
                </p>
              </div>
              <div className="row-actions">
                <a className="icon-button" href={asset.url} target="_blank" rel="noreferrer" title="Open attachment">
                  <ExternalLink size={14} />
                </a>
                <a className="icon-button" href={asset.url} download={asset.original_name} title="Download attachment">
                  <Download size={14} />
                </a>
                <IconButton
                  title="Remove attachment"
                  danger
                  onClick={async () => {
                    const updated = await api.deleteAsset(workspaceSlug, asset.id, card.id);
                    onUpdated(updated);
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-block">Store PDFs, notes, handouts and reference files here.</div>
      )}
    </section>
  );
}

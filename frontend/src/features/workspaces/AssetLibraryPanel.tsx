import { useEffect, useState } from "react";
import { Download, ExternalLink, ImageIcon } from "lucide-react";
import type { CardDetail, WorkspaceAsset } from "../../types/models";
import { PanelCard } from "../../shared/components/PanelCard";
import { StateNotice } from "../../shared/components/StateNotice";

interface AssetLibraryPanelProps {
  assets: WorkspaceAsset[];
  selectedCard: CardDetail | null;
  query: string;
  assetType: string;
  onQueryChange: (value: string) => void;
  onAssetTypeChange: (value: string) => void;
  onAttachAsset: (assetId: string, role: "gallery" | "attachment") => Promise<void>;
  onAttachSourceAsset: (assetId: string, sourceId: number) => Promise<void>;
  onDeleteAsset: (assetId: string) => Promise<void>;
}

export function AssetLibraryPanel({
  assets,
  selectedCard,
  query,
  assetType,
  onQueryChange,
  onAssetTypeChange,
  onAttachAsset,
  onAttachSourceAsset,
  onDeleteAsset,
}: AssetLibraryPanelProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | "">("");

  useEffect(() => {
    setSelectedSourceId(selectedCard?.sources[0]?.id ?? "");
  }, [selectedCard]);

  return (
    <PanelCard
      title="Asset Library"
      subtitle="Search workspace files by id, filename, or type and see where each one is used."
      actions={<span className="status-badge">{assets.length} assets</span>}
    >
      <div className="asset-library-toolbar">
        <input
          className="themed-input"
          aria-label="Search asset id or filename"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search asset id or filename"
        />
        <select
          className="themed-select"
          aria-label="Filter assets by type"
          value={assetType}
          onChange={(event) => onAssetTypeChange(event.target.value)}
        >
          <option value="">All types</option>
          <option value="images">Images</option>
          <option value="documents">Documents</option>
          <option value="pdf">PDF</option>
          <option value="spreadsheets">Spreadsheets</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="other">Other</option>
        </select>
      </div>

      {assets.length ? (
        <div className="asset-library-list">
          {assets.map((asset) => (
            <div key={asset.id} className="asset-library-row">
              <div className="asset-library-main">
                <strong>
                  {asset.id} / {asset.original_filename}
                </strong>
                <p>
                  {asset.asset_type} · {asset.stored_filename} · {formatBytes(asset.size_bytes)}
                </p>
                {asset.usages.length ? (
                  <div className="asset-usage-list">
                    {asset.usages.map((usage, index) => (
                      <span key={`${asset.id}-${usage.asset_role}-${index}`} className="tag-chip">
                        {usage.label} · {usage.asset_role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No active links yet.</p>
                )}
                <div className="action-strip asset-row-actions">
                  <a
                    className="icon-button"
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open asset"
                    aria-label={`Open ${asset.original_filename}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                  <a
                    className="icon-button"
                    href={asset.url}
                    download={asset.original_filename}
                    title="Download asset"
                    aria-label={`Download ${asset.original_filename}`}
                  >
                    <Download size={14} />
                  </a>
                  <button
                    className="secondary-button small"
                    disabled={!selectedCard}
                    onClick={() => void onAttachAsset(asset.id, "gallery")}
                  >
                    Add to gallery
                  </button>
                  <button
                    className="secondary-button small"
                    disabled={!selectedCard}
                    onClick={() => void onAttachAsset(asset.id, "attachment")}
                  >
                    Add to attachments
                  </button>
                  {selectedCard?.sources.length ? (
                    <>
                      <select
                        className="mini-select"
                        aria-label={`Choose source for ${asset.original_filename}`}
                        value={selectedSourceId}
                        onChange={(event) => setSelectedSourceId(event.target.value ? Number(event.target.value) : "")}
                      >
                        {selectedCard.sources.map((source) => (
                          <option key={source.id} value={source.id}>
                            Source: {source.title}
                          </option>
                        ))}
                      </select>
                      <button
                        className="secondary-button small"
                        disabled={!selectedSourceId}
                        onClick={() => selectedSourceId && void onAttachSourceAsset(asset.id, selectedSourceId)}
                      >
                        Add to source
                      </button>
                    </>
                  ) : null}
                  <button
                    className="secondary-button danger small"
                    disabled={asset.usage_count > 0}
                    title={
                      asset.usage_count > 0
                        ? `Still used in ${asset.usages.map((usage) => `${usage.label} (${usage.asset_role})`).join(", ")}`
                        : "Delete unused asset"
                    }
                    onClick={() => void onDeleteAsset(asset.id)}
                  >
                    Delete unused
                  </button>
                </div>
              </div>
              {asset.asset_type === "images" ? (
                <div className="asset-library-preview">
                  <img src={asset.url} alt={asset.original_filename} className="asset-preview-image" />
                </div>
              ) : (
                <div className="asset-library-preview placeholder">
                  <ImageIcon size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <StateNotice
          title="No matching assets"
          description="Upload gallery images, attachments, or source files and they will appear here."
        />
      )}
    </PanelCard>
  );
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

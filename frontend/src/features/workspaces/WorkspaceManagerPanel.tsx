import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Download,
  FolderPlus,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  AppInfo,
  CardDetail,
  WorkspaceAsset,
  WorkspaceAssetHealth,
  WorkspaceBackup,
  WorkspaceCreatePayload,
  WorkspaceHealth,
  WorkspaceSummary,
} from "../../types/models";
import { AssetLibraryPanel } from "./AssetLibraryPanel";
import { PanelCard } from "../../shared/components/PanelCard";
import { StateNotice } from "../../shared/components/StateNotice";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { IconButton } from "../../shared/components/IconButton";

interface WorkspaceManagerPanelProps {
  appInfo: AppInfo | null;
  backendStatus: string;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  selectedCard: CardDetail | null;
  archivedWorkspaces: WorkspaceSummary[];
  backups: WorkspaceBackup[];
  health: WorkspaceHealth | null;
  assetHealth: WorkspaceAssetHealth | null;
  assets: WorkspaceAsset[];
  message: string | null;
  busy: boolean;
  assetLibraryQuery: string;
  assetLibraryType: string;
  onClose: () => void;
  onSelectWorkspace: (slug: string) => void;
  onCreateWorkspace: (payload: WorkspaceCreatePayload) => Promise<unknown>;
  onReorderWorkspaces: (orderedSlugs: string[]) => Promise<unknown>;
  onAssetLibraryQueryChange: (value: string) => void;
  onAssetLibraryTypeChange: (value: string) => void;
  onAttachAsset: (assetId: string, role: "gallery" | "attachment") => Promise<void>;
  onAttachSourceAsset: (assetId: string, sourceId: number) => Promise<void>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  onRepairWorkspaceHealth: (action: string) => Promise<void>;
  onRepairAssetHealth: (action: string) => Promise<void>;
  onRenameWorkspace: (name: string, description: string) => Promise<void>;
  onDuplicateWorkspace: (name: string) => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
  onCreateBackup: () => Promise<unknown>;
  onExportWorkspace: () => Promise<unknown>;
  onExportWorkspaceData: (includeAssetIds: boolean) => Promise<unknown>;
  onArchiveWorkspace: () => Promise<unknown>;
  onUnarchiveWorkspace: (slug: string) => Promise<unknown>;
  onImportWorkspace: (file: File, name?: string) => Promise<unknown>;
  onRestoreBackup: (filename: string) => Promise<unknown>;
  onDeleteBackup: (filename: string) => Promise<unknown>;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not yet";
  }
  return new Date(value).toLocaleString();
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

export function WorkspaceManagerPanel({
  appInfo,
  backendStatus,
  workspaces,
  activeWorkspace,
  selectedCard,
  archivedWorkspaces,
  backups,
  health,
  assetHealth,
  assets,
  message,
  busy,
  assetLibraryQuery,
  assetLibraryType,
  onClose,
  onSelectWorkspace,
  onCreateWorkspace,
  onReorderWorkspaces,
  onAssetLibraryQueryChange,
  onAssetLibraryTypeChange,
  onAttachAsset,
  onAttachSourceAsset,
  onDeleteAsset,
  onRepairWorkspaceHealth,
  onRepairAssetHealth,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onCreateBackup,
  onExportWorkspace,
  onExportWorkspaceData,
  onArchiveWorkspace,
  onUnarchiveWorkspace,
  onImportWorkspace,
  onRestoreBackup,
  onDeleteBackup,
}: WorkspaceManagerPanelProps) {
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name ?? "");
  const [workspaceDescription, setWorkspaceDescription] = useState(activeWorkspace?.description ?? "");
  const [duplicateName, setDuplicateName] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [newWorkspaceTheme, setNewWorkspaceTheme] = useState("fantasy");

  useEffect(() => {
    setWorkspaceName(activeWorkspace?.name ?? "");
    setWorkspaceDescription(activeWorkspace?.description ?? "");
    setDuplicateName(activeWorkspace ? `${activeWorkspace.name} Copy` : "");
  }, [activeWorkspace]);

  const statusTone = useMemo(() => {
    if (backendStatus !== "ok") {
      return "danger" as const;
    }
    if (health && (!health.integrity_ok || health.missing_files_count > 0)) {
      return "warning" as const;
    }
    return "success" as const;
  }, [backendStatus, health]);

  async function moveWorkspace(slug: string, direction: -1 | 1) {
    const currentIndex = workspaces.findIndex((workspace) => workspace.slug === slug);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= workspaces.length) {
      return;
    }
    const ordered = [...workspaces];
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(nextIndex, 0, moved);
    await onReorderWorkspaces(ordered.map((workspace) => workspace.slug));
  }

  async function submitWorkspaceCreate() {
    if (!newWorkspaceName.trim()) {
      return;
    }
    await onCreateWorkspace({
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim(),
      theme: newWorkspaceTheme,
    });
    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
    setNewWorkspaceTheme("fantasy");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card workspace-manager-modal" onClick={(event) => event.stopPropagation()}>
        <div className="workspace-manager-header">
          <div>
            <h2>Manage databases</h2>
            <p>Keep local databases tidy, backed up, and easy to switch without cluttering the main workspace.</p>
          </div>
          <IconButton title="Close database manager" aria-label="Close database manager" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        {message ? <p className="inline-message workspace-manager-message">{message}</p> : null}

        <section className="workspace-manager-grid">
          <PanelCard
            title="Databases"
            subtitle="Choose the active local database, change the order, or create a new one."
            actions={<StatusBadge>{workspaces.length} active</StatusBadge>}
          >
            <div className="database-manager-list">
              {workspaces.length ? (
                workspaces.map((workspace, index) => (
                  <div
                    key={workspace.slug}
                    className={`database-manager-row ${workspace.slug === activeWorkspace?.slug ? "active" : ""}`}
                  >
                    <button
                      className="database-manager-main"
                      disabled={busy}
                      onClick={() => onSelectWorkspace(workspace.slug)}
                    >
                      <strong>{workspace.name}</strong>
                      <span>
                        {workspace.card_count} cards · {workspace.theme}
                      </span>
                    </button>
                    <div className="database-manager-actions">
                      <IconButton
                        title="Move up"
                        aria-label={`Move ${workspace.name} up`}
                        disabled={busy || index === 0}
                        onClick={() => void moveWorkspace(workspace.slug, -1)}
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        title="Move down"
                        aria-label={`Move ${workspace.name} down`}
                        disabled={busy || index === workspaces.length - 1}
                        onClick={() => void moveWorkspace(workspace.slug, 1)}
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))
              ) : (
                <StateNotice
                  title="No active databases"
                  description="Create a new database or unarchive an older one to start working."
                />
              )}
            </div>

            <div className="stack-form compact-top-gap">
              <label className="field-stack">
                <span>New database name</span>
                <input
                  className="themed-input"
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  placeholder="Personal Atlas"
                />
              </label>
              <label className="field-stack">
                <span>Description</span>
                <textarea
                  className="themed-textarea"
                  rows={3}
                  value={newWorkspaceDescription}
                  onChange={(event) => setNewWorkspaceDescription(event.target.value)}
                  placeholder="Local notes, references, and structured cards."
                />
              </label>
              <label className="field-stack">
                <span>Theme</span>
                <select
                  className="themed-select"
                  value={newWorkspaceTheme}
                  onChange={(event) => setNewWorkspaceTheme(event.target.value)}
                >
                  <option value="fantasy">Fantasy</option>
                  <option value="classic">Classic</option>
                </select>
              </label>
              <button
                className="primary-button"
                disabled={busy || !newWorkspaceName.trim()}
                onClick={() => void submitWorkspaceCreate()}
              >
                <FolderPlus size={15} />
                Create database
              </button>
            </div>
          </PanelCard>

          <PanelCard
            title="Local Status"
            subtitle="Everything important about the local app, active workspace, and storage state."
            actions={
              <StatusBadge tone={statusTone}>
                {backendStatus === "ok" ? "Backend running" : "Needs attention"}
              </StatusBadge>
            }
          >
            <div className="meta-grid">
              <div className="meta-item">
                <span>Database</span>
                <strong>{activeWorkspace?.name ?? "No active workspace"}</strong>
              </div>
              <div className="meta-item">
                <span>Version</span>
                <strong>{appInfo?.workspace_schema_version ?? "Unknown"}</strong>
              </div>
              <div className="meta-item">
                <span>Registry</span>
                <strong>{appInfo?.workspace_count ?? 0} workspaces</strong>
              </div>
              <div className="meta-item">
                <span>Archived</span>
                <strong>{appInfo?.archived_workspace_count ?? archivedWorkspaces.length}</strong>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Selected database"
            subtitle={
              activeWorkspace
                ? `Manage ${activeWorkspace.name} without leaving the local app.`
                : "Choose a database to edit its details, export, archive, or remove it."
            }
          >
            {activeWorkspace ? (
              <>
                <div className="action-strip">
                  <button className="primary-button" disabled={busy} onClick={() => void onCreateBackup()}>
                    <ShieldCheck size={15} />
                    Create backup
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onExportWorkspace()}>
                    <Download size={15} />
                    Export portable workspace
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onExportWorkspaceData(false)}>
                    <Download size={15} />
                    Export data JSON
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onExportWorkspaceData(true)}>
                    <Download size={15} />
                    Data + asset ids
                  </button>
                  <button className="secondary-button danger" disabled={busy} onClick={() => void onArchiveWorkspace()}>
                    <Archive size={15} />
                    Archive workspace
                  </button>
                </div>
                <div className="stack-form">
                  <label className="field-stack">
                    <span>Database name</span>
                    <input
                      className="themed-input"
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                    />
                  </label>
                  <label className="field-stack">
                    <span>Description</span>
                    <textarea
                      className="themed-textarea"
                      rows={3}
                      value={workspaceDescription}
                      onChange={(event) => setWorkspaceDescription(event.target.value)}
                    />
                  </label>
                  <button
                    className="secondary-button"
                    disabled={busy || !workspaceName.trim()}
                    onClick={() => void onRenameWorkspace(workspaceName.trim(), workspaceDescription)}
                  >
                    Save database details
                  </button>
                </div>
                <div className="stack-form compact-top-gap">
                  <label className="field-stack">
                    <span>Duplicate as</span>
                    <input
                      className="themed-input"
                      value={duplicateName}
                      onChange={(event) => setDuplicateName(event.target.value)}
                    />
                  </label>
                  <div className="action-strip">
                    <button
                      className="secondary-button"
                      disabled={busy || !duplicateName.trim()}
                      onClick={() => void onDuplicateWorkspace(duplicateName.trim())}
                    >
                      Duplicate database
                    </button>
                    <button
                      className="secondary-button danger"
                      disabled={busy}
                      onClick={() => void onDeleteWorkspace()}
                    >
                      <Trash2 size={14} />
                      Delete database
                    </button>
                  </div>
                </div>
                <div className="meta-grid compact-grid">
                  <div className="meta-item">
                    <span>Path</span>
                    <strong>{activeWorkspace.path}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Last opened</span>
                    <strong>{formatDate(activeWorkspace.last_opened_at)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Backups</span>
                    <strong>{activeWorkspace.backup_count}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Last backup</span>
                    <strong>{formatDate(activeWorkspace.last_backup_at)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <StateNotice
                title="No active database"
                description="Select a database from the list above or create a fresh one."
              />
            )}
          </PanelCard>

          <PanelCard
            title="Asset Health"
            subtitle="Check missing files, orphaned assets, duplicates, and broken card cover links."
            actions={
              assetHealth ? (
                <StatusBadge tone={assetHealth.issue_count === 0 ? "success" : "warning"}>
                  {assetHealth.issue_count === 0 ? "Healthy" : `${assetHealth.issue_count} issues`}
                </StatusBadge>
              ) : undefined
            }
          >
            {assetHealth ? (
              <>
                <div className="action-strip">
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("remove_broken_cover_references")}>
                    Clear broken covers
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("remove_broken_gallery_links")}>
                    Repair gallery links
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("remove_broken_attachment_links")}>
                    Repair attachment links
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("remove_broken_source_links")}>
                    Repair source links
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("delete_orphaned_asset_files")}>
                    Delete orphaned files
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairAssetHealth("delete_unused_assets")}>
                    Delete unused assets
                  </button>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>Checked</span>
                    <strong>{formatDate(assetHealth.checked_at)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Missing files</span>
                    <strong>{assetHealth.missing_asset_files.length}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Orphaned files</span>
                    <strong>{assetHealth.orphaned_files.length}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Unused assets</span>
                    <strong>{assetHealth.unused_assets.length}</strong>
                  </div>
                </div>
              </>
            ) : (
              <StateNotice
                title="Asset health will appear here"
                description="Open a workspace to inspect local asset integrity and registry health."
              />
            )}
          </PanelCard>

          <AssetLibraryPanel
            assets={assets}
            selectedCard={selectedCard}
            query={assetLibraryQuery}
            assetType={assetLibraryType}
            onQueryChange={onAssetLibraryQueryChange}
            onAssetTypeChange={onAssetLibraryTypeChange}
            onAttachAsset={onAttachAsset}
            onAttachSourceAsset={onAttachSourceAsset}
            onDeleteAsset={onDeleteAsset}
          />

          <PanelCard
            title="Data Health"
            subtitle="A quick local integrity snapshot of the active workspace database and files."
            actions={
              health ? (
                <StatusBadge tone={health.issue_count === 0 ? "success" : "warning"}>
                  {health.issue_count === 0 ? "Healthy" : `${health.issue_count} issues`}
                </StatusBadge>
              ) : undefined
            }
          >
            {health ? (
              <>
                <div className="action-strip">
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairWorkspaceHealth("rebuild_search_index")}>
                    Rebuild search index
                  </button>
                  <button className="secondary-button" disabled={busy} onClick={() => void onRepairWorkspaceHealth("remove_broken_relation_links")}>
                    Remove broken relation links
                  </button>
                </div>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>Checked</span>
                    <strong>{formatDate(health.checked_at)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Database size</span>
                    <strong>{formatBytes(health.db_size_bytes)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Files size</span>
                    <strong>{formatBytes(health.files_size_bytes)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Missing files</span>
                    <strong>{health.missing_files_count}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Cards</span>
                    <strong>{health.card_count}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Check groups</span>
                    <strong>{Object.keys(health.categories).length}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Taxonomy terms</span>
                    <strong>{health.taxonomy_term_count}</strong>
                  </div>
                </div>
              </>
            ) : (
              <StateNotice
                title="Workspace health will appear here"
                description="Open a workspace to inspect database integrity, file counts, and backup coverage."
              />
            )}
          </PanelCard>

          <PanelCard
            title="Backup Manager"
            subtitle="Restore or clean up local database snapshots from inside the app."
            actions={<StatusBadge>{backups.length} snapshots</StatusBadge>}
          >
            {backups.length ? (
              <div className="backup-list">
                {backups.map((backup) => (
                  <div key={backup.filename} className="backup-row">
                    <div>
                      <strong>{backup.reason}</strong>
                      <p>
                        {formatDate(backup.created_at)} · {formatBytes(backup.size_bytes)}
                      </p>
                    </div>
                    <div className="backup-actions">
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void onRestoreBackup(backup.filename)}
                      >
                        <RefreshCcw size={14} />
                        Restore
                      </button>
                      <button
                        className="secondary-button danger"
                        disabled={busy}
                        onClick={() => void onDeleteBackup(backup.filename)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <StateNotice
                title="No backups yet"
                description="Create a manual backup before risky changes or before exporting a workspace."
              />
            )}
          </PanelCard>

          <PanelCard
            title="Import Workspace"
            subtitle="Bring a portable `.workspace.zip` archive back into the local registry."
          >
            <div className="import-stack">
              <label className="field-stack">
                <span>Optional name</span>
                <input
                  className="themed-input"
                  value={importName}
                  onChange={(event) => setImportName(event.target.value)}
                  placeholder="Imported workspace name"
                />
              </label>
              <label className="upload-drop">
                <Upload size={18} />
                <span>{importFile ? importFile.name : "Choose a .workspace.zip file"}</span>
                <input
                  type="file"
                  accept=".zip,.workspace.zip"
                  hidden
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button
                className="primary-button"
                disabled={busy || !importFile}
                onClick={async () => {
                  if (!importFile) {
                    return;
                  }
                  await onImportWorkspace(importFile, importName || undefined);
                  setImportFile(null);
                  setImportName("");
                }}
              >
                <PackagePlus size={15} />
                Import workspace
              </button>
            </div>
          </PanelCard>

          <PanelCard
            title="Archived Workspaces"
            subtitle="Keep old local projects out of the main list without deleting their files."
            actions={<StatusBadge>{archivedWorkspaces.length} archived</StatusBadge>}
          >
            {archivedWorkspaces.length ? (
              <div className="archive-list">
                {archivedWorkspaces.map((workspace) => (
                  <div key={workspace.slug} className="archive-row">
                    <div>
                      <strong>{workspace.name}</strong>
                      <p>{workspace.path}</p>
                    </div>
                    <div className="backup-actions">
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void onUnarchiveWorkspace(workspace.slug)}
                      >
                        <ArchiveRestore size={14} />
                        Unarchive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <StateNotice
                title="No archived databases"
                description="Archive older databases instead of deleting them when you just want to declutter the main list."
              />
            )}
          </PanelCard>
        </section>
      </div>
    </div>
  );
}

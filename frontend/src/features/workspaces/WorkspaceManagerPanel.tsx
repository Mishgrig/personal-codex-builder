import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Download,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  AppInfo,
  WorkspaceBackup,
  WorkspaceHealth,
  WorkspaceSummary,
} from "../../types/models";
import { PanelCard } from "../../shared/components/PanelCard";
import { StateNotice } from "../../shared/components/StateNotice";
import { StatusBadge } from "../../shared/components/StatusBadge";

interface WorkspaceManagerPanelProps {
  appInfo: AppInfo | null;
  backendStatus: string;
  activeWorkspace: WorkspaceSummary | null;
  archivedWorkspaces: WorkspaceSummary[];
  backups: WorkspaceBackup[];
  health: WorkspaceHealth | null;
  message: string | null;
  busy: boolean;
  onCreateBackup: () => Promise<unknown>;
  onExportWorkspace: () => Promise<unknown>;
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
  activeWorkspace,
  archivedWorkspaces,
  backups,
  health,
  message,
  busy,
  onCreateBackup,
  onExportWorkspace,
  onArchiveWorkspace,
  onUnarchiveWorkspace,
  onImportWorkspace,
  onRestoreBackup,
  onDeleteBackup,
}: WorkspaceManagerPanelProps) {
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const statusTone = useMemo(() => {
    if (backendStatus !== "ok") {
      return "danger" as const;
    }
    if (health && (!health.integrity_ok || health.missing_files_count > 0)) {
      return "warning" as const;
    }
    return "success" as const;
  }, [backendStatus, health]);

  return (
    <section className="workspace-manager-grid">
      <PanelCard
        title="Local Status"
        subtitle="Everything important about the local app, active workspace, and storage state."
        actions={<StatusBadge tone={statusTone}>{backendStatus === "ok" ? "Backend running" : "Needs attention"}</StatusBadge>}
      >
        <div className="meta-grid">
          <div className="meta-item">
            <span>Workspace</span>
            <strong>{activeWorkspace?.name ?? "No active workspace"}</strong>
          </div>
          <div className="meta-item">
            <span>Schema</span>
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
        {message ? <p className="inline-message">{message}</p> : null}
      </PanelCard>

      <PanelCard
        title="Workspace Operations"
        subtitle={activeWorkspace ? `Manage ${activeWorkspace.name} without leaving the local app.` : "Create or unarchive a workspace to start managing data."}
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
                Export archive
              </button>
              <button className="secondary-button danger" disabled={busy} onClick={() => void onArchiveWorkspace()}>
                <Archive size={15} />
                Archive workspace
              </button>
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
            title="No active workspace"
            description="Create a new workspace or unarchive an existing one to continue working locally."
          />
        )}
      </PanelCard>

      <PanelCard
        title="Data Health"
        subtitle="A quick local integrity snapshot of the active workspace database and files."
        actions={
          health ? (
            <StatusBadge tone={health.integrity_ok && health.missing_files_count === 0 ? "success" : "warning"}>
              {health.integrity_ok ? "Integrity OK" : "Integrity issue"}
            </StatusBadge>
          ) : undefined
        }
      >
        {health ? (
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
              <span>Taxonomy terms</span>
              <strong>{health.taxonomy_term_count}</strong>
            </div>
          </div>
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
            title="No archived workspaces"
            description="Archive old projects when you want a cleaner active list without deleting local data."
          />
        )}
      </PanelCard>
    </section>
  );
}

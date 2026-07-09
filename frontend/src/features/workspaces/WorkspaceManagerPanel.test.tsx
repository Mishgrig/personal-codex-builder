import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceManagerPanel } from "./WorkspaceManagerPanel";

function makeProps() {
  return {
    appInfo: {
      project_name: "Personal Codex Builder API",
      app_version: "0.1.0",
      workspace_schema_version: "1",
      data_dir: "/tmp/data",
      app_index_path: "/tmp/data/app_index.sqlite",
      workspaces_dir: "/tmp/data/workspaces",
      workspace_count: 3,
      active_workspace_count: 2,
      archived_workspace_count: 1,
      default_theme: "fantasy",
    },
    backendStatus: "ok",
    workspaces: [
      {
        slug: "personal",
        name: "Personal",
        description: "Local codex",
        theme: "fantasy",
        archived: false,
        logo_url: null,
        card_count: 12,
        path: "workspaces/personal",
        last_opened_at: "2026-07-03T10:00:00Z",
        backup_count: 2,
        last_backup_at: "2026-07-03T10:10:00Z",
        created_at: "2026-07-03T09:00:00Z",
        updated_at: "2026-07-03T10:10:00Z",
        taxonomy_labels: {
          domain: "Domain",
          type: "Type",
          subtype: "Subtype",
          layer: "Layer",
        },
      },
    ],
    activeWorkspace: {
      slug: "personal",
      name: "Personal",
      description: "Local codex",
      theme: "fantasy",
      archived: false,
      logo_url: null,
      card_count: 12,
      path: "workspaces/personal",
      last_opened_at: "2026-07-03T10:00:00Z",
      backup_count: 2,
      last_backup_at: "2026-07-03T10:10:00Z",
      created_at: "2026-07-03T09:00:00Z",
      updated_at: "2026-07-03T10:10:00Z",
      taxonomy_labels: {
        domain: "Domain",
        type: "Type",
        subtype: "Subtype",
        layer: "Layer",
      },
    },
    selectedCard: null,
    archivedWorkspaces: [
      {
        slug: "archive",
        name: "Archive",
        description: "Archived workspace",
        theme: "classic",
        archived: true,
        logo_url: null,
        card_count: 1,
        path: "workspaces/archive",
        last_opened_at: null,
        backup_count: 1,
        last_backup_at: "2026-07-02T10:10:00Z",
        created_at: "2026-07-02T09:00:00Z",
        updated_at: "2026-07-02T10:10:00Z",
        taxonomy_labels: {
          domain: "Domain",
          type: "Type",
          subtype: "Subtype",
          layer: "Layer",
        },
      },
    ],
    backups: [
      {
        filename: "personal-20260703T101000Z-manual.sqlite",
        created_at: "2026-07-03T10:10:00Z",
        size_bytes: 2048,
        reason: "manual",
        schema_version: "1",
        app_version: "0.1.0",
        is_safety_backup: false,
        path: "workspaces/personal/backups/personal-20260703T101000Z-manual.sqlite",
      },
    ],
    health: {
      workspace_slug: "personal",
      checked_at: "2026-07-03T10:11:00Z",
      integrity_ok: true,
      integrity_message: "ok",
      db_size_bytes: 1024,
      files_size_bytes: 4096,
      files_count: 3,
      missing_files_count: 0,
      missing_paths: [],
      card_count: 12,
      schema_count: 2,
      taxonomy_term_count: 8,
      backup_count: 1,
      last_backup_at: "2026-07-03T10:10:00Z",
      schema_version: "1",
      app_version: "0.1.0",
      issue_count: 0,
      checks: [
        {
          key: "sqlite_integrity",
          category: "database",
          status: "ok",
          message: "SQLite integrity check passed.",
          details: { integrity_message: "ok" },
        },
      ],
      categories: {
        database: {
          key: "database",
          status: "ok",
          issue_count: 0,
          checks: [
            {
              key: "sqlite_integrity",
              category: "database",
              status: "ok",
              message: "SQLite integrity check passed.",
              details: { integrity_message: "ok" },
            },
          ],
        },
      },
    },
    assetHealth: {
      workspace_slug: "personal",
      checked_at: "2026-07-03T10:11:00Z",
      issue_count: 0,
      missing_asset_files: [],
      orphaned_files: [],
      duplicate_checksums: [],
      unused_assets: [],
      broken_cover_asset_ids: [],
      broken_gallery_links: [],
      broken_attachment_links: [],
      broken_source_links: [],
      checks: [],
      categories: {},
    },
    assets: [
      {
        id: "img-a83k2d",
        asset_type: "images",
        original_filename: "Dragon Map.png",
        stored_filename: "img-a83k2d.png",
        relative_path: "workspaces/personal/assets/images/img-a83k2d.png",
        mime_type: "image/png",
        size_bytes: 2048,
        checksum_sha256: "abc123",
        url: "/media/workspaces/personal/assets/images/img-a83k2d.png",
        usage_count: 1,
        usages: [{ usage_type: "card", label: "Dragon of the North", card_id: 7, asset_role: "gallery" }],
        created_at: "2026-07-03T10:11:00Z",
        updated_at: "2026-07-03T10:11:00Z",
      },
    ],
    message: "Backup created successfully.",
    busy: false,
    assetLibraryQuery: "",
    assetLibraryType: "",
    onClose: vi.fn(),
    onSelectWorkspace: vi.fn(),
    onCreateWorkspace: vi.fn().mockResolvedValue(undefined),
    onReorderWorkspaces: vi.fn().mockResolvedValue(undefined),
    onAssetLibraryQueryChange: vi.fn(),
    onAssetLibraryTypeChange: vi.fn(),
    onAttachAsset: vi.fn().mockResolvedValue(undefined),
    onAttachSourceAsset: vi.fn().mockResolvedValue(undefined),
    onDeleteAsset: vi.fn().mockResolvedValue(undefined),
    onRepairWorkspaceHealth: vi.fn().mockResolvedValue(undefined),
    onRepairAssetHealth: vi.fn().mockResolvedValue(undefined),
    onRenameWorkspace: vi.fn().mockResolvedValue(undefined),
    onDuplicateWorkspace: vi.fn().mockResolvedValue(undefined),
    onDeleteWorkspace: vi.fn().mockResolvedValue(undefined),
    onCreateBackup: vi.fn().mockResolvedValue(undefined),
    onExportWorkspace: vi.fn().mockResolvedValue(undefined),
    onExportWorkspaceData: vi.fn().mockResolvedValue(undefined),
    onArchiveWorkspace: vi.fn().mockResolvedValue(undefined),
    onUnarchiveWorkspace: vi.fn().mockResolvedValue(undefined),
    onImportWorkspace: vi.fn().mockResolvedValue(undefined),
    onRestoreBackup: vi.fn().mockResolvedValue(undefined),
    onDeleteBackup: vi.fn().mockResolvedValue(undefined),
  };
}

describe("WorkspaceManagerPanel", () => {
  it("renders local status, health, and backups", () => {
    const props = makeProps();
    render(<WorkspaceManagerPanel {...props} />);

    expect(screen.getByText("Local Status")).toBeInTheDocument();
    expect(screen.getAllByText("Manage databases")[0]).toBeInTheDocument();
    expect(screen.getByText("Databases")).toBeInTheDocument();
    expect(screen.getByText("Data Health")).toBeInTheDocument();
    expect(screen.getByText("Asset Library")).toBeInTheDocument();
    expect(screen.getByText("Backup Manager")).toBeInTheDocument();
    expect(screen.getByText("Backup created successfully.")).toBeInTheDocument();
    expect(screen.getByText("Archive workspace")).toBeInTheDocument();
    expect(screen.getByText("Save database details")).toBeInTheDocument();
    expect(screen.getByText("Duplicate database")).toBeInTheDocument();
  });

  it("invokes backup and restore actions", () => {
    const props = makeProps();
    render(<WorkspaceManagerPanel {...props} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Create backup/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Restore/i }));

    expect(props.onCreateBackup).toHaveBeenCalledTimes(1);
    expect(props.onRestoreBackup).toHaveBeenCalledWith(
      "personal-20260703T101000Z-manual.sqlite",
    );
  });

  it("shows empty state without an active workspace", () => {
    const props = makeProps();
    render(
      <WorkspaceManagerPanel
        {...props}
        workspaces={[]}
        activeWorkspace={null}
        backups={[]}
        health={null}
        assetHealth={null}
        message={null}
      />,
    );

    expect(
      screen.getByText("Create a new database or unarchive an older one to start working."),
    ).toBeInTheDocument();
    expect(screen.getByText("No backups yet")).toBeInTheDocument();
  });
});

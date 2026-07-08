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
    },
    message: "Backup created successfully.",
    busy: false,
    onCreateBackup: vi.fn().mockResolvedValue(undefined),
    onExportWorkspace: vi.fn().mockResolvedValue(undefined),
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
    expect(screen.getByText("Workspace Operations")).toBeInTheDocument();
    expect(screen.getByText("Data Health")).toBeInTheDocument();
    expect(screen.getByText("Backup Manager")).toBeInTheDocument();
    expect(screen.getByText("Backup created successfully.")).toBeInTheDocument();
    expect(screen.getByText("Archive workspace")).toBeInTheDocument();
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
        activeWorkspace={null}
        backups={[]}
        health={null}
        message={null}
      />,
    );

    expect(
      screen.getByText("Create a new workspace or unarchive an existing one to continue working locally."),
    ).toBeInTheDocument();
    expect(screen.getByText("No backups yet")).toBeInTheDocument();
  });
});

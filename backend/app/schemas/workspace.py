from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str
    description: str = ""
    theme: str = "fantasy"


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    theme: str | None = None
    taxonomy_labels: dict[str, str] | None = None


class WorkspaceSummary(BaseModel):
    slug: str
    name: str
    description: str
    theme: str
    archived: bool = False
    logo_url: str | None = None
    card_count: int = 0
    path: str
    last_opened_at: datetime | None = None
    backup_count: int = 0
    last_backup_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    taxonomy_labels: dict[str, str]


class WorkspaceCopy(BaseModel):
    name: str


class WorkspaceBackupRequest(BaseModel):
    reason: str = "manual"


class WorkspaceBackupRead(BaseModel):
    filename: str
    created_at: datetime
    size_bytes: int
    reason: str
    schema_version: str
    app_version: str
    is_safety_backup: bool = False
    path: str


class WorkspaceRestoreRequest(BaseModel):
    filename: str


class WorkspaceExportRead(BaseModel):
    filename: str
    created_at: datetime
    size_bytes: int
    path: str


class WorkspaceRestoreRead(BaseModel):
    workspace: WorkspaceSummary
    safety_backup: WorkspaceBackupRead


class WorkspaceHealthRead(BaseModel):
    workspace_slug: str
    checked_at: datetime
    integrity_ok: bool
    integrity_message: str
    db_size_bytes: int
    files_size_bytes: int
    files_count: int
    missing_files_count: int
    missing_paths: list[str] = Field(default_factory=list)
    card_count: int
    schema_count: int
    taxonomy_term_count: int
    backup_count: int
    last_backup_at: datetime | None = None
    schema_version: str
    app_version: str


class AppInfoRead(BaseModel):
    project_name: str
    app_version: str
    workspace_schema_version: str
    data_dir: str
    app_index_path: str
    workspaces_dir: str
    workspace_count: int
    active_workspace_count: int
    archived_workspace_count: int
    default_theme: str

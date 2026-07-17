from __future__ import annotations

from datetime import datetime
from typing import Any

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
    ui_preferences: dict[str, Any] | None = None


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
    ui_preferences: dict[str, Any] = Field(default_factory=dict)


class WorkspaceCopy(BaseModel):
    name: str


class WorkspaceReorderRequest(BaseModel):
    ordered_slugs: list[str]


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


class WorkspaceDataExportRead(BaseModel):
    filename: str
    format: str
    scope: str
    include_asset_ids: bool = False
    row_count: int = 0
    content_text: str = ""
    content_json: list[dict[str, Any]] = Field(default_factory=list)


class WorkspaceRestoreRead(BaseModel):
    workspace: WorkspaceSummary
    safety_backup: WorkspaceBackupRead


class WorkspaceHealthCheckRead(BaseModel):
    key: str
    category: str
    status: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class WorkspaceHealthCategoryRead(BaseModel):
    key: str
    status: str
    issue_count: int
    checks: list[WorkspaceHealthCheckRead] = Field(default_factory=list)


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
    issue_count: int = 0
    checks: list[WorkspaceHealthCheckRead] = Field(default_factory=list)
    categories: dict[str, WorkspaceHealthCategoryRead] = Field(default_factory=dict)


class WorkspacePortabilityRead(BaseModel):
    workspace_slug: str
    checked_at: datetime
    status: str
    issue_count: int = 0
    required_tables: list[str] = Field(default_factory=list)
    present_tables: list[str] = Field(default_factory=list)
    missing_tables: list[str] = Field(default_factory=list)
    db_included: bool
    metadata_included: bool
    files_dir_present: bool
    asset_file_count: int
    backup_count: int
    export_count: int
    checks: list[WorkspaceHealthCheckRead] = Field(default_factory=list)
    categories: dict[str, WorkspaceHealthCategoryRead] = Field(default_factory=dict)


class WorkspaceAssetHealthRead(BaseModel):
    workspace_slug: str
    checked_at: datetime
    issue_count: int = 0
    missing_asset_files: list[str] = Field(default_factory=list)
    orphaned_files: list[str] = Field(default_factory=list)
    duplicate_checksums: list[str] = Field(default_factory=list)
    unused_assets: list[str] = Field(default_factory=list)
    broken_cover_asset_ids: list[str] = Field(default_factory=list)
    broken_gallery_links: list[str] = Field(default_factory=list)
    broken_attachment_links: list[str] = Field(default_factory=list)
    broken_source_links: list[str] = Field(default_factory=list)
    checks: list[WorkspaceHealthCheckRead] = Field(default_factory=list)
    categories: dict[str, WorkspaceHealthCategoryRead] = Field(default_factory=dict)


class WorkspaceNotebookRead(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list)
    body_json: dict[str, Any] = Field(default_factory=dict)
    body_text: str = ""


class WorkspaceAssetUsageRead(BaseModel):
    usage_type: str
    label: str
    card_id: int | None = None
    asset_role: str = ""


class WorkspaceAssetRead(BaseModel):
    id: str
    asset_type: str
    original_filename: str
    stored_filename: str
    relative_path: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str
    url: str
    usage_count: int = 0
    usages: list[WorkspaceAssetUsageRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class WorkspaceAssetLibraryRead(BaseModel):
    items: list[WorkspaceAssetRead] = Field(default_factory=list)
    total: int = 0
    q: str = ""
    asset_type: str | None = None


class WorkspaceAssetAttachRequest(BaseModel):
    card_id: int
    role: str = "gallery"
    set_as_cover: bool = False


class WorkspaceRepairRequest(BaseModel):
    action: str


class WorkspaceRepairRead(BaseModel):
    status: str = "ok"
    message: str
    repaired_count: int = 0
    skipped_count: int = 0


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

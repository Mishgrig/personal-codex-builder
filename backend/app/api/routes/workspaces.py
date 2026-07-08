from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.common import APIDataEnvelope, ActionStatus
from app.schemas.workspace import (
    WorkspaceBackupRead,
    WorkspaceBackupRequest,
    WorkspaceCopy,
    WorkspaceCreate,
    WorkspaceExportRead,
    WorkspaceHealthRead,
    WorkspaceRestoreRead,
    WorkspaceRestoreRequest,
    WorkspaceSummary,
    WorkspaceUpdate,
)
from app.services.workspace_manager import get_workspace_manager

router = APIRouter()


@router.get("", response_model=APIDataEnvelope[list[WorkspaceSummary]])
def get_workspaces(include_archived: bool = False) -> dict[str, list[WorkspaceSummary]]:
    workspaces = [
        WorkspaceSummary(**item)
        for item in get_workspace_manager().list_workspaces(include_archived=include_archived)
    ]
    return {"data": workspaces}


@router.post("", response_model=APIDataEnvelope[WorkspaceSummary])
def post_workspace(payload: WorkspaceCreate) -> dict[str, WorkspaceSummary]:
    created = WorkspaceSummary(**get_workspace_manager().create_workspace(payload))
    return {"data": created}


@router.post("/import", response_model=APIDataEnvelope[WorkspaceSummary])
async def import_workspace(
    upload: UploadFile = File(...),
    name: str | None = Form(default=None),
) -> dict[str, WorkspaceSummary]:
    suffix = Path(upload.filename or "workspace.workspace.zip").suffix or ".zip"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        temp_path = Path(handle.name)
        shutil.copyfileobj(upload.file, handle)
    try:
        created = WorkspaceSummary(**get_workspace_manager().import_workspace_archive(temp_path, name_override=name))
        return {"data": created}
    finally:
        temp_path.unlink(missing_ok=True)


@router.get("/{workspace_slug}", response_model=APIDataEnvelope[WorkspaceSummary])
def get_workspace(workspace_slug: str) -> dict[str, WorkspaceSummary]:
    return {"data": WorkspaceSummary(**get_workspace_manager().get_workspace_summary(workspace_slug))}


@router.post("/{workspace_slug}/open", response_model=APIDataEnvelope[WorkspaceSummary])
def open_workspace(workspace_slug: str) -> dict[str, WorkspaceSummary]:
    return {"data": WorkspaceSummary(**get_workspace_manager().open_workspace(workspace_slug))}


@router.patch("/{workspace_slug}", response_model=APIDataEnvelope[WorkspaceSummary])
def patch_workspace(workspace_slug: str, payload: WorkspaceUpdate) -> dict[str, WorkspaceSummary]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        get_workspace_manager().update_workspace(session, workspace_slug, payload)
    finally:
        session.close()
    return {"data": WorkspaceSummary(**get_workspace_manager().get_workspace_summary(workspace_slug))}


@router.post("/{workspace_slug}/logo", response_model=APIDataEnvelope[WorkspaceSummary])
def post_logo(workspace_slug: str, upload: UploadFile = File(...)) -> dict[str, WorkspaceSummary]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        from app.services.file_service import upload_logo

        upload_logo(session, workspace_slug, upload)
    finally:
        session.close()
    return {"data": WorkspaceSummary(**get_workspace_manager().get_workspace_summary(workspace_slug))}


@router.post("/{workspace_slug}/copy", response_model=APIDataEnvelope[WorkspaceSummary])
def duplicate_workspace(workspace_slug: str, payload: WorkspaceCopy) -> dict[str, WorkspaceSummary]:
    copied = WorkspaceSummary(**get_workspace_manager().copy_workspace(workspace_slug, payload.name))
    return {"data": copied}


@router.post("/{workspace_slug}/archive", response_model=APIDataEnvelope[WorkspaceSummary])
def archive_workspace(workspace_slug: str) -> dict[str, WorkspaceSummary]:
    archived = WorkspaceSummary(**get_workspace_manager().archive_workspace(workspace_slug, archived=True))
    return {"data": archived}


@router.post("/{workspace_slug}/unarchive", response_model=APIDataEnvelope[WorkspaceSummary])
def unarchive_workspace(workspace_slug: str) -> dict[str, WorkspaceSummary]:
    restored = WorkspaceSummary(**get_workspace_manager().archive_workspace(workspace_slug, archived=False))
    return {"data": restored}


@router.delete("/{workspace_slug}", response_model=APIDataEnvelope[ActionStatus])
def remove_workspace(workspace_slug: str) -> dict[str, ActionStatus]:
    get_workspace_manager().delete_workspace(workspace_slug)
    return {"data": ActionStatus(message="Workspace deleted.")}


@router.get("/{workspace_slug}/backups", response_model=APIDataEnvelope[list[WorkspaceBackupRead]])
def get_backups(workspace_slug: str) -> dict[str, list[WorkspaceBackupRead]]:
    backups = [WorkspaceBackupRead(**item) for item in get_workspace_manager().list_backups(workspace_slug)]
    return {"data": backups}


@router.post("/{workspace_slug}/backup", response_model=APIDataEnvelope[WorkspaceBackupRead])
def post_backup(
    workspace_slug: str,
    payload: WorkspaceBackupRequest | None = None,
) -> dict[str, WorkspaceBackupRead]:
    backup = WorkspaceBackupRead(**get_workspace_manager().create_backup(workspace_slug, reason=(payload.reason if payload else "manual")))
    return {"data": backup}


@router.delete("/{workspace_slug}/backups/{filename}", response_model=APIDataEnvelope[ActionStatus])
def remove_backup(workspace_slug: str, filename: str) -> dict[str, ActionStatus]:
    get_workspace_manager().delete_backup(workspace_slug, filename)
    return {"data": ActionStatus(message="Backup deleted.")}


@router.post("/{workspace_slug}/restore", response_model=APIDataEnvelope[WorkspaceRestoreRead])
def restore_workspace(
    workspace_slug: str,
    payload: WorkspaceRestoreRequest,
) -> dict[str, WorkspaceRestoreRead]:
    restored = get_workspace_manager().restore_backup(workspace_slug, payload.filename)
    return {"data": WorkspaceRestoreRead(**restored)}


@router.post("/{workspace_slug}/export", response_model=APIDataEnvelope[WorkspaceExportRead])
def export_workspace(workspace_slug: str) -> dict[str, WorkspaceExportRead]:
    exported = WorkspaceExportRead(**get_workspace_manager().export_workspace(workspace_slug))
    return {"data": exported}


@router.get("/{workspace_slug}/health", response_model=APIDataEnvelope[WorkspaceHealthRead])
def get_workspace_health(workspace_slug: str) -> dict[str, WorkspaceHealthRead]:
    health = WorkspaceHealthRead(**get_workspace_manager().workspace_health(workspace_slug))
    return {"data": health}

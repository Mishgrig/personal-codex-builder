from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.common import APIDataEnvelope, ActionStatus
from app.schemas.workspace import (
    WorkspaceAssetLibraryRead,
    WorkspaceAssetAttachRequest,
    WorkspaceAssetHealthRead,
    WorkspaceBackupRead,
    WorkspaceBackupRequest,
    WorkspaceCopy,
    WorkspaceCreate,
    WorkspaceExportRead,
    WorkspaceHealthRead,
    WorkspaceNotebookRead,
    WorkspaceReorderRequest,
    WorkspaceRestoreRead,
    WorkspaceRestoreRequest,
    WorkspaceSummary,
    WorkspaceUpdate,
)
from app.services.file_service import attach_existing_asset, delete_unused_asset, list_assets
from app.services.workspace_manager import get_workspace_manager
from app.utils.rich_text import extract_plain_text

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


@router.post("/reorder", response_model=APIDataEnvelope[ActionStatus])
def reorder_workspaces(payload: WorkspaceReorderRequest) -> dict[str, ActionStatus]:
    get_workspace_manager().reorder_workspaces(payload.ordered_slugs)
    return {"data": ActionStatus(message="Workspace order updated.")}


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


@router.get("/{workspace_slug}/asset-health", response_model=APIDataEnvelope[WorkspaceAssetHealthRead])
def get_workspace_asset_health(workspace_slug: str) -> dict[str, WorkspaceAssetHealthRead]:
    health = WorkspaceAssetHealthRead(**get_workspace_manager().asset_health(workspace_slug))
    return {"data": health}


@router.get("/{workspace_slug}/assets", response_model=APIDataEnvelope[WorkspaceAssetLibraryRead])
def get_workspace_assets(
    workspace_slug: str,
    q: str = "",
    asset_type: str | None = None,
) -> dict[str, WorkspaceAssetLibraryRead]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        payload = list_assets(session, q=q, asset_type=asset_type)
    finally:
        session.close()
    return {"data": WorkspaceAssetLibraryRead.model_validate(payload)}


@router.post("/{workspace_slug}/assets/{asset_id}/attach", response_model=APIDataEnvelope[ActionStatus])
def post_workspace_asset_attach(
    workspace_slug: str,
    asset_id: str,
    payload: WorkspaceAssetAttachRequest,
) -> dict[str, ActionStatus]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        attach_existing_asset(
            session,
            card_id=payload.card_id,
            asset_id=asset_id,
            role=payload.role,
            set_as_cover=payload.set_as_cover,
        )
    finally:
        session.close()
    return {"data": ActionStatus(message="Asset attached.")}


@router.delete("/{workspace_slug}/assets/{asset_id}", response_model=APIDataEnvelope[ActionStatus])
def delete_workspace_asset(
    workspace_slug: str,
    asset_id: str,
) -> dict[str, ActionStatus]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        delete_unused_asset(session, asset_id=asset_id)
    finally:
        session.close()
    return {"data": ActionStatus(message="Unused asset deleted.")}


@router.get("/{workspace_slug}/notebook", response_model=APIDataEnvelope[WorkspaceNotebookRead])
def get_workspace_notebook(workspace_slug: str) -> dict[str, WorkspaceNotebookRead]:
    notebook = WorkspaceNotebookRead(**get_workspace_manager().get_notebook(workspace_slug))
    return {"data": notebook}


@router.patch("/{workspace_slug}/notebook", response_model=APIDataEnvelope[WorkspaceNotebookRead])
def patch_workspace_notebook(
    workspace_slug: str,
    payload: WorkspaceNotebookRead,
) -> dict[str, WorkspaceNotebookRead]:
    notebook = WorkspaceNotebookRead(
        **get_workspace_manager().update_notebook(
            workspace_slug,
            body_json=payload.body_json,
            body_text=payload.body_text or extract_plain_text(payload.body_json),
        )
    )
    return {"data": notebook}

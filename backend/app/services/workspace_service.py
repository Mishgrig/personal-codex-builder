from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.models.workspace import WorkspaceSetting
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_manager import get_workspace_manager


def list_workspaces() -> list[dict]:
    return get_workspace_manager().list_workspaces()


def list_all_workspaces(include_archived: bool = False) -> list[dict]:
    return get_workspace_manager().list_workspaces(include_archived=include_archived)


def create_workspace(payload: WorkspaceCreate, *, seed_demo: bool = False) -> dict:
    return get_workspace_manager().create_workspace(payload, seed_demo=seed_demo)


def delete_workspace(slug: str) -> None:
    get_workspace_manager().delete_workspace(slug)


def copy_workspace(slug: str, new_name: str) -> dict:
    return get_workspace_manager().copy_workspace(slug, new_name)


def open_workspace(slug: str) -> dict:
    return get_workspace_manager().open_workspace(slug)


def get_workspace_session(slug: str) -> Session:
    return get_workspace_manager().get_workspace_session(slug)


def update_workspace(session: Session, workspace_slug: str, payload: WorkspaceUpdate) -> WorkspaceSetting:
    return get_workspace_manager().update_workspace(session, workspace_slug, payload)


def ensure_default_workspace() -> None:
    get_workspace_manager().ensure_default_workspace()


def archive_workspace(slug: str, *, archived: bool = True) -> dict:
    return get_workspace_manager().archive_workspace(slug, archived=archived)


def list_backups(slug: str) -> list[dict]:
    return get_workspace_manager().list_backups(slug)


def create_backup(slug: str, *, reason: str = "manual") -> dict:
    return get_workspace_manager().create_backup(slug, reason=reason)


def delete_backup(slug: str, filename: str) -> None:
    get_workspace_manager().delete_backup(slug, filename)


def restore_backup(slug: str, filename: str) -> dict:
    return get_workspace_manager().restore_backup(slug, filename)


def export_workspace(slug: str) -> dict:
    return get_workspace_manager().export_workspace(slug)


def import_workspace_archive(archive_path: Path, *, name_override: str | None = None) -> dict:
    return get_workspace_manager().import_workspace_archive(archive_path, name_override=name_override)


def workspace_health(slug: str) -> dict:
    return get_workspace_manager().workspace_health(slug)


def get_app_info() -> dict:
    return get_workspace_manager().get_app_info()

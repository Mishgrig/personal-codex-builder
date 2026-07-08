from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings

WORKSPACE_DB_FILENAME = "workspace.sqlite"
LEGACY_WORKSPACE_DB_FILENAME = "workspace.db"
WORKSPACE_METADATA_FILENAME = "workspace_manifest.json"
LEGACY_WORKSPACE_METADATA_FILENAME = "workspace.json"
WORKSPACE_ASSET_LIBRARY_VERSION = "1"


def app_index_path() -> Path:
    return get_settings().app_index_path


def workspace_dir(slug: str) -> Path:
    return get_settings().workspaces_dir / slug


def workspace_relative_dir(slug: str) -> str:
    return f"workspaces/{slug}"


def workspace_db_path(slug: str) -> Path:
    return workspace_dir(slug) / WORKSPACE_DB_FILENAME


def legacy_workspace_db_path(slug: str) -> Path:
    return workspace_dir(slug) / LEGACY_WORKSPACE_DB_FILENAME


def workspace_metadata_path(slug: str) -> Path:
    return workspace_dir(slug) / WORKSPACE_METADATA_FILENAME


def legacy_workspace_metadata_path(slug: str) -> Path:
    return workspace_dir(slug) / LEGACY_WORKSPACE_METADATA_FILENAME


def workspace_files_dir(slug: str) -> Path:
    return workspace_dir(slug) / "files"


def workspace_backups_dir(slug: str) -> Path:
    return workspace_dir(slug) / "backups"


def workspace_exports_dir(slug: str) -> Path:
    return workspace_dir(slug) / "exports"


def app_safety_backups_dir() -> Path:
    return get_settings().data_dir / "safety-backups"


def ensure_workspace_layout(slug: str) -> Path:
    root = workspace_dir(slug)
    root.mkdir(parents=True, exist_ok=True)
    workspace_files_dir(slug).mkdir(parents=True, exist_ok=True)
    workspace_backups_dir(slug).mkdir(parents=True, exist_ok=True)
    workspace_exports_dir(slug).mkdir(parents=True, exist_ok=True)
    app_safety_backups_dir().mkdir(parents=True, exist_ok=True)
    return root


def resolve_workspace_db_path(slug: str) -> Path:
    ensure_workspace_layout(slug)
    canonical = workspace_db_path(slug)
    legacy = legacy_workspace_db_path(slug)

    if canonical.exists():
        return canonical

    if legacy.exists():
        legacy.replace(canonical)
        for suffix in ("-wal", "-shm"):
            old_sidecar = legacy.with_name(f"{legacy.name}{suffix}")
            new_sidecar = canonical.with_name(f"{canonical.name}{suffix}")
            if old_sidecar.exists() and not new_sidecar.exists():
                old_sidecar.replace(new_sidecar)

    return canonical

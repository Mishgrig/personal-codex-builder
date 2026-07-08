from __future__ import annotations

import json
import logging
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.db import dispose_sqlite_handles
from app.core.exceptions import NotFoundError
from app.core.paths import resolve_workspace_db_path, workspace_backups_dir, workspace_dir

logger = logging.getLogger(__name__)

BACKUP_TIMESTAMP_FORMAT = "%Y%m%dT%H%M%SZ"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sanitize_reason(reason: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", reason.strip().lower())
    return cleaned.strip("-") or "manual"


def backup_manifest_path(backup_path: Path) -> Path:
    return backup_path.with_name(f"{backup_path.name}.json")


def _write_manifest(backup_path: Path, payload: dict[str, Any]) -> None:
    backup_manifest_path(backup_path).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _load_manifest(backup_path: Path) -> dict[str, Any] | None:
    manifest_path = backup_manifest_path(backup_path)
    if not manifest_path.exists():
        return None
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def _copy_sqlite_database(source_path: Path, destination_path: Path) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    if destination_path.exists():
        destination_path.unlink()
    with sqlite3.connect(source_path) as source_connection:
        with sqlite3.connect(destination_path) as destination_connection:
            source_connection.backup(destination_connection)


def locate_backup_path(slug: str, filename: str) -> Path:
    backup_path = workspace_backups_dir(slug) / filename
    if not backup_path.exists():
        raise NotFoundError(
            "Backup was not found.",
            code="BACKUP_NOT_FOUND",
            details={"slug": slug, "filename": filename},
        )
    return backup_path


def create_workspace_backup(
    slug: str,
    *,
    reason: str,
    schema_version: str,
    app_version: str,
) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    if not db_path.exists():
        raise NotFoundError(
            "Workspace database was not found.",
            code="WORKSPACE_DB_NOT_FOUND",
            details={"slug": slug},
        )

    timestamp = _now()
    safe_reason = _sanitize_reason(reason)
    backup_filename = f"{slug}-{timestamp.strftime(BACKUP_TIMESTAMP_FORMAT)}-{safe_reason}.sqlite"
    backup_path = workspace_backups_dir(slug) / backup_filename

    _copy_sqlite_database(db_path, backup_path)
    payload = {
        "filename": backup_filename,
        "created_at": timestamp.isoformat(),
        "size_bytes": backup_path.stat().st_size,
        "reason": safe_reason,
        "schema_version": schema_version,
        "app_version": app_version,
        "is_safety_backup": safe_reason.startswith("safety") or safe_reason.startswith("pre-"),
        "path": backup_path.relative_to(workspace_dir(slug).parent.parent).as_posix(),
    }
    _write_manifest(backup_path, payload)
    logger.info("Created workspace backup", extra={"slug": slug, "backup": backup_filename, "reason": safe_reason})
    return payload


def list_workspace_backups(slug: str) -> list[dict[str, Any]]:
    backups_dir = workspace_backups_dir(slug)
    if not backups_dir.exists():
        return []

    payloads: list[dict[str, Any]] = []
    for backup_path in sorted(backups_dir.glob("*.sqlite"), key=lambda item: item.stat().st_mtime, reverse=True):
        manifest = _load_manifest(backup_path)
        if manifest is None:
            created_at = datetime.fromtimestamp(backup_path.stat().st_mtime, tz=timezone.utc).isoformat()
            manifest = {
                "filename": backup_path.name,
                "created_at": created_at,
                "size_bytes": backup_path.stat().st_size,
                "reason": "legacy",
                "schema_version": "unknown",
                "app_version": "unknown",
                "is_safety_backup": False,
                "path": backup_path.relative_to(workspace_dir(slug).parent.parent).as_posix(),
            }
        payloads.append(manifest)
    return payloads


def delete_workspace_backup(slug: str, filename: str) -> None:
    backup_path = locate_backup_path(slug, filename)
    manifest_path = backup_manifest_path(backup_path)
    backup_path.unlink()
    if manifest_path.exists():
        manifest_path.unlink()
    logger.info("Deleted workspace backup", extra={"slug": slug, "backup": filename})


def restore_workspace_backup(slug: str, filename: str) -> Path:
    backup_path = locate_backup_path(slug, filename)
    db_path = resolve_workspace_db_path(slug)
    dispose_sqlite_handles(db_path)
    for suffix in ("-wal", "-shm"):
        sidecar = db_path.with_name(f"{db_path.name}{suffix}")
        if sidecar.exists():
            sidecar.unlink()
    _copy_sqlite_database(backup_path, db_path)
    logger.info("Restored workspace backup", extra={"slug": slug, "backup": filename})
    return db_path

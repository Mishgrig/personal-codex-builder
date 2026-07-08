from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.paths import resolve_workspace_db_path, workspace_files_dir
from app.models.workspace import Card, CardAsset, CardSchema, TaxonomyTerm, WorkspaceSetting
from app.services.backup_service import list_workspace_backups
from app.core.db import get_session_factory

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _directory_size(directory: Path) -> tuple[int, int]:
    total_size = 0
    total_files = 0
    if not directory.exists():
        return total_size, total_files
    for file_path in directory.rglob("*"):
        if file_path.is_file():
            total_files += 1
            total_size += file_path.stat().st_size
    return total_size, total_files


def inspect_workspace_health(slug: str, *, schema_version: str, app_version: str) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    files_dir = workspace_files_dir(slug)

    with sqlite3.connect(db_path) as connection:
        row = connection.execute("PRAGMA integrity_check").fetchone()
    integrity_message = row[0] if row else "unknown"
    integrity_ok = integrity_message == "ok"

    session = get_session_factory(db_path)()
    try:
        card_count = session.execute(select(func.count(Card.id))).scalar() or 0
        schema_count = session.execute(select(func.count(CardSchema.id))).scalar() or 0
        taxonomy_term_count = session.execute(select(func.count(TaxonomyTerm.id))).scalar() or 0
        asset_paths = session.execute(select(CardAsset.stored_path)).scalars().all()
        settings = session.get(WorkspaceSetting, 1)
    finally:
        session.close()

    workspace_root = get_settings().workspaces_dir
    relative_paths = [path for path in asset_paths if path]
    if settings and settings.logo_path:
        relative_paths.append(settings.logo_path)
    missing_paths = [path for path in relative_paths if not (workspace_root / path).exists()]
    files_size_bytes, files_count = _directory_size(files_dir)
    backups = list_workspace_backups(slug)
    last_backup_at = backups[0]["created_at"] if backups else None

    payload = {
        "workspace_slug": slug,
        "checked_at": _now().isoformat(),
        "integrity_ok": integrity_ok,
        "integrity_message": integrity_message,
        "db_size_bytes": db_path.stat().st_size if db_path.exists() else 0,
        "files_size_bytes": files_size_bytes,
        "files_count": files_count,
        "missing_files_count": len(missing_paths),
        "missing_paths": missing_paths,
        "card_count": card_count,
        "schema_count": schema_count,
        "taxonomy_term_count": taxonomy_term_count,
        "backup_count": len(backups),
        "last_backup_at": last_backup_at,
        "schema_version": schema_version,
        "app_version": app_version,
    }
    logger.info("Workspace health checked", extra={"slug": slug, "integrity_ok": integrity_ok})
    return payload

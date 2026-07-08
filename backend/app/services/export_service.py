from __future__ import annotations

import json
import logging
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.exceptions import ValidationAPIError
from app.core.paths import (
    WORKSPACE_DB_FILENAME,
    WORKSPACE_METADATA_FILENAME,
    resolve_workspace_db_path,
    workspace_dir,
    workspace_exports_dir,
    workspace_files_dir,
    workspace_metadata_path,
)
from app.services.backup_service import _copy_sqlite_database

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_workspace_export(slug: str) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    metadata_path = workspace_metadata_path(slug)
    files_dir = workspace_files_dir(slug)
    exports_dir = workspace_exports_dir(slug)
    exports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = _now()
    archive_filename = f"{slug}-{timestamp.strftime('%Y%m%dT%H%M%SZ')}.workspace.zip"
    archive_path = exports_dir / archive_filename

    with tempfile.TemporaryDirectory() as tmpdir:
        temp_root = Path(tmpdir)
        temp_db_path = temp_root / WORKSPACE_DB_FILENAME
        _copy_sqlite_database(db_path, temp_db_path)

        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(temp_db_path, arcname=WORKSPACE_DB_FILENAME)
            if metadata_path.exists():
                archive.write(metadata_path, arcname=WORKSPACE_METADATA_FILENAME)
            if files_dir.exists():
                for file_path in files_dir.rglob("*"):
                    if file_path.is_file():
                        archive.write(file_path, arcname=file_path.relative_to(files_dir.parent).as_posix())

    logger.info("Exported workspace archive", extra={"slug": slug, "archive": archive_filename})
    return {
        "filename": archive_filename,
        "created_at": timestamp.isoformat(),
        "size_bytes": archive_path.stat().st_size,
        "path": archive_path.relative_to(workspace_dir(slug).parent.parent).as_posix(),
    }


def extract_workspace_archive(archive_path: Path) -> tuple[Path, dict[str, Any]]:
    temp_root = Path(tempfile.mkdtemp(prefix="workspace-import-"))
    extract_root = temp_root / "workspace"
    extract_root.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(archive_path) as archive:
            members = archive.namelist()
            required = {WORKSPACE_DB_FILENAME, WORKSPACE_METADATA_FILENAME}
            if not required.issubset(set(members)):
                raise ValidationAPIError(
                    "Archive is missing required workspace files.",
                    details={"required": sorted(required), "members": sorted(members)},
                )
            for member in members:
                target_path = extract_root / member
                resolved = target_path.resolve()
                if not str(resolved).startswith(str(extract_root.resolve())):
                    raise ValidationAPIError("Archive contains an unsafe path.", details={"member": member})
                if member.endswith("/"):
                    resolved.mkdir(parents=True, exist_ok=True)
                    continue
                resolved.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member) as source, resolved.open("wb") as destination:
                    shutil.copyfileobj(source, destination)

        metadata = json.loads((extract_root / WORKSPACE_METADATA_FILENAME).read_text(encoding="utf-8"))
        return extract_root, metadata
    except Exception:
        shutil.rmtree(temp_root, ignore_errors=True)
        raise

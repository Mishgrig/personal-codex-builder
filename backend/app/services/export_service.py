from __future__ import annotations

import csv
import io
import json
import logging
import re
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import ValidationAPIError
from app.core.paths import (
    LEGACY_WORKSPACE_METADATA_FILENAME,
    WORKSPACE_DB_FILENAME,
    WORKSPACE_METADATA_FILENAME,
    app_safety_backups_dir,
    legacy_workspace_metadata_path,
    resolve_workspace_db_path,
    workspace_assets_dir,
    workspace_dir,
    workspace_exports_dir,
    workspace_files_dir,
    workspace_metadata_path,
)
from app.models.workspace import Card
from app.services.card_service import _active_card_clause, _card_query, serialize_card_detail
from app.services.backup_service import _copy_sqlite_database

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sanitize_reason(reason: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", reason.strip().lower())
    return cleaned.strip("-") or "manual"


def _archive_workspace_contents(slug: str, archive_path: Path) -> None:
    db_path = resolve_workspace_db_path(slug)
    metadata_path = workspace_metadata_path(slug)
    legacy_metadata_path = legacy_workspace_metadata_path(slug)
    files_dir = workspace_files_dir(slug)
    assets_dir = workspace_assets_dir(slug)

    archive_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        temp_root = Path(tmpdir)
        temp_db_path = temp_root / WORKSPACE_DB_FILENAME
        _copy_sqlite_database(db_path, temp_db_path)

        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(temp_db_path, arcname=WORKSPACE_DB_FILENAME)
            if metadata_path.exists():
                archive.write(metadata_path, arcname=WORKSPACE_METADATA_FILENAME)
            if legacy_metadata_path.exists():
                archive.write(legacy_metadata_path, arcname=LEGACY_WORKSPACE_METADATA_FILENAME)
            if files_dir.exists():
                for file_path in files_dir.rglob("*"):
                    if file_path.is_file():
                        archive.write(file_path, arcname=file_path.relative_to(files_dir.parent).as_posix())
            if assets_dir.exists():
                for file_path in assets_dir.rglob("*"):
                    if file_path.is_file():
                        archive.write(file_path, arcname=file_path.relative_to(assets_dir.parent).as_posix())


def create_workspace_export(slug: str) -> dict[str, Any]:
    exports_dir = workspace_exports_dir(slug)
    exports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = _now()
    archive_filename = f"{slug}-{timestamp.strftime('%Y%m%dT%H%M%SZ')}.workspace.zip"
    archive_path = exports_dir / archive_filename

    _archive_workspace_contents(slug, archive_path)

    logger.info("Exported workspace archive", extra={"slug": slug, "archive": archive_filename})
    return {
        "filename": archive_filename,
        "created_at": timestamp.isoformat(),
        "size_bytes": archive_path.stat().st_size,
        "path": archive_path.relative_to(workspace_dir(slug).parent.parent).as_posix(),
    }


def create_workspace_safety_export(slug: str, *, reason: str) -> dict[str, Any]:
    timestamp = _now()
    safe_reason = _sanitize_reason(reason)
    archive_filename = f"{slug}-{timestamp.strftime('%Y%m%dT%H%M%SZ')}-{safe_reason}.workspace.zip"
    archive_path = app_safety_backups_dir() / archive_filename
    _archive_workspace_contents(slug, archive_path)
    logger.info("Created workspace safety archive", extra={"slug": slug, "archive": archive_filename, "reason": safe_reason})
    return {
        "filename": archive_filename,
        "created_at": timestamp.isoformat(),
        "size_bytes": archive_path.stat().st_size,
        "reason": safe_reason,
        "path": archive_path.relative_to(workspace_dir(slug).parent.parent).as_posix(),
    }


def extract_workspace_archive(archive_path: Path) -> tuple[Path, dict[str, Any]]:
    temp_root = Path(tempfile.mkdtemp(prefix="workspace-import-"))
    extract_root = temp_root / "workspace"
    extract_root.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(archive_path) as archive:
            members = archive.namelist()
            has_db = WORKSPACE_DB_FILENAME in members
            has_metadata = WORKSPACE_METADATA_FILENAME in members or LEGACY_WORKSPACE_METADATA_FILENAME in members
            if not has_db or not has_metadata:
                raise ValidationAPIError(
                    "Archive is missing required workspace files.",
                    details={
                        "required": [WORKSPACE_DB_FILENAME, f"{WORKSPACE_METADATA_FILENAME} or {LEGACY_WORKSPACE_METADATA_FILENAME}"],
                        "members": sorted(members),
                    },
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

        metadata_path = extract_root / WORKSPACE_METADATA_FILENAME
        if not metadata_path.exists():
            metadata_path = extract_root / LEGACY_WORKSPACE_METADATA_FILENAME
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        return extract_root, metadata
    except Exception:
        shutil.rmtree(temp_root, ignore_errors=True)
        raise


def export_workspace_data(
    session: Session,
    slug: str,
    *,
    export_format: str = "json",
    include_asset_ids: bool = False,
    card_ids: list[int] | None = None,
) -> dict[str, Any]:
    stmt = _card_query().where(_active_card_clause()).order_by(Card.sort_order.asc(), Card.id.asc())
    scope = "selected_cards" if card_ids else "all_workspace_data"
    if card_ids:
        stmt = stmt.where(Card.id.in_(card_ids))
    cards = list(session.execute(stmt).scalars().unique())
    rows: list[dict[str, Any]] = []
    for card in cards:
        payload = serialize_card_detail(card).model_dump(mode="json", by_alias=True)
        if not include_asset_ids:
            for asset_group in ("gallery", "attachments"):
                for asset in payload.get(asset_group, []):
                    asset.pop("id", None)
            for source in payload.get("sources", []):
                for asset in source.get("assets", []):
                    asset.pop("id", None)
            payload["cover_asset_id"] = None
        rows.append(payload)

    export_format = export_format.lower()
    timestamp = _now().strftime("%Y%m%dT%H%M%SZ")
    filename_base = f"{slug}-{scope}-{timestamp}"
    if export_format == "json":
        return {
            "filename": f"{filename_base}.json",
            "format": "json",
            "scope": scope,
            "include_asset_ids": include_asset_ids,
            "row_count": len(rows),
            "content_json": rows,
            "content_text": "",
        }
    if export_format == "csv":
        buffer = io.StringIO()
        headers = [
            "card_id",
            "uid",
            "slug",
            "title",
            "summary",
            "status",
            "schema_id",
            "schema_label",
            "body_text",
            "cover_asset_id",
            "dynamic_fields_json",
            "taxonomy_terms_json",
            "gallery_json",
            "attachments_json",
            "sources_json",
            "relations_json",
        ]
        writer = csv.DictWriter(buffer, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "card_id": row.get("id"),
                    "uid": row.get("uid"),
                    "slug": row.get("slug"),
                    "title": row.get("title"),
                    "summary": row.get("summary"),
                    "status": row.get("status"),
                    "schema_id": row.get("schema_id"),
                    "schema_label": row.get("schema_label"),
                    "body_text": row.get("body_text"),
                    "cover_asset_id": row.get("cover_asset_id"),
                    "dynamic_fields_json": json.dumps(row.get("dynamic_fields", {}), ensure_ascii=False),
                    "taxonomy_terms_json": json.dumps(row.get("taxonomy_terms", []), ensure_ascii=False),
                    "gallery_json": json.dumps(row.get("gallery", []), ensure_ascii=False),
                    "attachments_json": json.dumps(row.get("attachments", []), ensure_ascii=False),
                    "sources_json": json.dumps(row.get("sources", []), ensure_ascii=False),
                    "relations_json": json.dumps(row.get("relations", []), ensure_ascii=False),
                }
            )
        return {
            "filename": f"{filename_base}.csv",
            "format": "csv",
            "scope": scope,
            "include_asset_ids": include_asset_ids,
            "row_count": len(rows),
            "content_json": [],
            "content_text": buffer.getvalue(),
        }
    raise ValidationAPIError("Unsupported data export format.", details={"supported": ["json", "csv"]})

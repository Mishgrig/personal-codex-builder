from __future__ import annotations

import logging
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.paths import resolve_workspace_db_path, workspace_files_dir
from app.models.workspace import (
    Asset,
    Card,
    CardAsset,
    CardAttachmentAsset,
    CardGalleryAsset,
    CardRegistry,
    CardRelation,
    CardSchema,
    CardSource,
    CardSourceAsset,
    CardTaxonomyTerm,
    CardTypeDefinition,
    CardTypeField,
    TaxonomyTerm,
    WorkspaceSetting,
)
from app.services.backup_service import list_workspace_backups
from app.core.db import get_session_factory
from app.services.file_service import delete_unused_asset
from app.services.search_service import rebuild_index

logger = logging.getLogger(__name__)
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SQL_IDENTIFIER_PATTERN = re.compile(r"^[a-z_][a-z0-9_]*$")


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


def _check_status(ok: bool) -> str:
    return "ok" if ok else "warning"


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
        cards = session.execute(select(Card)).scalars().all()
        schema_count = session.execute(select(func.count(CardSchema.id))).scalar() or 0
        taxonomy_term_count = session.execute(select(func.count(TaxonomyTerm.id))).scalar() or 0
        asset_paths = session.execute(select(CardAsset.stored_path)).scalars().all()
        settings = session.get(WorkspaceSetting, 1)
        card_types = session.execute(select(CardTypeDefinition)).scalars().all()
        card_type_fields = session.execute(select(CardTypeField)).scalars().all()
        registry_rows = session.execute(select(CardRegistry)).scalars().all()
        relation_rows = session.execute(select(CardRelation)).scalars().all()
        taxonomy_links = session.execute(select(CardTaxonomyTerm)).scalars().all()
        taxonomy_terms = session.execute(select(TaxonomyTerm)).scalars().all()
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
    active_card_ids = {
        registry.legacy_card_id
        for registry in registry_rows
        if registry.legacy_card_id is not None and registry.deleted_at is None
    }
    all_card_ids = {card.id for card in cards}
    term_ids = {term.id for term in taxonomy_terms}
    invalid_card_type_slugs = sorted(card_type.slug for card_type in card_types if not SLUG_PATTERN.match(card_type.slug))
    invalid_table_names = sorted(
        card_type.table_name for card_type in card_types if not SQL_IDENTIFIER_PATTERN.match(card_type.table_name)
    )
    invalid_column_names = sorted(
        field.sql_column_name for field in card_type_fields if not SQL_IDENTIFIER_PATTERN.match(field.sql_column_name)
    )

    missing_registry_rows: list[str] = []
    orphan_table_rows: list[str] = []
    with sqlite3.connect(db_path) as connection:
        search_index_count_row = connection.execute("SELECT COUNT(*) FROM card_search_index").fetchone()
        search_index_count = search_index_count_row[0] if search_index_count_row else 0
        for card_type in card_types:
            table_name = f'"{card_type.table_name}"'
            missing_registry_rows.extend(
                f"{card_type.slug}:{row[0]}"
                for row in connection.execute(
                    f"""
                    SELECT t.card_id
                    FROM {table_name} t
                    LEFT JOIN cards_registry r ON r.legacy_card_id = t.card_id
                    WHERE r.id IS NULL
                    """
                ).fetchall()
            )
            orphan_table_rows.extend(
                f"{card_type.slug}:{row[0]}"
                for row in connection.execute(
                    f"""
                    SELECT r.legacy_card_id
                    FROM cards_registry r
                    LEFT JOIN {table_name} t ON t.card_id = r.legacy_card_id
                    WHERE r.card_type_slug = ? AND r.deleted_at IS NULL AND r.legacy_card_id IS NOT NULL AND t.card_id IS NULL
                    """,
                    (card_type.slug,),
                ).fetchall()
            )

    broken_relation_links = sorted(
        str(relation.id)
        for relation in relation_rows
        if relation.source_card_id not in all_card_ids or relation.target_card_id not in all_card_ids
    )
    broken_taxonomy_links = sorted(
        str(link.id)
        for link in taxonomy_links
        if link.card_id not in all_card_ids or link.term_id not in term_ids
    )
    search_index_out_of_sync = search_index_count != len(active_card_ids)
    checks = [
        {
            "key": "sqlite_integrity",
            "category": "database",
            "status": "ok" if integrity_ok else "error",
            "message": "SQLite integrity check passed." if integrity_ok else f"SQLite integrity check returned {integrity_message}.",
            "details": {"integrity_message": integrity_message},
        },
        {
            "key": "workspace_files_missing",
            "category": "filesystem",
            "status": _check_status(len(missing_paths) == 0),
            "message": "No missing workspace file paths were found."
            if not missing_paths
            else f"Found {len(missing_paths)} missing workspace file paths.",
            "details": {"missing_paths": missing_paths, "missing_files_count": len(missing_paths)},
        },
        {
            "key": "workspace_backup_coverage",
            "category": "backups",
            "status": _check_status(len(backups) > 0),
            "message": "Workspace has at least one backup."
            if backups
            else "Workspace has no backups yet.",
            "details": {"backup_count": len(backups), "last_backup_at": last_backup_at},
        },
        {
            "key": "workspace_structure_counts",
            "category": "content",
            "status": "ok",
            "message": "Workspace record counts were collected successfully.",
            "details": {
                "card_count": card_count,
                "schema_count": schema_count,
                "taxonomy_term_count": taxonomy_term_count,
                "files_count": files_count,
            },
        },
        {
            "key": "card_type_identifiers",
            "category": "schema",
            "status": _check_status(not (invalid_card_type_slugs or invalid_table_names or invalid_column_names)),
            "message": "Card type identifiers look valid."
            if not (invalid_card_type_slugs or invalid_table_names or invalid_column_names)
            else "Found invalid card type slugs, table names, or column names.",
            "details": {
                "invalid_card_type_slugs": invalid_card_type_slugs,
                "invalid_table_names": invalid_table_names,
                "invalid_column_names": invalid_column_names,
            },
        },
        {
            "key": "card_type_registry_sync",
            "category": "schema",
            "status": _check_status(not (missing_registry_rows or orphan_table_rows)),
            "message": "Card type tables and registry rows are in sync."
            if not (missing_registry_rows or orphan_table_rows)
            else "Found card type table and registry mismatches.",
            "details": {
                "table_rows_without_registry": missing_registry_rows,
                "registry_rows_without_table": orphan_table_rows,
            },
        },
        {
            "key": "search_index_sync",
            "category": "search",
            "status": _check_status(not search_index_out_of_sync),
            "message": "Search index row count matches active registry rows."
            if not search_index_out_of_sync
            else "Search index appears out of sync with active registry rows.",
            "details": {
                "search_index_count": search_index_count,
                "active_registry_count": len(active_card_ids),
            },
        },
        {
            "key": "relation_link_integrity",
            "category": "relations",
            "status": _check_status(not broken_relation_links),
            "message": "All relation links point to existing cards."
            if not broken_relation_links
            else f"Found {len(broken_relation_links)} broken relation links.",
            "details": {"relation_ids": broken_relation_links},
        },
        {
            "key": "taxonomy_link_integrity",
            "category": "taxonomy",
            "status": _check_status(not broken_taxonomy_links),
            "message": "All taxonomy links point to existing cards and terms."
            if not broken_taxonomy_links
            else f"Found {len(broken_taxonomy_links)} broken taxonomy links.",
            "details": {"taxonomy_link_ids": broken_taxonomy_links},
        },
    ]

    categories: dict[str, dict[str, Any]] = {}
    for check in checks:
        category = categories.setdefault(
            check["category"],
            {
                "key": check["category"],
                "status": "ok",
                "issue_count": 0,
                "checks": [],
            },
        )
        category["checks"].append(check)
        if check["status"] != "ok":
            category["issue_count"] += 1
            if check["status"] == "error":
                category["status"] = "error"
            elif category["status"] == "ok":
                category["status"] = "warning"

    issue_count = sum(1 for check in checks if check["status"] != "ok")

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
        "issue_count": issue_count,
        "checks": checks,
        "categories": categories,
    }
    logger.info("Workspace health checked", extra={"slug": slug, "integrity_ok": integrity_ok})
    return payload


def inspect_asset_health(slug: str) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    workspace_root = get_settings().workspaces_dir
    assets_root = workspace_root / slug / "assets"

    session = get_session_factory(db_path)()
    try:
        assets = session.execute(
            select(Asset).options(
                selectinload(Asset.gallery_links),
                selectinload(Asset.attachment_links),
                selectinload(Asset.source_links),
                selectinload(Asset.notebook_links),
            )
        ).scalars().all()
        cards = session.execute(select(Card)).scalars().all()
        gallery_links = session.execute(select(CardGalleryAsset)).scalars().all()
        attachment_links = session.execute(select(CardAttachmentAsset)).scalars().all()
        source_links = session.execute(select(CardSourceAsset)).scalars().all()
        sources = session.execute(select(CardSource)).scalars().all()
    finally:
        session.close()

    asset_paths = {asset.relative_path for asset in assets}
    missing_asset_files = sorted(path for path in asset_paths if not (workspace_root / path).exists())
    orphaned_files = []
    if assets_root.exists():
        for file_path in assets_root.rglob("*"):
            if file_path.is_file():
                relative = file_path.relative_to(workspace_root).as_posix()
                if relative not in asset_paths:
                    orphaned_files.append(relative)

    checksum_counts: dict[str, int] = {}
    for asset in assets:
        checksum_counts[asset.checksum_sha256] = checksum_counts.get(asset.checksum_sha256, 0) + 1
    duplicate_checksums = sorted(checksum for checksum, count in checksum_counts.items() if count > 1)

    used_asset_ids = set()
    for asset in assets:
        if asset.gallery_links or asset.attachment_links or asset.source_links or asset.notebook_links:
            used_asset_ids.add(asset.id)
    unused_assets = sorted(asset.id for asset in assets if asset.id not in used_asset_ids)

    all_asset_ids = {asset.id for asset in assets}
    all_card_ids = {card.id for card in cards}
    all_source_ids = {source.id for source in sources}
    broken_cover_asset_ids = sorted(
        card.cover_asset_id for card in cards if card.cover_asset_id and card.cover_asset_id not in all_asset_ids
    )
    broken_gallery_links = sorted(
        str(link.id) for link in gallery_links if link.asset_id not in all_asset_ids or link.card_id not in all_card_ids
    )
    broken_attachment_links = sorted(
        str(link.id) for link in attachment_links if link.asset_id not in all_asset_ids or link.card_id not in all_card_ids
    )
    broken_source_links = sorted(
        str(link.id) for link in source_links if link.asset_id not in all_asset_ids or link.source_id not in all_source_ids
    )

    checks = [
        {
            "key": "missing_asset_files",
            "category": "asset-files",
            "status": _check_status(not missing_asset_files),
            "message": "All asset files are present." if not missing_asset_files else f"Missing {len(missing_asset_files)} asset files.",
            "details": {"paths": missing_asset_files},
        },
        {
            "key": "orphaned_asset_files",
            "category": "asset-files",
            "status": _check_status(not orphaned_files),
            "message": "No orphaned asset files were found." if not orphaned_files else f"Found {len(orphaned_files)} orphaned asset files.",
            "details": {"paths": orphaned_files},
        },
        {
            "key": "duplicate_asset_checksums",
            "category": "asset-registry",
            "status": _check_status(not duplicate_checksums),
            "message": "No duplicate asset checksums found." if not duplicate_checksums else f"Found {len(duplicate_checksums)} duplicate checksum groups.",
            "details": {"checksums": duplicate_checksums},
        },
        {
            "key": "unused_assets",
            "category": "asset-registry",
            "status": _check_status(not unused_assets),
            "message": "No unused assets found." if not unused_assets else f"Found {len(unused_assets)} unused assets.",
            "details": {"asset_ids": unused_assets},
        },
        {
            "key": "broken_cover_assets",
            "category": "card-links",
            "status": _check_status(not broken_cover_asset_ids),
            "message": "All card covers point to existing assets." if not broken_cover_asset_ids else f"Found {len(broken_cover_asset_ids)} broken cover links.",
            "details": {"cover_asset_ids": broken_cover_asset_ids},
        },
        {
            "key": "broken_gallery_links",
            "category": "card-links",
            "status": _check_status(not broken_gallery_links),
            "message": "All gallery links are valid." if not broken_gallery_links else f"Found {len(broken_gallery_links)} broken gallery links.",
            "details": {"link_ids": broken_gallery_links},
        },
        {
            "key": "broken_attachment_links",
            "category": "card-links",
            "status": _check_status(not broken_attachment_links),
            "message": "All attachment links are valid." if not broken_attachment_links else f"Found {len(broken_attachment_links)} broken attachment links.",
            "details": {"link_ids": broken_attachment_links},
        },
        {
            "key": "broken_source_links",
            "category": "card-links",
            "status": _check_status(not broken_source_links),
            "message": "All source asset links are valid." if not broken_source_links else f"Found {len(broken_source_links)} broken source links.",
            "details": {"link_ids": broken_source_links},
        },
    ]

    categories: dict[str, dict[str, Any]] = {}
    for check in checks:
        category = categories.setdefault(
            check["category"],
            {"key": check["category"], "status": "ok", "issue_count": 0, "checks": []},
        )
        category["checks"].append(check)
        if check["status"] != "ok":
            category["issue_count"] += 1
            if category["status"] == "ok":
                category["status"] = "warning"

    return {
        "workspace_slug": slug,
        "checked_at": _now().isoformat(),
        "issue_count": sum(1 for check in checks if check["status"] != "ok"),
        "missing_asset_files": missing_asset_files,
        "orphaned_files": orphaned_files,
        "duplicate_checksums": duplicate_checksums,
        "unused_assets": unused_assets,
        "broken_cover_asset_ids": broken_cover_asset_ids,
        "broken_gallery_links": broken_gallery_links,
        "broken_attachment_links": broken_attachment_links,
        "broken_source_links": broken_source_links,
        "checks": checks,
        "categories": categories,
    }


def repair_workspace_health(slug: str, *, action: str) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    session = get_session_factory(db_path)()
    try:
        if action == "rebuild_search_index":
            rebuild_index(session)
            return {"message": "Search index rebuilt.", "repaired_count": 1, "skipped_count": 0}

        if action == "remove_broken_relation_links":
            cards = {card.id for card in session.execute(select(Card)).scalars().all()}
            relations = session.execute(select(CardRelation)).scalars().all()
            broken = [
                relation
                for relation in relations
                if relation.source_card_id not in cards or relation.target_card_id not in cards
            ]
            for relation in broken:
                session.delete(relation)
            session.commit()
            return {
                "message": "Broken relation links removed." if broken else "No broken relation links found.",
                "repaired_count": len(broken),
                "skipped_count": 0,
            }

        raise ValueError(f"Unsupported workspace repair action: {action}")
    finally:
        session.close()


def repair_asset_health(slug: str, *, action: str) -> dict[str, Any]:
    db_path = resolve_workspace_db_path(slug)
    workspace_root = get_settings().workspaces_dir
    session = get_session_factory(db_path)()
    try:
        if action == "remove_broken_cover_references":
            assets = {asset.id for asset in session.execute(select(Asset)).scalars().all()}
            cards = session.execute(select(Card)).scalars().all()
            repaired = 0
            for card in cards:
                if card.cover_asset_id and card.cover_asset_id not in assets:
                    card.cover_asset_id = None
                    session.add(card)
                    repaired += 1
            session.commit()
            return {
                "message": "Broken cover references removed." if repaired else "No broken cover references found.",
                "repaired_count": repaired,
                "skipped_count": 0,
            }

        if action in {"remove_broken_gallery_links", "remove_broken_attachment_links", "remove_broken_source_links"}:
            assets = {asset.id for asset in session.execute(select(Asset)).scalars().all()}
            cards = {card.id for card in session.execute(select(Card)).scalars().all()}
            sources = {source.id for source in session.execute(select(CardSource)).scalars().all()}
            if action == "remove_broken_gallery_links":
                links = session.execute(select(CardGalleryAsset)).scalars().all()
                broken = [link for link in links if link.asset_id not in assets or link.card_id not in cards]
            elif action == "remove_broken_attachment_links":
                links = session.execute(select(CardAttachmentAsset)).scalars().all()
                broken = [link for link in links if link.asset_id not in assets or link.card_id not in cards]
            else:
                links = session.execute(select(CardSourceAsset)).scalars().all()
                broken = [link for link in links if link.asset_id not in assets or link.source_id not in sources]
            for link in broken:
                session.delete(link)
            session.commit()
            label = action.replace("_", " ")
            return {
                "message": f"{label.capitalize()} repaired." if broken else f"No issues found for {label}.",
                "repaired_count": len(broken),
                "skipped_count": 0,
            }

        if action == "delete_orphaned_asset_files":
            asset_paths = {asset.relative_path for asset in session.execute(select(Asset)).scalars().all()}
            assets_root = workspace_root / slug / "assets"
            removed = 0
            if assets_root.exists():
                for file_path in assets_root.rglob("*"):
                    if file_path.is_file():
                        relative = file_path.relative_to(workspace_root).as_posix()
                        if relative not in asset_paths:
                            file_path.unlink()
                            removed += 1
            return {
                "message": "Orphaned asset files deleted." if removed else "No orphaned asset files found.",
                "repaired_count": removed,
                "skipped_count": 0,
            }

        if action == "delete_unused_assets":
            assets = session.execute(
                select(Asset).options(
                    selectinload(Asset.gallery_links),
                    selectinload(Asset.attachment_links),
                    selectinload(Asset.source_links),
                )
            ).scalars().all()
            unused_ids = [
                asset.id for asset in assets if not asset.gallery_links and not asset.attachment_links and not asset.source_links
            ]
            removed = 0
            for asset_id in unused_ids:
                delete_unused_asset(session, asset_id=asset_id)
                removed += 1
            return {
                "message": "Unused assets deleted." if removed else "No unused assets found.",
                "repaired_count": removed,
                "skipped_count": 0,
            }

        if action == "rebuild_asset_index":
            return {
                "message": "Asset Library reads directly from the SQLite registry, so no separate asset index rebuild is needed.",
                "repaired_count": 0,
                "skipped_count": 1,
            }

        raise ValueError(f"Unsupported asset repair action: {action}")
    finally:
        session.close()

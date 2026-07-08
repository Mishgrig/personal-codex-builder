from __future__ import annotations

import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import create_workspace_schema, dispose_sqlite_handles, get_session_factory
from app.core.exceptions import NotFoundError, ValidationAPIError
from app.core.paths import (
    WORKSPACE_DB_FILENAME,
    WORKSPACE_METADATA_FILENAME,
    ensure_workspace_layout,
    resolve_workspace_db_path,
    workspace_backups_dir,
    workspace_db_path,
    workspace_dir,
    workspace_exports_dir,
    workspace_files_dir,
    workspace_metadata_path,
    workspace_relative_dir,
)
from app.models.app_index import AppWorkspace
from app.models.workspace import Card, CardSchema, WorkspaceSetting
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.backup_service import (
    create_workspace_backup,
    delete_workspace_backup,
    list_workspace_backups,
    restore_workspace_backup,
)
from app.services.export_service import create_workspace_export, extract_workspace_archive
from app.services.integrity_service import inspect_workspace_health
from app.services.seed_service import seed_workspace
from app.storage.app_index import app_index_session, create_app_index_schema
from app.storage.catalog import load_catalog
from app.storage.workspace_metadata import load_workspace_metadata, save_workspace_metadata
from app.utils.slug import slugify_name

logger = logging.getLogger(__name__)

DEFAULT_TAXONOMY_LABELS = {
    "domain": "Domain",
    "type": "Type",
    "subtype": "Subtype",
    "layer": "Layer",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return _now()
    return datetime.fromisoformat(value)


class WorkspaceManager:
    def __init__(self) -> None:
        self.settings = get_settings()

    def bootstrap(self) -> None:
        create_app_index_schema()
        self._seed_registry_if_needed()
        with app_index_session() as session:
            records = session.execute(select(AppWorkspace).order_by(AppWorkspace.id)).scalars().all()
            changed = False
            for record in records:
                changed = self._ensure_workspace_layout_for_record(record) or changed
                changed = self._ensure_workspace_schema_current(record) or changed
                snapshot = self._workspace_snapshot(record.slug)
                if snapshot:
                    changed = self._sync_record_from_snapshot(record, snapshot) or changed
            if changed:
                session.commit()
                for record in records:
                    session.refresh(record)
            for record in records:
                self._write_workspace_metadata(record)

    def list_workspaces(self, *, include_archived: bool = False) -> list[dict]:
        self.bootstrap()
        with app_index_session() as session:
            statement = select(AppWorkspace)
            if not include_archived:
                statement = statement.where(AppWorkspace.archived.is_(False))
            records = session.execute(statement).scalars().all()
        records.sort(key=lambda record: record.last_opened_at or record.created_at, reverse=True)
        return [self._workspace_summary(record) for record in records if resolve_workspace_db_path(record.slug).exists()]

    def get_workspace_summary(self, slug: str) -> dict:
        self.bootstrap()
        with app_index_session() as session:
            record = self._get_record_or_raise(session, slug)
        return self._workspace_summary(record)

    def create_workspace(self, payload: WorkspaceCreate, *, seed_demo: bool = False) -> dict:
        self.bootstrap()
        with app_index_session() as session:
            slug = self._next_slug(session, payload.name)
            created_at = _now()
            record = AppWorkspace(
                slug=slug,
                name=payload.name,
                description=payload.description,
                theme=payload.theme,
                path=workspace_relative_dir(slug),
                db_filename=WORKSPACE_DB_FILENAME,
                metadata_filename=WORKSPACE_METADATA_FILENAME,
                archived=False,
                schema_version=self.settings.workspace_schema_version,
                app_version=self.settings.app_version,
                created_at=created_at,
                updated_at=created_at,
            )
            ensure_workspace_layout(slug)
            db_path = resolve_workspace_db_path(slug)
            create_workspace_schema(db_path)
            workspace_session = get_session_factory(db_path)()
            try:
                seed_workspace(
                    workspace_session,
                    workspace_name=payload.name,
                    theme=payload.theme,
                    include_demo=seed_demo,
                )
            finally:
                workspace_session.close()
            session.add(record)
            session.commit()
            session.refresh(record)
            self._write_workspace_metadata(record)
            logger.info("Created workspace", extra={"slug": slug})
            return self._workspace_summary(record)

    def delete_workspace(self, slug: str) -> None:
        self.bootstrap()
        db_path = resolve_workspace_db_path(slug)
        dispose_sqlite_handles(db_path)
        with app_index_session() as session:
            record = self._get_record_or_raise(session, slug)
            session.delete(record)
            session.commit()
        workspace_root = workspace_dir(slug)
        if workspace_root.exists():
            shutil.rmtree(workspace_root)
        logger.info("Deleted workspace", extra={"slug": slug})

    def copy_workspace(self, slug: str, new_name: str) -> dict:
        self.bootstrap()
        source_root = workspace_dir(slug)
        if not source_root.exists():
            raise NotFoundError("Workspace was not found.", code="WORKSPACE_NOT_FOUND")

        with app_index_session() as session:
            original = self._get_record_or_raise(session, slug)
            new_slug = self._next_slug(session, new_name)
            created_at = _now()
            copied = AppWorkspace(
                slug=new_slug,
                name=new_name,
                description=original.description,
                theme=original.theme,
                path=workspace_relative_dir(new_slug),
                db_filename=WORKSPACE_DB_FILENAME,
                metadata_filename=WORKSPACE_METADATA_FILENAME,
                archived=False,
                schema_version=original.schema_version,
                app_version=self.settings.app_version,
                created_at=created_at,
                updated_at=created_at,
            )
            target_root = workspace_dir(new_slug)
            if target_root.exists():
                shutil.rmtree(target_root)
            shutil.copytree(source_root, target_root)
            ensure_workspace_layout(new_slug)
            self._rename_workspace_setting(new_slug, new_name)
            snapshot = self._workspace_snapshot(new_slug)
            if snapshot:
                copied.description = snapshot["description"]
                copied.theme = snapshot["theme"]
            session.add(copied)
            session.commit()
            session.refresh(copied)
            self._write_workspace_metadata(copied)
            logger.info("Copied workspace", extra={"slug": slug, "new_slug": new_slug})
            return self._workspace_summary(copied)

    def open_workspace(self, slug: str) -> dict:
        self.bootstrap()
        with app_index_session() as session:
            record = self._get_record_or_raise(session, slug)
            record.last_opened_at = _now()
            session.add(record)
            session.commit()
            session.refresh(record)
            self._write_workspace_metadata(record)
        logger.info("Opened workspace", extra={"slug": slug})
        return self._workspace_summary(record)

    def get_workspace_session(self, slug: str) -> Session:
        self.open_workspace(slug)
        db_path = resolve_workspace_db_path(slug)
        if not db_path.exists():
            raise NotFoundError("Workspace was not found.", code="WORKSPACE_NOT_FOUND")
        return get_session_factory(db_path)()

    def update_workspace(self, session: Session, workspace_slug: str, payload: WorkspaceUpdate) -> WorkspaceSetting:
        settings = session.get(WorkspaceSetting, 1)
        if not settings:
            raise NotFoundError("Workspace settings were not found.", code="WORKSPACE_SETTINGS_NOT_FOUND")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(settings, key, value)
        session.add(settings)
        session.commit()
        session.refresh(settings)

        with app_index_session() as index_session:
            record = self._get_record_or_raise(index_session, workspace_slug)
            record.name = settings.name
            record.description = settings.description
            record.theme = settings.theme
            record.app_version = self.settings.app_version
            record.updated_at = _now()
            index_session.add(record)
            index_session.commit()
            index_session.refresh(record)
            self._write_workspace_metadata(record)

        logger.info("Updated workspace metadata", extra={"slug": workspace_slug})
        return settings

    def archive_workspace(self, slug: str, *, archived: bool = True) -> dict:
        self.bootstrap()
        with app_index_session() as session:
            record = self._get_record_or_raise(session, slug)
            record.archived = archived
            record.updated_at = _now()
            session.add(record)
            session.commit()
            session.refresh(record)
            self._write_workspace_metadata(record)
        logger.info("Archived workspace" if archived else "Unarchived workspace", extra={"slug": slug})
        return self._workspace_summary(record)

    def list_backups(self, slug: str) -> list[dict]:
        self.bootstrap()
        self._require_workspace(slug)
        return [
            {**backup, "created_at": _parse_datetime(backup["created_at"])}
            for backup in list_workspace_backups(slug)
        ]

    def create_backup(self, slug: str, *, reason: str = "manual") -> dict:
        self.bootstrap()
        record = self._require_workspace(slug)
        payload = create_workspace_backup(
            slug,
            reason=reason,
            schema_version=record.schema_version,
            app_version=record.app_version,
        )
        self._touch_record(slug)
        return {**payload, "created_at": _parse_datetime(payload["created_at"])}

    def delete_backup(self, slug: str, filename: str) -> None:
        self.bootstrap()
        self._require_workspace(slug)
        delete_workspace_backup(slug, filename)

    def restore_backup(self, slug: str, filename: str) -> dict:
        self.bootstrap()
        record = self._require_workspace(slug)
        safety_backup = create_workspace_backup(
            slug,
            reason="safety-restore",
            schema_version=record.schema_version,
            app_version=record.app_version,
        )
        restore_workspace_backup(slug, filename)
        snapshot = self._workspace_snapshot(slug)
        with app_index_session() as session:
            current = self._get_record_or_raise(session, slug)
            if snapshot:
                self._sync_record_from_snapshot(current, snapshot)
            current.updated_at = _now()
            session.add(current)
            session.commit()
            session.refresh(current)
            self._write_workspace_metadata(current)
        logger.info(
            "Restored workspace from backup",
            extra={"slug": slug, "backup": filename, "safety_backup": safety_backup["filename"]},
        )
        return {
            "workspace": self._workspace_summary(current),
            "safety_backup": {**safety_backup, "created_at": _parse_datetime(safety_backup["created_at"])},
        }

    def export_workspace(self, slug: str) -> dict:
        self.bootstrap()
        self._require_workspace(slug)
        payload = create_workspace_export(slug)
        return {**payload, "created_at": _parse_datetime(payload["created_at"])}

    def import_workspace_archive(self, archive_path: Path, *, name_override: str | None = None) -> dict:
        self.bootstrap()
        extract_root, metadata = extract_workspace_archive(archive_path)
        temp_root = extract_root.parent
        try:
            original_name = metadata.get("name") or extract_root.name.replace("-", " ").title()
            target_name = name_override or original_name
            with app_index_session() as session:
                new_slug = self._next_slug(session, target_name)
                target_root = workspace_dir(new_slug)
                if target_root.exists():
                    raise ValidationAPIError(
                        "A workspace folder with the target slug already exists.",
                        details={"slug": new_slug},
                    )
                shutil.copytree(extract_root, target_root)
                ensure_workspace_layout(new_slug)
                db_path = resolve_workspace_db_path(new_slug)
                if not db_path.exists():
                    raise ValidationAPIError("Imported archive did not contain workspace.sqlite.")
                create_workspace_schema(db_path)
                self._rename_workspace_setting(new_slug, target_name)
                snapshot = self._workspace_snapshot(new_slug)
                created_at = _parse_datetime(metadata.get("created_at"))
                record = AppWorkspace(
                    slug=new_slug,
                    name=target_name,
                    description=snapshot["description"] if snapshot else metadata.get("description", ""),
                    theme=snapshot["theme"] if snapshot else metadata.get("theme", self.settings.default_theme),
                    path=workspace_relative_dir(new_slug),
                    db_filename=WORKSPACE_DB_FILENAME,
                    metadata_filename=WORKSPACE_METADATA_FILENAME,
                    archived=False,
                    schema_version=metadata.get("schema_version", self.settings.workspace_schema_version),
                    app_version=self.settings.app_version,
                    created_at=created_at,
                    updated_at=_now(),
                )
                self._ensure_workspace_schema_current(record)
                session.add(record)
                session.commit()
                session.refresh(record)
                self._write_workspace_metadata(record)
            logger.info("Imported workspace archive", extra={"slug": new_slug, "archive": archive_path.name})
            return self._workspace_summary(record)
        finally:
            shutil.rmtree(temp_root, ignore_errors=True)

    def workspace_health(self, slug: str) -> dict:
        self.bootstrap()
        record = self._require_workspace(slug)
        payload = inspect_workspace_health(
            slug,
            schema_version=record.schema_version,
            app_version=record.app_version,
        )
        payload["checked_at"] = _parse_datetime(payload["checked_at"])
        if payload["last_backup_at"]:
            payload["last_backup_at"] = _parse_datetime(payload["last_backup_at"])
        return payload

    def get_app_info(self) -> dict:
        self.bootstrap()
        with app_index_session() as session:
            records = session.execute(select(AppWorkspace)).scalars().all()
        return {
            "project_name": self.settings.project_name,
            "app_version": self.settings.app_version,
            "workspace_schema_version": self.settings.workspace_schema_version,
            "data_dir": str(self.settings.data_dir),
            "app_index_path": str(self.settings.app_index_path),
            "workspaces_dir": str(self.settings.workspaces_dir),
            "workspace_count": len(records),
            "active_workspace_count": sum(1 for record in records if not record.archived),
            "archived_workspace_count": sum(1 for record in records if record.archived),
            "default_theme": self.settings.default_theme,
        }

    def ensure_default_workspace(self) -> None:
        self.bootstrap()
        with app_index_session() as session:
            records = session.execute(select(AppWorkspace)).scalars().all()
            if records:
                demo_record = next((record for record in records if record.slug == "spelljammer-atlas"), None)
                if not demo_record:
                    return
                db_path = resolve_workspace_db_path(demo_record.slug)
                needs_repair = not db_path.exists()
                if not needs_repair:
                    workspace_session = get_session_factory(db_path)()
                    try:
                        card_count = workspace_session.execute(select(func.count(Card.id))).scalar() or 0
                        schema_count = workspace_session.execute(select(func.count(CardSchema.id))).scalar() or 0
                        needs_repair = card_count == 0 and schema_count == 0
                    finally:
                        workspace_session.close()
                if not needs_repair:
                    return
        if workspace_dir("spelljammer-atlas").exists():
            shutil.rmtree(workspace_dir("spelljammer-atlas"))
        with app_index_session() as session:
            record = session.execute(
                select(AppWorkspace).where(AppWorkspace.slug == "spelljammer-atlas")
            ).scalar_one_or_none()
            if record:
                session.delete(record)
                session.commit()
        self.create_workspace(
            WorkspaceCreate(name="Spelljammer Atlas", description="Demo fantasy codex", theme="fantasy"),
            seed_demo=True,
        )

    def _seed_registry_if_needed(self) -> None:
        with app_index_session() as session:
            has_records = session.execute(select(func.count(AppWorkspace.id))).scalar() or 0
        if has_records:
            return

        imported_records = self._legacy_catalog_records()
        if not imported_records:
            imported_records = self._discover_workspace_records()

        if not imported_records:
            return

        with app_index_session() as session:
            for payload in imported_records:
                session.add(
                    AppWorkspace(
                        slug=payload["slug"],
                        name=payload["name"],
                        description=payload["description"],
                        theme=payload["theme"],
                        path=payload["path"],
                        db_filename=payload["db_filename"],
                        metadata_filename=payload["metadata_filename"],
                        archived=payload["archived"],
                        schema_version=payload["schema_version"],
                        app_version=payload["app_version"],
                        created_at=_parse_datetime(payload["created_at"]),
                        updated_at=_parse_datetime(payload["updated_at"]),
                        last_opened_at=_parse_datetime(payload["last_opened_at"])
                        if payload.get("last_opened_at")
                        else None,
                    )
                )
            session.commit()

    def _legacy_catalog_records(self) -> list[dict]:
        if not self.settings.catalog_path.exists():
            return []
        records: list[dict] = []
        for item in load_catalog().get("workspaces", []):
            slug = item["slug"]
            records.append(
                {
                    "slug": slug,
                    "name": item["name"],
                    "description": item.get("description", ""),
                    "theme": item.get("theme", self.settings.default_theme),
                    "path": workspace_relative_dir(slug),
                    "db_filename": WORKSPACE_DB_FILENAME,
                    "metadata_filename": WORKSPACE_METADATA_FILENAME,
                    "archived": False,
                    "schema_version": self.settings.workspace_schema_version,
                    "app_version": self.settings.app_version,
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at", item.get("created_at")),
                    "last_opened_at": None,
                }
            )
        return records

    def _discover_workspace_records(self) -> list[dict]:
        records: list[dict] = []
        if not self.settings.workspaces_dir.exists():
            return records

        for candidate in sorted(self.settings.workspaces_dir.iterdir()):
            if not candidate.is_dir():
                continue
            slug = candidate.name
            ensure_workspace_layout(slug)
            metadata = load_workspace_metadata(slug) or {}
            snapshot = self._workspace_snapshot(slug)
            if not snapshot and not workspace_db_path(slug).exists() and not workspace_metadata_path(slug).exists():
                continue
            created_at = metadata.get("created_at") or _now().isoformat()
            updated_at = metadata.get("updated_at") or created_at
            records.append(
                {
                    "slug": slug,
                    "name": snapshot["name"] if snapshot else metadata.get("name", slug.replace("-", " ").title()),
                    "description": snapshot["description"] if snapshot else metadata.get("description", ""),
                    "theme": snapshot["theme"] if snapshot else metadata.get("theme", self.settings.default_theme),
                    "path": workspace_relative_dir(slug),
                    "db_filename": WORKSPACE_DB_FILENAME,
                    "metadata_filename": WORKSPACE_METADATA_FILENAME,
                    "archived": bool(metadata.get("archived", False)),
                    "schema_version": metadata.get("schema_version", self.settings.workspace_schema_version),
                    "app_version": metadata.get("app_version", self.settings.app_version),
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "last_opened_at": metadata.get("last_opened_at"),
                }
            )
        return records

    def _ensure_workspace_layout_for_record(self, record: AppWorkspace) -> bool:
        ensure_workspace_layout(record.slug)
        resolve_workspace_db_path(record.slug)
        changed = False
        if record.path != workspace_relative_dir(record.slug):
            record.path = workspace_relative_dir(record.slug)
            changed = True
        if record.db_filename != WORKSPACE_DB_FILENAME:
            record.db_filename = WORKSPACE_DB_FILENAME
            changed = True
        if record.metadata_filename != WORKSPACE_METADATA_FILENAME:
            record.metadata_filename = WORKSPACE_METADATA_FILENAME
            changed = True
        if record.app_version != self.settings.app_version:
            record.app_version = self.settings.app_version
            changed = True
        return changed

    def _ensure_workspace_schema_current(self, record: AppWorkspace) -> bool:
        db_path = resolve_workspace_db_path(record.slug)
        if not db_path.exists():
            return False
        if record.schema_version == self.settings.workspace_schema_version:
            return False
        create_workspace_backup(
            record.slug,
            reason="pre-migration",
            schema_version=record.schema_version,
            app_version=record.app_version,
        )
        create_workspace_schema(db_path)
        record.schema_version = self.settings.workspace_schema_version
        record.app_version = self.settings.app_version
        record.updated_at = _now()
        logger.info("Synchronized workspace schema version", extra={"slug": record.slug})
        return True

    def _sync_record_from_snapshot(self, record: AppWorkspace, snapshot: dict[str, str]) -> bool:
        changed = False
        for key in ("name", "description", "theme"):
            if getattr(record, key) != snapshot[key]:
                setattr(record, key, snapshot[key])
                changed = True
        if changed:
            record.updated_at = _now()
        return changed

    def _workspace_snapshot(self, slug: str) -> dict[str, str] | None:
        db_path = resolve_workspace_db_path(slug)
        if not db_path.exists():
            return None
        session = get_session_factory(db_path)()
        try:
            settings = session.get(WorkspaceSetting, 1)
            if not settings:
                return None
            return {
                "name": settings.name,
                "description": settings.description,
                "theme": settings.theme,
            }
        finally:
            session.close()

    def _workspace_summary(self, record: AppWorkspace) -> dict:
        db_path = resolve_workspace_db_path(record.slug)
        session = get_session_factory(db_path)()
        try:
            setting = session.get(WorkspaceSetting, 1)
            card_count = session.execute(select(func.count(Card.id))).scalar() or 0
        finally:
            session.close()
        backups = list_workspace_backups(record.slug)
        last_backup_at = backups[0]["created_at"] if backups else None
        return {
            "slug": record.slug,
            "name": setting.name if setting else record.name,
            "description": setting.description if setting else record.description,
            "theme": setting.theme if setting else record.theme,
            "archived": record.archived,
            "logo_url": f"/media/{setting.logo_path}" if setting and setting.logo_path else None,
            "card_count": card_count,
            "path": record.path,
            "last_opened_at": record.last_opened_at,
            "backup_count": len(backups),
            "last_backup_at": _parse_datetime(last_backup_at) if last_backup_at else None,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "taxonomy_labels": setting.taxonomy_labels if setting else DEFAULT_TAXONOMY_LABELS,
        }

    def _write_workspace_metadata(self, record: AppWorkspace) -> None:
        save_workspace_metadata(
            record.slug,
            {
                "slug": record.slug,
                "name": record.name,
                "description": record.description,
                "theme": record.theme,
                "archived": record.archived,
                "path": record.path,
                "db_filename": record.db_filename,
                "metadata_filename": record.metadata_filename,
                "files_dir": workspace_files_dir(record.slug).name,
                "backups_dir": workspace_backups_dir(record.slug).name,
                "exports_dir": workspace_exports_dir(record.slug).name,
                "schema_version": record.schema_version,
                "app_version": record.app_version,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "last_opened_at": record.last_opened_at,
            },
        )

    def _rename_workspace_setting(self, slug: str, name: str) -> None:
        db_path = resolve_workspace_db_path(slug)
        workspace_session = get_session_factory(db_path)()
        try:
            settings = workspace_session.get(WorkspaceSetting, 1)
            if settings:
                settings.name = name
                workspace_session.add(settings)
                workspace_session.commit()
        finally:
            workspace_session.close()

    def _get_record_or_raise(self, session: Session, slug: str) -> AppWorkspace:
        record = session.execute(select(AppWorkspace).where(AppWorkspace.slug == slug)).scalar_one_or_none()
        if not record:
            raise NotFoundError("Workspace was not found.", code="WORKSPACE_NOT_FOUND", details={"slug": slug})
        return record

    def _next_slug(self, session: Session, name: str) -> str:
        base_slug = slugify_name(name)
        slug = base_slug
        suffix = 1
        while session.execute(select(AppWorkspace).where(AppWorkspace.slug == slug)).scalar_one_or_none():
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        return slug

    def _require_workspace(self, slug: str) -> AppWorkspace:
        with app_index_session() as session:
            return self._get_record_or_raise(session, slug)

    def _touch_record(self, slug: str) -> None:
        with app_index_session() as session:
            record = self._get_record_or_raise(session, slug)
            record.updated_at = _now()
            session.add(record)
            session.commit()
            session.refresh(record)
            self._write_workspace_metadata(record)


_workspace_manager = WorkspaceManager()


def get_workspace_manager() -> WorkspaceManager:
    return _workspace_manager

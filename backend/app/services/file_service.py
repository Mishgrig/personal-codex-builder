from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationAPIError
from app.core.paths import workspace_dir
from app.models.workspace import (
    Asset,
    Card,
    CardAsset,
    CardAttachmentAsset,
    CardGalleryAsset,
    CardSource,
    CardSourceAsset,
    WorkspaceSetting,
)
from app.services.search_service import index_card


ASSET_PREFIX = {
    "gallery": "img",
    "attachment": "file",
    "image": "img",
    "pdf": "pdf",
    "document": "doc",
    "spreadsheet": "xls",
    "audio": "aud",
    "video": "vid",
    "other": "file",
}


def _serialize_asset_usages(asset: Asset) -> list[dict[str, str | int | None]]:
    usages: list[dict[str, str | int | None]] = []
    for link in asset.gallery_links:
        if link.card:
            if link.card.cover_asset_id == asset.id:
                usages.append(
                    {
                        "usage_type": "card",
                        "label": link.card.title,
                        "card_id": link.card.id,
                        "asset_role": "cover",
                    }
                )
            usages.append(
                {
                    "usage_type": "card",
                    "label": link.card.title,
                    "card_id": link.card.id,
                    "asset_role": "gallery",
                }
            )
    for link in asset.attachment_links:
        if link.card:
            usages.append(
                {
                    "usage_type": "card",
                    "label": link.card.title,
                    "card_id": link.card.id,
                    "asset_role": "attachment",
                }
            )
    for link in asset.source_links:
        if link.source:
            usages.append(
                {
                    "usage_type": "source",
                    "label": f"{link.source.card.title if getattr(link.source, 'card', None) else 'Card'} / {link.source.title}",
                    "card_id": link.source.card_id,
                    "asset_role": "source",
                }
            )
    for link in asset.notebook_links:
        usages.append(
            {
                "usage_type": "notebook",
                "label": f"Notebook item {link.item_id}",
                "card_id": None,
                "asset_role": link.item_type,
            }
        )
    for chapter in asset.chapter_cover_links:
        usages.append(
            {
                "usage_type": "chapter",
                "label": chapter.title,
                "card_id": None,
                "asset_role": "cover",
            }
        )
    for scene in asset.scene_background_links:
        usages.append(
            {
                "usage_type": "scene",
                "label": scene.title,
                "card_id": None,
                "asset_role": "background",
            }
        )
    for scene in asset.scene_map_links:
        usages.append(
            {
                "usage_type": "scene",
                "label": scene.title,
                "card_id": None,
                "asset_role": "map",
            }
        )
    for token in asset.scene_token_links:
        usages.append(
            {
                "usage_type": "scene_token",
                "label": token.label or f"Scene token {token.id}",
                "card_id": token.card_id,
                "asset_role": "token",
            }
        )
    return usages


def _asset_bucket(upload: UploadFile, kind: str) -> str:
    mime = upload.content_type or ""
    if kind == "gallery" or mime.startswith("image/"):
        return "images"
    if mime == "application/pdf":
        return "pdf"
    if "spreadsheet" in mime or "excel" in mime:
        return "spreadsheets"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    if any(token in mime for token in ["word", "document", "text"]):
        return "documents"
    return "other"


def _asset_type_id(bucket: str) -> str:
    prefix_map = {
        "images": "img",
        "pdf": "pdf",
        "documents": "doc",
        "spreadsheets": "xls",
        "audio": "aud",
        "video": "vid",
        "other": "file",
    }
    return f"{prefix_map[bucket]}-{uuid4().hex[:6]}"


def _asset_bucket_for_filename(filename: str, mime_type: str = "") -> str:
    guessed_mime = mime_type or mimetypes.guess_type(filename)[0] or ""
    if guessed_mime.startswith("image/"):
        return "images"
    if guessed_mime == "application/pdf":
        return "pdf"
    if "spreadsheet" in guessed_mime or "excel" in guessed_mime:
        return "spreadsheets"
    if guessed_mime.startswith("audio/"):
        return "audio"
    if guessed_mime.startswith("video/"):
        return "video"
    if any(token in guessed_mime for token in ["word", "document", "text"]):
        return "documents"
    return "other"


def _read_upload_bytes(upload: UploadFile) -> bytes:
    upload.file.seek(0)
    content = upload.file.read()
    upload.file.seek(0)
    return content


def _save_binary(*, workspace_slug: str, bucket: str, asset_id: str, suffix: str, content: bytes) -> tuple[str, int, str]:
    workspace_root = workspace_dir(workspace_slug)
    destination_dir = workspace_root / "assets" / bucket
    destination_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{asset_id}{suffix}"
    destination = destination_dir / stored_filename
    destination.write_bytes(content)
    mime = mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    relative_path = destination.relative_to(get_settings().workspaces_dir).as_posix()
    return relative_path, len(content), mime


def upload_logo(session: Session, workspace_slug: str, upload: UploadFile) -> WorkspaceSetting:
    settings = session.get(WorkspaceSetting, 1)
    if not settings:
        raise NotFoundError("Workspace settings were not found.")
    content = _read_upload_bytes(upload)
    suffix = Path(upload.filename or "logo").suffix
    asset_id = _asset_type_id("images")
    relative_path, _size, _mime = _save_binary(
        workspace_slug=workspace_slug,
        bucket="images",
        asset_id=asset_id,
        suffix=suffix,
        content=content,
    )
    settings.logo_path = relative_path
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


def add_asset(
    session: Session,
    *,
    workspace_slug: str,
    card_id: int,
    kind: str,
    upload: UploadFile,
) -> CardAsset:
    card = session.get(Card, card_id)
    if not card:
        raise NotFoundError("Card was not found.")
    content = _read_upload_bytes(upload)
    checksum = hashlib.sha256(content).hexdigest()
    existing_asset = session.execute(select(Asset).where(Asset.checksum_sha256 == checksum)).scalar_one_or_none()
    if existing_asset:
        raise ConflictError(
            f"This file already exists as {existing_asset.id} / {existing_asset.original_filename}. Use existing asset instead of uploading a duplicate?"
        )

    suffix = Path(upload.filename or "file").suffix
    bucket = _asset_bucket(upload, kind)
    asset_id = _asset_type_id(bucket)
    relative_path, size, mime = _save_binary(
        workspace_slug=workspace_slug,
        bucket=bucket,
        asset_id=asset_id,
        suffix=suffix,
        content=content,
    )

    asset = Asset(
        id=asset_id,
        asset_type=bucket,
        original_filename=upload.filename or f"{asset_id}{suffix}",
        stored_filename=f"{asset_id}{suffix}",
        relative_path=relative_path,
        mime_type=upload.content_type or mime,
        size_bytes=size,
        checksum_sha256=checksum,
    )
    session.add(asset)
    session.flush()

    if kind == "gallery":
        sort_order = len(card.gallery_asset_links)
        session.add(CardGalleryAsset(card_id=card.id, asset_id=asset.id, sort_order=sort_order))
        if not card.cover_asset_id:
            card.cover_asset_id = asset.id
    else:
        sort_order = len(card.attachment_asset_links)
        session.add(CardAttachmentAsset(card_id=card.id, asset_id=asset.id, sort_order=sort_order))

    legacy = CardAsset(
        card_id=card.id,
        kind=kind,
        stored_path=relative_path,
        original_name=asset.original_filename,
        mime_type=asset.mime_type,
        size=asset.size_bytes,
        sort_order=sort_order,
    )
    session.add(legacy)
    session.commit()
    refreshed_card = session.get(Card, card.id)
    if refreshed_card:
        index_card(session, refreshed_card)
        session.commit()
    session.refresh(legacy)
    return legacy


def delete_asset(session: Session, *, workspace_slug: str, asset_id: int | str, card_id: int | None = None) -> int:
    legacy_asset = session.get(CardAsset, asset_id) if isinstance(asset_id, int) else None
    if legacy_asset:
        card_id = legacy_asset.card_id
        file_path = get_settings().workspaces_dir / legacy_asset.stored_path
        if file_path.exists():
            file_path.unlink()
        session.delete(legacy_asset)
        session.commit()
        return card_id

    asset = session.get(Asset, str(asset_id))
    if not asset:
        raise NotFoundError("Asset was not found.")
    affected_card_id = card_id or (
        asset.gallery_links[0].card_id if asset.gallery_links else asset.attachment_links[0].card_id
    )

    if card_id is not None:
        for link in list(asset.gallery_links):
            if link.card_id == card_id:
                session.delete(link)
        for link in list(asset.attachment_links):
            if link.card_id == card_id:
                session.delete(link)
        legacy_rows = session.execute(
            select(CardAsset).where(CardAsset.card_id == card_id, CardAsset.stored_path == asset.relative_path)
        ).scalars().all()
        for row in legacy_rows:
            session.delete(row)
        card = session.get(Card, card_id)
        if card and card.cover_asset_id == asset.id:
            replacement = next((link.asset_id for link in card.gallery_asset_links if link.asset_id != asset.id), None)
            card.cover_asset_id = replacement
            session.add(card)
        session.flush()
        session.refresh(asset)
        if (
            asset.gallery_links
            or asset.attachment_links
            or asset.source_links
            or asset.notebook_links
            or asset.chapter_cover_links
            or asset.scene_background_links
            or asset.scene_map_links
            or asset.scene_token_links
        ):
            session.commit()
            refreshed_card = session.get(Card, affected_card_id)
            if refreshed_card:
                index_card(session, refreshed_card)
                session.commit()
            return affected_card_id

    if (
        asset.notebook_links
        or asset.chapter_cover_links
        or asset.scene_background_links
        or asset.scene_map_links
        or asset.scene_token_links
    ):
        raise ConflictError("This asset is still used by a workspace module and cannot be deleted.")

    file_path = get_settings().workspaces_dir / asset.relative_path
    if file_path.exists():
        file_path.unlink()
    for link in list(asset.gallery_links):
        session.delete(link)
    for link in list(asset.attachment_links):
        session.delete(link)
    for link in list(asset.source_links):
        session.delete(link)
    for link in list(asset.notebook_links):
        session.delete(link)
    session.delete(asset)
    session.commit()
    refreshed_card = session.get(Card, affected_card_id)
    if refreshed_card:
        index_card(session, refreshed_card)
        session.commit()
    return affected_card_id


def attach_existing_asset(
    session: Session,
    *,
    card_id: int,
    asset_id: str,
    role: str,
    set_as_cover: bool = False,
) -> Asset:
    card = session.get(Card, card_id)
    if not card:
        raise NotFoundError("Card was not found.")
    asset = session.get(Asset, asset_id)
    if not asset:
        raise NotFoundError("Asset was not found.")

    if role == "gallery":
        already_linked = any(link.asset_id == asset.id for link in card.gallery_asset_links)
        if not already_linked:
            sort_order = len(card.gallery_asset_links)
            session.add(CardGalleryAsset(card_id=card.id, asset_id=asset.id, sort_order=sort_order))
            session.add(
                CardAsset(
                    card_id=card.id,
                    kind="gallery",
                    stored_path=asset.relative_path,
                    original_name=asset.original_filename,
                    mime_type=asset.mime_type,
                    size=asset.size_bytes,
                    sort_order=sort_order,
                )
            )
        if set_as_cover or not card.cover_asset_id:
            card.cover_asset_id = asset.id
    elif role == "attachment":
        already_linked = any(link.asset_id == asset.id for link in card.attachment_asset_links)
        if not already_linked:
            sort_order = len(card.attachment_asset_links)
            session.add(CardAttachmentAsset(card_id=card.id, asset_id=asset.id, sort_order=sort_order))
            session.add(
                CardAsset(
                    card_id=card.id,
                    kind="attachment",
                    stored_path=asset.relative_path,
                    original_name=asset.original_filename,
                    mime_type=asset.mime_type,
                    size=asset.size_bytes,
                    sort_order=sort_order,
                )
            )
    else:
        raise ValidationAPIError("Unsupported asset role.", details={"supported": ["gallery", "attachment"]})

    session.add(card)
    session.commit()
    refreshed_card = session.get(Card, card.id)
    if refreshed_card:
        index_card(session, refreshed_card)
        session.commit()
    session.refresh(asset)
    return asset


def add_source_asset(
    session: Session,
    *,
    workspace_slug: str,
    source_id: int,
    upload: UploadFile,
) -> int:
    source = session.get(CardSource, source_id)
    if not source:
        raise NotFoundError("Source was not found.")
    content = _read_upload_bytes(upload)
    checksum = hashlib.sha256(content).hexdigest()
    existing_asset = session.execute(select(Asset).where(Asset.checksum_sha256 == checksum)).scalar_one_or_none()
    if existing_asset:
        raise ConflictError(
            f"This file already exists as {existing_asset.id} / {existing_asset.original_filename}. Use existing asset instead of uploading a duplicate?"
        )

    suffix = Path(upload.filename or "file").suffix
    bucket = _asset_bucket(upload, "attachment")
    asset_id = _asset_type_id(bucket)
    relative_path, size, mime = _save_binary(
        workspace_slug=workspace_slug,
        bucket=bucket,
        asset_id=asset_id,
        suffix=suffix,
        content=content,
    )

    asset = Asset(
        id=asset_id,
        asset_type=bucket,
        original_filename=upload.filename or f"{asset_id}{suffix}",
        stored_filename=f"{asset_id}{suffix}",
        relative_path=relative_path,
        mime_type=upload.content_type or mime,
        size_bytes=size,
        checksum_sha256=checksum,
    )
    session.add(asset)
    session.flush()
    session.add(CardSourceAsset(source_id=source.id, asset_id=asset.id))
    session.commit()
    refreshed_card = session.get(Card, source.card_id)
    if refreshed_card:
        index_card(session, refreshed_card)
        session.commit()
    return source.card_id


def attach_existing_source_asset(
    session: Session,
    *,
    source_id: int,
    asset_id: str,
) -> int:
    source = session.get(CardSource, source_id)
    if not source:
        raise NotFoundError("Source was not found.")
    asset = session.get(Asset, asset_id)
    if not asset:
        raise NotFoundError("Asset was not found.")
    if not any(link.asset_id == asset.id for link in source.asset_links):
        session.add(CardSourceAsset(source_id=source.id, asset_id=asset.id))
        session.commit()
        refreshed_card = session.get(Card, source.card_id)
        if refreshed_card:
            index_card(session, refreshed_card)
            session.commit()
    return source.card_id


def delete_source_asset(
    session: Session,
    *,
    source_id: int,
    asset_id: str,
) -> int:
    source = session.get(CardSource, source_id)
    if not source:
        raise NotFoundError("Source was not found.")
    asset = session.get(Asset, asset_id)
    if not asset:
        raise NotFoundError("Asset was not found.")
    for link in list(asset.source_links):
        if link.source_id == source_id:
            session.delete(link)
    session.flush()
    session.refresh(asset)
    if asset.gallery_links or asset.attachment_links or asset.source_links:
        session.commit()
        refreshed_card = session.get(Card, source.card_id)
        if refreshed_card:
            index_card(session, refreshed_card)
            session.commit()
        return source.card_id

    file_path = get_settings().workspaces_dir / asset.relative_path
    if file_path.exists():
        file_path.unlink()
    session.delete(asset)
    session.commit()
    refreshed_card = session.get(Card, source.card_id)
    if refreshed_card:
        index_card(session, refreshed_card)
        session.commit()
    return source.card_id


def delete_unused_asset(session: Session, *, asset_id: str) -> None:
    asset = session.execute(
        select(Asset)
        .options(
            selectinload(Asset.gallery_links),
            selectinload(Asset.attachment_links),
            selectinload(Asset.source_links),
            selectinload(Asset.notebook_links),
            selectinload(Asset.chapter_cover_links),
            selectinload(Asset.scene_background_links),
            selectinload(Asset.scene_map_links),
            selectinload(Asset.scene_token_links),
        )
        .where(Asset.id == asset_id)
    ).scalar_one_or_none()
    if not asset:
        raise NotFoundError("Asset was not found.")
    if (
        asset.gallery_links
        or asset.attachment_links
        or asset.source_links
        or asset.notebook_links
        or asset.chapter_cover_links
        or asset.scene_background_links
        or asset.scene_map_links
        or asset.scene_token_links
    ):
        usages = _serialize_asset_usages(asset)
        raise ValidationAPIError(
            "This asset is still in use and cannot be deleted from the Asset Library.",
            details={"asset_id": asset.id, "usages": usages},
        )

    file_path = get_settings().workspaces_dir / asset.relative_path
    if file_path.exists():
        file_path.unlink()
    session.delete(asset)
    session.commit()


def register_imported_asset(
    session: Session,
    *,
    workspace_slug: str,
    original_filename: str,
    content: bytes,
    mime_type: str = "",
    preferred_asset_id: str | None = None,
) -> Asset:
    checksum = hashlib.sha256(content).hexdigest()
    existing_asset = session.execute(select(Asset).where(Asset.checksum_sha256 == checksum)).scalar_one_or_none()
    if existing_asset:
        return existing_asset

    bucket = _asset_bucket_for_filename(original_filename, mime_type)
    suffix = Path(original_filename or "file").suffix
    asset_id = preferred_asset_id or _asset_type_id(bucket)
    if session.get(Asset, asset_id):
        asset_id = _asset_type_id(bucket)
    relative_path, size, guessed_mime = _save_binary(
        workspace_slug=workspace_slug,
        bucket=bucket,
        asset_id=asset_id,
        suffix=suffix,
        content=content,
    )
    asset = Asset(
        id=asset_id,
        asset_type=bucket,
        original_filename=original_filename or f"{asset_id}{suffix}",
        stored_filename=f"{asset_id}{suffix}",
        relative_path=relative_path,
        mime_type=mime_type or guessed_mime,
        size_bytes=size,
        checksum_sha256=checksum,
    )
    session.add(asset)
    session.flush()
    return asset


def upload_workspace_asset(session: Session, *, workspace_slug: str, upload: UploadFile) -> Asset:
    content = _read_upload_bytes(upload)
    asset = register_imported_asset(
        session,
        workspace_slug=workspace_slug,
        original_filename=upload.filename or "workspace-file",
        content=content,
        mime_type=upload.content_type or "",
    )
    session.commit()
    session.refresh(asset)
    return asset


def list_assets(session: Session, *, q: str = "", asset_type: str | None = None) -> dict:
    statement = (
        select(Asset)
        .options(
            selectinload(Asset.gallery_links).selectinload(CardGalleryAsset.card),
            selectinload(Asset.attachment_links).selectinload(CardAttachmentAsset.card),
            selectinload(Asset.source_links).selectinload(CardSourceAsset.source).selectinload(CardSource.card),
            selectinload(Asset.notebook_links),
            selectinload(Asset.chapter_cover_links),
            selectinload(Asset.scene_background_links),
            selectinload(Asset.scene_map_links),
            selectinload(Asset.scene_token_links),
        )
        .order_by(Asset.created_at.desc(), Asset.id.desc())
    )
    if asset_type:
        statement = statement.where(Asset.asset_type == asset_type)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        statement = statement.where(
            Asset.id.ilike(like)
            | Asset.original_filename.ilike(like)
            | Asset.stored_filename.ilike(like)
        )

    assets = session.execute(statement).scalars().all()
    items = []
    for asset in assets:
        usages = _serialize_asset_usages(asset)
        items.append(
            {
                "id": asset.id,
                "asset_type": asset.asset_type,
                "original_filename": asset.original_filename,
                "stored_filename": asset.stored_filename,
                "relative_path": asset.relative_path,
                "mime_type": asset.mime_type,
                "size_bytes": asset.size_bytes,
                "checksum_sha256": asset.checksum_sha256,
                "url": f"/media/{asset.relative_path}",
                "usage_count": len(usages),
                "usages": usages,
                "created_at": asset.created_at,
                "updated_at": asset.updated_at,
            }
        )
    return {"items": items, "total": len(items), "q": q, "asset_type": asset_type}

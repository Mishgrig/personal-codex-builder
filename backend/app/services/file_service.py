from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.core.paths import workspace_dir
from app.models.workspace import Card, CardAsset, WorkspaceSetting


def save_upload(
    *,
    workspace_slug: str,
    subfolder: str,
    upload: UploadFile,
) -> tuple[str, int, str]:
    workspace_root = workspace_dir(workspace_slug)
    destination_dir = workspace_root / "files" / subfolder
    destination_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(upload.filename or "file").suffix
    storage_name = f"{uuid4().hex}{suffix}"
    destination = destination_dir / storage_name
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    size = destination.stat().st_size
    mime = upload.content_type or mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    relative_path = destination.relative_to(get_settings().workspaces_dir).as_posix()
    return relative_path, size, mime


def upload_logo(session: Session, workspace_slug: str, upload: UploadFile) -> WorkspaceSetting:
    settings = session.get(WorkspaceSetting, 1)
    if not settings:
        raise NotFoundError("Workspace settings were not found.")
    relative_path, _size, _mime = save_upload(
        workspace_slug=workspace_slug,
        subfolder="logos",
        upload=upload,
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
    existing_count = sum(1 for asset in card.assets if asset.kind == kind)
    relative_path, size, mime = save_upload(
        workspace_slug=workspace_slug,
        subfolder=kind,
        upload=upload,
    )
    asset = CardAsset(
        card_id=card.id,
        kind=kind,
        stored_path=relative_path,
        original_name=upload.filename or Path(relative_path).name,
        mime_type=mime,
        size=size,
        sort_order=existing_count,
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


def delete_asset(session: Session, *, workspace_slug: str, asset_id: int) -> int:
    asset = session.get(CardAsset, asset_id)
    if not asset:
        raise NotFoundError("Asset was not found.")
    card_id = asset.card_id
    file_path = get_settings().workspaces_dir / asset.stored_path
    if file_path.exists():
        file_path.unlink()
    session.delete(asset)
    session.commit()
    return card_id

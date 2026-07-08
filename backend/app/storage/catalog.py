from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_catalog() -> dict[str, Any]:
    settings = get_settings()
    if not settings.catalog_path.exists():
        payload = {"workspaces": [], "created_at": now_iso(), "updated_at": now_iso()}
        save_catalog(payload)
        return payload
    return json.loads(settings.catalog_path.read_text(encoding="utf-8"))


def save_catalog(payload: dict[str, Any]) -> None:
    settings = get_settings()
    payload["updated_at"] = now_iso()
    settings.catalog_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def workspace_dir(slug: str) -> Path:
    return get_settings().workspaces_dir / slug


def workspace_db_path(slug: str) -> Path:
    return workspace_dir(slug) / "workspace.db"


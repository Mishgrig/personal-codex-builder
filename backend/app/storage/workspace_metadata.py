from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.core.paths import workspace_metadata_path


def load_workspace_metadata(slug: str) -> dict[str, Any] | None:
    path = workspace_metadata_path(slug)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_workspace_metadata(slug: str, payload: dict[str, Any]) -> None:
    normalized = {
        key: value.isoformat() if isinstance(value, datetime) else value
        for key, value in payload.items()
    }
    workspace_metadata_path(slug).write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

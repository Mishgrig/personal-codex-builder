from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.core.paths import legacy_workspace_metadata_path, workspace_metadata_path


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value.isoformat() if isinstance(value, datetime) else value
        for key, value in payload.items()
    }


def load_workspace_metadata(slug: str) -> dict[str, Any] | None:
    for path in (workspace_metadata_path(slug), legacy_workspace_metadata_path(slug)):
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    return None


def save_workspace_metadata(slug: str, payload: dict[str, Any], *, write_legacy_compat: bool = True) -> None:
    normalized = _normalize_payload(payload)
    canonical_path = workspace_metadata_path(slug)
    legacy_path = legacy_workspace_metadata_path(slug)

    canonical_path.write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if write_legacy_compat or legacy_path.exists():
        legacy_path.write_text(
            json.dumps(normalized, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

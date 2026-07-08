from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, model_validator


def _default_project_root() -> Path:
    return Path(os.getenv("CODEX_PROJECT_ROOT", str(Path(__file__).resolve().parents[3])))


class Settings(BaseModel):
    project_name: str = "Personal Codex Builder API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"
    project_root: Path
    data_dir: Path
    app_index_path: Path
    workspaces_dir: Path
    exports_dir: Path
    catalog_path: Path
    workspace_schema_version: str = "1"
    default_theme: str = "fantasy"
    cors_origins: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

    @model_validator(mode="before")
    @classmethod
    def populate_paths(cls, values: object) -> object:
        if values is None:
            values = {}
        if not isinstance(values, dict):
            return values

        project_root = Path(values.get("project_root") or _default_project_root())
        data_dir = Path(values.get("data_dir") or os.getenv("CODEX_DATA_DIR", str(project_root / "data")))
        workspaces_dir = Path(values.get("workspaces_dir") or data_dir / "workspaces")

        values.setdefault("project_root", project_root)
        values.setdefault("data_dir", data_dir)
        values.setdefault("app_index_path", data_dir / "app_index.sqlite")
        values.setdefault("workspaces_dir", workspaces_dir)
        values.setdefault("exports_dir", data_dir / "exports")
        values.setdefault("catalog_path", workspaces_dir / "catalog.json")
        return values


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.workspaces_dir.mkdir(parents=True, exist_ok=True)
    settings.exports_dir.mkdir(parents=True, exist_ok=True)
    return settings

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


def _reset_runtime_state() -> None:
    from app.core.config import get_settings
    from app.core.db import _ENGINE_CACHE as workspace_engines
    from app.core.db import _SESSION_CACHE as workspace_sessions
    from app.storage.app_index import _ENGINE_CACHE as app_index_engines
    from app.storage.app_index import _SESSION_CACHE as app_index_sessions

    for engine in list(workspace_engines.values()):
        engine.dispose()
    for engine in list(app_index_engines.values()):
        engine.dispose()

    workspace_engines.clear()
    workspace_sessions.clear()
    app_index_engines.clear()
    app_index_sessions.clear()
    get_settings.cache_clear()


def test_bootstrap_migrates_legacy_workspace_db(tmp_path: Path, monkeypatch) -> None:
    legacy_data_dir = tmp_path / "legacy-data"
    monkeypatch.setenv("CODEX_DATA_DIR", str(legacy_data_dir))
    _reset_runtime_state()

    try:
        from app.core.config import get_settings
        from app.core.db import _ENGINE_CACHE as workspace_engines
        from app.core.db import _SESSION_CACHE as workspace_sessions
        from app.core.db import create_workspace_schema, get_session_factory
        from app.services.seed_service import seed_workspace
        from app.services.workspace_manager import WorkspaceManager

        settings = get_settings()
        slug = "legacy-atlas"
        workspace_root = settings.workspaces_dir / slug
        workspace_root.mkdir(parents=True, exist_ok=True)

        legacy_db_path = workspace_root / "workspace.db"
        create_workspace_schema(legacy_db_path)
        session = get_session_factory(legacy_db_path)()
        try:
            seed_workspace(
                session,
                workspace_name="Legacy Atlas",
                theme="fantasy",
            )
        finally:
            session.close()

        legacy_engine = workspace_engines.pop(legacy_db_path)
        legacy_engine.dispose()
        workspace_sessions.pop(legacy_db_path, None)

        created_at = datetime.now(timezone.utc).isoformat()
        settings.catalog_path.write_text(
            json.dumps(
                {
                    "workspaces": [
                        {
                            "slug": slug,
                            "name": "Legacy Atlas",
                            "description": "Legacy seeded workspace",
                            "theme": "fantasy",
                            "created_at": created_at,
                            "updated_at": created_at,
                        }
                    ],
                    "created_at": created_at,
                    "updated_at": created_at,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        manager = WorkspaceManager()
        manager.bootstrap()

        metadata = json.loads((workspace_root / "workspace.json").read_text(encoding="utf-8"))
        summaries = manager.list_workspaces()

        assert settings.app_index_path.exists()
        assert (workspace_root / "workspace.sqlite").exists()
        assert not legacy_db_path.exists()
        assert (workspace_root / "workspace.json").exists()
        assert (workspace_root / "files").exists()
        assert (workspace_root / "backups").exists()
        assert (workspace_root / "exports").exists()
        assert metadata["db_filename"] == "workspace.sqlite"
        assert metadata["metadata_filename"] == "workspace.json"
        assert summaries[0]["slug"] == slug
        assert summaries[0]["name"] == "Legacy Atlas"
    finally:
        _reset_runtime_state()

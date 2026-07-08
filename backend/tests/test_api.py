from __future__ import annotations

import importlib
import os
import shutil
from pathlib import Path

from fastapi.testclient import TestClient

TEST_DATA_DIR = Path(__file__).resolve().parents[2] / ".test-data"
if TEST_DATA_DIR.exists():
    shutil.rmtree(TEST_DATA_DIR)
os.environ["CODEX_DATA_DIR"] = str(TEST_DATA_DIR)

client = TestClient(importlib.import_module("app.main").app)


def _json_data(response):
    payload = response.json()
    assert "data" in payload
    return payload["data"]


def _workspace_slug() -> str:
    workspaces = _json_data(client.get("/api/workspaces"))
    assert workspaces
    return workspaces[0]["slug"]


def test_health_and_app_info() -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert _json_data(health)["status"] == "ok"

    app_info = client.get("/api/app-info")
    assert app_info.status_code == 200
    payload = _json_data(app_info)
    assert payload["project_name"] == "Personal Codex Builder API"
    assert payload["workspace_count"] >= 1


def test_workspaces_bootstrap() -> None:
    response = client.get("/api/workspaces")
    assert response.status_code == 200
    workspaces = _json_data(response)
    assert workspaces
    slug = workspaces[0]["slug"]
    assert (TEST_DATA_DIR / "app_index.sqlite").exists()
    workspace_root = TEST_DATA_DIR / "workspaces" / slug
    assert (workspace_root / "workspace.sqlite").exists()
    assert (workspace_root / "workspace.json").exists()
    assert (workspace_root / "files").exists()
    assert (workspace_root / "backups").exists()
    assert (workspace_root / "exports").exists()


def test_create_card_and_search() -> None:
    slug = _workspace_slug()
    create_response = client.post(f"/api/workspaces/{slug}/cards", json={"title": "Astral Beacon"})
    assert create_response.status_code == 200
    card = _json_data(create_response)
    card_id = card["id"]
    update_response = client.patch(
        f"/api/workspaces/{slug}/cards/{card_id}",
        json={
            "summary": "A bright guide for night sailors.",
            "body_json": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "The beacon shines above the harbor."}],
                    }
                ],
            },
        },
    )
    assert update_response.status_code == 200
    search_response = client.get(f"/api/workspaces/{slug}/cards?q=beacon")
    assert search_response.status_code == 200
    assert any(item["id"] == card_id for item in _json_data(search_response)["items"])


def test_slug_uniqueness_validation() -> None:
    slug = _workspace_slug()
    first = _json_data(client.post(f"/api/workspaces/{slug}/cards", json={"title": "First"}))
    second = _json_data(client.post(f"/api/workspaces/{slug}/cards", json={"title": "Second"}))
    response = client.patch(
        f"/api/workspaces/{slug}/cards/{second['id']}",
        json={"slug": first["slug"]},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_sources_relations_backup_restore_export_import_and_archive() -> None:
    slug = _workspace_slug()
    left = _json_data(client.post(f"/api/workspaces/{slug}/cards", json={"title": "Left Card"}))
    right = _json_data(client.post(f"/api/workspaces/{slug}/cards", json={"title": "Right Card"}))
    source_response = client.post(
        f"/api/workspaces/{slug}/cards/{left['id']}/sources",
        json={"title": "Field Notes", "note": "Stored at the harbor", "source_type": "note"},
    )
    assert source_response.status_code == 200
    relation_response = client.post(
        f"/api/workspaces/{slug}/cards/{left['id']}/relations",
        json={"target_card_id": right["id"], "note": "Mentions"},
    )
    assert relation_response.status_code == 200
    payload = _json_data(relation_response)
    assert payload["sources"]
    assert payload["relations"][0]["target_card_id"] == right["id"]

    backup_response = client.post(f"/api/workspaces/{slug}/backup", json={"reason": "manual"})
    assert backup_response.status_code == 200
    backup = _json_data(backup_response)
    assert backup["filename"].endswith(".sqlite")

    mutate_response = client.patch(
        f"/api/workspaces/{slug}/cards/{left['id']}",
        json={"summary": "Changed after backup"},
    )
    assert mutate_response.status_code == 200
    restore_response = client.post(
        f"/api/workspaces/{slug}/restore",
        json={"filename": backup["filename"]},
    )
    assert restore_response.status_code == 200
    restored = _json_data(restore_response)
    assert restored["safety_backup"]["filename"].endswith(".sqlite")
    card_after_restore = _json_data(client.get(f"/api/workspaces/{slug}/cards/{left['id']}"))
    assert card_after_restore["summary"] != "Changed after backup"

    health_response = client.get(f"/api/workspaces/{slug}/health")
    assert health_response.status_code == 200
    health = _json_data(health_response)
    assert health["integrity_ok"] is True
    assert health["backup_count"] >= 2

    export_response = client.post(f"/api/workspaces/{slug}/export")
    assert export_response.status_code == 200
    exported = _json_data(export_response)
    export_path = TEST_DATA_DIR / exported["path"]
    assert export_path.exists()

    with export_path.open("rb") as archive_handle:
        import_response = client.post(
            "/api/workspaces/import",
            files={"upload": ("archive.workspace.zip", archive_handle, "application/zip")},
            data={"name": "Imported Atlas"},
        )
    assert import_response.status_code == 200
    imported = _json_data(import_response)
    imported_slug = imported["slug"]
    assert imported_slug != slug

    archive_response = client.post(f"/api/workspaces/{imported_slug}/archive")
    assert archive_response.status_code == 200
    archived = _json_data(archive_response)
    assert archived["archived"] is True

    active_workspaces = _json_data(client.get("/api/workspaces"))
    assert all(workspace["slug"] != imported_slug for workspace in active_workspaces)
    all_workspaces = _json_data(client.get("/api/workspaces?include_archived=true"))
    assert any(workspace["slug"] == imported_slug and workspace["archived"] for workspace in all_workspaces)

    unarchive_response = client.post(f"/api/workspaces/{imported_slug}/unarchive")
    assert unarchive_response.status_code == 200
    unarchived = _json_data(unarchive_response)
    assert unarchived["archived"] is False

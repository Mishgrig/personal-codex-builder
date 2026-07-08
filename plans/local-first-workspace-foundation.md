# Establish app_index registry and WorkspaceManager foundation

This ExecPlan is a living document and must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

After this change, the repository will stop relying on `data/workspaces/catalog.json` as the primary workspace registry and will instead maintain a real global application database at `data/app_index.sqlite`. The backend will also gain a dedicated `WorkspaceManager` that becomes the single place responsible for discovering, creating, copying, deleting, and opening local workspaces. A user will not see a major UI redesign yet, but they will gain a safer and more durable storage foundation: workspace metadata will live in a structured registry, each workspace folder will include `workspace.json`, `files/`, `backups/`, and `exports/`, and legacy `workspace.db` files will migrate to `workspace.sqlite` without manual repair.

This phase intentionally focuses on the storage and lifecycle foundation before backup, restore, import/export, or broader UI work. Those later tasks depend on a trustworthy workspace registry and a single authoritative service for workspace lifecycle behavior.

## Progress

- [x] (2026-07-03T09:39Z) Wrote the initial ExecPlan, captured current repository architecture, and fixed the scope of phase 1 around `app_index.sqlite`, `WorkspaceManager`, `workspace.json`, and legacy registry migration.
- [x] (2026-07-03T09:51Z) Implemented `app_index.sqlite` storage, a dedicated app-index model, and bootstrap logic that can import the legacy `catalog.json` registry or discover workspace folders on disk.
- [x] (2026-07-03T09:51Z) Introduced `WorkspaceManager` as the backend authority for workspace lifecycle and refactored `workspace_service.py` into a compatibility facade that delegates to it.
- [x] (2026-07-03T09:51Z) Added workspace layout helpers that normalize `workspace.sqlite`, `workspace.json`, `files/`, `backups/`, and `exports/`, including automatic migration from `workspace.db`.
- [x] (2026-07-03T09:51Z) Updated backend integration points including request dependencies, file storage, Alembic lookup, and workspace update flows to use the new manager and path helpers.
- [x] (2026-07-03T09:51Z) Expanded automated coverage to prove registry bootstrap, normalized workspace layout creation, and legacy `workspace.db` migration compatibility.
- [x] (2026-07-03T09:51Z) Ran backend validation successfully: `ruff check backend` passed and `pytest backend/tests -q` passed with 5 tests.

## Surprises & Discoveries

- Observation: the project already isolates business data per workspace database and per-workspace files folder, so the report’s “separate SQLite per workspace” goal is partially achieved already.
  Evidence: `backend/app/core/db.py` creates one engine per workspace path, and `backend/app/services/file_service.py` stores uploads under `data/workspaces/<slug>/files/`.

- Observation: the weakest architectural link is the workspace registry, not the workspace data storage.
  Evidence: `backend/app/storage/catalog.py` persists the registry in `catalog.json`, while route handlers and services rely on it for listing, creating, copying, and deleting workspaces.

- Observation: the previous `Settings` model read environment-sensitive paths too early, at module import time instead of settings construction time.
  Evidence: isolated legacy-migration tests kept resolving `CODEX_DATA_DIR` to the earlier `.test-data` path until the config model was changed to populate paths dynamically during `Settings()` validation.

## Decision Log

- Decision: phase 1 will preserve the existing HTTP API shape and the `X-Workspace-Slug` header even though the long-term roadmap prefers more explicit workspace-scoped routes.
  Rationale: replacing the registry and introducing `WorkspaceManager` is already a large cross-cutting change; keeping the current transport contract reduces the number of moving pieces while we stabilize storage.
  Date/Author: 2026-07-03 / Codex

- Decision: phase 1 will migrate legacy `workspace.db` files to `workspace.sqlite` automatically instead of requiring a one-time manual conversion.
  Rationale: the repository already contains a seeded legacy demo workspace, and users may have local data created before this refactor. Automatic migration keeps the change safe and local-first.
  Date/Author: 2026-07-03 / Codex

- Decision: backup, restore, import/export, and integrity-check endpoints are deferred to later ExecPlans after the new registry and manager exist.
  Rationale: these features depend on a stable model of workspace identity, workspace paths, and authoritative lifecycle behavior.
  Date/Author: 2026-07-03 / Codex

## Outcomes & Retrospective

The repository now has the storage foundation this phase was meant to deliver. `backend/app/storage/app_index.py` and `backend/app/models/app_index.py` introduce a dedicated global SQLite registry at `data/app_index.sqlite`, and `backend/app/services/workspace_manager.py` is now the authoritative lifecycle service for discovering, creating, copying, deleting, updating, and opening workspaces. The legacy JSON catalog remains only as an import source during bootstrap when the app index is empty.

Workspace folders are now normalized through `backend/app/core/paths.py`. Whenever a workspace is touched, the backend ensures `workspace.sqlite`, `workspace.json`, `files/`, `backups/`, and `exports/` exist, and it automatically migrates a legacy `workspace.db` file to the canonical `workspace.sqlite` name. `backend/app/services/file_service.py`, `backend/app/api/routes/workspaces.py`, and `backend/alembic/env.py` were updated so the rest of the stack follows the same path conventions.

Validation is green for this phase. `./.venv/bin/ruff check backend` passes, and `PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q` passes with 5 tests, including a dedicated regression for legacy `workspace.db` migration via `catalog.json`. Remaining work for later ExecPlans includes backup and restore flows, explicit import/export operations, integrity checks, and the broader API/frontend cleanup described in the project improvement report.

## Context and Orientation

Today the backend entrypoint is `backend/app/main.py`. On import it calls `ensure_default_workspace()` from `backend/app/services/workspace_service.py`, which in turn reads and writes `data/workspaces/catalog.json` through `backend/app/storage/catalog.py`. That same service also creates and copies workspace folders and opens workspace sessions. SQLite engine creation and schema bootstrapping live in `backend/app/core/db.py`. The frontend talks to the backend through `frontend/src/api/client.ts`, and current workspace scope is passed by the `X-Workspace-Slug` request header.

The current workspace folder layout is incomplete relative to the roadmap. Workspaces already have a local database and files folder, but they do not yet guarantee a `workspace.json` metadata file, a `backups/` directory, or an `exports/` directory. The global workspace registry is still JSON, not SQLite. This means the repository has a solid local data core but not yet a durable application-level index.

In this plan, “app index” means the global SQLite database that stores workspace registry metadata only, not business content like cards or taxonomy. “WorkspaceManager” means a backend service object that centralizes workspace lifecycle logic such as discovery, creation, copy, delete, metadata synchronization, and session opening. “Legacy registry” means the existing `catalog.json` file. “Legacy workspace database” means the old `workspace.db` filename currently used in existing folders.

## Milestones

### Milestone 1: Build a real workspace registry

At the end of this milestone, the backend will create and use `data/app_index.sqlite`, containing one row per known workspace. Bootstrapping will be able to import the old `catalog.json` file or discover workspace folders on disk when the index is empty. The result is observable because starting the backend or running the test suite will create `app_index.sqlite`, and listing workspaces through `GET /api/workspaces` will still work without depending on `catalog.json` as the primary registry.

### Milestone 2: Centralize workspace lifecycle in WorkspaceManager

At the end of this milestone, lifecycle operations such as list, create, copy, delete, update, and open-session will run through a dedicated `WorkspaceManager`. The existing `workspace_service.py` module will remain as a compatibility layer for current imports, but its implementation will delegate to the manager instead of owning the logic itself. The result is observable because route handlers and dependencies will keep functioning while the logic now lives in one coherent layer.

### Milestone 3: Normalize workspace layout and legacy compatibility

At the end of this milestone, any workspace accessed by the backend will have a normalized layout: `workspace.sqlite`, `workspace.json`, `files/`, `backups/`, and `exports/`. Legacy `workspace.db` files will be migrated safely. The result is observable because a bootstrapped workspace folder will include the new metadata and directories, and tests will confirm that the current demo bootstrap still succeeds.

## Plan of Work

First, add a dedicated app-index model and storage layer. This requires a separate SQLAlchemy metadata tree so that `app_index.sqlite` does not accidentally receive workspace business tables. Introduce a model in `backend/app/models/app_index.py` for workspace registry records and a storage helper in `backend/app/storage/app_index.py` that creates the app-index schema and returns sessions for it.

Next, centralize path logic. Add `backend/app/core/paths.py` to define the canonical app-index path, workspace root path, `workspace.sqlite`, legacy `workspace.db`, `workspace.json`, and the `files/`, `backups/`, and `exports/` subdirectories. This file should also own the safe migration from a legacy database filename to the new one.

Then introduce `backend/app/services/workspace_manager.py`. This service should bootstrap the app index, import legacy registry data if necessary, optionally discover workspace folders on disk, ensure workspace folder layout, write `workspace.json`, create new workspaces, copy workspaces, delete workspaces, update workspace registry metadata, and return SQLAlchemy sessions for workspace databases. The manager should also update `last_opened_at` when a workspace session is requested.

After the manager exists, rewrite `backend/app/services/workspace_service.py` as a compatibility façade. Keep the current function names used by the rest of the codebase, but have them call a shared `WorkspaceManager` instance. Update `backend/app/api/routes/workspaces.py` and `backend/app/api/deps.py` only as much as needed to pass the workspace slug into manager-backed update flows. Update `backend/app/services/file_service.py` and `backend/alembic/env.py` to use the new path helpers so that file storage and migrations stay aligned with the new layout.

Finally, extend tests in `backend/tests/test_api.py` so the suite proves that app-index bootstrap works, the default workspace is created in normalized layout, and the backend still supports current CRUD flows under the new registry model.

## Concrete Steps

Run all commands from the repository root unless a step explicitly says otherwise.

1. Create the new files and refactors described above:
   `backend/app/core/paths.py`
   `backend/app/models/app_index.py`
   `backend/app/storage/app_index.py`
   `backend/app/services/workspace_manager.py`

2. Refactor the existing integration points:
   `backend/app/services/workspace_service.py`
   `backend/app/api/routes/workspaces.py`
   `backend/app/api/deps.py`
   `backend/app/services/file_service.py`
   `backend/alembic/env.py`
   `.gitignore`

3. Add regression coverage in:
   `backend/tests/test_api.py`

4. Run validation:
   `cd personal-codex-builder && ./.venv/bin/ruff check backend`
   `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`

Expected successful test transcript shape:

    ....                                                                     [100%]
    <updated count> passed in <time>

Expected successful lint transcript shape:

    All checks passed!

## Validation and Acceptance

Acceptance for this phase is behavior-focused:

1. Starting the backend or importing the app in tests creates `app_index.sqlite` in the configured data directory.
2. A newly bootstrapped workspace contains `workspace.sqlite`, `workspace.json`, `files/`, `backups/`, and `exports/`.
3. The existing `GET /api/workspaces` and card CRUD test flows still pass without the API caller needing to change.
4. The repository can still create, update, search, and relate cards inside the active workspace after the registry refactor.
5. If only `workspace.db` exists for a workspace, the backend can migrate it to `workspace.sqlite` automatically and continue working.

## Idempotence and Recovery

Bootstrap must be idempotent. Running the backend multiple times must not duplicate workspace registry rows or corrupt workspace metadata files. Creating the app-index schema multiple times must be safe. Ensuring workspace layout must be safe to repeat.

Legacy database migration must be one-way but recoverable. The migration step should only rename or move the database when `workspace.sqlite` does not already exist. If both filenames exist, prefer the canonical `workspace.sqlite` path and leave the legacy file untouched for manual inspection rather than guessing how to merge them.

This phase should avoid destructive migration of user business data beyond the safe rename from `workspace.db` to `workspace.sqlite`. If validation fails after refactoring, the rollback path is to restore the prior code and use the preserved legacy workspace database file or the copied workspace folder.

## Interfaces and Dependencies

The implementation must leave these repository interfaces in a coherent state:

- `backend/app/core/config.py` must expose an app-index path.
- `backend/app/core/paths.py` must define canonical workspace and app-index paths.
- `backend/app/models/app_index.py` must define the app-index ORM model and a separate declarative base or metadata tree from workspace business tables.
- `backend/app/storage/app_index.py` must create and open the global registry database.
- `backend/app/services/workspace_manager.py` must provide the authoritative lifecycle API used by the rest of the backend.
- `backend/app/services/workspace_service.py` must continue to provide the currently imported helper functions while delegating to the manager.
- `backend/app/api/deps.py` must still be able to open a session for the active workspace.
- `backend/app/services/file_service.py` must still store uploaded files under the active workspace folder.
- `backend/tests/test_api.py` must validate the new bootstrap behavior and the existing CRUD path.

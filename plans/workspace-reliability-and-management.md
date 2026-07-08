# Deliver workspace reliability, management APIs, and local-first UI flows

This ExecPlan is a living document and must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

After this change, the project will move beyond basic workspace discovery and become a real local-first workspace manager. A user will be able to create backups, restore a workspace safely, export a workspace to a portable archive, import that archive back into the app, inspect workspace health, archive old workspaces instead of deleting them immediately, and manage these operations from the frontend. The backend will also expose a more consistent API contract and explicit workspace-scoped routes so the frontend can operate without relying only on an ambient header contract.

This phase matters because the repository already has isolated local workspaces and a global app index, but it still lacks the day-two safety and portability features that make a local-first app trustworthy. The main visible outcome is that a user can now protect, move, inspect, and organize workspace data without dropping into the filesystem manually.

## Progress

- [x] (2026-07-03T09:56Z) Wrote the execution plan for the remaining stages after the storage-foundation phase and fixed the implementation order around reliability features first, then API contract updates, then frontend integration.
- [x] (2026-07-03T10:23Z) Added backend services and manager operations for backup, restore, import, export, integrity check, archive, workspace health snapshots, and app-info reporting.
- [x] (2026-07-03T10:23Z) Standardized API success and error envelopes and exposed explicit workspace-scoped routes plus `GET /api/health` and `GET /api/app-info`.
- [x] (2026-07-03T10:23Z) Updated the frontend data layer so the API client unwraps the common envelope and uses explicit workspace-scoped routes while Zustand remains focused on UI-only state.
- [x] (2026-07-03T10:23Z) Added workspace management UI for import/export, backups, health status, archive visibility, and local-first status indicators.
- [x] (2026-07-03T10:23Z) Expanded backend and frontend validation coverage for local-first reliability flows and recorded the final results here.

## Surprises & Discoveries

- Observation: the current frontend is still organized around a single `CodexPage` and one `WorkspaceControls` toolbar, so adding workspace management UX will need some shared UI building blocks rather than only a few extra buttons.
  Evidence: `frontend/src/layout/CodexPage.tsx` currently owns most query wiring and mutation orchestration directly.

- Observation: the current API surface mixes header-scoped workspace routes with global routes and returns raw payloads instead of a uniform envelope.
  Evidence: `frontend/src/api/client.ts` throws on `payload.detail`, while backend routes under `backend/app/api/routes/*.py` return direct models or `{ "status": "ok" }`.

- Observation: Vitest configuration in this repository needs `defineConfig` from `vitest/config` rather than plain Vite config typing when test-specific keys are added.
  Evidence: `tsc -b` rejected the `test` block in `frontend/vite.config.ts` until the config import was switched.

- Observation: the frontend now builds cleanly but still produces a large single production chunk.
  Evidence: `npm --cache .npm-cache run build` succeeds, but Vite reports a post-build warning because the main JS bundle is roughly 772 kB before gzip.

## Decision Log

- Decision: explicit workspace-scoped routes will be added in parallel with the current header-scoped routes, and the frontend will migrate to the explicit routes first.
  Rationale: this preserves compatibility while moving the product toward clearer workspace isolation semantics.
  Date/Author: 2026-07-03 / Codex

- Decision: archive will be implemented for workspaces in this phase, while a full trash system for cards remains deferred.
  Rationale: workspace archiving is directly aligned with the report and low-risk because the app index already tracks workspace registry metadata. Card-level soft delete would require broader model, query, and UI changes and is not a prerequisite for safe workspace management.
  Date/Author: 2026-07-03 / Codex

- Decision: workspace restore will always create a safety backup before replacing the active database file.
  Rationale: restore is destructive by nature, and the repository planning rules require recovery to be first-class for dangerous workspace operations.
  Date/Author: 2026-07-03 / Codex

## Outcomes & Retrospective

This phase shipped the core local-first workspace reliability loop. The backend now supports manual backups, backup listing, backup deletion, restore with a mandatory safety backup, workspace export to `.workspace.zip`, workspace import from an archive, database integrity checks, workspace health summaries, workspace archive and unarchive, and app-level health or info endpoints. These behaviors live primarily in `backend/app/services/backup_service.py`, `backend/app/services/export_service.py`, `backend/app/services/integrity_service.py`, and the expanded `backend/app/services/workspace_manager.py`.

The API contract is now consistent. Success payloads are wrapped in a shared `data` envelope, errors return a structured `error` envelope, and explicit workspace-scoped routes exist for cards, taxonomy, schemas, and workspace-management operations. The frontend client and UI were updated to consume that contract, and a new workspace-management surface now shows local backend status, archive state, backup controls, import and export actions, and health information in the main interface.

Validation is green for the implemented scope. Backend validation passed with `ruff check backend` and `pytest backend/tests -q`, covering bootstrap, CRUD, relations, backup, restore, health, export, import, and archive flows. Frontend validation passed with `npm --cache .npm-cache run build` and `npm --cache .npm-cache test -- --run`, including component coverage for the new workspace-management panel. Remaining deferred work is narrower now: full card-level trash or soft delete, real per-workspace Alembic revision execution beyond the current schema-version synchronization safety hook, and bundle-size optimization for the frontend.

## Context and Orientation

The backend entrypoint is `backend/app/main.py`, which mounts the API router and today returns a minimal root-level health response. Workspace lifecycle currently flows through `backend/app/services/workspace_manager.py` and `backend/app/services/workspace_service.py`. Workspace registry metadata is stored in `data/app_index.sqlite` using `backend/app/models/app_index.py`, while workspace-local metadata is written to `workspace.json`. The current backend can list, create, copy, delete, and update workspaces, but it does not yet expose first-class backup, restore, import/export, integrity, archive, or app-information flows.

The frontend lives under `frontend/src`. `frontend/src/layout/CodexPage.tsx` currently coordinates most server data queries and mutations. `frontend/src/app/store.ts` holds active workspace selection and other UI state. `frontend/src/features/workspaces/WorkspaceControls.tsx` is the only workspace management surface today, and it only covers selection, creation, copy, delete, logo upload, and search/filter controls.

In this plan, “backup” means a safe snapshot of the workspace database stored under the workspace’s `backups/` directory, not a full application backup. “Workspace export” means a portable zip archive containing `workspace.sqlite`, `workspace.json`, and the `files/` directory. “Workspace health” means a combined view of SQLite integrity status plus basic filesystem facts such as database size, files size, record count, and latest backup timestamp. “Explicit workspace-scoped routes” means endpoints whose path contains `/api/workspaces/{workspace_slug}/...` for workspace-bound data and operations.

## Milestones

### Milestone 1: Backend reliability operations

At the end of this milestone, the backend will support backup creation, backup listing, restore with a safety backup, workspace export to zip, workspace import from zip, integrity checking, workspace health summaries, and workspace archiving. The result is observable because a caller can create a backup, inspect it, restore it, export a workspace, re-import it, and receive a health report through documented API endpoints.

### Milestone 2: Standardized API contract and explicit routes

At the end of this milestone, the backend will return a consistent success envelope and structured error envelope, and it will expose `GET /api/health`, `GET /api/app-info`, workspace operation endpoints, and explicit workspace-scoped card/taxonomy/schema endpoints. The result is observable because the frontend can consume all endpoints through one generic unwrapping client instead of route-specific response assumptions.

### Milestone 3: Frontend workspace management surfaces

At the end of this milestone, the frontend will show local-first status, workspace health, backup controls, export/import actions, archive visibility, and improved empty/loading/error states around workspace selection. The result is observable because a user can manage the local workspace lifecycle directly in the browser UI.

### Milestone 4: Validation and regression coverage

At the end of this milestone, backend tests will cover local-first reliability flows, and frontend tests will cover core workspace-management rendering and interaction flows. The result is observable because the repository test suite will exercise backup, restore, import/export, archive, and status behavior instead of only card CRUD.

## Plan of Work

First, extend backend schemas and services. Add response-envelope schemas in `backend/app/schemas/common.py`, workspace management schemas in `backend/app/schemas/workspace.py`, and new services such as `backend/app/services/backup_service.py`, `backend/app/services/export_service.py`, and `backend/app/services/integrity_service.py`. These services should stay focused: backup listing and creation, zip import/export, and health or integrity reporting should not be buried inside route handlers.

Next, expand `backend/app/services/workspace_manager.py` into the authoritative workspace-management façade for all user-facing operations. It should support archive and unarchive, backup creation and listing, restore from backup with a safety backup, export and import flows, explicit health snapshots, and schema-version synchronization behavior suitable for the repository’s current Alembic posture. The manager should continue to keep `workspace.json` and the app index aligned after these operations.

Then, reshape the API contract. Update `backend/app/main.py` so API errors, validation errors, and unexpected server errors all return a structured error envelope. Add `/api/health` and `/api/app-info`. Update `backend/app/api/routes/workspaces.py` with first-class management endpoints and explicit workspace operations. Add explicit workspace-scoped routers or aliases for cards, taxonomy, and schemas so frontend calls can target `/api/workspaces/{workspace_slug}/...`. Keep compatibility routes where reasonable instead of breaking existing behavior abruptly.

After the backend contract is stable, update the frontend client and models. `frontend/src/api/client.ts` should unwrap the common success envelope, surface structured error messages, and use explicit workspace-scoped routes. `frontend/src/types/models.ts` should add types for backups, workspace health, app info, API envelopes, and archive/import/export operations. `frontend/src/app/store.ts` should remain responsible only for UI concerns such as selected workspace, active panels, dialog state, search, and layout state.

Finally, evolve the workspace UI. Introduce shared components and workspace-management panels under `frontend/src/features/workspaces/` or `frontend/src/shared/` as needed. Extend the main page with local backend status, active workspace metadata, health indicators, backup actions, export/import actions, archive toggles, and better empty/loading/error states. The current visual system should be preserved where possible, but the new controls must be clear and safe, especially for destructive actions such as restore and delete.

## Concrete Steps

Run all commands from the repository root unless otherwise specified.

1. Implement backend services, manager methods, and route additions.

2. Update frontend client, types, workspace UI, and any shared components or styles required for the new flows.

3. Add or extend validation coverage in:
   `backend/tests/test_api.py`
   `backend/tests/test_workspace_manager.py`
   new frontend tests under `frontend/src/**`

4. Run backend validation:
   `cd personal-codex-builder && ./.venv/bin/ruff check backend`
   `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`

5. Run frontend validation:
   `cd personal-codex-builder/frontend && npm --cache .npm-cache run build`
   `cd personal-codex-builder/frontend && npm --cache .npm-cache test -- --run`

Expected successful backend lint shape:

    All checks passed!

Expected successful backend test shape:

    <count> passed in <time>

Expected successful frontend build shape:

    vite v...
    ✓ built in ...

Expected successful frontend test shape:

    ✓ ... tests passed

## Validation and Acceptance

Acceptance for this phase is behavior-focused:

1. `GET /api/health` reports backend availability and `GET /api/app-info` reports app and workspace-registry facts.
2. A user can create a workspace backup, list available backups, and restore from a selected backup while the backend creates a safety backup first.
3. A user can export a workspace to a `.workspace.zip` archive and import that archive back as a registered workspace.
4. A user can inspect a workspace health report that includes database integrity status and basic local storage facts.
5. Archived workspaces can be hidden from the default active list and shown separately without deleting local data.
6. The frontend can perform workspace-bound data operations through explicit `/api/workspaces/{workspace_slug}/...` routes.
7. Backend success responses use a common `data` envelope and backend errors use a structured `error` envelope.
8. The UI exposes backup, import/export, health, and local status information without requiring manual filesystem work.

## Idempotence and Recovery

Backup creation must be safe to repeat. Multiple manual or automatic backups should create distinct timestamped files and never overwrite an existing backup silently.

Restore is destructive and must therefore create a safety backup before replacing the active workspace database. If restore fails after the safety backup is created, the safety backup remains in place and the error response must make it clear that recovery is still possible from backups.

Import must validate the archive contents before registering a workspace. If validation fails, the partially extracted directory must be removed so the app index and filesystem do not drift apart. If a slug collision occurs, the manager should generate a safe unique slug instead of overwriting an existing workspace.

Export must not mutate workspace data. It should write archives under the workspace `exports/` directory and may also return the generated archive path for download or later retrieval.

Archive and unarchive should be idempotent metadata operations on the app index and `workspace.json`. Deleting a workspace remains destructive and should stay a separate explicit action.

## Interfaces and Dependencies

The implementation must leave these repository interfaces in a coherent state:

- `backend/app/main.py` must expose envelope-aware exception handling and `GET /api/health` plus `GET /api/app-info`.
- `backend/app/schemas/common.py` must define reusable API success and error envelope models.
- `backend/app/schemas/workspace.py` must define backup, health, import/export, archive, and app-info schemas.
- `backend/app/services/workspace_manager.py` must expose manager operations for archive, backup, restore, export, import, and health.
- `backend/app/services/backup_service.py`, `backend/app/services/export_service.py`, and `backend/app/services/integrity_service.py` must encapsulate the new reliability behaviors.
- `backend/app/api/routes/workspaces.py` must expose workspace management and health endpoints.
- `backend/app/api/router.py` must include explicit workspace-scoped data routers or aliases.
- `frontend/src/api/client.ts` must consume the standardized API envelope and explicit workspace-scoped routes.
- `frontend/src/types/models.ts` must include types for backups, health, app info, and archive-aware workspace summaries.
- `frontend/src/layout/CodexPage.tsx` and workspace UI modules must expose the new local-first management flows in the interface.

# Data Foundation and UI Roadmap Phase 1A

This ExecPlan is a living document and must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

This phase hardens workspace lifecycle safety before broader storage and UI evolution. After this work, existing workspaces should keep opening normally, new and legacy workspaces should both gain a forward-compatible `workspace_manifest.json`, destructive workspace deletion should create a recoverable safety archive first, and workspace health should return machine-readable checks rather than only flat counts. Users should still experience the app as local-first and SQLite-only, with no PostgreSQL migration or cloud runtime dependency introduced.

## Progress

- [x] (2026-07-08T00:00Z) Read `AGENTS.md`, `PLANS.md`, the provided SQLite-only execution file, and the current workspace lifecycle implementation to scope Phase 1A against the actual repository state.
- [x] (2026-07-08T17:00Z) Added canonical manifest support around `workspace_manifest.json` while preserving `workspace.json` compatibility for discovery, export, and import.
- [x] (2026-07-08T17:10Z) Added safety backup coverage for destructive workspace deletion and kept restore safety backup behavior intact.
- [x] (2026-07-08T17:18Z) Expanded workspace health into categorized machine-readable checks without breaking current frontend expectations.
- [x] (2026-07-08T17:23Z) Added regression coverage for manifest generation, delete safety backup, export/import compatibility, and health payload structure.
- [x] (2026-07-08T17:31Z) Ran repository validation and recorded outcomes, surprises, and follow-up work.
- [x] (2026-07-08T17:47Z) Extended the SQLite bridge model with card type definitions, card registry, asset library tables, explicit cover ids, notebook storage, and a multi-column FTS5 search index.
- [x] (2026-07-08T17:54Z) Added workspace-scoped notebook and asset-health APIs, persisted per-workspace UI preferences, simplified the top bar, and moved more advanced workspace actions into the manage-databases panel.
- [x] (2026-07-08T18:02Z) Added workspace-scoped `card-types` and `assets` APIs for card type listing, table inspection, structure export, and centralized asset library listing with usage details.
- [x] (2026-07-08T18:05Z) Re-ran backend and frontend validation after the broader bridge/API work and confirmed the repository remains green.
- [x] (2026-07-08T18:10Z) Added a user-facing Atlas/Table View screen switcher with persisted per-workspace screen state, card type selection, table search, and card type structure export from the frontend.
- [x] (2026-07-08T18:13Z) Added an Asset Library surface inside workspace management with search, type filtering, usage display, and image previews wired to the centralized asset API.
- [x] (2026-07-08T18:18Z) Promoted the workspace notebook into a persistent left-side panel with per-workspace visibility and size preferences, while keeping notebook editing local and backed by the existing workspace API.
- [x] (2026-07-08T18:20Z) Improved editor controls toward the requested direction by adding richer block labels, list actions, expanded font sizes, focus-first toolbar behavior, and clearer formatting reset behavior.
- [x] (2026-07-08T18:31Z) Added a first-pass Card Type import pipeline with backend preview/apply endpoints for CSV and JSON, automatic safety backup before import apply, row create/update handling, and regression coverage.
- [x] (2026-07-08T18:34Z) Wired a first-pass Import Wizard into Table View so users can paste CSV/JSON, preview matched/missing columns, and confirm imports without leaving the main workspace UI.
- [x] (2026-07-08T18:49Z) Extended Card Type structure export and table export with `XLSX` output, added `XLSX` import preview/apply support through `openpyxl`, and updated the frontend wizard to accept local `.xlsx` files in addition to pasted CSV/JSON.
- [x] (2026-07-08T21:40Z) Expanded Asset Library workflows with attach-existing-asset and safe delete semantics, fixed card-level asset unlink behavior so library assets are only removed when no links remain, and added regression coverage around reuse and cleanup flows.
- [x] (2026-07-08T21:44Z) Expanded health inspection with card-link checks, card-type registry/table consistency checks, search-index sync checks, and taxonomy/relation integrity checks, while keeping backend and frontend validation green.
- [x] (2026-07-08T21:52Z) Completed the universal-relations pass on the current UI by exposing relation type choice, compact clickable relation pills, and card-to-card navigation from the detail pane.
- [x] (2026-07-08T21:55Z) Started the shared UI primitive layer with reusable `IconButton` and `AutoResizeTextarea` components and applied them to detail, sources, and relations flows as a foundation for later UI cleanup phases.
- [x] (2026-07-08T21:58Z) Finished the manage-databases and card-detail cleanup pass by wiring real cover persistence, improving attachment/source presentation, and keeping frontend/backend validation green.
- [x] (2026-07-08T22:00Z) Normalized card media flows toward canonical asset ids, added source-file attachments end-to-end, and extended regression coverage for the new source asset lifecycle.
- [x] (2026-07-08T22:02Z) Removed the backend `CardDetail.schema` shadowing warning while preserving the external `schema` API field through aliases.
- [x] (2026-07-08T22:04Z) Split heavy frontend modules into lazy-loaded chunks, added manual Vite chunking for editor/query/react/dnd dependencies, and reduced the main application bundle substantially.
- [x] (2026-07-08T22:08Z) Extended search indexing so attachment filenames and source-file names are searchable, and refreshed the index automatically after file attach/upload/delete flows.
- [x] (2026-07-08T22:10Z) Expanded Asset Library reuse flows so existing workspace assets can be attached directly to a chosen source, and updated repository guidance docs to reflect the current `app_index.sqlite` plus workspace-scoped architecture.
- [x] (2026-07-08T22:12Z) Brought the Table View frontend closer to the existing backend feature set by adding table JSON export, clearer column metadata, fuller import preview feedback, and explicit XLSX import mode in the UI.
- [x] (2026-07-08T22:28Z) Finished the next UI simplification pass by moving database creation and ordering into the Manage databases modal, persisting workspace order in `app_index.sqlite`, tightening the card detail layout, and redesigning Card Type Studio around live preview plus field-behavior controls.
- [x] (2026-07-08T22:33Z) Fixed a runtime-only migration gap for existing local workspaces by teaching `create_workspace_schema()` to add missing additive columns like `workspace_settings.ui_preferences` and `workspace_settings.notebook_json`, then verified the real app could boot against older local data again.

## Surprises & Discoveries

- Observation: the current public repository already moved the canonical database filename to `workspace.sqlite`, but several architecture docs still describe older `workspace.db` and `workspace.json` assumptions.
  Evidence: `backend/app/core/paths.py` already normalizes `workspace.db` to `workspace.sqlite`, while `AGENTS.md` and older plans still mention the older names.
- Observation: the current delete flow permanently removes the workspace folder after deleting the app-index record, so a normal workspace backup stored under `backups/` would be deleted along with the workspace.
  Evidence: `backend/app/services/workspace_manager.py::delete_workspace()` deletes the record and then runs `shutil.rmtree(workspace_root)`.
- Observation: current export/import only requires `workspace.sqlite` plus `workspace.json`, so manifest rollout must preserve legacy metadata during the compatibility phase.
  Evidence: `backend/app/services/export_service.py` currently archives and requires `WORKSPACE_METADATA_FILENAME` only.
- Observation: frontend fallout from the new structured health payload was limited to a test fixture, not production code.
  Evidence: the initial frontend build failed only because `frontend/src/features/workspaces/WorkspaceManagerPanel.test.tsx` mocked `WorkspaceHealth` without the new `issue_count`, `checks`, and `categories` fields.

## Decision Log

- Decision: SQLite remains the only storage engine for this phase.
  Rationale: the supplied execution file explicitly forbids PostgreSQL migration for this version and the current code already uses SQLAlchemy + SQLite + WAL successfully.
  Date/Author: 2026-07-08 / Codex
- Decision: `workspace.sqlite` remains canonical, while `workspace_manifest.json` becomes the preferred metadata file and `workspace.json` remains compatibility metadata for now.
  Rationale: the repository already normalized database naming, and the execution file explicitly requires a forward-compatible manifest without breaking existing imports and exports.
  Date/Author: 2026-07-08 / Codex
- Decision: destructive workspace delete will create an app-level safety archive outside the workspace folder instead of relying on workspace-local backups.
  Rationale: workspace-local backups are deleted together with the workspace folder and therefore do not satisfy recovery requirements for destructive delete.
  Date/Author: 2026-07-08 / Codex

## Outcomes & Retrospective

Phase 1A shipped as a backend-first foundation pass, and the repository has since advanced further into the SQLite-only bridge architecture described by the execution file. Workspaces now maintain a canonical `workspace_manifest.json` while preserving legacy `workspace.json` compatibility, export/import archives carry both metadata files during the transition, destructive workspace deletion creates a recoverable safety archive outside the workspace folder, and workspace health now exposes categorized machine-readable checks while keeping the flat summary fields consumed by the current UI.

Beyond that initial safety milestone, the current repository now also has:

- bridge tables for `card_type_definitions`, `card_type_fields`, `cards_registry`, and centralized `assets`;
- physical `card_type_<slug>` table creation and incremental column creation when card types evolve;
- a new workspace notebook API and asset-health API;
- a centralized workspace asset library listing API with usage details;
- workspace-scoped card type APIs for list, table inspection, and structure export;
- frontend changes that simplify top-level controls, persist more workspace UI state, and surface notebook plus asset-health information.

Validation passed across the current repository commands:

- `./.venv/bin/ruff check backend`
- `PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`
- `npm --cache .npm-cache run build`
- `npm --cache .npm-cache test -- --run`
- local runtime smoke after the migration fix: backend booted on the real local workspace data, frontend reconnected successfully, and the app resumed fetching `/api/workspaces`, `/api/cards`, `/api/card-types`, notebook, health, and asset-library endpoints without the earlier schema crash.

Known non-blocking follow-ups:

- backend tests still emit the existing Starlette `httpx` deprecation warning;
- backend tests still emit the existing Pydantic `schema` field shadowing warning;
- Vite still warns about the large production chunk size, but the build succeeds.

## Context and Orientation

Workspace lifecycle currently flows through `backend/app/services/workspace_manager.py`, which already owns bootstrap, app-index synchronization, create/copy/delete, backup/restore, export/import, archive, and health flows. Workspace-local metadata is read and written by `backend/app/storage/workspace_metadata.py`, while path conventions live in `backend/app/core/paths.py`. Export/import currently package `workspace.sqlite`, `workspace.json`, and `files/`, and health currently returns one flat payload with SQLite integrity plus simple filesystem counts.

Important repository facts for this phase:

- SQLite remains the required storage engine.
- `data/app_index.sqlite` is the global metadata index.
- `data/workspaces/spelljammer-atlas/` must not be used for destructive verification without backup.
- Destructive verification should prefer `.test-data/` or temporary workspaces.
- Any destructive migration or delete path must create recovery material first.

Non-obvious terms in this plan:

- Manifest: structured workspace metadata file stored alongside the workspace database.
- Safety backup: recovery material created automatically before a destructive action.
- Compatibility metadata: temporary continued support for legacy `workspace.json` while new manifest support rolls out.

## Milestones

### Milestone 1: Manifest compatibility layer

The backend writes `workspace_manifest.json` for every touched workspace, still reads `workspace.json` when needed, and keeps compatibility metadata available for older export/import paths. This milestone is complete when a legacy workspace missing the manifest gains one automatically and newly created workspaces contain both readable metadata files.

### Milestone 2: Safer destructive lifecycle behavior

Deleting a workspace first creates a portable safety archive outside the workspace folder, and restore continues creating a safety backup before overwriting the database. This milestone is complete when a delete operation leaves recoverable safety material behind even after the workspace folder is removed.

### Milestone 3: Structured workspace health

Workspace health returns categorized machine-readable checks while preserving the summary fields the current frontend already displays. This milestone is complete when API consumers can inspect check categories and statuses without parsing human-only strings.

## Plan of Work

Add a new canonical manifest filename in `backend/app/core/paths.py`, keep a legacy metadata filename constant, and expose helpers for both paths plus an app-level safety backup directory. Update `backend/app/storage/workspace_metadata.py` so reads prefer `workspace_manifest.json` but fall back to `workspace.json`, and writes always keep the canonical manifest current while preserving compatibility metadata during this phase.

Update `backend/app/services/workspace_manager.py` so bootstrap normalizes app-index metadata toward the canonical manifest filename, writes richer manifest contents including workspace slug, workspace name, schema version, asset library version, and relative layout names, and creates a safety archive before destructive workspace delete. Keep restore safety backup behavior intact and ensure import/export flows repopulate canonical metadata after compatibility imports.

Refactor `backend/app/services/export_service.py` so archive creation can be reused for normal exports and delete safety archives. Export archives should include `workspace.sqlite`, `workspace_manifest.json`, legacy `workspace.json` when present, and the existing `files/` directory. Import should accept either manifest file and regenerate canonical metadata during manager reconciliation.

Expand `backend/app/services/integrity_service.py` and `backend/app/schemas/workspace.py` with health-check models and categorized results while keeping the current flat summary keys for existing frontend consumers. Update tests in `backend/tests/test_workspace_manager.py` and `backend/tests/test_api.py` to cover manifest generation, delete safety archive creation, import/export compatibility, and structured health payloads.

## Concrete Steps

1. Update planning artifact:
   `plans/2026-07-08-data-foundation-and-ui-roadmap.md`
2. Implement path and metadata compatibility helpers in:
   `backend/app/core/paths.py`
   `backend/app/storage/workspace_metadata.py`
3. Implement workspace lifecycle safety and export/import updates in:
   `backend/app/services/workspace_manager.py`
   `backend/app/services/export_service.py`
4. Expand health payloads in:
   `backend/app/services/integrity_service.py`
   `backend/app/schemas/workspace.py`
5. Add regression coverage in:
   `backend/tests/test_workspace_manager.py`
   `backend/tests/test_api.py`
6. Run validation:
   `cd personal-codex-builder && ./.venv/bin/ruff check backend`
   `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`
   `cd personal-codex-builder/frontend && npm --cache .npm-cache run build`
   `cd personal-codex-builder/frontend && npm --cache .npm-cache test -- --run`

## Validation and Acceptance

Acceptance for this phase is behavioral:

- Existing workspaces still list and open.
- Creating or bootstrapping a workspace leaves a canonical `workspace_manifest.json` in place.
- A legacy workspace with only `workspace.json` gains a manifest automatically without losing compatibility metadata.
- Exported workspace archives contain manifest metadata and remain importable.
- Deleting a workspace creates recoverable safety material outside the deleted workspace folder.
- Workspace health exposes machine-readable checks and categories while preserving current summary fields.
- Backend and frontend validation commands still pass.

## Idempotence and Recovery

Manifest generation must be idempotent: rerunning bootstrap or opening a workspace should refresh metadata safely without duplicating files or changing relative layout semantics. Delete safety archive creation must happen before removal; if archive creation fails, delete should abort. Import should stage extraction in a temporary directory and clean up on failure. Restore already creates a safety backup before overwriting the workspace database and should keep doing so.

This phase does touch `data/workspaces/` for normal workspace operations, but destructive verification should use `.test-data/` or temporary workspaces rather than the demo workspace. The demo workspace `data/workspaces/spelljammer-atlas/` must not be destructively mutated without a prior backup. Recovery for delete should come from the app-level safety archive; recovery for restore should come from the restore safety backup already produced automatically.

## Interfaces and Dependencies

Expected interfaces after this phase:

- `backend/app/core/paths.py`
  - `WORKSPACE_DB_FILENAME = "workspace.sqlite"`
  - canonical manifest filename helper for `workspace_manifest.json`
  - legacy metadata filename helper for `workspace.json`
  - app-level safety backup directory helper
- `backend/app/storage/workspace_metadata.py`
  - compatibility-aware metadata loader
  - canonical manifest writer with legacy compatibility output
- `backend/app/services/export_service.py`
  - workspace export helper that packages manifest metadata
  - safety archive helper for destructive delete recovery
- `backend/app/services/integrity_service.py`
  - categorized health-check payload with machine-readable checks
- `backend/app/schemas/workspace.py`
  - Pydantic models for health checks/categories while preserving `WorkspaceHealthRead`

No PostgreSQL adapter, no Docker runtime, no cloud sync, and no hosted dependency will be introduced in this phase.

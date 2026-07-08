# AGENTS.md

## Project identity

This repository is a local-first, single-user codex application. Core workflows must keep working on one machine, with local files and local databases, even when there is no internet connection.

The product already has a useful foundation:

- the backend lives in `backend/app` and uses FastAPI plus SQLite;
- the frontend lives in `frontend/src` and uses React, TypeScript, and Vite;
- each workspace already has its own SQLite file under `data/workspaces/<slug>/workspace.sqlite`;
- each workspace already stores metadata, assets, backups, and exports inside its own folder.

The architecture is still evolving, but the major storage transition has already happened. The workspace registry now lives in `data/app_index.sqlite`, workspace manifests are written as `workspace_manifest.json` with legacy `workspace.json` compatibility, and lifecycle behavior is centered on a first-class `WorkspaceManager`.

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan as described in `PLANS.md` from design through implementation.

Use an ExecPlan whenever the task touches one or more of these areas:

- workspace lifecycle, storage format, or workspace metadata;
- schema changes, migrations, or data moves;
- backup, restore, import, export, or integrity-check logic;
- API contract changes that affect both backend and frontend;
- cross-cutting work that spans multiple services or multiple frontend features;
- new dependencies, new test infrastructure, or work expected to take more than one focused coding session.

## Current architecture snapshot

- Backend entrypoint: `backend/app/main.py`
- Workspace lifecycle service today: `backend/app/services/workspace_manager.py`
- App index persistence today: `backend/app/storage/app_index.py`
- SQLite engine and session bootstrapping: `backend/app/core/db.py`
- Frontend API layer: `frontend/src/api/client.ts`
- Workspace UI controls: `frontend/src/features/workspaces/WorkspaceControls.tsx`
- Demo workspace data: `data/workspaces/spelljammer-atlas/`

Important current behavior:

- workspace scope is explicit for the modern API surface through `/api/workspaces/{workspace_slug}/...` routes;
- API responses are standardized around a shared success envelope plus structured error payloads;
- React Query is the right home for backend data, while Zustand should remain the home for UI-only state.

## Architecture guardrails

Keep all changes aligned with the local-first roadmap from the project improvement report.

1. Preserve offline, local-only ownership.
   Core CRUD, search, backup, restore, import, export, and workspace switching must not depend on third-party cloud services.

2. Treat each workspace as an isolated data container.
   Business data belongs in the selected workspace database and workspace-local folders, not in global app metadata.

3. Keep workspaces portable.
   Store relative paths inside workspace data. Avoid absolute machine-specific paths in models, exports, or API payloads.

4. Protect user data before changing storage behavior.
   If a task can delete, migrate, overwrite, or re-home data, plan a backup and recovery path first.

5. Prefer foundation before polish.
   Storage layout, workspace lifecycle, backup, restore, import/export, and integrity work take priority over broad UI redesigns.

6. Make workspace scope more explicit, not less.
   For new endpoints and flows, prefer APIs that clearly identify the workspace being operated on.

7. Standardize interfaces as you touch them.
   When editing endpoints, move them toward a shared success/error envelope instead of introducing more one-off shapes.

8. Grow shared UI primitives instead of ad hoc screens.
   If a feature introduces a new button, modal, empty state, status badge, or confirmation flow, prefer reusable components over one-off markup.

## Data safety rules

- Do not use real user workspaces for destructive verification.
- Prefer temporary workspaces or `.test-data/` for experiments, fixtures, and destructive tests.
- Treat `data/workspaces/spelljammer-atlas/` as demo content unless the task is explicitly about seed data or repair logic.
- Before restore, migration, archive, delete, or import/export changes, document what safety backup exists and how to recover.

## Repository-specific development guidance

### Backend

- Use the project virtual environment in `.venv`.
- Keep business logic in services, not in route handlers.
- Keep SQLite path logic centralized; avoid scattering path-building rules across handlers and UI code.
- If a task introduces global application metadata, prefer a dedicated app-index abstraction over adding more responsibility to `catalog.json`.
  This mostly means extending the current `app_index.sqlite` abstractions rather than reviving legacy JSON catalog ideas.

### Frontend

- Keep server-state fetching and cache invalidation in React Query flows.
- Keep modal state, panel state, temporary filters, and other UI-only concerns in Zustand or component state.
- Preserve the current feature-based organization and move toward a clearer `shared/` plus `features/` split as the codebase grows.
- When forms use Zod defaults, be explicit about input versus output types so newer `react-hook-form` and resolver versions stay type-safe.

## Verification commands

Run the commands that actually exist in this repository. If a plan depends on a new script, add the script before using it as a required validation step.

Backend checks:

- `cd personal-codex-builder && ./.venv/bin/ruff check backend`
- `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`

Frontend checks:

- `cd personal-codex-builder/frontend && npm --cache .npm-cache run build`
- `cd personal-codex-builder/frontend && npm --cache .npm-cache test`

Local dev run:

- Backend: `cd personal-codex-builder && PYTHONPATH=backend ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --app-dir .`
- Frontend: `cd personal-codex-builder/frontend && npm run dev -- --host 127.0.0.1 --port 5173`
- Launcher: `Personal Codex Builder.command`

## Near-term roadmap assumptions

Unless the user explicitly overrides the direction, assume the repository should continue moving toward these architectural goals:

- keep `data/app_index.sqlite` as the authoritative workspace registry;
- continue consolidating lifecycle operations inside `WorkspaceManager`;
- add backup, restore, import, export, and integrity-check services;
- keep workspace metadata explicit with `workspace_manifest.json`, compatibility `workspace.json`, and workspace-local `backups/` and `exports/` folders;
- standardize API success and error envelopes;
- improve frontend structure and shared components only after the data and workspace foundation is stable.

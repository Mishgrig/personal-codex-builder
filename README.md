# Personal Codex Builder

Personal Codex Builder is a local-first workspace for tabletop RPG game masters, RPG creators, writers, and worldbuilding authors. It is a private offline desk for preparing a World, connecting its canon, building Chapters and Scenes, and running playable scenes from the same portable Workspace database.

The current product direction comes from the Notion project hub and uses two primary modes:

- `Prep` for creating, reading, updating, and deleting world material.
- `Play` for running prepared scenes at the table.

## What is included

- FastAPI backend with per-workspace SQLite databases
- React + TypeScript + Vite frontend
- Explicit workspace management with local backups, health checks, import/export, archive support, and safety backups before destructive flows
- Wiki/Atlas, Characters, Locations, Chapters/Scenes, Plots, Boards, Character Graphs, and Play prototype surfaces
- Card Type Studio, category/tag filters, centralized Asset Library, workspace Notebook, relations, and rich text editing
- Local runtime storage under `data/` that stays on the machine

## Project structure

```text
personal-codex-builder/
  backend/
  frontend/
  docs/
  plans/
  scripts/
  data/          # local runtime data only, ignored by git
```

## Workspace layout

Each workspace is a local container:

```text
data/workspaces/<workspace-slug>/
  workspace.sqlite
  workspace_manifest.json
  workspace.json                  # compatibility metadata during transition
  assets/
  files/
  backups/
  exports/
```

Global app metadata lives separately in `data/app_index.sqlite`.

## Setup

Backend:

```bash
cd personal-codex-builder
python3 -m venv .venv
./.venv/bin/pip install -r backend/requirements.txt
```

Frontend:

```bash
cd personal-codex-builder/frontend
npm install
```

## Run locally

Backend:

```bash
cd personal-codex-builder
PYTHONPATH=backend ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --app-dir .
```

Frontend:

```bash
cd personal-codex-builder/frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## macOS launcher

Use [Personal Codex Builder.command](<./Personal Codex Builder.command>) from Finder or Terminal.

Examples:

```bash
./Personal\ Codex\ Builder.command start
./Personal\ Codex\ Builder.command open
./Personal\ Codex\ Builder.command stop
```

## Checks

Backend:

```bash
cd personal-codex-builder
./.venv/bin/ruff check backend
PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q
```

Frontend:

```bash
cd personal-codex-builder/frontend
npm --cache .npm-cache run build
npm --cache .npm-cache test -- --run
```

## GitHub sync and AI review

GitHub contains source code and documentation only.

- Source code, scripts, plans, and safe docs can be pushed.
- Local databases, workspace data, uploaded media, backups, exports, logs, caches, and runtime artifacts stay on the local machine and are ignored by git.
- The application must remain offline local-first and must not depend on GitHub or any online service at runtime.

## Recommended git workflow

- `main` for the stable baseline
- feature branches for focused changes, for example:
  - `codex/ui-refactor`
  - `codex/notebook-architecture`
  - `codex/workspace-management`
  - `codex/editor-upgrade`

## Development notes

- Notion is the current product source of truth for the NRI/RPG/worldbuilding direction.
- TTRPG/worldbuilding is now core product direction, not an optional late mode.
- Public product language should move from generic `cards/databases` toward `Worlds`, `Entities`, `Chapters`, and `Scenes`, while preserving existing internal compatibility until focused migrations are planned.
- The product has two primary modes: `Prep` and `Play`; there is no separate `Review` mode in the current roadmap.
- The current target is one complete modular prototype, not separate MVP/beta/later product versions.
- The global workspace registry now lives in the local app index database.
- Workspace business data stays isolated inside each workspace database.
- Existing local workspaces are migrated forward with additive SQLite schema repair on startup.
- `backend/alembic` remains a migration scaffold for future schema evolution.
- See [plans/2026-07-09-master-product-roadmap.md](./plans/2026-07-09-master-product-roadmap.md) for the current product roadmap.
- See [docs/AI_REVIEW_CONTEXT.md](./docs/AI_REVIEW_CONTEXT.md) for future ChatGPT and GitHub review context.

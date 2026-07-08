# Personal Codex Builder

Personal Codex Builder is a local-first single-user atlas for personal knowledge bases, notes, lore archives, and structured codices.

## What is included

- FastAPI backend with per-workspace SQLite databases
- React + TypeScript + Vite frontend
- Explicit workspace management with local backups, health checks, import/export, and archive support
- Search, schemas, taxonomy, attachments, relations, and rich text editing
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
  workspace.json
  files/
  backups/
  exports/
```

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

- The global workspace registry now lives in the local app index database.
- Workspace business data stays isolated inside each workspace database.
- `backend/alembic` remains a migration scaffold for future schema evolution.
- See [docs/AI_REVIEW_CONTEXT.md](./docs/AI_REVIEW_CONTEXT.md) for future ChatGPT and GitHub review context.

# AI Review Context

## Project summary

Personal Codex Builder is a local-first single-user workspace for tabletop RPG game masters, RPG creators, writers, and worldbuilding authors. The product is being reoriented from a generic creative database into one modular offline prototype for worldbuilding, chapter/scene preparation, and local play.

The current product source of truth is the Notion project hub:

- https://app.notion.com/p/39d2e0c1694780d2b461f1af04f85464

The active product model has two primary modes:

- `Prep`: prepare and maintain world material.
- `Play`: run prepared scenes.

There is no separate `Review` mode in the current roadmap. Post-session cleanup belongs to `Prep`.

## Local-first principle

The application must remain offline local-first.

- Runtime use must not depend on GitHub or any online service.
- GitHub is only for source code version control, documentation backup, collaboration, and future AI-assisted review.
- No cloud sync, online login, telemetry, remote database, or hosted runtime dependency should be added as part of GitHub synchronization.

## Product direction guardrails

- TTRPG/worldbuilding is core product direction, not optional future scope.
- Do not split the product into MVP/beta/later versions in roadmap language; the current goal is one complete modular prototype.
- Workspaces should increasingly feel like portable Worlds.
- Cards should increasingly be treated as canonical Entities in public product language.
- Chapter/Scene preparation and Play Mode should build on the existing workspace, card/entity, asset, relation, board, plot, notebook, backup, and export foundation.
- Existing `Campaign/Module` language is legacy/alias terminology; public UI should use `Chapter/Scene` where possible.
- Do not port Electron/AppBridge/better-sqlite3 code from the `НРИ стол` prototype; it is a product/reference source, not the target architecture.
- Do not add global player visibility flags to all entities or relations. GM/player visibility belongs only inside Play Mode scene materials.

## Frontend stack

- React
- TypeScript
- Vite
- TanStack React Query
- Zustand
- React Hook Form
- Zod
- Vitest

## Backend stack

- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- SQLite
- pytest
- Ruff

## How to run locally

### Backend

```bash
cd personal-codex-builder
PYTHONPATH=backend ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --app-dir .
```

### Frontend

```bash
cd personal-codex-builder/frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### macOS launcher

```bash
cd personal-codex-builder
./Personal\ Codex\ Builder.command
```

## Where source code lives

- Backend source: `backend/app`
- Backend tests: `backend/tests`
- Frontend source: `frontend/src`
- Plans and architecture docs: `plans/`, `AGENTS.md`, `PLANS.md`, `docs/`
- Local launcher and helper scripts: project root and `scripts/`

## Where local runtime data lives

Runtime and user data live under local-only paths such as:

- `data/`
- `.run/`
- `.test-data/`
- local SQLite workspace files
- user uploads and generated archives

These paths are intentionally ignored by git because they contain machine-local runtime state and user content, not source code.

## What must never be pushed to GitHub

Never push:

- `.env` files
- secrets, tokens, keys, certificates
- local SQLite databases
- workspace runtime data
- uploaded media and attachments
- backups, exports, archives
- logs, caches, test artifacts
- virtual environments
- `node_modules`

## Current GitHub sync policy

- GitHub repository may be private or public depending on the owner's chosen review workflow.
- Only source code, safe configuration examples, and documentation should be committed.
- The application must remain fully usable offline without GitHub.
- Remote history must not be force-pushed unless the owner explicitly approves it.

## Suggested workflow for future AI review

1. Keep `main` as the stable branch.
2. Create focused feature branches for larger Codex changes.
3. Commit only source code and safe docs.
4. Run backend and frontend checks locally before pushing.
5. Push the branch to the GitHub repository.
6. Connect that repository in ChatGPT for source review and discussion.
7. Keep local runtime data on the machine and outside git at all times.

# Codex Execution Plans for Personal Codex Builder

This file defines how to write and maintain an execution plan, or ExecPlan, for this repository.

An ExecPlan is a self-contained design-and-delivery document that a stateless coding agent or a new contributor can follow from start to finish without relying on prior chat history. The plan must explain why the work matters, what files and modules are involved, what to change, what to run, what success looks like, and how to recover safely if a step goes wrong.

## How this file should be used

When authoring an ExecPlan, follow this file closely. Re-read the relevant source files before writing the plan, and write the plan as if the reader knows nothing about this repository except what they can learn from the working tree and the plan itself.

When implementing an ExecPlan, keep the plan up to date while the work is happening. The `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` sections are living sections. They are not optional and they must reflect the real current state at every meaningful stopping point.

When discussing or revising an ExecPlan, record why the plan changed. A future contributor must be able to understand the current direction, the abandoned direction, and the reason the change happened without reading any external document or prior conversation.

## When this repository requires an ExecPlan

Create an ExecPlan for any task that is more than a short isolated code edit, especially if it touches:

- workspace lifecycle or storage layout;
- database migrations or schema-version handling;
- backup, restore, import, export, archive, or integrity-check flows;
- cross-cutting backend plus frontend changes;
- API contract changes that affect multiple screens or services;
- new infrastructure, new dependencies, or multi-session implementation work.

## Non-negotiable requirements

Every ExecPlan in this repository must satisfy all of the following:

1. It must be fully self-contained.
   A novice contributor must be able to succeed using only the plan and the current repository checkout.

2. It must be a living document.
   If the implementation changes, the plan changes too.

3. It must be outcome-focused.
   The plan must describe observable behavior, not only structural code edits.

4. It must explain all non-obvious terms in plain language.
   If a plan uses a term such as migration, app index, workspace registry, integrity check, or ambient workspace scope, it must define what that means in this repository.

5. It must be safe to execute.
   Destructive or risky steps must include backups, retries, rollback guidance, or clear recovery instructions.

6. It must include concrete validation.
   A plan is not complete unless it explains exactly how to prove the new behavior works.

## Repository-specific architecture context

An ExecPlan for this repository must anchor itself in the real current architecture before describing the target architecture.

Current state:

- FastAPI backend code lives under `backend/app`.
- React plus TypeScript plus Vite frontend code lives under `frontend/src`.
- Each workspace already has its own SQLite database under `data/workspaces/<slug>/workspace.sqlite`.
- Workspace metadata lives beside the database as `workspace_manifest.json`, with legacy `workspace.json` compatibility still supported.
- Workspace-local assets, backups, and exports already live inside each workspace folder.
- Global workspace registry metadata already lives in `data/app_index.sqlite`.
- Workspace scope is explicit on the current API surface through `/api/workspaces/{workspace_slug}/...` routes.

Target direction from the project improvement report:

- keep global workspace registry metadata in `data/app_index.sqlite` and evolve its abstractions as needed;
- continue consolidating lifecycle behavior inside the dedicated `WorkspaceManager` service;
- treat each workspace as a portable container with workspace-local database, metadata, files, backups, and exports;
- add backup, restore, import, export, and integrity-check capabilities;
- make API success and error shapes consistent;
- keep the product local-first and functional without internet access.

Every plan must clearly distinguish between these two states. Do not write as if the target state already exists when it does not. If the plan moves the repository from the current state toward the target state, describe that migration path explicitly.

## Repository-specific planning rules

### Local-first rule

Plans must preserve offline-first behavior. Core user workflows cannot start depending on hosted services or remote storage.

### Workspace isolation rule

Plans must keep business data isolated per workspace. Global metadata can describe workspaces, but workspace content must stay in workspace-local storage.

### Portability rule

Plans must avoid absolute file paths in durable workspace records. Any stored path should remain valid when a workspace folder is copied to another machine.

### Foundation-before-polish rule

If a feature request mixes architecture work with UI polish, the plan must stabilize storage, migration, backup, or workspace-management behavior before broad interface redesign.

### Safety-before-destruction rule

If a plan proposes migration, restore, delete, archive, import, or export behavior, it must include the backup and recovery path as first-class work, not as an afterthought.

## Formatting rules

If an ExecPlan is written inline in chat or another document, wrap it in a single fenced `md` block and avoid nested code fences inside it. Use indented command examples instead.

If the ExecPlan is written as its own `.md` file and the file contains only the plan, do not add the outer triple backticks.

Use normal Markdown headings with blank lines after headings. Write in prose first. Checklists are allowed only where the plan needs a real progress checklist, and they are mandatory in the `Progress` section.

## Required sections in every ExecPlan

Every ExecPlan in this repository must contain these sections, in this spirit, even if the exact wording changes:

### Purpose / Big Picture

Explain what a user will be able to do after the change, why that matters, and how someone can see the result working.

### Progress

Use timestamped checkboxes. This is the only section where checklist formatting is mandatory. Every stopping point must be reflected here, even if that means splitting a half-finished step into completed and remaining parts.

### Surprises & Discoveries

Record bugs, unexpected behaviors, constraints, or insights discovered during the work. Include short evidence snippets when useful.

### Decision Log

Record important design decisions with the reason they were made and the date or author.

### Outcomes & Retrospective

Summarize what shipped, what remains unfinished, and what was learned.

### Context and Orientation

Describe the relevant current code as if the reader has never seen this repository. Name the key files by full repository-relative path.

### Milestones

Tell the story of the work in verifiable chunks. Each milestone should explain what will exist afterward, how to exercise it, and what proof demonstrates that it works.

### Plan of Work

Describe the exact edits and additions in prose. Name the files, functions, modules, handlers, and components to change.

### Concrete Steps

List the exact commands to run, the working directory, and the expected output patterns that prove success.

### Validation and Acceptance

Describe how to exercise the system and what behavior confirms the change. Acceptance must be phrased as observable behavior, not only internal code structure.

### Idempotence and Recovery

Explain what can be repeated safely, what can fail halfway, how to retry, and how to recover.

### Interfaces and Dependencies

Name the libraries, services, endpoints, schemas, functions, and file paths that must exist at the end of the work. Be precise.

## Validation commands for this repository

An ExecPlan must include the exact validation commands relevant to the task. Use the existing toolchain unless the plan explicitly adds a new script first.

Backend validation today:

- `cd personal-codex-builder && ./.venv/bin/ruff check backend`
- `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`

Frontend validation today:

- `cd personal-codex-builder/frontend && npm --cache .npm-cache run build`
- `cd personal-codex-builder/frontend && npm --cache .npm-cache test`

Runtime validation today:

- backend dev server command from repository root:
  `PYTHONPATH=backend ./.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --app-dir .`
- frontend dev server command from `frontend/`:
  `npm run dev -- --host 127.0.0.1 --port 5173`

If a plan introduces new test or lint commands, it must add them to the repository before treating them as required acceptance steps.

## Data safety expectations for plans

If a plan touches workspace lifecycle or storage, it must say all of the following in concrete repository terms:

- which files or folders can change;
- whether the task touches `data/workspaces/` directly;
- whether demo data in `data/workspaces/spelljammer-atlas/` is safe to modify;
- what backup exists before a destructive step;
- how to restore the old state if validation fails.

Plans should prefer temporary workspaces or `.test-data/` for destructive verification.

## Architecture priorities inherited from the improvement report

Unless the user explicitly overrides the direction, plans for this repository should move the codebase toward:

1. a first-class `app_index.sqlite` global registry;
2. a dedicated `WorkspaceManager`;
3. workspace-local backups and exports;
4. restore and integrity-check flows;
5. explicit workspace-scoped APIs;
6. consistent API success and error envelopes;
7. stronger local-first testing, especially for isolation and recovery;
8. shared frontend components and clearer frontend module boundaries after the storage foundation is stable.

If a plan intentionally postpones one of these priorities, the plan must say why.

## Skeleton for a good ExecPlan in this repository

Use this outline as a starting point and expand it with repository-specific detail:

# <Short action-oriented title>

This ExecPlan is a living document and must be maintained in accordance with `PLANS.md`.

## Purpose / Big Picture

Explain the user-visible outcome and how to see it working.

## Progress

- [ ] Add timestamped steps here.

## Surprises & Discoveries

- Observation: ...
  Evidence: ...

## Decision Log

- Decision: ...
  Rationale: ...
  Date/Author: ...

## Outcomes & Retrospective

Summarize what shipped, what remains, and what changed during implementation.

## Context and Orientation

Describe the current repository state, name the important files, and define non-obvious terms.

## Milestones

Describe the work in independently verifiable narrative milestones.

## Plan of Work

Describe the exact file-by-file and module-by-module edits in prose.

## Concrete Steps

List exact commands, working directories, and expected output patterns.

## Validation and Acceptance

Describe how to prove the result works for a human observer and for the project test suite.

## Idempotence and Recovery

Explain retry, rollback, cleanup, and backup expectations.

## Interfaces and Dependencies

Name the modules, endpoints, services, schemas, and libraries that must exist when the work is complete.

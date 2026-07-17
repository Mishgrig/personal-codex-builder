# Phase 7 Dashboard Widgets Design

Status: Design ready for implementation.

## Goal

Turn Workspace Home from a fixed dashboard into a configurable project cockpit inspired by ForgeTales patterns without copying ForgeTales UI or branding.

The dashboard should stay local-first, single-user and simple enough to use before Board, Plots and advanced graph features exist.

## Scope

Phase 7 should add widget behavior on top of the existing Home screen:

- quick note;
- tasks / corkboard;
- recent activity;
- pinned cards;
- asset reminders;
- mention / relation summary;
- goals / progress;
- learning / help shortcuts.

Phase 7 should not introduce a new database table unless a later implementation needs multi-device conflict handling. Workspace-backed JSON is enough for this local-first phase.

## Storage Model

Use `WorkspaceSummary.ui_preferences` for user-customizable widget state because it already travels with the workspace.

Recommended keys:

- `dashboard_widget_layout`: array of widget layout objects.
- `dashboard_tasks`: array of task cards.
- `dashboard_goals`: array of goal/progress records.
- `dashboard_help_links`: optional array of custom help shortcuts.

Suggested layout object:

```json
{
  "id": "quick_note",
  "enabled": true,
  "order": 10,
  "size": "wide"
}
```

Suggested task object:

```json
{
  "id": "task-abc123",
  "title": "Revise faction templates",
  "status": "todo",
  "note": "",
  "created_at": "2026-07-12T00:00:00Z",
  "updated_at": "2026-07-12T00:00:00Z"
}
```

Suggested goal object:

```json
{
  "id": "goal-abc123",
  "title": "Build Act I locations",
  "current": 3,
  "target": 10,
  "unit": "cards",
  "updated_at": "2026-07-12T00:00:00Z"
}
```

## Widget Behavior

### Quick Note

- Keep using the existing Notebook integration.
- Saving a note creates a Notebook item.
- Do not duplicate quick-note content into another store.

### Tasks / Corkboard

- Store lightweight tasks in `dashboard_tasks`.
- Support statuses: `todo`, `doing`, `done`.
- Support add, edit, complete and delete.
- Later Board can import or mirror these tasks, but Phase 7 should not depend on Board.

### Recent Activity

- Use existing card and asset data.
- Keep this derived, not separately stored.
- Show cards, assets and Notebook updates when available.

### Pinned Cards

- Continue using `pinned_card_ids`.
- Render cards from Wiki, Characters and Locations.
- Missing/deleted pinned cards should be ignored safely.

### Asset Reminders

- Use existing Asset Library and asset health data.
- Surface unused assets, missing files, broken links and duplicate checksums.
- Action buttons should open Manage Databases / Asset Library rather than duplicating repair workflows.

### Mention / Relation Summary

- MVP: derived stats from visible cards, search mention counts and relation counts where available.
- Later: graph preview after relation graph phase.

### Goals / Progress

- Store lightweight goals in `dashboard_goals`.
- Support add/edit/delete and current/target progress.
- Do not make this a full project management system.

### Learning / Help Shortcuts

- Static shortcuts first:
  - Open Wiki;
  - Open Characters;
  - Open Locations;
  - Open Card Type Studio;
  - Open Manage Databases;
  - Show Notebook.
- Later allow custom help links.

## Interface Plan

The current Home should become a widget grid:

- Keep the hero and metrics at the top.
- Below that, render widgets from `dashboard_widget_layout`.
- Widgets should support `compact`, `normal` and `wide` sizes.
- Phase 7 MVP can reorder widgets through a simple settings panel rather than drag and drop.
- Drag/resize can wait until Board/Moodboard interaction patterns are chosen.

## Backend Notes

- No new API required if `ui_preferences` is enough.
- Continue using `PATCH /workspaces/{slug}` to persist widget preferences.
- Validate defaults on the frontend so old workspaces keep working.
- Backup/export/import already include workspace preferences.

## Frontend Tasks

1. Add dashboard preference helpers in `WorkspaceHomePane`.
2. Add default widget layout fallback.
3. Refactor Home panels into widget components.
4. Add Tasks / Corkboard widget backed by `dashboard_tasks`.
5. Add Goals / Progress widget backed by `dashboard_goals`.
6. Add Asset Reminders widget derived from asset health.
7. Add Help Shortcuts widget.
8. Add lightweight widget settings controls for enable/disable and size.
9. Persist layout and widget content through `onUpdatePreferences`.
10. Add tests for task/goal preference updates if practical with current test harness.

## Acceptance Criteria

- Home remains usable on desktop and mobile.
- Dashboard widgets survive reload through workspace preferences.
- Quick notes still save to Notebook.
- Tasks and goals are local-first and included in workspace export/import.
- No widget introduces cloud, account or collaboration assumptions.
- Existing tests and build remain green.

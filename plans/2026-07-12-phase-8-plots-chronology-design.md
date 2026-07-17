# Phase 8 Plots / Chronology Design

Status: Implemented.

## Goal

Add a dedicated Plots / Chronology workspace for story planning, event sequencing and timeline thinking without forcing plot events into generic Wiki cards.

The module should support ForgeTales-inspired separation between lore databases and chronology work while keeping Personal Codex Builder local-first and single-user.

## MVP Scope

Phase 8 should implement the event foundation first:

- plot events as workspace-local entities;
- event title, description, color, status and optional date fields;
- links from events to Characters, Locations, Wiki cards and future factions;
- event-to-event links for sequence, dependency or loose relation;
- canvas layout data stored separately from semantic event data;
- dedicated Plots / Chronology navigation entry;
- list/table mode first, simple canvas mode after the data model exists.

Standard Calendar mode is implemented on top of `event_date`. Custom world-calendar rules remain a Later roadmap item.

## Delivered Implementation

- Backend tables and APIs for plot events, linked cards, event links and per-view layout data.
- Frontend Plots workspace with Canvas, List and Calendar modes.
- Canvas interactions: double-click create, drag layout, visual event links, zoom, scroll-pan, multi-select, duplicate and delete selected.
- Local-first compatibility: existing workspace databases auto-ensure the new plot tables when opened.

## Data Model

Recommended SQLite tables:

```sql
plot_events (
  id integer primary key,
  uid text unique not null,
  title text not null,
  description text not null default '',
  color text not null default '#4ba8d6',
  status text not null default 'draft',
  event_date text,
  sort_order real not null default 0,
  created_at text not null,
  updated_at text not null
)
```

```sql
plot_event_card_links (
  id integer primary key,
  event_id integer not null references plot_events(id) on delete cascade,
  card_id integer not null references cards(id) on delete cascade,
  role text not null default 'related',
  created_at text not null,
  unique(event_id, card_id, role)
)
```

```sql
plot_event_links (
  id integer primary key,
  source_event_id integer not null references plot_events(id) on delete cascade,
  target_event_id integer not null references plot_events(id) on delete cascade,
  relation_type text not null default 'sequence',
  note text not null default '',
  created_at text not null,
  updated_at text not null,
  unique(source_event_id, target_event_id, relation_type)
)
```

```sql
plot_event_layouts (
  id integer primary key,
  event_id integer not null references plot_events(id) on delete cascade,
  view_id text not null default 'default',
  x real not null default 0,
  y real not null default 0,
  width real not null default 260,
  height real not null default 160,
  created_at text not null,
  updated_at text not null,
  unique(event_id, view_id)
)
```

## API Plan

Use workspace-scoped routes:

- `GET /api/workspaces/{slug}/plot-events`
- `POST /api/workspaces/{slug}/plot-events`
- `GET /api/workspaces/{slug}/plot-events/{event_id}`
- `PATCH /api/workspaces/{slug}/plot-events/{event_id}`
- `DELETE /api/workspaces/{slug}/plot-events/{event_id}`
- `POST /api/workspaces/{slug}/plot-events/{event_id}/card-links`
- `DELETE /api/workspaces/{slug}/plot-events/card-links/{link_id}`
- `POST /api/workspaces/{slug}/plot-events/{event_id}/event-links`
- `DELETE /api/workspaces/{slug}/plot-events/event-links/{link_id}`
- `PATCH /api/workspaces/{slug}/plot-events/{event_id}/layout`

## Frontend Plan

Add `plots` to the workspace screen union and navigation.

Create `frontend/src/features/plots/PlotsPane.tsx`:

- header with create event action;
- filters for status and linked card type;
- event list with color, title, description, date and linked-card pills;
- detail editor for selected event;
- linked card controls using current card list;
- event link controls;
- simple canvas preview using absolute-positioned event cards after layout API exists.

MVP can use list/detail layout first. Canvas interaction can follow in the same phase only after event CRUD is stable.

## Calendar Notes

Calendar mode should not be implemented in the first plot-event pass.

Later calendar mode should:

- support normal date mode first;
- sync with event data;
- avoid custom calendars until event CRUD, canvas and import/export are stable.

## Export / Backup

Workspace backup/export should include the new tables automatically when exporting the SQLite workspace.

Workspace data export should later add plot-event export, but it is not required for the first event foundation.

## Acceptance Criteria

- User can create, edit, list and delete plot events inside a workspace.
- Events can link to existing Wiki, Character and Location cards.
- Event-to-event links can represent sequence/dependency.
- Layout data is separate from semantic event links.
- Existing cards/card types are not required to represent plot events.
- Existing tests/build remain green.

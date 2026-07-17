# NRI Product Vision Alignment

Date: 2026-07-16

## Purpose

This plan aligns Personal Codex Builder with the current Notion product vision. The app should evolve from a generic local creative database into an offline workspace for tabletop RPG game masters, RPG creators, writers, and worldbuilding authors.

Notion is the active source of truth:

- Main hub: https://app.notion.com/p/39d2e0c1694780d2b461f1af04f85464
- Positioning: two modes, public `Prep` and `Play` (`CRUD` remains an internal technical description)
- Reference list: Alkemion, LegendKeeper, ForgeTales, Campfire, VVD, World Anvil, Alchemy RPG, Notion-style rich text
- Modular architecture: Workspace/World, Chapter/Scene, Entity, Boards, Maps, Calendar/Timeline, Asset Library, Relations, Local-first

## Current Repo Direction To Replace

Older roadmap language described Personal Codex Builder as a local-first creative database for notes, atlases, codices, and structured data. That foundation is still technically useful, but the product direction is now narrower and deeper:

- TTRPG/worldbuilding is core, not optional.
- There are two primary modes: `Prep` and `Play`.
- `Review` is not a product mode.
- Campaign/TTRPG mode is not a late add-on; Chapter/Scene preparation and Play Mode are central.

## Mapping To Current Architecture

Keep:

- FastAPI backend;
- SQLite workspace databases;
- React/Vite frontend;
- WorkspaceManager and local app index;
- Card/Card Type compatibility layer;
- Asset Library;
- Relations;
- Notebook;
- Boards, Plots, Character Graph work already started;
- backup, restore, import/export, archive, health, portability flows.

Reframe:

- Workspace becomes public `World` / `Workspace`.
- Card becomes public `Entity`.
- Card Type becomes public `Entity Type`.
- Campaign/TTRPG prototype becomes legacy groundwork for `Chapter` / `Scene`.
- Atlas/Wiki becomes the canonical encyclopedia surface.

Do not port:

- Electron architecture from `НРИ стол`;
- AppBridge/IPC;
- better-sqlite3;
- prototype build tools;
- prototype runtime data.

## Data Defaults

New workspaces should get product-facing defaults without a destructive migration:

```json
{
  "product_mode_labels": {
    "crud": "Prep",
    "play": "Play"
  },
  "workspace_display_name": "World",
  "chapter_display_name": "Chapter",
  "home_layout_preset": "worldbuilder"
}
```

Existing workspaces should receive these defaults by API summary merging, not by rewriting stored preferences unless the user saves settings.

Seed card/entity types should cover the Notion baseline:

- character;
- npc;
- creature;
- location;
- organization;
- item;
- lore;
- magic;
- note.

## Product Decisions

- `Prep` mode owns preparation, post-session cleanup, canon updates, wiki, characters, locations, maps, boards, timelines, assets, relations, chapters, and scenes.
- `Play` mode owns running the current scene.
- GM/player visibility is scoped to Play Mode scene materials.
- Chapter does not own entity content. It gathers references.
- Scene is the Play Mode unit inside a Chapter.
- Visual modules are views over canonical Entities, not separate content silos.
- Asset Library is the single local file source for covers, portraits, maps, backgrounds, handouts, audio, documents, and board materials.

## Follow-Up Plans

- `2026-07-16-modular-prototype-roadmap.md`: one complete modular prototype roadmap.
- Follow-up implementation plans should refine individual modules without splitting the product into MVP/beta/later versions.

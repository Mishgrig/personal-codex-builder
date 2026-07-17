# Personal Codex Builder Master Product Roadmap

Last aligned: 2026-07-16

## Product Direction

Personal Codex Builder is a local-first worldbuilding and tabletop RPG workspace for game masters, RPG creators, writers, and worldbuilding authors. The product is not a generic database builder. It is a private offline desk where a user creates a world, maintains canonical knowledge, prepares playable chapters and scenes, and runs those scenes locally.

Notion is the active source of truth:

- https://app.notion.com/p/39d2e0c1694780d2b461f1af04f85464

The target is one complete modular prototype, not separate MVP/beta/later product versions. Every primary Notion module should exist in the prototype as a working, stable slice that can be improved independently.

## Product Model

- Public hierarchy: `World -> Chapter -> Scene`.
- Public modes: `Prep` and `Play`.
- Internal compatibility: `Workspace`, `Card`, `Card Type`, and legacy `Campaign` may remain in code until focused migrations are safe.
- `World`: one portable local workspace/database.
- `Entity`: one canonical object of world knowledge, currently backed by the `Card` model.
- `Entity Type`: configurable structure for entities, currently backed by Card Type/Card Schema foundations.
- `Chapter`: playable preparation container inside a World. It gathers references but does not own entities.
- `Scene`: playable unit inside a Chapter. It opens in Play Mode.
- `Play`: local GM screen plus local player preview. No accounts, networked multiplayer, cloud runtime, or full VTT.

## Modular Architecture Rule

The application is built as shared core plus independent modules:

- Shared core owns Worlds, Entities, Entity Types, Assets, Relations, Search, Notebook, Backup/Restore, Import/Export, Health, and portability.
- Each module owns only its own settings, layouts, prep/runtime state, and links.
- Canonical content lives once in Entity, Asset, and Relation layers.
- Boards, maps, timelines, chapters, scenes, graphs, and play screens store references or visual placements, not cloned entity content.
- A module can be redesigned without rewriting the rest of the app if it preserves stable ids such as `entity_id`, `asset_id`, `chapter_id`, `scene_id`, `board_id`, `map_id`, and `event_id`.

## Prototype Roadmap

### 1. Product And Terminology Alignment

- Use `World` in public UI where it improves clarity; keep `Workspace` as the technical term.
- Use `Entity` in architecture/API planning; do not destructively rename existing `Card` tables.
- Replace public `Campaign` navigation with `Chapters`.
- Do not show `CRUD` as a product mode; use `Prep`.
- Keep `Campaign` and `campaign_mode` only as legacy/compatibility source.

### 2. Shared Core

- Preserve FastAPI, SQLite, per-workspace local databases, React/Vite, app index, backup/restore, import/export, and health checks.
- Preserve current `cards`, `card_type_definitions`, assets, relations, boards, plots, character graph layouts, workspace settings, and notebook data.
- Seed baseline entity types: character, npc, creature, location, organization, item, lore, magic, deity, note.
- Asset Library must show where files are used across cards, chapters, scenes, tokens, maps, boards, and attachments.

### 3. World Shell

- Home becomes the main World entrance: cover, description, chapter shelf, latest materials, pinned entities, quick notes, recent assets, relation preview, and backup status.
- Global Library presents local Worlds as a project shelf.
- Settings keeps locality, portability, backup, export/import, themes, density, and layout preferences.

### 4. Entity Modules

- Wiki, Characters, and Locations are specialized views over the same canonical Entity database.
- Entity Type Studio continues on the current Card Type/Card Schema foundation.
- Subtype is the second classification level for every entity type, but can stay empty.
- Shared search, tags/categories, relations, sources, attachments, gallery, and rich text are available across entity modules.

### 5. Chapter / Scene Module

- Chapter stores title, description, cover, status, notes, linked entities, linked assets, linked boards, linked maps, linked timeline events, and dice shortcuts.
- Scene stores background/map, GM notes, player notes, quick notes, linked materials, tokens, map notes, dice shortcuts, audio/visual materials, and Play visibility.
- Chapter/Scene never clone entity content.
- GM/player visibility exists only inside scene/play materials.

### 6. Visual Modules

- Boards, Moodboards, and Plot Boards share canvas behavior: pan/zoom, drag, resize, duplicate, connect, layers/z-order, groups/frames where useful, and open linked entity/asset.
- Maps are image-backed views with pins, notes, entity links, categories/layers, zoom, and pan.
- Timeline and Calendar share events and can link to Entities, Chapters, and Scenes.
- Character/Relationship Graph is a visual layout over semantic Relations.

### 7. Play Mode

- Scene runner follows the Alchemy-style scene-first model: large background/map, minimal chrome, participants/tokens, quick wiki access, GM notes, player preview, quick notes, dice shortcuts, and local audio/visual material.
- Player preview shows only player-facing scene materials, handouts, visible notes, and visible tokens.
- Runtime rolls/current toggles are local runtime state; quick notes can be saved back into the scene and later copied into canonical Prep materials.

## Do Not Do

- Do not port Electron, AppBridge, or `better-sqlite3` from `НРИ стол`.
- Do not replace the FastAPI/SQLite/local workspace foundation.
- Do not delete or rewrite existing Card/Card Type/Relation/Asset data.
- Do not add cloud, mandatory accounts, telemetry, hosted databases, or networked multiplayer.
- Do not reintroduce a third `Review` mode.
- Do not add global player visibility to all entities or relations.
- Do not build full VTT features first: no dynamic lighting, fog of war, distance measurement, or grid-first tactical runtime.

## Validation Standard

Frontend:

- `cd personal-codex-builder/frontend && npm --cache .npm-cache run build`
- `cd personal-codex-builder/frontend && npm --cache .npm-cache test -- --run`

Backend:

- `cd personal-codex-builder && ./.venv/bin/ruff check backend`
- `cd personal-codex-builder && PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q`

Prototype acceptance scenario:

```text
create World
-> create Entity types and entities: Character, NPC, Location, Item, Lore
-> upload Assets and see usage
-> create Relations
-> create Board/Moodboard, Map with pins, Timeline/Calendar event
-> create Chapter and Scene
-> link Entities, Assets, Map, Board and Event to Chapter/Scene
-> open Scene in Play Mode
-> verify GM screen, player preview, tokens/map notes, dice formula, music/audio asset and quick notes
-> return to Prep and update canonical Entities
-> backup, export, restore and confirm module links survived
```

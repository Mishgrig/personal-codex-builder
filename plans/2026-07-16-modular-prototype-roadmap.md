# Modular Prototype Roadmap

Date: 2026-07-16

## Purpose

This roadmap turns the Notion vision into one complete modular prototype. The goal is not to ship a small MVP first, but to build a stable local prototype where every primary product module exists, works through shared contracts, and can be improved independently.

## Architecture Contract

- Shared core: Worlds, Entities, Entity Types, Assets, Relations, Search, Notebook, Backup/Restore, Import/Export, Health.
- Modules: Home/World, Wiki, Characters, Locations, Chapters/Scenes, Boards/Moodboards/Plot Boards, Maps, Timeline/Calendar, Relationship Graph, Play Mode, Settings.
- Modules do not own canonical content. They store module state, layouts, runtime/prep notes, visibility, and references.
- Cross-module references use stable ids: `entity_id`, `asset_id`, `chapter_id`, `scene_id`, `board_id`, `map_id`, `event_id`.
- Legacy `Card`/`Workspace` code remains until a safe cleanup plan exists.

## Build Order

1. Align docs, terminology, navigation, and defaults around `World`, `Entity`, `Prep`, `Chapter`, `Scene`, and `Play`.
2. Add persisted Chapter/Scene backend models, APIs, tests, and backup/export compatibility through the workspace database.
3. Replace the old Campaign screen with a Chapters module that manages chapters, scenes, linked materials, tokens, quick notes, and dice shortcuts.
4. Connect Asset Library usage to Chapter/Scene covers, backgrounds, maps, and tokens.
5. Strengthen Home as the World entrance with a direct Chapters path and module shortcuts.
6. Continue splitting visual modules around shared canvas behavior while keeping semantic relations separate from visual edges.
7. Add Maps and Calendar/Timeline refinements as independent modules over the same reference model.
8. Mature Play Mode with local GM screen and player preview, while keeping full VTT/network features out.

## Prototype Completion Criteria

- A user can create a World and use it offline.
- A user can create and edit canonical Entities and Entity Types.
- A user can upload Assets and see where each file is used.
- A user can relate Entities and see those relations in entity modules and graph-style views.
- A user can create visual Boards/Moodboards/Plot Boards and link them to Entities/Assets.
- A user can create Timeline/Calendar events and link them to Entities/Chapters/Scenes.
- A user can create Chapters and Scenes that gather existing materials without copying content.
- A user can run a Scene in Play Mode with GM-only and player-facing materials.
- Backup, export, restore, and health checks preserve the full local workspace.

## Implementation Guardrails

- Do not use Notion references to add unrelated features.
- Do not make `Campaign` the main product model again.
- Do not store global player visibility on every Entity or Relation.
- Do not introduce cloud, accounts, telemetry, hosted storage, or networked multiplayer.
- Do not make a plugin runtime before the built-in modules are stable.

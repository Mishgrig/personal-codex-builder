# ForgeTales Reference Audit for Personal Codex Builder

Source basis: official ForgeTales pages for getting started, worldbuilding and roadmap, the user-provided full Help text, and local screenshots stored under `docs/research/forgetales-audit/screenshots/`. Screenshots are treated as local research evidence only and should not be published without explicit approval.

Public references:

- [Getting started](https://www.forgetalesstudio.com/ru/archives/getting_started)
- [Worldbuilding](https://www.forgetalesstudio.com/ru/archives/worldbuilding)
- [Roadmap](https://www.forgetalesstudio.com/ru/roadmap)

## 1. Executive Summary

ForgeTales is useful as a reference because it treats worldbuilding as a set of connected creative workspaces rather than a generic note database. Its strongest ideas are not isolated features, but the product shape: a local/offline desktop workspace, project-level identity, separate rooms for different creative tasks, visual canvases, structured templates, entity relationships, and a calm interface that makes a large world feel manageable.

For Personal Codex Builder, the right adaptation is to keep the existing local-first SQLite foundation and evolve the app from a generic atlas/table editor into a project workspace for worldbuilding, lore archives, personal knowledge bases and creative databases. The app should borrow ForgeTales' information architecture patterns, not its branding, copy, terracotta palette, exact typography or proprietary visual identity.

The highest-value near-term move is to rename Atlas to Wiki at the UX level, add dedicated entry points for Characters and Locations, improve the project dashboard/home screen, and make relations/search/templates feel like the backbone of the app. More visual features such as plot canvas, moodboard, family trees and advanced calendars should be phased in after the core card model feels stable and pleasant.

## 2. Product Positioning Lessons

ForgeTales positions itself around a clear emotional promise: a private creative home for writers and game masters that works locally and does not require a subscription. This is directly aligned with Personal Codex Builder's local-first single-user direction.

Lessons worth adapting:

- Lead with privacy and ownership: local databases, local files, no runtime dependency on GitHub or online services.
- Present the product as a creative operating room, not just a CRUD database.
- Make offline/local-first feel like a benefit, not a technical limitation.
- Emphasize continuity: a user can leave a world for months and return without losing context.
- Avoid over-indexing on fantasy or TTRPG only; PCB should also support lore archives, personal knowledge bases and structured creative databases.

Do not copy:

- ForgeTales' exact brand voice, mascot-like forge metaphors, copy, theme or visual identity.
- Its commercial restrictions or plan-based feature framing.
- Its specific warm terracotta color system unless the user explicitly wants a warm theme later.

## 3. Information Architecture Lessons

ForgeTales separates creative modes while keeping them connected through shared entities. The main pattern is: dashboard/library first, then project workspace, then module-specific rooms.

Important IA patterns:

- Project dashboard/library with two mental models: visual bookshelf and practical cards.
- Project home/overview with cover, genre/category, description and pinned world cards.
- Bottom project navigation for core modules: home, characters, moodboard, plots, wiki.
- Global side rail for app-level navigation: search, dashboard, archives, settings, profile, support, feedback and projects.
- Search and command palette as global acceleration, especially via keyboard.
- Entity types remain connected: characters, wiki cards, plot events, files, sources and visual board items can reference each other.

For PCB, this suggests a two-level IA:

- App-level: workspace/database library, global search, settings, backups/import/export, profile/local preferences.
- Workspace-level: Home, Wiki, Characters, Locations, Plots/Chronology, Notebook, Board/Moodboard, Asset Library.

## 4. UX and Interface Patterns Worth Adapting

The strongest UX pattern is "separate spaces, shared memory." Users can focus on a task without losing the networked world model.

Patterns to adapt:

- Empty states that offer creation choices rather than dead blank pages.
- Templates/card types shown at creation time, including blank and structured options.
- Search, filter, sort, folder/group and view-mode controls in list screens.
- Detail pages with a large title, metadata fields, cover image, table of contents, sections and add-block actions.
- Rich content blocks: text, quote, image, PDF/file, table, custom attributes.
- Inline mentions using `@` to connect cards, with previews and click-through navigation.
- Visual graphs where layout data is separate from semantic relations.
- Canvas interactions: double-click to create, drag to move, resize handles, multi-select, context menus, copy/paste, duplicate, bring forward/back, delete.
- Export options for visual workspaces, ideally as PNG/JPG/PDF later.
- User-controlled interface density: image-focused cards versus classic information-dense cards.
- Keyboard shortcuts and command palette as power-user features.

For PCB visual direction:

- Use cold colors by default: slate, blue-gray, steel, muted cyan, soft ink.
- Keep the interface practical and calm, not ornamental.
- Use subtle texture, glassy panels, soft depth and clear hierarchy rather than copying ForgeTales' warm parchment style.
- Make theme settings workspace-aware later, with accent color and typography options saved in backups.

## 5. Feature Mapping to Personal Codex Builder

| ForgeTales idea | Why it is useful | PCB adaptation | Frontend implications | Backend/database implications | Priority |
| --- | --- | --- | --- | --- | --- |
| Project library with bookshelf/cards | Makes many worlds feel tangible and recoverable | Workspace/database management with visual and compact modes | Workspace cards, reorder, cover preview, health status | Workspace index metadata, cover asset references, order field | Next |
| Project home/Forge overview | Gives immediate context when entering a project | Home screen with project meta, pinned cards, recent activity, quick note and relation summary | New dashboard widgets and pinned-card area | Widget layout table, pinned entity references, activity query | MVP/Next |
| Wiki module | Central knowledge base | Rename Atlas to Wiki in UX while preserving current card model | Rename labels/nav, improve templates and card list | No immediate schema change | MVP |
| Characters module | Characters deserve a focused workspace | Dedicated Characters entry point backed by character card type | Character list, role filters, character detail presets | Seeded card type, role/timeline fields | MVP/Next |
| Locations module | Places are core for worldbuilding and chronology | Dedicated Locations entry point backed by location card type | Location list, climate/map/cover fields, relation summaries | Seeded card type, location-specific fields | MVP |
| Relationship graph | Makes social structure visible | Character graph with tabs and saved layouts later | Canvas graph view, edge editor | Relations plus graph layout records | Next |
| Character groups/folders | Keeps large casts readable | Groups/folders for character and wiki card collections | Folder cards, drag-to-group, group themes later | Group table or card collection metadata | Next |
| Plot canvas | Helps structure non-linear story events | Plots/Chronology canvas mode | Event cards, visual edges, zoom/pan, double-click create | Event entities, event links, canvas layout | Next |
| Calendar | Makes events concrete in time | Calendar/timeline mode after plot events exist | Month/week views, event drag/drop | Calendar settings, event date ranges, recurrence later | Later |
| Moodboard | Supports tone and non-textual thinking | Board/Moodboard spatial canvas | Nodes for text/image/file/color/card/link, right toolbar | Board, board item, board edge tables | Next/Later |
| Asset/files | Creative projects need local media | Asset Library as shared local file backbone | Asset browser, duplicate notices, linked usage | Asset IDs, content hash, renamed files, link table | MVP/Next |
| Dashboard widgets | Turns home into a personal cockpit | Quick note, tasks/corkboard, recent activity, mention graph | Widget grid, resize/reorder, saved layout | Widget layout/content tables | Next |
| Project-to-project sharing | Useful for sagas and shared canon | Linked canonical entity vs snapshot copy | Share modal, provenance banners | Cross-workspace IDs, provenance, sync/conflict rules | Later |
| User-managed cloud sync | Preserves local-first ownership | Optional sync folder support, not vendor server sync | Sync status button, conflict dialog | Export bundle or sync manifest, conflict metadata | Later |
| Themes and typography | Lets each project feel personal | Cold default theme plus workspace accent and font options | Theme editor, CSS variables, font upload later | Theme settings and local font assets | Next/Later |
| Campaign/TTRPG mode | Valuable but more niche | Optional future mode, not core app identity | Campaign panel, quests, NPCs, sessions, dice | Campaign-specific tables | Later |

## 6. Proposed Updated App Structure

Recommended workspace navigation:

1. Home
2. Wiki
3. Characters
4. Locations
5. Plots / Chronology
6. Notebook
7. Board / Moodboard
8. Assets
9. Workspace Settings

Recommended app-level navigation:

- Workspace Library
- Global Search / Command Palette
- Backups, Import and Export
- App Settings
- Local Profile / Goals
- Help / Keyboard Shortcuts

Home should become the user's project cockpit:

- Project cover, name, description, category and local path/health summary.
- Pinned cards from Wiki, Characters and Locations.
- Recent activity across cards, assets and notebook.
- Quick note and task/corkboard widget.
- Lightweight mention/relation summary.

Wiki should be the broad knowledge base:

- Card types such as lore, culture, factions, ecology, items, history, families and custom types.
- Structured templates with editable sections and custom fields.
- Import/export through Markdown-oriented flows.

Characters and Locations should be focused rooms:

- Characters: roles, groups, relationships, biography, traits, timeline and linked assets.
- Locations: region, climate, government/leader, population, economy, danger level, connected events, linked assets and sources.

Plots / Chronology should remain separate from generic cards:

- Canvas mode for event structure and dependencies.
- Calendar/timeline mode for ordering and dates.
- Events should link to characters, locations, factions and wiki cards.

Notebook should be always available:

- Persistent side panel per workspace.
- Temporary holding area for text, images, files and fragments before they become structured cards.

Board / Moodboard should be future spatial memory:

- Freeform layout for images, quotes, colors, files, links and cards.
- Visual edges between board items.
- Export later, after the core canvas is stable.

## 7. Data Model Implications

Current PCB direction already fits the most important ForgeTales lesson: business data should live in local workspace databases, and app-level metadata should stay separate.

Recommended principles:

- Keep `cards`, `card_types`, `fields`, `tags`, `relations`, `sources` and `assets` as the shared knowledge core.
- Treat Characters and Locations as first-class UX workspaces backed by card types, not as fully separate incompatible models.
- Store visual layout separately from semantic data. A relationship can exist once but appear differently on a character graph, moodboard, family tree or mention graph.
- Store dashboard widget layout separately from widget content. This makes backups, reset and customization safer.
- Store board items as typed nodes: text, image, file, color, quote, table, linked card, linked asset and link.
- Store board edges independently from card relations because visual meaning may be informal.
- Store plot events separately enough to support dates, duration, recurrence, involved entities and canvas layout.
- Keep asset metadata centralized: original name, stored name, hash, MIME type, size, created time and usage links.
- Delay cross-workspace linked/snapshot sharing until provenance, conflict handling and backup behavior are designed.

Potential future tables/entities:

- `dashboard_widgets`
- `dashboard_widget_layouts`
- `workspace_theme_settings`
- `entity_collections` or `groups`
- `graph_views`
- `graph_nodes`
- `graph_edges`
- `plot_events`
- `plot_event_links`
- `calendar_settings`
- `boards`
- `board_items`
- `board_edges`
- `cross_workspace_links`

## 8. Frontend Implementation Notes

Near-term frontend work should prioritize navigation clarity and the feeling of separate creative rooms.

Recommended frontend changes:

- Rename visible Atlas labels to Wiki while keeping internal paths/types compatible until a safe refactor.
- Add module entry points for Characters and Locations that reuse existing card list/detail infrastructure with filtered card types.
- Add a Home screen with project meta, pinned cards, recent activity and notebook/task widgets.
- Use one shared card detail architecture for Wiki, Characters and Locations, with type-specific templates and section presets.
- Add cold theme variables in `global.css`: background, surface, text, muted text, border, accent, accent-soft, danger, success.
- Prefer lucide-style line icons and restrained depth.
- Build canvas features as separate route-level modules, not as complex additions inside the detail pane.
- Add keyboard shortcuts progressively: global search first, then save, focus mode and module switching.
- Avoid dense feature panels until the user has enough content; empty states should guide creation.

Interaction defaults:

- Double-click empty canvas to create when in canvas views.
- `@` mention opens a cross-card picker.
- Save should be explicit for larger detail pages, but quick notes can autosave.
- Import/export flows should clearly say what remains local and what leaves the workspace.

## 9. Backend Implementation Notes

Backend work should preserve the local-first architecture and avoid introducing online dependencies.

Recommended backend changes:

- Seed or expose default card types for Wiki, Characters and Locations.
- Add a UX-level alias from Atlas to Wiki without forcing immediate database migration.
- Add APIs for pinned cards and recent activity if not already available.
- Add collection/group support for Characters and later Wiki/Locations.
- Add asset usage tracking so files can be linked from cards, board items and sources.
- Add board/canvas storage only after the frontend interaction model is clear.
- Add event/chronology storage before calendar complexity.
- Keep migrations additive and safe for existing local workspaces.
- Keep backup/export behavior explicit and predictable for every new table.

For future cloud-folder sync:

- Treat it as user-managed file synchronization, not a hosted service.
- Sync a portable bundle/manifest and asset folder.
- Surface conflicts clearly; do not silently merge complex local databases.

## 10. MVP / Next / Later Roadmap

### MVP

- Rename Atlas to Wiki in navigation and public-facing UI.
- Add dedicated Characters and Locations workspaces using existing card infrastructure.
- Add or refine default card templates for Wiki, Characters and Locations.
- Improve Home as workspace overview with project metadata and quick links.
- Strengthen search, filters, tags, relations, sources and assets as the core connective tissue.
- Keep Notebook as persistent side panel and quick capture buffer.
- Update import/export language so users understand what stays local.

### Next

- Add project dashboard widgets: quick note, tasks/corkboard, recent activity and pinned cards.
- Add character groups/folders.
- Add character relationship graph with saved layouts.
- Add basic Plots / Chronology canvas with event cards and visual links.
- Add basic Board / Moodboard canvas with text, image, file, color, quote and linked-card nodes.
- Add command palette and keyboard shortcuts.
- Add workspace theme accent and density settings.

### Later

- Add custom calendar with months, weekdays, moons, climate and event duration.
- Add family trees for family-type Wiki cards using characters as members.
- Add advanced moodboard drawing, export and edge styling.
- Add project-to-project sharing with linked canonical entities and snapshot copies.
- Add optional user-managed cloud-folder sync.
- Add campaign/TTRPG mode with quests, NPCs, session chronicle, handouts, initiative and dice.
- Add custom typography sets and full per-workspace visual themes.

## 11. Risks and What Not to Copy

Risks:

- Copying too much visual style would make PCB feel derivative and less aligned with the user's preferred colder palette.
- Adding canvases too early could destabilize the app before the card/workspace core is polished.
- Project-to-project linked sharing is deceptively complex because it touches provenance, backups, sync and conflict behavior.
- Calendar customization can become a large feature; it should wait until plot events are useful on their own.
- Campaign/TTRPG mode may narrow the product identity if introduced too early.
- Publishing local screenshots in a public repo could expose third-party UI reference material unnecessarily.

What not to copy:

- ForgeTales branding, exact text, warm terracotta identity, logo, illustration style or paid-plan framing.
- Exact feature gating or founder-only language.
- Any proprietary tutorial wording.
- Overly fantasy-specific assumptions in the core product.

What to adapt instead:

- The mental model of a private creative workspace.
- The separation between rooms/modules.
- The connection model across cards, files, events and visual spaces.
- The calm onboarding pattern that teaches features in context.
- The idea that visual workspaces and structured databases should reinforce each other.

## 12. Concrete Development Tasks

1. Rename visible `Atlas` UI labels to `Wiki`, while preserving current internal compatibility.
2. Add a `Wiki` navigation item and keep old Atlas route redirects or aliases if needed.
3. Create dedicated `Characters` workspace view filtered to the character card type.
4. Create dedicated `Locations` workspace view filtered to the location card type.
5. Seed default card types/templates for Wiki, Character and Location examples.
6. Add a workspace Home screen with project metadata, quick links and pinned cards.
7. Add pinned-card storage and UI for cards from Wiki, Characters and Locations.
8. Add recent activity query and widget for recently edited cards/assets.
9. Expand Notebook into a persistent quick-capture side panel with text and asset references.
10. Add character groups/folders with drag-to-group later after the character workspace exists.
11. Add relation graph storage where semantic relation data is separate from visual layout.
12. Build a first character relationship graph view with nodes, edges, saved layout and export deferred.
13. Add `plot_events` and `plot_event_links` backend structures before building calendar UI.
14. Build a Plots canvas with event cards, double-click create, drag, connect and zoom/pan.
15. Add calendar mode only after plot canvas events are usable.
16. Add `boards`, `board_items` and `board_edges` storage for the Board/Moodboard module.
17. Build a basic Board/Moodboard canvas with text, image, file, color and linked-card nodes.
18. Add Asset Library usage tracking so every asset can show where it is referenced.
19. Add `@` mention picker across rich text fields and card descriptions.
20. Add hover previews for mentioned cards.
21. Add command palette with search, create card, switch workspace and open settings actions.
22. Add keyboard shortcuts for save, global search, module switching and focus mode.
23. Add workspace theme settings for accent color and density.
24. Add full custom themes and typography only after the base design system is stable.
25. Design cross-workspace linked/snapshot sharing as a separate technical plan before implementation.
26. Design optional cloud-folder sync as a separate technical plan before implementation.
27. Keep campaign/TTRPG mode out of MVP unless product positioning changes.
28. Keep screenshots ignored in Git and cite only public ForgeTales pages in public documentation.

# Phase 0 UX Stabilization Audit

Status: Done

This audit closes Phase 0 from `2026-07-09-master-product-roadmap.md`. The phase goal was to stabilize the current interface before larger ForgeTales-inspired modules were added.

## Completed Checklist

- [x] Responsive text tokens and rem-based spacing are defined through global CSS variables and `clamp()` rules.
- [x] Shared z-index/layer variables exist for menus, overlays, popovers, dialogs and tooltips.
- [x] Workspace selection is handled through a dropdown with `Manage databases` as the final action.
- [x] Database creation, rename, duplicate, delete, reorder, archive, import, export, backup, health and portability checks are consolidated in Manage Databases.
- [x] The old top-right workspace action cluster and active-card counter are removed from the top workspace control area.
- [x] Workspace operation labels use explicit user-facing language such as `Export workspace`.
- [x] The database logo picker is not exposed in Manage Databases.
- [x] Search includes a clear action and highlights matches in cards/detail content.
- [x] Category filters include category management, including labels, option names, slugs and ordering.
- [x] Atlas/Wiki results include total/shown counts, view controls, sort controls, card actions and persisted detail placement.
- [x] Card detail includes save state, created/updated metadata, editable title styling, compact cover display, full-size cover preview, card type naming, metadata controls, tag pills, quick category management and collapsible content sections.
- [x] Rich text editor labels use English names, font size uses `- / dropdown / +`, common sizes 8-16 are available, text color uses `A`, highlight uses a marker icon, palettes include black/white/bright colors, custom color pickers are available and Clear format resets custom marks/color/font size.
- [x] Rich text toolbar is hidden until the editor is focused, matching the Phase 0 editing-mode requirement.
- [x] Notebook is a persistent left workspace with hide/reveal, resizing, rich-text notes, plain text, tables, images, files, links, asset references and card references.
- [x] Notebook content is preserved when hidden or shown and can be used as a visual buffer before moving material into structured cards.

## Notes

- Historical `uploadWorkspaceLogo` API support still exists for compatibility, but the public database-logo picker is not exposed in the current Manage Databases UI.
- Tooltip coverage is implemented broadly through native `title` attributes on action buttons and icon buttons. Future visual QA can replace native browser tooltips with a custom tooltip component if the app needs richer styling.
- The Phase 0 work is UX stabilization only; it does not change the backend data model beyond features already delivered in later phases.

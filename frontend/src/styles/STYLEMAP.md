# Frontend Style Map

This folder is split so small UI fixes usually touch one feature CSS file instead of one large global stylesheet.

## Where To Edit

- `tokens.css`: CSS variables, text scale, typography presets, z-index layers.
- `base.css`: reset, body defaults, headings, links, disabled controls.
- `primitives.css`: shared buttons, inputs, selects, popovers, segmented controls, badges, empty states.
- `shell.css`: app shell, topbar foundations, global layout surfaces.
- `modules/home.css`: world home, page anchor variants, dashboard widgets, tasks, quick note widget, pinned cards.
- `modules/notebook.css`: notebook rail, note list, note editor, note attachments, notebook divider/reveal.
- `modules/detail.css`: entity detail pane, entity metadata, cover area, rich body, sources, relations, gallery/attachments.
- `modules/workspace-manager.css`: manage worlds, workspace lifecycle, health, backup, import/export, portability.
- `modules/visual-workspaces.css`: boards, plots, chapters/play surfaces, character graph, table/canvas-like workspaces.
- `responsive.css`: viewport-level media queries.
- `overrides.css`: compatibility and repair overrides that must keep their late-cascade position.

## Rules

- Add new feature styles to the closest module file, not `overrides.css`.
- Use `overrides.css` only when a rule must intentionally win late in the cascade; add a short comment explaining why.
- Keep class names stable during visual repair passes unless the component is being refactored in the same task.
- Prefer shared primitives for repeated controls before adding one-off button/input styles.
- When moving rules between files, preserve cascade order or verify the affected screens visually.

## Fast Search Hints

- Home widgets or task layout: search in `modules/home.css`.
- Notebook button, attachment, drag, or reveal issues: search in `modules/notebook.css`.
- Entity editor clipping, cover, relations, sources: search in `modules/detail.css`.
- Left rail, world switcher, page anchor geometry: search `shell.css` first, then `overrides.css`.
- Z-index, filter popovers, modal stacking: search `primitives.css` first, then `overrides.css`.

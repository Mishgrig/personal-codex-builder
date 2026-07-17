# Superseded: Product Shell And Prep / Play Alignment

Date: 2026-07-16

This plan has been superseded by:

- `plans/2026-07-16-modular-prototype-roadmap.md`
- `plans/2026-07-09-master-product-roadmap.md`

The current direction is one complete modular prototype, not a phased MVP/later split. Public product language is now:

- `World` for the user-facing workspace metaphor.
- `Entity` for canonical world objects, while existing `Card` code remains compatible.
- `Prep` for the preparation mode, while `CRUD` remains an internal technical description.
- `World -> Chapter -> Scene` as the public playable hierarchy.
- `Play` as a local GM screen plus local player preview.

Legacy `Campaign`/`campaign_mode` data may be read as compatibility input, but it is no longer the main persisted source for playable preparation.

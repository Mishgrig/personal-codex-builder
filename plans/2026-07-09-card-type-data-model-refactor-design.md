# Card Type Data Model Refactor Design

Status: Draft for Phase 1.3. Do not run destructive migrations from this document without a backup-first implementation plan.

## Goal

Move Personal Codex Builder toward durable card type definitions while keeping existing cards, legacy schema APIs and physical `card_type_<slug>` tables compatible during the transition.

## Current Source Of Truth

- Shared card metadata lives on `cards`: id, slug, title, summary, body, status, schema/card type id, timestamps and shared taxonomy links.
- Legacy card type structure lives in `card_schemas` and `schema_field_definitions`.
- Newer table-like card type access is bridged through registry/card type tables.
- Dynamic card values still need a compatibility layer because card detail, exports, imports and table views read overlapping structures.

## Target Source Of Truth

- Card type definitions should become the durable display and validation contract for cards.
- Shared card metadata should remain shared and not be duplicated into every card type table.
- Field visibility, section order and hidden sections should be stored as layout metadata, not by deleting card data.
- Semantic relations and future canvas layouts should stay separate: one relation can appear in different places across Wiki, Characters, Locations and Board views.

## Required Audit Before Migration

- List all workspace tables and columns for a real workspace and the demo workspace.
- Count cards by `schema_id` and by card type registry rows.
- Find fields present in card content but missing from card type definitions.
- Find card type tables without matching card type definitions.
- Find card type definitions without physical table bridges.
- Verify export/import payloads contain enough information to rebuild both card metadata and dynamic fields.

## Migration Strategy

- Create a safety backup before any workspace migration.
- Add new layout metadata fields first, behind backward-compatible API responses.
- Backfill missing card type definitions from existing schemas and registry tables.
- Backfill card type table rows from cards only after validating row counts and checksums.
- Keep legacy `/schemas` and frontend `CardSchema` shapes available until all UI screens use `/card-types`.
- Run migrations per workspace and record migration status in workspace metadata.

## Rollback Strategy

- Never delete old schema tables in the first migration.
- Keep a pre-migration workspace export and SQLite backup.
- Store migration logs with counts of created, skipped and conflicting rows.
- If validation fails, stop migration, restore the safety backup and show the failure in Manage Databases health.

## Open Decisions

- Decide whether dynamic field values should live primarily in JSON card content, normalized field-value rows or physical card type tables.
- Decide how hidden sections are represented for built-in areas such as Body, Sources, Relations, Gallery and Attachments.
- Decide whether changing a card type slug should create a new card type, alias the old slug or run a table rename migration.
- Decide how import/export should represent deleted or inactive fields that still have stored data.

## Implementation Gate

Phase 1.3 is ready for implementation only after the audit command, migration preview, backup creation and rollback path exist in code and are covered by backend tests.

# Phase 9 Board / Moodboard Design

Status: Implemented.

## Goal

Add a dedicated Board / Moodboard workspace for spatial thinking: references, ideas, colors, quotes, files and linked cards can be arranged visually and connected without becoming regular Wiki text.

## MVP Scope

- workspace-local boards;
- board items for text, quote, color, link, table, file/image asset references and linked cards;
- board edges for visual connections;
- canvas layout stored on each item: x, y, width, height and z-index;
- Board navigation entry and Home shortcut;
- drag, resize, duplicate, delete and multi-select in the frontend;
- export and freehand drawing remain Later.

## Data Model

- `boards`: board metadata and view settings;
- `board_items`: typed nodes with optional card/asset references and canvas layout;
- `board_edges`: visual connections between items.

The semantic card/asset references are stored separately from visual edges so the same card can exist in multiple boards with different spatial meaning.

## Delivered Target

This phase is complete when Board has persisted backend storage, public API routes, frontend access in navigation and a usable canvas that can create, move, resize, duplicate, delete and connect nodes.

## Delivered Implementation

- Backend models, schemas, service and API routes for boards, board items and board edges.
- Frontend Board workspace with board selection/creation and a spatial canvas.
- Supported node types: text, quote, color, link, table, image/file asset references and linked cards.
- Canvas interactions: double-click text creation, toolbar creation, drag, resize, zoom, scroll-pan, multi-select, duplicate, delete and connect.
- Later: freehand drawing, layer panel, export to PNG/JPG/PDF and richer table editing.

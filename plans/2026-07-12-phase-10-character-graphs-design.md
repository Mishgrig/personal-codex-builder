# Phase 10 Character Graphs, Groups And Family Trees Design

Status: Implemented.

## Goal

Make character relationships visible and manageable without making the card detail panel heavier.

## MVP Scope

- Character groups/folders with name, slug and color.
- Group assignment remains compatible with the existing character `group` dynamic field.
- Relationship graph uses existing semantic `card_relations` as its source of truth.
- Graph node layout is stored separately from relations so positions can change without changing story meaning.
- Family Trees remain Later, as defined in the master roadmap.

## Data Model

- `character_groups`: managed group metadata.
- `character_graph_node_layouts`: saved x/y/width/height per character card and graph view.

The graph does not duplicate semantic relation data. It only stores visual positions.

## Delivered Target

This phase is complete when Characters has managed groups and a relationship graph view with draggable saved node positions based on existing card relations.

## Delivered Implementation

- Backend models, schemas, service and API routes for character groups and graph node layouts.
- Relationship graph is generated from existing `card_relations`.
- Frontend Characters workspace now has `Directory / Relationship Graph` modes.
- Relationship Graph supports managed group creation, visual relation edges and draggable saved node positions.
- Family Trees stay Later because the master roadmap explicitly keeps that submodule deferred.

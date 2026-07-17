# Phase 11 Themes, Typography And Interface Personalization Design

Status: Implemented.

## Goal

Let each local workspace feel personal while keeping the app clean, cold-toned and practical.

## MVP Scope

- Workspace-backed accent color.
- Workspace-backed density: comfortable, balanced and compact.
- Workspace-backed text scale.
- Workspace-backed typography preset using safe built-in font stacks.
- Cold palette direction by default.

## Later

- Full custom theme palettes.
- User-provided fonts and local font assets.
- Theme marketplace-like presets.

Custom fonts stay Later because they need backup, portability and security decisions.

## Delivered Target

This phase is complete when visual settings are editable from Home, stored in `ui_preferences`, applied as CSS variables/classes, and therefore travel with workspace backup/export.

## Delivered Implementation

- Home workspace settings now expose accent color, density, text scale and typography preset.
- App shell applies `--accent`, `--text-scale`, `density-*` and `typography-*` from workspace `ui_preferences`.
- Added balanced density and expanded density coverage to Home, Atlas, Detail, Notebook, Plots, Board and Character Graph surfaces.
- Added safe typography presets: literary, editorial, crisp and technical.
- Custom font files and full theme palette builders remain Later.

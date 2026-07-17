# Phase 12 Import, Export, Backup And User-Managed Sync Design

Status: Implemented for near-term portability. User-managed sync remains Later.

## Goal

Preserve local ownership while making workspace backup, export and import behavior explicit and trustworthy.

## Delivered Scope

- Existing workspace export/import remains the primary portability path.
- Existing backup/restore remains local and safety-backup-first.
- Added a workspace portability audit that checks durable tables, metadata, files directory, backup coverage and export count.
- Added Manage Databases UI visibility for portability status.
- Confirmed new durable modules are represented in the required table audit: Plots, Board/Moodboard and Character Graph layouts.

## Later Sync Plan

User-managed cloud-folder sync should be designed separately before implementation:

- user selects a local folder managed by iCloud, Google Drive, Dropbox or similar;
- app writes/reads portable workspace archives or snapshots there;
- conflicts must be explicit: keep local, use remote or make copy;
- no vendor-hosted runtime or account system should be added.

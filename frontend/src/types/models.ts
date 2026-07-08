export interface WorkspaceSummary {
  slug: string;
  name: string;
  description: string;
  theme: string;
  archived: boolean;
  logo_url: string | null;
  card_count: number;
  path: string;
  last_opened_at: string | null;
  backup_count: number;
  last_backup_at: string | null;
  created_at: string;
  updated_at: string;
  taxonomy_labels: Record<string, string>;
}

export interface WorkspaceBackup {
  filename: string;
  created_at: string;
  size_bytes: number;
  reason: string;
  schema_version: string;
  app_version: string;
  is_safety_backup: boolean;
  path: string;
}

export interface WorkspaceExport {
  filename: string;
  created_at: string;
  size_bytes: number;
  path: string;
}

export interface WorkspaceRestoreResult {
  workspace: WorkspaceSummary;
  safety_backup: WorkspaceBackup;
}

export interface WorkspaceHealthCheck {
  key: string;
  category: string;
  status: string;
  message: string;
  details: Record<string, unknown>;
}

export interface WorkspaceHealthCategory {
  key: string;
  status: string;
  issue_count: number;
  checks: WorkspaceHealthCheck[];
}

export interface WorkspaceHealth {
  workspace_slug: string;
  checked_at: string;
  integrity_ok: boolean;
  integrity_message: string;
  db_size_bytes: number;
  files_size_bytes: number;
  files_count: number;
  missing_files_count: number;
  missing_paths: string[];
  card_count: number;
  schema_count: number;
  taxonomy_term_count: number;
  backup_count: number;
  last_backup_at: string | null;
  schema_version: string;
  app_version: string;
  issue_count: number;
  checks: WorkspaceHealthCheck[];
  categories: Record<string, WorkspaceHealthCategory>;
}

export interface WorkspaceAssetHealth {
  workspace_slug: string;
  checked_at: string;
  issue_count: number;
  missing_asset_files: string[];
  orphaned_files: string[];
  duplicate_checksums: string[];
  unused_assets: string[];
  broken_cover_asset_ids: string[];
  broken_gallery_links: string[];
  broken_attachment_links: string[];
  broken_source_links: string[];
  checks: WorkspaceHealthCheck[];
  categories: Record<string, WorkspaceHealthCategory>;
}

export interface WorkspaceNotebook {
  body_json: Record<string, unknown>;
  body_text: string;
}

export interface WorkspaceAssetUsage {
  usage_type: string;
  label: string;
  card_id: number | null;
  asset_role: string;
}

export interface WorkspaceAsset {
  id: string;
  asset_type: string;
  original_filename: string;
  stored_filename: string;
  relative_path: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  url: string;
  usage_count: number;
  usages: WorkspaceAssetUsage[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAssetLibrary {
  items: WorkspaceAsset[];
  total: number;
  q: string;
  asset_type: string | null;
}

export interface AppInfo {
  project_name: string;
  app_version: string;
  workspace_schema_version: string;
  data_dir: string;
  app_index_path: string;
  workspaces_dir: string;
  workspace_count: number;
  active_workspace_count: number;
  archived_workspace_count: number;
  default_theme: string;
}

export interface TaxonomyTerm {
  id: number;
  category: "domain" | "type" | "subtype" | "layer" | string;
  slug: string;
  label: string;
  description: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SchemaField {
  id?: number;
  field_id: string;
  label: string;
  kind: string;
  description: string;
  required: boolean;
  repeatable: boolean;
  default_value: unknown;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  show_in_card: boolean;
  show_in_list: boolean;
  show_in_filters: boolean;
  validation: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CardSchema {
  id: string;
  label: string;
  description: string;
  icon: string;
  field_order: string[];
  is_active: boolean;
  fields: SchemaField[];
  created_at: string;
  updated_at: string;
}

export interface CardTypeField {
  id: number;
  card_type_slug: string;
  name: string;
  field_slug: string;
  sql_column_name: string;
  field_type: string;
  required: boolean;
  visible: boolean;
  show_in_card: boolean;
  show_in_atlas: boolean;
  include_in_table_view: boolean;
  include_in_export: boolean;
  allow_import: boolean;
  searchable: boolean;
  filterable: boolean;
  description: string;
  help_text: string;
  default_value_json: unknown;
  options_json: Array<Record<string, unknown>>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardTypeDefinition {
  slug: string;
  name: string;
  table_name: string;
  description: string;
  icon: string;
  is_active: boolean;
  layout_json: Record<string, unknown>;
  fields: CardTypeField[];
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface CardTypeTableColumn {
  field_slug: string;
  sql_column_name: string;
  name: string;
  field_type: string;
  required: boolean;
  searchable: boolean;
  filterable: boolean;
}

export interface CardTypeTableRow {
  card_id: number;
  registry_id: number | null;
  title: string;
  summary: string;
  status: string;
  values: Record<string, unknown>;
}

export interface CardTypeTable {
  card_type: CardTypeDefinition;
  columns: CardTypeTableColumn[];
  rows: CardTypeTableRow[];
  total: number;
  q: string;
}

export interface CardTypeStructureExport {
  card_type_slug: string;
  format: string;
  filename: string;
  content_text: string;
  content_json: Array<Record<string, unknown>>;
  content_base64: string;
}

export interface CardTypeImportPreview {
  card_type_slug: string;
  format: string;
  row_count: number;
  missing_columns: string[];
  unknown_columns: string[];
  matched_columns: Record<string, string>;
  sample_rows: Array<Record<string, unknown>>;
}

export interface CardTypeImportResult {
  card_type_slug: string;
  format: string;
  rows_created: number;
  rows_updated: number;
  rows_skipped: number;
  errors: string[];
  missing_columns: string[];
  unknown_columns: string[];
}

export interface CardTypeTableExport {
  card_type_slug: string;
  format: string;
  filename: string;
  content_text: string;
  content_json: Array<Record<string, unknown>>;
  content_base64: string;
}

export interface CardSource {
  id: number;
  title: string;
  url: string;
  note: string;
  source_type: string;
  assets: CardAsset[];
  created_at: string;
  updated_at: string;
}

export interface CardAsset {
  id: number | string;
  kind: "gallery" | "attachment" | string;
  stored_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  note: string;
  sort_order: number;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface CardRelation {
  id: number;
  target_card_id: number;
  target_uid: string;
  target_slug: string;
  target_title: string;
  relation_type: string;
  note: string;
}

export interface CardListItem {
  id: number;
  uid: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  schema_id: string | null;
  schema_label: string | null;
  dynamic_fields: Record<string, unknown>;
  taxonomy_terms: TaxonomyTerm[];
  mention_count: number;
  cover_url: string | null;
  cover_asset_id?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CardDetail extends CardListItem {
  body_json: Record<string, unknown>;
  body_text: string;
  gallery: CardAsset[];
  attachments: CardAsset[];
  sources: CardSource[];
  relations: CardRelation[];
  schema: CardSchema | null;
}

export interface SearchResult {
  items: CardListItem[];
  total: number;
  q: string;
  grouping: string;
  generated_at: string;
}

export interface WorkspaceCreatePayload {
  name: string;
  description: string;
  theme: string;
}

export interface CardCreatePayload {
  title?: string;
  summary?: string;
  status?: string;
  schema_id?: string | null;
  taxonomy_term_ids?: number[];
}

export interface CardUpdatePayload {
  title?: string;
  slug?: string;
  summary?: string;
  status?: string;
  schema_id?: string | null;
  cover_asset_id?: string | null;
  body_json?: Record<string, unknown>;
  dynamic_fields?: Record<string, unknown>;
  taxonomy_term_ids?: number[];
}

export interface SearchFilters {
  domain?: number;
  type?: number;
  subtype?: number;
  layer?: number;
}

export interface ActionStatus {
  status: string;
  message: string;
}

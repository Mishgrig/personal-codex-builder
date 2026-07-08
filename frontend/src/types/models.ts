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

export interface CardSource {
  id: number;
  title: string;
  url: string;
  note: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface CardAsset {
  id: number;
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

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
  ui_preferences: Record<string, unknown>;
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

export interface WorkspaceDataExport {
  filename: string;
  format: string;
  scope: string;
  include_asset_ids: boolean;
  row_count: number;
  content_text: string;
  content_json: Array<Record<string, unknown>>;
}

export type WorkspaceShareMode = "snapshot" | "linked";

export interface WorkspaceShareLink {
  id: string;
  mode: WorkspaceShareMode;
  entity_type: string;
  source_workspace_slug: string;
  source_workspace_name: string;
  source_entity_id: number;
  source_entity_title: string;
  target_workspace_slug: string;
  target_entity_id: number | null;
  created_at: string;
}

export interface WorkspaceShareRegistry {
  workspace_slug: string;
  links: WorkspaceShareLink[];
}

export interface WorkspaceShareResult {
  mode: WorkspaceShareMode;
  link: WorkspaceShareLink;
  copied_card: CardDetail | null;
}

export interface WorkspaceRestoreResult {
  workspace: WorkspaceSummary;
  safety_backup: WorkspaceBackup;
}

export interface WorkspaceRepairResult {
  status: string;
  message: string;
  repaired_count: number;
  skipped_count: number;
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

export interface WorkspacePortability {
  workspace_slug: string;
  checked_at: string;
  status: string;
  issue_count: number;
  required_tables: string[];
  present_tables: string[];
  missing_tables: string[];
  db_included: boolean;
  metadata_included: boolean;
  files_dir_present: boolean;
  asset_file_count: number;
  backup_count: number;
  export_count: number;
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

export type WorkspaceNotebookItemType =
  | "rich_text"
  | "plain_text"
  | "table"
  | "image"
  | "file"
  | "link"
  | "card_reference"
  | "asset_reference";

export interface WorkspaceNotebookItem {
  id: string;
  type: WorkspaceNotebookItemType | string;
  title: string;
  sort_order: number;
  body_json?: Record<string, unknown>;
  body_text?: string;
  text?: string;
  columns?: string[];
  rows?: string[][];
  asset_id?: string;
  asset_ids?: string[];
  href?: string;
  label?: string;
  card_id?: number | null;
  note?: string;
  icon?: string;
}

export interface WorkspaceNotebook {
  items: WorkspaceNotebookItem[];
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
  layout_json: Record<string, unknown>;
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
  sort_by: string;
  sort_dir: string;
  status: string;
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

export interface PlotEventCardLink {
  id: number;
  card_id: number;
  role: string;
  card_title: string;
  card_schema_id: string | null;
  card_schema_label: string | null;
  created_at: string;
}

export interface PlotEventLink {
  id: number;
  source_event_id: number;
  target_event_id: number;
  target_title: string;
  relation_type: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface PlotEventLayout {
  id: number;
  event_id: number;
  view_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface PlotEvent {
  id: number;
  uid: string;
  title: string;
  description: string;
  color: string;
  status: string;
  event_date: string | null;
  sort_order: number;
  card_links: PlotEventCardLink[];
  event_links: PlotEventLink[];
  layout: PlotEventLayout | null;
  created_at: string;
  updated_at: string;
}

export interface PlotEventList {
  items: PlotEvent[];
  total: number;
}

export interface PlotEventCreatePayload {
  title?: string;
  description?: string;
  color?: string;
  status?: string;
  event_date?: string | null;
  card_ids?: number[];
}

export interface PlotEventUpdatePayload {
  title?: string;
  description?: string;
  color?: string;
  status?: string;
  event_date?: string | null;
  sort_order?: number;
}

export type ReferenceTargetType = "entity" | "asset" | "board" | "map" | "event" | string;
export type PlayVisibility = "gm" | "players" | string;

export interface ChapterReference {
  id: number;
  target_type: ReferenceTargetType;
  target_id: string;
  role: string;
  label: string;
  sort_order: number;
  target_title: string | null;
  target_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SceneReference extends ChapterReference {
  visibility: PlayVisibility;
}

export interface DiceShortcut {
  id: number;
  chapter_id: number | null;
  scene_id: number | null;
  label: string;
  formula: string;
  visibility: PlayVisibility;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SceneToken {
  id: number;
  scene_id: number;
  label: string;
  card_id: number | null;
  asset_id: string | null;
  visibility: PlayVisibility;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  notes: string;
  card_title: string | null;
  asset_filename: string | null;
  asset_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: number;
  uid: string;
  chapter_id: number;
  title: string;
  summary: string;
  status: string;
  gm_notes_json: Record<string, unknown>;
  gm_notes_text: string;
  player_notes_json: Record<string, unknown>;
  player_notes_text: string;
  quick_notes_json: Array<Record<string, unknown>>;
  background_asset_id: string | null;
  background_asset_url: string | null;
  map_asset_id: string | null;
  map_asset_url: string | null;
  play_settings: Record<string, unknown>;
  runtime_state: Record<string, unknown>;
  sort_order: number;
  references: SceneReference[];
  tokens: SceneToken[];
  dice_shortcuts: DiceShortcut[];
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  uid: string;
  title: string;
  description: string;
  status: string;
  notes_json: Record<string, unknown>;
  notes_text: string;
  cover_asset_id: string | null;
  cover_asset_url: string | null;
  view_settings: Record<string, unknown>;
  sort_order: number;
  references: ChapterReference[];
  scenes: Scene[];
  dice_shortcuts: DiceShortcut[];
  created_at: string;
  updated_at: string;
}

export interface ChapterList {
  items: Chapter[];
  total: number;
}

export interface ChapterCreatePayload {
  title?: string;
  description?: string;
  status?: string;
  notes_json?: Record<string, unknown>;
  notes_text?: string;
  cover_asset_id?: string | null;
  view_settings?: Record<string, unknown>;
  sort_order?: number;
}

export type ChapterUpdatePayload = Partial<ChapterCreatePayload>;

export interface SceneCreatePayload {
  title?: string;
  summary?: string;
  status?: string;
  gm_notes_json?: Record<string, unknown>;
  gm_notes_text?: string;
  player_notes_json?: Record<string, unknown>;
  player_notes_text?: string;
  quick_notes_json?: Array<Record<string, unknown>>;
  background_asset_id?: string | null;
  map_asset_id?: string | null;
  play_settings?: Record<string, unknown>;
  runtime_state?: Record<string, unknown>;
  sort_order?: number;
}

export type SceneUpdatePayload = Partial<SceneCreatePayload>;

export interface ReferenceCreatePayload {
  target_type: ReferenceTargetType;
  target_id: string;
  role?: string;
  label?: string;
  visibility?: PlayVisibility;
  sort_order?: number;
}

export interface SceneTokenCreatePayload {
  label?: string;
  card_id?: number | null;
  asset_id?: string | null;
  visibility?: PlayVisibility;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  notes?: string;
}

export type SceneTokenUpdatePayload = Partial<SceneTokenCreatePayload>;

export interface DiceShortcutCreatePayload {
  label?: string;
  formula?: string;
  visibility?: PlayVisibility;
  sort_order?: number;
}

export type DiceShortcutUpdatePayload = Partial<DiceShortcutCreatePayload>;

export type BoardItemType = "text" | "quote" | "color" | "link" | "table" | "image" | "file" | "card" | string;

export interface BoardItem {
  id: number;
  uid: string;
  board_id: number;
  item_type: BoardItemType;
  title: string;
  body_text: string;
  body_json: Record<string, unknown>;
  card_id: number | null;
  asset_id: string | null;
  href: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  card_title: string | null;
  asset_filename: string | null;
  asset_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardEdge {
  id: number;
  board_id: number;
  source_item_id: number;
  target_item_id: number;
  relation_type: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  uid: string;
  title: string;
  description: string;
  view_settings: Record<string, unknown>;
  sort_order: number;
  items: BoardItem[];
  edges: BoardEdge[];
  created_at: string;
  updated_at: string;
}

export interface BoardList {
  items: Board[];
  total: number;
}

export interface BoardCreatePayload {
  title?: string;
  description?: string;
  view_settings?: Record<string, unknown>;
}

export interface BoardUpdatePayload {
  title?: string;
  description?: string;
  view_settings?: Record<string, unknown>;
  sort_order?: number;
}

export interface BoardItemCreatePayload {
  item_type?: BoardItemType;
  title?: string;
  body_text?: string;
  body_json?: Record<string, unknown>;
  card_id?: number | null;
  asset_id?: string | null;
  href?: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
}

export type BoardItemUpdatePayload = Partial<BoardItemCreatePayload>;

export interface CharacterGroup {
  id: number;
  slug: string;
  name: string;
  color: string;
  description: string;
  sort_order: number;
  character_count: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterGraphNodeLayout {
  id: number | null;
  graph_id: string;
  card_id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterGraphNode {
  id: number;
  uid: string;
  title: string;
  summary: string;
  group: string;
  role: string;
  dynamic_fields: Record<string, unknown>;
  layout: CharacterGraphNodeLayout;
}

export interface CharacterGraphEdge {
  id: number;
  source_card_id: number;
  target_card_id: number;
  source_title: string;
  target_title: string;
  relation_type: string;
  note: string;
}

export interface CharacterGraph {
  graph_id: string;
  groups: CharacterGroup[];
  nodes: CharacterGraphNode[];
  edges: CharacterGraphEdge[];
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

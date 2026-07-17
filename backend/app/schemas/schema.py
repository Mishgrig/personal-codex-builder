from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedModel


class SchemaFieldBase(BaseModel):
    field_id: str
    label: str
    kind: str
    description: str = ""
    required: bool = False
    repeatable: bool = False
    default_value: Any = None
    options: list[dict[str, str]] = Field(default_factory=list)
    placeholder: str = ""
    show_in_card: bool = True
    show_in_list: bool = False
    show_in_filters: bool = False
    validation: dict[str, Any] = Field(default_factory=dict)
    sort_order: int = 0
    is_active: bool = True


class SchemaFieldCreate(SchemaFieldBase):
    pass


class SchemaFieldRead(SchemaFieldBase, TimestampedModel):
    id: int


class CardSchemaBase(BaseModel):
    id: str
    label: str
    description: str = ""
    icon: str = "*"
    field_order: list[str] = Field(default_factory=list)
    layout_json: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class CardSchemaCreate(CardSchemaBase):
    fields: list[SchemaFieldCreate] = Field(default_factory=list)


class CardSchemaRead(CardSchemaBase, TimestampedModel):
    fields: list[SchemaFieldRead] = Field(default_factory=list)


class CardTypeFieldRead(TimestampedModel):
    id: int
    card_type_slug: str
    name: str
    field_slug: str
    sql_column_name: str
    field_type: str
    required: bool = False
    visible: bool = True
    show_in_card: bool = True
    show_in_atlas: bool = False
    include_in_table_view: bool = True
    include_in_export: bool = True
    allow_import: bool = True
    searchable: bool = False
    filterable: bool = False
    description: str = ""
    help_text: str = ""
    default_value_json: Any = None
    options_json: list[dict[str, Any]] = Field(default_factory=list)
    sort_order: int = 0
    is_active: bool = True


class CardTypeDefinitionRead(TimestampedModel):
    slug: str
    name: str
    table_name: str
    description: str = ""
    icon: str = "*"
    is_active: bool = True
    layout_json: dict[str, Any] = Field(default_factory=dict)
    fields: list[CardTypeFieldRead] = Field(default_factory=list)
    card_count: int = 0


class CardTypeTableColumnRead(BaseModel):
    field_slug: str
    sql_column_name: str
    name: str
    field_type: str
    required: bool = False
    searchable: bool = False
    filterable: bool = False


class CardTypeTableRowRead(BaseModel):
    card_id: int
    registry_id: int | None = None
    title: str
    summary: str
    status: str
    values: dict[str, Any] = Field(default_factory=dict)


class CardTypeTableRead(BaseModel):
    card_type: CardTypeDefinitionRead
    columns: list[CardTypeTableColumnRead] = Field(default_factory=list)
    rows: list[CardTypeTableRowRead] = Field(default_factory=list)
    total: int = 0
    q: str = ""
    sort_by: str = "manual"
    sort_dir: str = "asc"
    status: str = ""


class CardTypeRowWriteRequest(BaseModel):
    title: str = "Untitled Card"
    summary: str = ""
    status: str = "draft"
    values: dict[str, Any] = Field(default_factory=dict)


class CardTypeRowDeleteRead(BaseModel):
    card_id: int
    deleted: bool = True


class CardTypeStructureExportRead(BaseModel):
    card_type_slug: str
    format: str
    filename: str
    content_text: str = ""
    content_json: list[dict[str, Any]] = Field(default_factory=list)
    content_base64: str = ""


class CardTypeImportRequest(BaseModel):
    format: str = "csv"
    content_text: str = ""
    content_base64: str = ""
    filename: str = ""


class CardTypeImportPreviewRead(BaseModel):
    card_type_slug: str
    format: str
    row_count: int
    missing_columns: list[str] = Field(default_factory=list)
    unknown_columns: list[str] = Field(default_factory=list)
    matched_columns: dict[str, str] = Field(default_factory=dict)
    sample_rows: list[dict[str, Any]] = Field(default_factory=list)


class CardTypeImportResultRead(BaseModel):
    card_type_slug: str
    format: str
    rows_created: int = 0
    rows_updated: int = 0
    rows_skipped: int = 0
    errors: list[str] = Field(default_factory=list)
    missing_columns: list[str] = Field(default_factory=list)
    unknown_columns: list[str] = Field(default_factory=list)


class CardTypeTableExportRead(BaseModel):
    card_type_slug: str
    format: str
    filename: str
    content_text: str = ""
    content_json: list[dict[str, Any]] = Field(default_factory=list)
    content_base64: str = ""

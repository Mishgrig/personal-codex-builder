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
    is_active: bool = True


class CardSchemaCreate(CardSchemaBase):
    fields: list[SchemaFieldCreate] = Field(default_factory=list)


class CardSchemaRead(CardSchemaBase, TimestampedModel):
    fields: list[SchemaFieldRead] = Field(default_factory=list)


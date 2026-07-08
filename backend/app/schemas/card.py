from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import TimestampedModel
from app.schemas.schema import CardSchemaRead
from app.schemas.taxonomy import TaxonomyTermRead


class CardSourceBase(BaseModel):
    title: str
    url: str = ""
    note: str = ""
    source_type: str = "web_page"


class CardSourceCreate(CardSourceBase):
    pass


class CardSourceRead(CardSourceBase, TimestampedModel):
    id: int
    assets: list["CardAssetRead"] = Field(default_factory=list)


class CardAssetRead(TimestampedModel):
    id: int | str
    kind: str
    stored_path: str
    original_name: str
    mime_type: str
    size: int
    note: str
    sort_order: int
    url: str


class CardRelationRead(BaseModel):
    id: int
    target_card_id: int
    target_uid: str
    target_slug: str
    target_title: str
    relation_type: str = "one-to-one"
    note: str = ""


class CardRelationCreate(BaseModel):
    target_card_id: int
    relation_type: str = "one-to-one"
    note: str = ""


class CardCreate(BaseModel):
    title: str = "Untitled Card"
    summary: str = ""
    status: str = "draft"
    schema_id: str | None = None
    taxonomy_term_ids: list[int] = Field(default_factory=list)


class CardUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    summary: str | None = None
    status: str | None = None
    schema_id: str | None = None
    cover_asset_id: str | None = None
    body_json: dict[str, Any] | None = None
    dynamic_fields: dict[str, Any] | None = None
    taxonomy_term_ids: list[int] | None = None


class CardListItem(TimestampedModel):
    id: int
    uid: str
    slug: str
    title: str
    summary: str
    status: str
    schema_id: str | None = None
    schema_label: str | None = None
    dynamic_fields: dict[str, Any]
    taxonomy_terms: list[TaxonomyTermRead] = Field(default_factory=list)
    mention_count: int = 0
    cover_url: str | None = None
    cover_asset_id: str | None = None
    sort_order: float


class CardDetail(CardListItem):
    model_config = ConfigDict(populate_by_name=True)

    body_json: dict[str, Any]
    body_text: str
    gallery: list[CardAssetRead] = Field(default_factory=list)
    attachments: list[CardAssetRead] = Field(default_factory=list)
    sources: list[CardSourceRead] = Field(default_factory=list)
    relations: list[CardRelationRead] = Field(default_factory=list)
    card_schema: CardSchemaRead | None = Field(default=None, serialization_alias="schema")


class CardReorderPayload(BaseModel):
    ordered_ids: list[int | str]


class SearchResult(BaseModel):
    items: list[CardListItem]
    total: int
    q: str = ""
    grouping: str
    generated_at: datetime

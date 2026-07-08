from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import TimestampedModel


class TaxonomyTermBase(BaseModel):
    category: str
    slug: str
    label: str
    description: str = ""
    parent_id: int | None = None
    sort_order: int = 0


class TaxonomyTermCreate(TaxonomyTermBase):
    pass


class TaxonomyTermUpdate(BaseModel):
    slug: str | None = None
    label: str | None = None
    description: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None


class TaxonomyTermRead(TaxonomyTermBase, TimestampedModel):
    id: int


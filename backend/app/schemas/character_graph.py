from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CharacterGroupBase(BaseModel):
    name: str = Field(max_length=120)
    slug: str = Field(max_length=64)
    color: str = "#4ba8d6"
    description: str = ""


class CharacterGroupCreate(CharacterGroupBase):
    pass


class CharacterGroupUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    slug: str | None = Field(default=None, max_length=64)
    color: str | None = None
    description: str | None = None
    sort_order: float | None = None


class CharacterGroupRead(CharacterGroupBase):
    id: int
    sort_order: float
    character_count: int = 0
    created_at: datetime
    updated_at: datetime


class CharacterGraphNodeLayoutRead(BaseModel):
    id: int | None = None
    graph_id: str
    card_id: int
    x: float
    y: float
    width: float
    height: float


class CharacterGraphNodeLayoutUpdate(BaseModel):
    graph_id: str = "default"
    card_id: int
    x: float
    y: float
    width: float = 220.0
    height: float = 120.0


class CharacterGraphNodeRead(BaseModel):
    id: int
    uid: str
    title: str
    summary: str
    group: str
    role: str
    dynamic_fields: dict[str, Any]
    layout: CharacterGraphNodeLayoutRead


class CharacterGraphEdgeRead(BaseModel):
    id: int
    source_card_id: int
    target_card_id: int
    source_title: str
    target_title: str
    relation_type: str
    note: str


class CharacterGraphRead(BaseModel):
    graph_id: str
    groups: list[CharacterGroupRead]
    nodes: list[CharacterGraphNodeRead]
    edges: list[CharacterGraphEdgeRead]

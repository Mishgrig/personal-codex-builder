from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


BoardItemType = Literal["text", "quote", "color", "link", "table", "image", "file", "card"]


class BoardBase(BaseModel):
    title: str = Field(default="Moodboard", max_length=255)
    description: str = ""
    view_settings: dict[str, Any] = Field(default_factory=dict)


class BoardCreate(BoardBase):
    pass


class BoardUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    view_settings: dict[str, Any] | None = None
    sort_order: float | None = None


class BoardItemBase(BaseModel):
    item_type: BoardItemType | str = "text"
    title: str = Field(default="", max_length=255)
    body_text: str = ""
    body_json: dict[str, Any] = Field(default_factory=dict)
    card_id: int | None = None
    asset_id: str | None = None
    href: str = ""
    color: str = "#4ba8d6"
    x: float = 80.0
    y: float = 80.0
    width: float = 240.0
    height: float = 150.0
    z_index: int = 0


class BoardItemCreate(BoardItemBase):
    pass


class BoardItemUpdate(BaseModel):
    item_type: BoardItemType | str | None = None
    title: str | None = Field(default=None, max_length=255)
    body_text: str | None = None
    body_json: dict[str, Any] | None = None
    card_id: int | None = None
    asset_id: str | None = None
    href: str | None = None
    color: str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    z_index: int | None = None


class BoardEdgeCreate(BaseModel):
    source_item_id: int
    target_item_id: int
    relation_type: str = "related"
    label: str = ""


class BoardEdgeUpdate(BaseModel):
    relation_type: str | None = None
    label: str | None = None


class BoardItemRead(BoardItemBase):
    id: int
    uid: str
    board_id: int
    card_title: str | None = None
    asset_filename: str | None = None
    asset_url: str | None = None
    created_at: datetime
    updated_at: datetime


class BoardEdgeRead(BaseModel):
    id: int
    board_id: int
    source_item_id: int
    target_item_id: int
    relation_type: str
    label: str
    created_at: datetime
    updated_at: datetime


class BoardRead(BoardBase):
    id: int
    uid: str
    sort_order: float
    items: list[BoardItemRead]
    edges: list[BoardEdgeRead]
    created_at: datetime
    updated_at: datetime


class BoardListRead(BaseModel):
    items: list[BoardRead]
    total: int

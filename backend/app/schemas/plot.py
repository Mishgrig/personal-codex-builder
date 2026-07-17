from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PlotEventCardLinkRead(BaseModel):
    id: int
    card_id: int
    role: str
    card_title: str
    card_schema_id: str | None = None
    card_schema_label: str | None = None
    created_at: datetime


class PlotEventLinkRead(BaseModel):
    id: int
    source_event_id: int
    target_event_id: int
    target_title: str
    relation_type: str
    note: str
    created_at: datetime
    updated_at: datetime


class PlotEventLayoutRead(BaseModel):
    id: int
    event_id: int
    view_id: str = "default"
    x: float = 0
    y: float = 0
    width: float = 260
    height: float = 160
    created_at: datetime
    updated_at: datetime


class PlotEventBase(BaseModel):
    title: str = "Untitled Event"
    description: str = ""
    color: str = "#4ba8d6"
    status: str = "draft"
    event_date: str | None = None


class PlotEventCreate(PlotEventBase):
    card_ids: list[int] = Field(default_factory=list)


class PlotEventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    color: str | None = None
    status: str | None = None
    event_date: str | None = None
    sort_order: float | None = None


class PlotEventCardLinkCreate(BaseModel):
    card_id: int
    role: str = "related"


class PlotEventLinkCreate(BaseModel):
    target_event_id: int
    relation_type: str = "sequence"
    note: str = ""


class PlotEventLayoutUpdate(BaseModel):
    view_id: str = "default"
    x: float = 0
    y: float = 0
    width: float = 260
    height: float = 160


class PlotEventRead(PlotEventBase):
    id: int
    uid: str
    sort_order: float
    card_links: list[PlotEventCardLinkRead] = Field(default_factory=list)
    event_links: list[PlotEventLinkRead] = Field(default_factory=list)
    layout: PlotEventLayoutRead | None = None
    created_at: datetime
    updated_at: datetime


class PlotEventListRead(BaseModel):
    items: list[PlotEventRead]
    total: int

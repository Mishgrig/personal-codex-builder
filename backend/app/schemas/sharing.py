from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.card import CardDetail


ShareMode = Literal["snapshot", "linked"]


class WorkspaceShareRequest(BaseModel):
    target_workspace_slug: str
    entity_type: Literal["card"] = "card"
    entity_id: int
    mode: ShareMode = "snapshot"


class WorkspaceShareLink(BaseModel):
    id: str
    mode: ShareMode
    entity_type: str
    source_workspace_slug: str
    source_workspace_name: str
    source_entity_id: int
    source_entity_title: str
    target_workspace_slug: str
    target_entity_id: int | None = None
    created_at: datetime


class WorkspaceShareResult(BaseModel):
    mode: ShareMode
    link: WorkspaceShareLink
    copied_card: CardDetail | None = None


class WorkspaceShareRegistry(BaseModel):
    workspace_slug: str
    links: list[WorkspaceShareLink] = Field(default_factory=list)

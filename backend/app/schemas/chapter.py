from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


ReferenceTargetType = Literal["entity", "asset", "board", "map", "event"]
Visibility = Literal["gm", "players"]


class ReferenceBase(BaseModel):
    target_type: ReferenceTargetType | str = "entity"
    target_id: str
    role: str = "related"
    label: str = ""
    sort_order: int = 0


class ChapterReferenceCreate(ReferenceBase):
    pass


class ChapterReferenceRead(ReferenceBase):
    id: int
    target_title: str | None = None
    target_url: str | None = None
    created_at: datetime
    updated_at: datetime


class SceneReferenceCreate(ReferenceBase):
    visibility: Visibility | str = "gm"


class SceneReferenceRead(SceneReferenceCreate):
    id: int
    target_title: str | None = None
    target_url: str | None = None
    created_at: datetime
    updated_at: datetime


class DiceShortcutBase(BaseModel):
    label: str = Field(default="Roll", max_length=120)
    formula: str = Field(default="d20", max_length=80)
    visibility: Visibility | str = "gm"
    sort_order: int = 0


class DiceShortcutCreate(DiceShortcutBase):
    pass


class DiceShortcutUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    formula: str | None = Field(default=None, max_length=80)
    visibility: Visibility | str | None = None
    sort_order: int | None = None


class DiceShortcutRead(DiceShortcutBase):
    id: int
    chapter_id: int | None
    scene_id: int | None
    created_at: datetime
    updated_at: datetime


class SceneTokenBase(BaseModel):
    label: str = Field(default="", max_length=120)
    card_id: int | None = None
    asset_id: str | None = None
    visibility: Visibility | str = "gm"
    x: float = 120.0
    y: float = 120.0
    width: float = 96.0
    height: float = 96.0
    z_index: int = 0
    notes: str = ""


class SceneTokenCreate(SceneTokenBase):
    @model_validator(mode="after")
    def require_reference(self) -> "SceneTokenCreate":
        if self.card_id is None and self.asset_id is None and not self.label.strip():
            raise ValueError("Scene token requires a label, card_id, or asset_id.")
        return self


class SceneTokenUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    card_id: int | None = None
    asset_id: str | None = None
    visibility: Visibility | str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    z_index: int | None = None
    notes: str | None = None


class SceneTokenRead(SceneTokenBase):
    id: int
    scene_id: int
    card_title: str | None = None
    asset_filename: str | None = None
    asset_url: str | None = None
    created_at: datetime
    updated_at: datetime


class SceneBase(BaseModel):
    title: str = Field(default="Untitled Scene", max_length=255)
    summary: str = ""
    status: str = "prep"
    gm_notes_json: dict[str, Any] = Field(default_factory=dict)
    gm_notes_text: str = ""
    player_notes_json: dict[str, Any] = Field(default_factory=dict)
    player_notes_text: str = ""
    quick_notes_json: list[dict[str, Any]] = Field(default_factory=list)
    background_asset_id: str | None = None
    map_asset_id: str | None = None
    play_settings: dict[str, Any] = Field(default_factory=dict)
    runtime_state: dict[str, Any] = Field(default_factory=dict)
    sort_order: float = 0.0


class SceneCreate(SceneBase):
    pass


class SceneUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = None
    status: str | None = None
    gm_notes_json: dict[str, Any] | None = None
    gm_notes_text: str | None = None
    player_notes_json: dict[str, Any] | None = None
    player_notes_text: str | None = None
    quick_notes_json: list[dict[str, Any]] | None = None
    background_asset_id: str | None = None
    map_asset_id: str | None = None
    play_settings: dict[str, Any] | None = None
    runtime_state: dict[str, Any] | None = None
    sort_order: float | None = None


class SceneRead(SceneBase):
    id: int
    uid: str
    chapter_id: int
    background_asset_url: str | None = None
    map_asset_url: str | None = None
    references: list[SceneReferenceRead]
    tokens: list[SceneTokenRead]
    dice_shortcuts: list[DiceShortcutRead]
    created_at: datetime
    updated_at: datetime


class ChapterBase(BaseModel):
    title: str = Field(default="Untitled Chapter", max_length=255)
    description: str = ""
    status: str = "draft"
    notes_json: dict[str, Any] = Field(default_factory=dict)
    notes_text: str = ""
    cover_asset_id: str | None = None
    view_settings: dict[str, Any] = Field(default_factory=dict)
    sort_order: float = 0.0


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    status: str | None = None
    notes_json: dict[str, Any] | None = None
    notes_text: str | None = None
    cover_asset_id: str | None = None
    view_settings: dict[str, Any] | None = None
    sort_order: float | None = None


class ChapterRead(ChapterBase):
    id: int
    uid: str
    cover_asset_url: str | None = None
    references: list[ChapterReferenceRead]
    scenes: list[SceneRead]
    dice_shortcuts: list[DiceShortcutRead]
    created_at: datetime
    updated_at: datetime


class ChapterListRead(BaseModel):
    items: list[ChapterRead]
    total: int

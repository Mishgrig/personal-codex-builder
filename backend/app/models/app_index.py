from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, MetaData, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.models.base import TimestampMixin

app_index_metadata = MetaData()


class AppIndexBase(DeclarativeBase):
    metadata = app_index_metadata


class AppWorkspace(AppIndexBase, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    theme: Mapped[str] = mapped_column(String(32), default="fantasy", nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    db_filename: Mapped[str] = mapped_column(String(64), default="workspace.sqlite", nullable=False)
    metadata_filename: Mapped[str] = mapped_column(String(64), default="workspace_manifest.json", nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    schema_version: Mapped[str] = mapped_column(String(32), default="1", nullable=False)
    app_version: Mapped[str] = mapped_column(String(32), default="0.1.0", nullable=False)
    last_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

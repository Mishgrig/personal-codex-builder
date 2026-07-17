from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class WorkspaceSetting(Base, TimestampMixin):
    __tablename__ = "workspace_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    theme: Mapped[str] = mapped_column(String(32), default="fantasy", nullable=False)
    logo_path: Mapped[Optional[str]] = mapped_column(String(255))
    taxonomy_labels: Mapped[dict[str, str]] = mapped_column(
        JSON,
        default=lambda: {
            "domain": "Domain",
            "type": "Type",
            "subtype": "Subtype",
            "layer": "Layer",
        },
        nullable=False,
    )
    ui_preferences: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    notebook_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)


class CardSchema(Base, TimestampMixin):
    __tablename__ = "card_schemas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon: Mapped[str] = mapped_column(String(32), default="*", nullable=False)
    field_order: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    fields: Mapped[list[SchemaFieldDefinition]] = relationship(
        back_populates="schema",
        cascade="all, delete-orphan",
        order_by="SchemaFieldDefinition.sort_order",
    )
    cards: Mapped[list[Card]] = relationship(back_populates="schema")


class CardTypeDefinition(Base, TimestampMixin):
    __tablename__ = "card_type_definitions"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    table_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    icon: Mapped[str] = mapped_column(String(32), default="*", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    layout_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    fields: Mapped[list["CardTypeField"]] = relationship(
        back_populates="card_type",
        cascade="all, delete-orphan",
        order_by="CardTypeField.sort_order",
    )
    registry_cards: Mapped[list["CardRegistry"]] = relationship(back_populates="card_type")


class CardTypeField(Base, TimestampMixin):
    __tablename__ = "card_type_fields"
    __table_args__ = (
        UniqueConstraint("card_type_slug", "field_slug", name="uq_card_type_field_slug"),
        UniqueConstraint("card_type_slug", "sql_column_name", name="uq_card_type_sql_column"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_type_slug: Mapped[str] = mapped_column(ForeignKey("card_type_definitions.slug"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    field_slug: Mapped[str] = mapped_column(String(64), nullable=False)
    sql_column_name: Mapped[str] = mapped_column(String(64), nullable=False)
    field_type: Mapped[str] = mapped_column(String(32), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_card: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_atlas: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    include_in_table_view: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_in_export: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_import: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    searchable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    filterable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    help_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_value_json: Mapped[Any] = mapped_column(JSON, default=None, nullable=True)
    options_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    card_type: Mapped["CardTypeDefinition"] = relationship(back_populates="fields")


class SchemaFieldDefinition(Base, TimestampMixin):
    __tablename__ = "schema_fields"
    __table_args__ = (UniqueConstraint("schema_id", "field_id", name="uq_schema_field_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    schema_id: Mapped[str] = mapped_column(ForeignKey("card_schemas.id"), nullable=False)
    field_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    repeatable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_value: Mapped[Any] = mapped_column(JSON, default=None, nullable=True)
    options: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list, nullable=False)
    placeholder: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    show_in_card: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_list: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_in_filters: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    validation: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    schema: Mapped[CardSchema] = relationship(back_populates="fields")


class TaxonomyTerm(Base, TimestampMixin):
    __tablename__ = "taxonomy_terms"
    __table_args__ = (UniqueConstraint("category", "slug", name="uq_taxonomy_category_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("taxonomy_terms.id"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    parent: Mapped[Optional["TaxonomyTerm"]] = relationship(remote_side=[id], backref="children")
    card_links: Mapped[list[CardTaxonomyTerm]] = relationship(
        back_populates="term", cascade="all, delete-orphan"
    )


class Card(Base, TimestampMixin):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Card", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    schema_id: Mapped[Optional[str]] = mapped_column(ForeignKey("card_schemas.id"))
    body_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    body_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    dynamic_fields: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cover_asset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    schema: Mapped[Optional["CardSchema"]] = relationship(back_populates="cards")
    taxonomy_links: Mapped[list[CardTaxonomyTerm]] = relationship(
        back_populates="card", cascade="all, delete-orphan"
    )
    sources: Mapped[list[CardSource]] = relationship(
        back_populates="card", cascade="all, delete-orphan", order_by="CardSource.created_at"
    )
    assets: Mapped[list[CardAsset]] = relationship(
        back_populates="card", cascade="all, delete-orphan", order_by="CardAsset.sort_order"
    )
    outgoing_relations: Mapped[list[CardRelation]] = relationship(
        back_populates="source_card",
        foreign_keys="CardRelation.source_card_id",
        cascade="all, delete-orphan",
    )
    incoming_relations: Mapped[list[CardRelation]] = relationship(
        back_populates="target_card",
        foreign_keys="CardRelation.target_card_id",
        cascade="all, delete-orphan",
    )
    registry_entry: Mapped[Optional["CardRegistry"]] = relationship(back_populates="legacy_card", uselist=False)


class CardRegistry(Base, TimestampMixin):
    __tablename__ = "cards_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    legacy_card_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cards.id", ondelete="SET NULL"), unique=True)
    card_type_slug: Mapped[str] = mapped_column(ForeignKey("card_type_definitions.slug"), nullable=False)
    card_type_table: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Card", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    body_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    body_plain_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cover_asset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    legacy_card: Mapped[Optional["Card"]] = relationship(back_populates="registry_entry")
    card_type: Mapped["CardTypeDefinition"] = relationship(back_populates="registry_cards")


class CardTaxonomyTerm(Base):
    __tablename__ = "card_taxonomy_terms"
    __table_args__ = (UniqueConstraint("card_id", "term_id", name="uq_card_term"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    term_id: Mapped[int] = mapped_column(
        ForeignKey("taxonomy_terms.id", ondelete="CASCADE"), nullable=False
    )

    card: Mapped[Card] = relationship(back_populates="taxonomy_links")
    term: Mapped[TaxonomyTerm] = relationship(back_populates="card_links")


class CardRelation(Base, TimestampMixin):
    __tablename__ = "card_relations"
    __table_args__ = (
        UniqueConstraint("source_card_id", "target_card_id", name="uq_relation_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_card_id: Mapped[int] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    target_card_id: Mapped[int] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    relation_type: Mapped[str] = mapped_column(String(32), default="one-to-one", nullable=False)
    note: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    source_card: Mapped[Card] = relationship(
        back_populates="outgoing_relations", foreign_keys=[source_card_id]
    )
    target_card: Mapped[Card] = relationship(
        back_populates="incoming_relations", foreign_keys=[target_card_id]
    )


class CardSource(Base, TimestampMixin):
    __tablename__ = "card_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), default="web_page", nullable=False)

    card: Mapped[Card] = relationship(back_populates="sources")


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    relative_path: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    gallery_links: Mapped[list["CardGalleryAsset"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan", order_by="CardGalleryAsset.sort_order"
    )
    attachment_links: Mapped[list["CardAttachmentAsset"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan", order_by="CardAttachmentAsset.sort_order"
    )
    source_links: Mapped[list["CardSourceAsset"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    notebook_links: Mapped[list["NotebookAssetLink"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    chapter_cover_links: Mapped[list["Chapter"]] = relationship(
        foreign_keys="Chapter.cover_asset_id",
        viewonly=True,
    )
    scene_background_links: Mapped[list["Scene"]] = relationship(
        foreign_keys="Scene.background_asset_id",
        viewonly=True,
    )
    scene_map_links: Mapped[list["Scene"]] = relationship(
        foreign_keys="Scene.map_asset_id",
        viewonly=True,
    )
    scene_token_links: Mapped[list["SceneToken"]] = relationship(
        foreign_keys="SceneToken.asset_id",
        viewonly=True,
    )


class CardGalleryAsset(Base, TimestampMixin):
    __tablename__ = "card_gallery_assets"
    __table_args__ = (UniqueConstraint("card_id", "asset_id", name="uq_card_gallery_asset"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    card: Mapped[Card] = relationship(backref="gallery_asset_links")
    asset: Mapped[Asset] = relationship(back_populates="gallery_links")


class CardAttachmentAsset(Base, TimestampMixin):
    __tablename__ = "card_attachment_assets"
    __table_args__ = (UniqueConstraint("card_id", "asset_id", name="uq_card_attachment_asset"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    card: Mapped[Card] = relationship(backref="attachment_asset_links")
    asset: Mapped[Asset] = relationship(back_populates="attachment_links")


class CardSourceAsset(Base, TimestampMixin):
    __tablename__ = "card_source_assets"
    __table_args__ = (UniqueConstraint("source_id", "asset_id", name="uq_card_source_asset"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("card_sources.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)

    source: Mapped[CardSource] = relationship(backref="asset_links")
    asset: Mapped[Asset] = relationship(back_populates="source_links")


class CardAsset(Base, TimestampMixin):
    __tablename__ = "card_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), default="application/octet-stream")
    size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    card: Mapped[Card] = relationship(back_populates="assets")


class NotebookAssetLink(Base, TimestampMixin):
    __tablename__ = "notebook_asset_links"
    __table_args__ = (UniqueConstraint("item_id", "asset_id", name="uq_notebook_asset_link"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    item_type: Mapped[str] = mapped_column(String(32), nullable=False, default="asset_reference")
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)

    asset: Mapped[Asset] = relationship(back_populates="notebook_links")


class PlotEvent(Base, TimestampMixin):
    __tablename__ = "plot_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Event", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="#4ba8d6", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    event_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    card_links: Mapped[list["PlotEventCardLink"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    outgoing_links: Mapped[list["PlotEventLink"]] = relationship(
        back_populates="source_event",
        foreign_keys="PlotEventLink.source_event_id",
        cascade="all, delete-orphan",
    )
    incoming_links: Mapped[list["PlotEventLink"]] = relationship(
        back_populates="target_event",
        foreign_keys="PlotEventLink.target_event_id",
        cascade="all, delete-orphan",
    )
    layouts: Mapped[list["PlotEventLayout"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class PlotEventCardLink(Base, TimestampMixin):
    __tablename__ = "plot_event_card_links"
    __table_args__ = (UniqueConstraint("event_id", "card_id", "role", name="uq_plot_event_card_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("plot_events.id", ondelete="CASCADE"), nullable=False)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="related", nullable=False)

    event: Mapped[PlotEvent] = relationship(back_populates="card_links")
    card: Mapped[Card] = relationship()


class PlotEventLink(Base, TimestampMixin):
    __tablename__ = "plot_event_links"
    __table_args__ = (
        UniqueConstraint("source_event_id", "target_event_id", "relation_type", name="uq_plot_event_link_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_event_id: Mapped[int] = mapped_column(ForeignKey("plot_events.id", ondelete="CASCADE"), nullable=False)
    target_event_id: Mapped[int] = mapped_column(ForeignKey("plot_events.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(32), default="sequence", nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)

    source_event: Mapped[PlotEvent] = relationship(
        back_populates="outgoing_links", foreign_keys=[source_event_id]
    )
    target_event: Mapped[PlotEvent] = relationship(
        back_populates="incoming_links", foreign_keys=[target_event_id]
    )


class PlotEventLayout(Base, TimestampMixin):
    __tablename__ = "plot_event_layouts"
    __table_args__ = (UniqueConstraint("event_id", "view_id", name="uq_plot_event_layout_view"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("plot_events.id", ondelete="CASCADE"), nullable=False)
    view_id: Mapped[str] = mapped_column(String(64), default="default", nullable=False)
    x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=260.0, nullable=False)
    height: Mapped[float] = mapped_column(Float, default=160.0, nullable=False)

    event: Mapped[PlotEvent] = relationship(back_populates="layouts")


class Chapter(Base, TimestampMixin):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Chapter", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    notes_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    notes_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cover_asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    view_settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    cover_asset: Mapped[Optional["Asset"]] = relationship()
    references: Mapped[list["ChapterReference"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="ChapterReference.sort_order",
    )
    scenes: Mapped[list["Scene"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="Scene.sort_order",
    )
    dice_shortcuts: Mapped[list["DiceShortcut"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="DiceShortcut.sort_order",
    )


class ChapterReference(Base, TimestampMixin):
    __tablename__ = "chapter_references"
    __table_args__ = (
        UniqueConstraint("chapter_id", "target_type", "target_id", "role", name="uq_chapter_reference_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="related", nullable=False)
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chapter: Mapped[Chapter] = relationship(back_populates="references")


class Scene(Base, TimestampMixin):
    __tablename__ = "scenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Scene", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="prep", nullable=False)
    gm_notes_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    gm_notes_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    player_notes_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    player_notes_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    quick_notes_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    background_asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    map_asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    play_settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    runtime_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    chapter: Mapped[Chapter] = relationship(back_populates="scenes")
    background_asset: Mapped[Optional["Asset"]] = relationship(foreign_keys=[background_asset_id])
    map_asset: Mapped[Optional["Asset"]] = relationship(foreign_keys=[map_asset_id])
    references: Mapped[list["SceneReference"]] = relationship(
        back_populates="scene",
        cascade="all, delete-orphan",
        order_by="SceneReference.sort_order",
    )
    tokens: Mapped[list["SceneToken"]] = relationship(
        back_populates="scene",
        cascade="all, delete-orphan",
        order_by="SceneToken.z_index",
    )
    dice_shortcuts: Mapped[list["DiceShortcut"]] = relationship(
        back_populates="scene",
        cascade="all, delete-orphan",
        order_by="DiceShortcut.sort_order",
    )


class SceneReference(Base, TimestampMixin):
    __tablename__ = "scene_references"
    __table_args__ = (
        UniqueConstraint("scene_id", "target_type", "target_id", "role", name="uq_scene_reference_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="related", nullable=False)
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    visibility: Mapped[str] = mapped_column(String(16), default="gm", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    scene: Mapped[Scene] = relationship(back_populates="references")


class SceneToken(Base, TimestampMixin):
    __tablename__ = "scene_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    card_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    visibility: Mapped[str] = mapped_column(String(16), default="gm", nullable=False)
    x: Mapped[float] = mapped_column(Float, default=120.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=120.0, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=96.0, nullable=False)
    height: Mapped[float] = mapped_column(Float, default=96.0, nullable=False)
    z_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)

    scene: Mapped[Scene] = relationship(back_populates="tokens")
    card: Mapped[Optional[Card]] = relationship()
    asset: Mapped[Optional[Asset]] = relationship()


class DiceShortcut(Base, TimestampMixin):
    __tablename__ = "dice_shortcuts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    scene_id: Mapped[Optional[int]] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), nullable=True)
    label: Mapped[str] = mapped_column(String(120), default="Roll", nullable=False)
    formula: Mapped[str] = mapped_column(String(80), default="d20", nullable=False)
    visibility: Mapped[str] = mapped_column(String(16), default="gm", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chapter: Mapped[Optional[Chapter]] = relationship(back_populates="dice_shortcuts")
    scene: Mapped[Optional[Scene]] = relationship(back_populates="dice_shortcuts")


class Board(Base, TimestampMixin):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Moodboard", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    view_settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    items: Mapped[list["BoardItem"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardItem.z_index",
    )
    edges: Mapped[list["BoardEdge"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
    )


class BoardItem(Base, TimestampMixin):
    __tablename__ = "board_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    item_type: Mapped[str] = mapped_column(String(32), default="text", nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    body_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    body_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    card_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    href: Mapped[str] = mapped_column(Text, default="", nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="#4ba8d6", nullable=False)
    x: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=240.0, nullable=False)
    height: Mapped[float] = mapped_column(Float, default=150.0, nullable=False)
    z_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    board: Mapped[Board] = relationship(back_populates="items")
    card: Mapped[Optional[Card]] = relationship()
    asset: Mapped[Optional[Asset]] = relationship()


class BoardEdge(Base, TimestampMixin):
    __tablename__ = "board_edges"
    __table_args__ = (
        UniqueConstraint("board_id", "source_item_id", "target_item_id", "relation_type", name="uq_board_edge_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    source_item_id: Mapped[int] = mapped_column(ForeignKey("board_items.id", ondelete="CASCADE"), nullable=False)
    target_item_id: Mapped[int] = mapped_column(ForeignKey("board_items.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(32), default="related", nullable=False)
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)

    board: Mapped[Board] = relationship(back_populates="edges")
    source_item: Mapped[BoardItem] = relationship(foreign_keys=[source_item_id])
    target_item: Mapped[BoardItem] = relationship(foreign_keys=[target_item_id])


class CharacterGroup(Base, TimestampMixin):
    __tablename__ = "character_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="#4ba8d6", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class CharacterGraphNodeLayout(Base, TimestampMixin):
    __tablename__ = "character_graph_node_layouts"
    __table_args__ = (UniqueConstraint("graph_id", "card_id", name="uq_character_graph_node"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    graph_id: Mapped[str] = mapped_column(String(64), default="default", nullable=False)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), nullable=False)
    x: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=220.0, nullable=False)
    height: Mapped[float] = mapped_column(Float, default=120.0, nullable=False)

    card: Mapped[Card] = relationship()

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import (
    Boolean,
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

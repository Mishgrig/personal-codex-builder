from __future__ import annotations

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.models.workspace import Card, CardSchema, SchemaFieldDefinition
from app.utils.slug import validate_card_slug


def ensure_unique_slug(session: Session, slug: str, card_id: int | None = None) -> None:
    stmt: Select[tuple[Card]] = select(Card).where(Card.slug == slug)
    existing = session.execute(stmt).scalar_one_or_none()
    if existing and existing.id != card_id:
        raise ConflictError(f"Slug '{slug}' is already used by another card.")


def validate_card_payload(
    session: Session,
    *,
    slug: str,
    schema_id: str | None,
    dynamic_fields: dict,
    card_id: int | None = None,
) -> None:
    if not validate_card_slug(slug):
        raise ConflictError("Slug must match the format card-xxxxxx.")
    ensure_unique_slug(session, slug, card_id=card_id)
    if not schema_id:
        return
    schema = session.get(CardSchema, schema_id)
    if not schema:
        raise ConflictError(f"Schema '{schema_id}' does not exist.")
    required_fields = session.execute(
        select(SchemaFieldDefinition).where(
            SchemaFieldDefinition.schema_id == schema_id,
            SchemaFieldDefinition.required.is_(True),
            SchemaFieldDefinition.is_active.is_(True),
        )
    ).scalars()
    missing = [field.label for field in required_fields if not dynamic_fields.get(field.field_id)]
    if missing:
        raise ConflictError(f"Missing required schema fields: {', '.join(missing)}.")


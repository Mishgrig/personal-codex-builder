from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.workspace import CardSchema, SchemaFieldDefinition
from app.schemas.schema import CardSchemaCreate


def list_schemas(session: Session) -> list[CardSchema]:
    return list(
        session.execute(
            select(CardSchema)
            .options(selectinload(CardSchema.fields))
            .order_by(CardSchema.label.asc())
        ).scalars()
    )


def upsert_schema(session: Session, payload: CardSchemaCreate) -> CardSchema:
    schema = session.get(CardSchema, payload.id)
    if schema is None:
        schema = CardSchema(id=payload.id)
    schema.label = payload.label
    schema.description = payload.description
    schema.icon = payload.icon
    schema.field_order = payload.field_order or [field.field_id for field in payload.fields]
    schema.is_active = payload.is_active

    existing_fields = {field.field_id: field for field in schema.fields}
    incoming_ids = {field.field_id for field in payload.fields}
    for field_id, existing in list(existing_fields.items()):
        if field_id not in incoming_ids:
            schema.fields.remove(existing)

    for item in payload.fields:
        field = existing_fields.get(item.field_id)
        if field is None:
            field = SchemaFieldDefinition(field_id=item.field_id)
            schema.fields.append(field)
        field.label = item.label
        field.kind = item.kind
        field.description = item.description
        field.required = item.required
        field.repeatable = item.repeatable
        field.default_value = item.default_value
        field.options = item.options
        field.placeholder = item.placeholder
        field.show_in_card = item.show_in_card
        field.show_in_list = item.show_in_list
        field.show_in_filters = item.show_in_filters
        field.validation = item.validation
        field.sort_order = item.sort_order
        field.is_active = item.is_active

    session.add(schema)
    session.commit()
    session.refresh(schema)
    return session.execute(
        select(CardSchema)
        .options(selectinload(CardSchema.fields))
        .where(CardSchema.id == schema.id)
    ).scalar_one()


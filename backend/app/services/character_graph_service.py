from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.workspace import Card, CardRelation, CharacterGraphNodeLayout, CharacterGroup
from app.schemas.character_graph import (
    CharacterGraphEdgeRead,
    CharacterGraphNodeLayoutRead,
    CharacterGraphNodeLayoutUpdate,
    CharacterGraphNodeRead,
    CharacterGraphRead,
    CharacterGroupCreate,
    CharacterGroupRead,
    CharacterGroupUpdate,
)


def list_character_groups(session: Session) -> list[CharacterGroupRead]:
    groups = session.execute(select(CharacterGroup).order_by(CharacterGroup.sort_order.asc(), CharacterGroup.name.asc())).scalars().all()
    counts = _group_counts(session)
    return [serialize_character_group(group, counts.get(group.name, 0)) for group in groups]


def create_character_group(session: Session, payload: CharacterGroupCreate) -> CharacterGroupRead:
    slug = payload.slug or slugify(payload.name)
    existing = session.execute(select(CharacterGroup).where(CharacterGroup.slug == slug)).scalar_one_or_none()
    if existing:
        raise ConflictError("Character group slug already exists.")
    group = CharacterGroup(
        name=payload.name,
        slug=slug,
        color=payload.color,
        description=payload.description,
        sort_order=_next_group_sort_order(session),
    )
    session.add(group)
    session.commit()
    session.refresh(group)
    return serialize_character_group(group, _group_counts(session).get(group.name, 0))


def update_character_group(session: Session, group_id: int, payload: CharacterGroupUpdate) -> CharacterGroupRead:
    group = session.get(CharacterGroup, group_id)
    if not group:
        raise NotFoundError("Character group was not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, key, value)
    session.add(group)
    session.commit()
    session.refresh(group)
    return serialize_character_group(group, _group_counts(session).get(group.name, 0))


def delete_character_group(session: Session, group_id: int) -> None:
    group = session.get(CharacterGroup, group_id)
    if not group:
        raise NotFoundError("Character group was not found.")
    session.delete(group)
    session.commit()


def get_character_graph(session: Session, graph_id: str = "default") -> CharacterGraphRead:
    characters = _character_cards(session)
    character_ids = {card.id for card in characters}
    layouts = {
        layout.card_id: layout
        for layout in session.execute(
            select(CharacterGraphNodeLayout).where(CharacterGraphNodeLayout.graph_id == graph_id)
        ).scalars()
    }
    edges = session.execute(
        select(CardRelation)
        .options(selectinload(CardRelation.source_card), selectinload(CardRelation.target_card))
        .where(CardRelation.source_card_id.in_(character_ids), CardRelation.target_card_id.in_(character_ids))
    ).scalars().all()
    return CharacterGraphRead(
        graph_id=graph_id,
        groups=list_character_groups(session),
        nodes=[
            CharacterGraphNodeRead(
                id=card.id,
                uid=card.uid,
                title=card.title,
                summary=card.summary,
                group=str((card.dynamic_fields or {}).get("group") or ""),
                role=str((card.dynamic_fields or {}).get("role") or ""),
                dynamic_fields=card.dynamic_fields or {},
                layout=_layout_read(card, layouts.get(card.id), index),
            )
            for index, card in enumerate(characters)
        ],
        edges=[
            CharacterGraphEdgeRead(
                id=edge.id,
                source_card_id=edge.source_card_id,
                target_card_id=edge.target_card_id,
                source_title=edge.source_card.title if edge.source_card else "",
                target_title=edge.target_card.title if edge.target_card else "",
                relation_type=edge.relation_type,
                note=edge.note,
            )
            for edge in edges
        ],
    )


def update_character_graph_layout(session: Session, payload: CharacterGraphNodeLayoutUpdate) -> CharacterGraphRead:
    card = session.get(Card, payload.card_id)
    if not card or card.schema_id not in {"character", "npc"}:
        raise NotFoundError("Character card was not found.")
    layout = session.execute(
        select(CharacterGraphNodeLayout).where(
            CharacterGraphNodeLayout.graph_id == payload.graph_id,
            CharacterGraphNodeLayout.card_id == payload.card_id,
        )
    ).scalar_one_or_none()
    if not layout:
        layout = CharacterGraphNodeLayout(graph_id=payload.graph_id, card_id=payload.card_id)
    layout.x = payload.x
    layout.y = payload.y
    layout.width = payload.width
    layout.height = payload.height
    session.add(layout)
    session.commit()
    session.expire_all()
    return get_character_graph(session, payload.graph_id)


def serialize_character_group(group: CharacterGroup, character_count: int = 0) -> CharacterGroupRead:
    return CharacterGroupRead(
        id=group.id,
        slug=group.slug,
        name=group.name,
        color=group.color,
        description=group.description,
        sort_order=group.sort_order,
        character_count=character_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def _character_cards(session: Session) -> list[Card]:
    return list(
        session.execute(
            select(Card)
            .where(Card.schema_id.in_(["character", "npc"]))
            .order_by(Card.sort_order.asc(), Card.title.asc())
        ).scalars()
    )


def _layout_read(card: Card, layout: CharacterGraphNodeLayout | None, index: int) -> CharacterGraphNodeLayoutRead:
    if layout:
        return CharacterGraphNodeLayoutRead(
            id=layout.id,
            graph_id=layout.graph_id,
            card_id=card.id,
            x=layout.x,
            y=layout.y,
            width=layout.width,
            height=layout.height,
        )
    return CharacterGraphNodeLayoutRead(
        graph_id="default",
        card_id=card.id,
        x=80 + (index % 4) * 270,
        y=80 + (index // 4) * 170,
        width=220,
        height=120,
    )


def _group_counts(session: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    for card in _character_cards(session):
        group = str((card.dynamic_fields or {}).get("group") or "")
        if group:
            counts[group] = counts.get(group, 0) + 1
    return counts


def _next_group_sort_order(session: Session) -> float:
    latest = session.execute(select(CharacterGroup).order_by(CharacterGroup.sort_order.desc())).scalars().first()
    return (latest.sort_order + 100.0) if latest else 100.0


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "group"

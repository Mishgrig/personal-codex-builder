from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.workspace import Card, PlotEvent, PlotEventCardLink, PlotEventLayout, PlotEventLink
from app.schemas.plot import (
    PlotEventCardLinkCreate,
    PlotEventCardLinkRead,
    PlotEventCreate,
    PlotEventLayoutRead,
    PlotEventLayoutUpdate,
    PlotEventLinkCreate,
    PlotEventLinkRead,
    PlotEventRead,
    PlotEventUpdate,
)


def _event_options():
    return (
        selectinload(PlotEvent.card_links).selectinload(PlotEventCardLink.card).selectinload(Card.schema),
        selectinload(PlotEvent.outgoing_links).selectinload(PlotEventLink.target_event),
        selectinload(PlotEvent.layouts),
    )


def get_plot_event(session: Session, event_id: int) -> PlotEvent:
    event = session.execute(
        select(PlotEvent).options(*_event_options()).where(PlotEvent.id == event_id)
    ).scalar_one_or_none()
    if not event:
        raise NotFoundError("Plot event was not found.")
    return event


def list_plot_events(session: Session, *, status: str = "", q: str = "") -> list[PlotEventRead]:
    stmt = select(PlotEvent).options(*_event_options()).order_by(PlotEvent.sort_order.asc(), PlotEvent.created_at.asc())
    if status:
        stmt = stmt.where(PlotEvent.status == status)
    events = list(session.execute(stmt).scalars().unique())
    if q.strip():
        query = q.strip().lower()
        events = [
            event for event in events if query in f"{event.title} {event.description} {event.event_date or ''}".lower()
        ]
    return [serialize_plot_event(event) for event in events]


def create_plot_event(session: Session, payload: PlotEventCreate) -> PlotEventRead:
    event = PlotEvent(
        uid=f"evt-{uuid4().hex[:12]}",
        title=payload.title,
        description=payload.description,
        color=payload.color,
        status=payload.status,
        event_date=payload.event_date,
        sort_order=_next_sort_order(session),
    )
    session.add(event)
    session.flush()
    for card_id in payload.card_ids:
        _add_card_link(session, event.id, card_id, "related")
    session.add(PlotEventLayout(event_id=event.id, view_id="default", x=40 + event.sort_order, y=40))
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event.id))


def update_plot_event(session: Session, event_id: int, payload: PlotEventUpdate) -> PlotEventRead:
    event = get_plot_event(session, event_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    session.add(event)
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def delete_plot_event(session: Session, event_id: int) -> None:
    event = get_plot_event(session, event_id)
    session.delete(event)
    session.commit()


def add_plot_event_card_link(session: Session, event_id: int, payload: PlotEventCardLinkCreate) -> PlotEventRead:
    _add_card_link(session, event_id, payload.card_id, payload.role)
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def delete_plot_event_card_link(session: Session, link_id: int) -> PlotEventRead:
    link = session.get(PlotEventCardLink, link_id)
    if not link:
        raise NotFoundError("Plot event card link was not found.")
    event_id = link.event_id
    session.delete(link)
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def add_plot_event_link(session: Session, event_id: int, payload: PlotEventLinkCreate) -> PlotEventRead:
    if event_id == payload.target_event_id:
        raise ConflictError("A plot event cannot link to itself.")
    get_plot_event(session, event_id)
    get_plot_event(session, payload.target_event_id)
    exists = session.execute(
        select(PlotEventLink).where(
            PlotEventLink.source_event_id == event_id,
            PlotEventLink.target_event_id == payload.target_event_id,
            PlotEventLink.relation_type == payload.relation_type,
        )
    ).scalar_one_or_none()
    if not exists:
        session.add(
            PlotEventLink(
                source_event_id=event_id,
                target_event_id=payload.target_event_id,
                relation_type=payload.relation_type,
                note=payload.note,
            )
        )
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def delete_plot_event_link(session: Session, link_id: int) -> PlotEventRead:
    link = session.get(PlotEventLink, link_id)
    if not link:
        raise NotFoundError("Plot event link was not found.")
    event_id = link.source_event_id
    session.delete(link)
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def update_plot_event_layout(session: Session, event_id: int, payload: PlotEventLayoutUpdate) -> PlotEventRead:
    get_plot_event(session, event_id)
    layout = session.execute(
        select(PlotEventLayout).where(PlotEventLayout.event_id == event_id, PlotEventLayout.view_id == payload.view_id)
    ).scalar_one_or_none()
    if not layout:
        layout = PlotEventLayout(event_id=event_id, view_id=payload.view_id)
    layout.x = payload.x
    layout.y = payload.y
    layout.width = payload.width
    layout.height = payload.height
    session.add(layout)
    session.commit()
    session.expire_all()
    return serialize_plot_event(get_plot_event(session, event_id))


def _add_card_link(session: Session, event_id: int, card_id: int, role: str) -> None:
    get_plot_event(session, event_id)
    card = session.get(Card, card_id)
    if not card:
        raise NotFoundError("Linked card was not found.")
    exists = session.execute(
        select(PlotEventCardLink).where(
            PlotEventCardLink.event_id == event_id,
            PlotEventCardLink.card_id == card_id,
            PlotEventCardLink.role == role,
        )
    ).scalar_one_or_none()
    if not exists:
        session.add(PlotEventCardLink(event_id=event_id, card_id=card_id, role=role))
        session.flush()


def _next_sort_order(session: Session) -> float:
    latest = session.execute(select(PlotEvent).order_by(PlotEvent.sort_order.desc())).scalars().first()
    return (latest.sort_order + 100.0) if latest else 100.0


def serialize_plot_event(event: PlotEvent) -> PlotEventRead:
    layout = next((item for item in event.layouts if item.view_id == "default"), event.layouts[0] if event.layouts else None)
    return PlotEventRead(
        id=event.id,
        uid=event.uid,
        title=event.title,
        description=event.description,
        color=event.color,
        status=event.status,
        event_date=event.event_date,
        sort_order=event.sort_order,
        card_links=[
            PlotEventCardLinkRead(
                id=link.id,
                card_id=link.card_id,
                role=link.role,
                card_title=link.card.title if link.card else "Missing card",
                card_schema_id=link.card.schema_id if link.card else None,
                card_schema_label=link.card.schema.label if link.card and link.card.schema else None,
                created_at=link.created_at,
            )
            for link in event.card_links
        ],
        event_links=[
            PlotEventLinkRead(
                id=link.id,
                source_event_id=link.source_event_id,
                target_event_id=link.target_event_id,
                target_title=link.target_event.title if link.target_event else "Missing event",
                relation_type=link.relation_type,
                note=link.note,
                created_at=link.created_at,
                updated_at=link.updated_at,
            )
            for link in event.outgoing_links
        ],
        layout=PlotEventLayoutRead(
            id=layout.id,
            event_id=layout.event_id,
            view_id=layout.view_id,
            x=layout.x,
            y=layout.y,
            width=layout.width,
            height=layout.height,
            created_at=layout.created_at,
            updated_at=layout.updated_at,
        )
        if layout
        else None,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_workspace_db
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.schemas.plot import (
    PlotEventCardLinkCreate,
    PlotEventCreate,
    PlotEventLayoutUpdate,
    PlotEventLinkCreate,
    PlotEventListRead,
    PlotEventRead,
    PlotEventUpdate,
)
from app.services.plot_service import (
    add_plot_event_card_link,
    add_plot_event_link,
    create_plot_event,
    delete_plot_event,
    delete_plot_event_card_link,
    delete_plot_event_link,
    get_plot_event,
    list_plot_events,
    serialize_plot_event,
    update_plot_event,
    update_plot_event_layout,
)

router = APIRouter(prefix="/workspaces/{workspace_slug}/plot-events")


@router.get("", response_model=APIDataEnvelope[PlotEventListRead])
def get_plot_events(
    workspace_slug: str,
    status: str = Query(default=""),
    q: str = Query(default=""),
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventListRead]:
    items = list_plot_events(session, status=status, q=q)
    return {"data": PlotEventListRead(items=items, total=len(items))}


@router.post("", response_model=APIDataEnvelope[PlotEventRead])
def post_plot_event(
    workspace_slug: str,
    payload: PlotEventCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": create_plot_event(session, payload)}


@router.get("/{event_id}", response_model=APIDataEnvelope[PlotEventRead])
def get_plot_event_detail(
    workspace_slug: str,
    event_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": serialize_plot_event(get_plot_event(session, event_id))}


@router.patch("/{event_id}", response_model=APIDataEnvelope[PlotEventRead])
def patch_plot_event(
    workspace_slug: str,
    event_id: int,
    payload: PlotEventUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": update_plot_event(session, event_id, payload)}


@router.delete("/{event_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_plot_event(
    workspace_slug: str,
    event_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_plot_event(session, event_id)
    return {"data": ActionStatus(message="Plot event deleted.")}


@router.post("/{event_id}/card-links", response_model=APIDataEnvelope[PlotEventRead])
def post_plot_event_card_link(
    workspace_slug: str,
    event_id: int,
    payload: PlotEventCardLinkCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": add_plot_event_card_link(session, event_id, payload)}


@router.delete("/card-links/{link_id}", response_model=APIDataEnvelope[PlotEventRead])
def remove_plot_event_card_link(
    workspace_slug: str,
    link_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": delete_plot_event_card_link(session, link_id)}


@router.post("/{event_id}/event-links", response_model=APIDataEnvelope[PlotEventRead])
def post_plot_event_link(
    workspace_slug: str,
    event_id: int,
    payload: PlotEventLinkCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": add_plot_event_link(session, event_id, payload)}


@router.delete("/event-links/{link_id}", response_model=APIDataEnvelope[PlotEventRead])
def remove_plot_event_link(
    workspace_slug: str,
    link_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": delete_plot_event_link(session, link_id)}


@router.patch("/{event_id}/layout", response_model=APIDataEnvelope[PlotEventRead])
def patch_plot_event_layout(
    workspace_slug: str,
    event_id: int,
    payload: PlotEventLayoutUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, PlotEventRead]:
    return {"data": update_plot_event_layout(session, event_id, payload)}

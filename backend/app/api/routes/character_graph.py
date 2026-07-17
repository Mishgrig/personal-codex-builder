from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_workspace_db
from app.schemas.character_graph import (
    CharacterGraphNodeLayoutUpdate,
    CharacterGraphRead,
    CharacterGroupCreate,
    CharacterGroupRead,
    CharacterGroupUpdate,
)
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.services.character_graph_service import (
    create_character_group,
    delete_character_group,
    get_character_graph,
    list_character_groups,
    update_character_graph_layout,
    update_character_group,
)

router = APIRouter(prefix="/workspaces/{workspace_slug}/characters")


@router.get("/groups", response_model=APIDataEnvelope[list[CharacterGroupRead]])
def get_character_groups(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, list[CharacterGroupRead]]:
    return {"data": list_character_groups(session)}


@router.post("/groups", response_model=APIDataEnvelope[CharacterGroupRead])
def post_character_group(
    workspace_slug: str,
    payload: CharacterGroupCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CharacterGroupRead]:
    return {"data": create_character_group(session, payload)}


@router.patch("/groups/{group_id}", response_model=APIDataEnvelope[CharacterGroupRead])
def patch_character_group(
    workspace_slug: str,
    group_id: int,
    payload: CharacterGroupUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CharacterGroupRead]:
    return {"data": update_character_group(session, group_id, payload)}


@router.delete("/groups/{group_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_character_group(
    workspace_slug: str,
    group_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_character_group(session, group_id)
    return {"data": ActionStatus(message="Character group deleted.")}


@router.get("/graph", response_model=APIDataEnvelope[CharacterGraphRead])
def get_graph(
    workspace_slug: str,
    graph_id: str = Query(default="default"),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CharacterGraphRead]:
    return {"data": get_character_graph(session, graph_id)}


@router.patch("/graph/layout", response_model=APIDataEnvelope[CharacterGraphRead])
def patch_graph_layout(
    workspace_slug: str,
    payload: CharacterGraphNodeLayoutUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CharacterGraphRead]:
    return {"data": update_character_graph_layout(session, payload)}

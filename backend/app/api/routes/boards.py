from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_workspace_db
from app.schemas.board import (
    BoardCreate,
    BoardEdgeCreate,
    BoardEdgeUpdate,
    BoardItemCreate,
    BoardItemUpdate,
    BoardListRead,
    BoardRead,
    BoardUpdate,
)
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.services.board_service import (
    create_board,
    create_board_edge,
    create_board_item,
    delete_board,
    delete_board_edge,
    delete_board_item,
    get_board,
    list_boards,
    serialize_board,
    update_board,
    update_board_edge,
    update_board_item,
)

router = APIRouter(prefix="/workspaces/{workspace_slug}/boards")


@router.get("", response_model=APIDataEnvelope[BoardListRead])
def get_boards(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardListRead]:
    items = list_boards(session)
    return {"data": BoardListRead(items=items, total=len(items))}


@router.post("", response_model=APIDataEnvelope[BoardRead])
def post_board(
    workspace_slug: str,
    payload: BoardCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": create_board(session, payload)}


@router.get("/{board_id}", response_model=APIDataEnvelope[BoardRead])
def get_board_detail(
    workspace_slug: str,
    board_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": serialize_board(get_board(session, board_id))}


@router.patch("/{board_id}", response_model=APIDataEnvelope[BoardRead])
def patch_board(
    workspace_slug: str,
    board_id: int,
    payload: BoardUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": update_board(session, board_id, payload)}


@router.delete("/{board_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_board(
    workspace_slug: str,
    board_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_board(session, board_id)
    return {"data": ActionStatus(message="Board deleted.")}


@router.post("/{board_id}/items", response_model=APIDataEnvelope[BoardRead])
def post_board_item(
    workspace_slug: str,
    board_id: int,
    payload: BoardItemCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": create_board_item(session, board_id, payload)}


@router.patch("/items/{item_id}", response_model=APIDataEnvelope[BoardRead])
def patch_board_item(
    workspace_slug: str,
    item_id: int,
    payload: BoardItemUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": update_board_item(session, item_id, payload)}


@router.delete("/items/{item_id}", response_model=APIDataEnvelope[BoardRead])
def remove_board_item(
    workspace_slug: str,
    item_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": delete_board_item(session, item_id)}


@router.post("/{board_id}/edges", response_model=APIDataEnvelope[BoardRead])
def post_board_edge(
    workspace_slug: str,
    board_id: int,
    payload: BoardEdgeCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": create_board_edge(session, board_id, payload)}


@router.patch("/edges/{edge_id}", response_model=APIDataEnvelope[BoardRead])
def patch_board_edge(
    workspace_slug: str,
    edge_id: int,
    payload: BoardEdgeUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": update_board_edge(session, edge_id, payload)}


@router.delete("/edges/{edge_id}", response_model=APIDataEnvelope[BoardRead])
def remove_board_edge(
    workspace_slug: str,
    edge_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, BoardRead]:
    return {"data": delete_board_edge(session, edge_id)}

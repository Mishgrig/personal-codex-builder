from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.workspace import Asset, Board, BoardEdge, BoardItem, Card
from app.schemas.board import (
    BoardCreate,
    BoardEdgeCreate,
    BoardEdgeRead,
    BoardEdgeUpdate,
    BoardItemCreate,
    BoardItemRead,
    BoardItemUpdate,
    BoardRead,
    BoardUpdate,
)


def _board_options():
    return (
        selectinload(Board.items).selectinload(BoardItem.card),
        selectinload(Board.items).selectinload(BoardItem.asset),
        selectinload(Board.edges),
    )


def list_boards(session: Session) -> list[BoardRead]:
    boards = session.execute(
        select(Board).options(*_board_options()).order_by(Board.sort_order.asc(), Board.created_at.asc())
    ).scalars().unique()
    return [serialize_board(board) for board in boards]


def get_board(session: Session, board_id: int) -> Board:
    board = session.execute(
        select(Board).options(*_board_options()).where(Board.id == board_id)
    ).scalar_one_or_none()
    if not board:
        raise NotFoundError("Board was not found.")
    return board


def create_board(session: Session, payload: BoardCreate) -> BoardRead:
    board = Board(
        uid=f"brd-{uuid4().hex[:12]}",
        title=payload.title,
        description=payload.description,
        view_settings=payload.view_settings,
        sort_order=_next_board_sort_order(session),
    )
    session.add(board)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board.id))


def update_board(session: Session, board_id: int, payload: BoardUpdate) -> BoardRead:
    board = get_board(session, board_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(board, key, value)
    session.add(board)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def delete_board(session: Session, board_id: int) -> None:
    board = get_board(session, board_id)
    session.delete(board)
    session.commit()


def create_board_item(session: Session, board_id: int, payload: BoardItemCreate) -> BoardRead:
    get_board(session, board_id)
    _validate_item_references(session, payload.card_id, payload.asset_id)
    item = BoardItem(
        uid=f"bit-{uuid4().hex[:12]}",
        board_id=board_id,
        item_type=payload.item_type,
        title=payload.title,
        body_text=payload.body_text,
        body_json=payload.body_json,
        card_id=payload.card_id,
        asset_id=payload.asset_id,
        href=payload.href,
        color=payload.color,
        x=payload.x,
        y=payload.y,
        width=payload.width,
        height=payload.height,
        z_index=payload.z_index or _next_item_z_index(session, board_id),
    )
    session.add(item)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def update_board_item(session: Session, item_id: int, payload: BoardItemUpdate) -> BoardRead:
    item = session.get(BoardItem, item_id)
    if not item:
        raise NotFoundError("Board item was not found.")
    data = payload.model_dump(exclude_unset=True)
    _validate_item_references(session, data.get("card_id"), data.get("asset_id"))
    for key, value in data.items():
        setattr(item, key, value)
    board_id = item.board_id
    session.add(item)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def delete_board_item(session: Session, item_id: int) -> BoardRead:
    item = session.get(BoardItem, item_id)
    if not item:
        raise NotFoundError("Board item was not found.")
    board_id = item.board_id
    session.delete(item)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def create_board_edge(session: Session, board_id: int, payload: BoardEdgeCreate) -> BoardRead:
    if payload.source_item_id == payload.target_item_id:
        raise ConflictError("A board item cannot connect to itself.")
    get_board(session, board_id)
    source = _get_board_item(session, payload.source_item_id)
    target = _get_board_item(session, payload.target_item_id)
    if source.board_id != board_id or target.board_id != board_id:
        raise ConflictError("Board edges can only connect items on the same board.")
    exists = session.execute(
        select(BoardEdge).where(
            BoardEdge.board_id == board_id,
            BoardEdge.source_item_id == payload.source_item_id,
            BoardEdge.target_item_id == payload.target_item_id,
            BoardEdge.relation_type == payload.relation_type,
        )
    ).scalar_one_or_none()
    if not exists:
        session.add(
            BoardEdge(
                board_id=board_id,
                source_item_id=payload.source_item_id,
                target_item_id=payload.target_item_id,
                relation_type=payload.relation_type,
                label=payload.label,
            )
        )
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def update_board_edge(session: Session, edge_id: int, payload: BoardEdgeUpdate) -> BoardRead:
    edge = session.get(BoardEdge, edge_id)
    if not edge:
        raise NotFoundError("Board edge was not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(edge, key, value)
    board_id = edge.board_id
    session.add(edge)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def delete_board_edge(session: Session, edge_id: int) -> BoardRead:
    edge = session.get(BoardEdge, edge_id)
    if not edge:
        raise NotFoundError("Board edge was not found.")
    board_id = edge.board_id
    session.delete(edge)
    session.commit()
    session.expire_all()
    return serialize_board(get_board(session, board_id))


def serialize_board(board: Board) -> BoardRead:
    return BoardRead(
        id=board.id,
        uid=board.uid,
        title=board.title,
        description=board.description,
        view_settings=board.view_settings,
        sort_order=board.sort_order,
        items=[
            BoardItemRead(
                id=item.id,
                uid=item.uid,
                board_id=item.board_id,
                item_type=item.item_type,
                title=item.title,
                body_text=item.body_text,
                body_json=item.body_json,
                card_id=item.card_id,
                asset_id=item.asset_id,
                href=item.href,
                color=item.color,
                x=item.x,
                y=item.y,
                width=item.width,
                height=item.height,
                z_index=item.z_index,
                card_title=item.card.title if item.card else None,
                asset_filename=item.asset.original_filename if item.asset else None,
                asset_url=f"/media/{item.asset.relative_path}" if item.asset else None,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in board.items
        ],
        edges=[
            BoardEdgeRead(
                id=edge.id,
                board_id=edge.board_id,
                source_item_id=edge.source_item_id,
                target_item_id=edge.target_item_id,
                relation_type=edge.relation_type,
                label=edge.label,
                created_at=edge.created_at,
                updated_at=edge.updated_at,
            )
            for edge in board.edges
        ],
        created_at=board.created_at,
        updated_at=board.updated_at,
    )


def _get_board_item(session: Session, item_id: int) -> BoardItem:
    item = session.get(BoardItem, item_id)
    if not item:
        raise NotFoundError("Board item was not found.")
    return item


def _validate_item_references(session: Session, card_id: int | None, asset_id: str | None) -> None:
    if card_id is not None and not session.get(Card, card_id):
        raise NotFoundError("Linked card was not found.")
    if asset_id is not None and not session.get(Asset, asset_id):
        raise NotFoundError("Linked asset was not found.")


def _next_board_sort_order(session: Session) -> float:
    latest = session.execute(select(Board).order_by(Board.sort_order.desc())).scalars().first()
    return (latest.sort_order + 100.0) if latest else 100.0


def _next_item_z_index(session: Session, board_id: int) -> int:
    latest = session.execute(
        select(BoardItem).where(BoardItem.board_id == board_id).order_by(BoardItem.z_index.desc())
    ).scalars().first()
    return (latest.z_index + 1) if latest else 1

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_workspace_db, get_workspace_slug
from app.schemas.card import (
    CardCreate,
    CardDetail,
    CardRelationCreate,
    CardReorderPayload,
    CardSourceCreate,
    CardSourceRead,
    CardUpdate,
    SearchResult,
)
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.services.card_service import (
    add_relation,
    add_source,
    create_card,
    delete_card,
    delete_relation,
    delete_source,
    get_card,
    reorder_cards,
    reorder_gallery,
    serialize_card_detail,
    update_card,
    update_source,
)
from app.services.file_service import add_asset, delete_asset
from app.services.search_service import rebuild_index, search_cards

router = APIRouter()
workspace_router = APIRouter(prefix="/workspaces/{workspace_slug}/cards")


def _search_result(
    session: Session,
    *,
    q: str,
    domain: int | None,
    type_term: int | None,
    subtype: int | None,
    layer: int | None,
    sort: str,
) -> SearchResult:
    return search_cards(
        session,
        q=q,
        domain=domain,
        type_term=type_term,
        subtype=subtype,
        layer=layer,
        sort_mode=sort,
    )


def _get_card_detail_payload(session: Session, card_id: int) -> CardDetail:
    return serialize_card_detail(get_card(session, card_id))


@router.get("", response_model=APIDataEnvelope[SearchResult])
def list_cards(
    q: str = "",
    domain: int | None = Query(default=None),
    type_term: int | None = Query(default=None, alias="type"),
    subtype: int | None = Query(default=None),
    layer: int | None = Query(default=None),
    sort: str = Query(default="manual"),
    session: Session = Depends(get_db),
) -> dict[str, SearchResult]:
    return {
        "data": _search_result(
            session,
            q=q,
            domain=domain,
            type_term=type_term,
            subtype=subtype,
            layer=layer,
            sort=sort,
        )
    }


@workspace_router.get("", response_model=APIDataEnvelope[SearchResult])
def list_workspace_cards(
    workspace_slug: str,
    q: str = "",
    domain: int | None = Query(default=None),
    type_term: int | None = Query(default=None, alias="type"),
    subtype: int | None = Query(default=None),
    layer: int | None = Query(default=None),
    sort: str = Query(default="manual"),
    session: Session = Depends(get_workspace_db),
) -> dict[str, SearchResult]:
    return {
        "data": _search_result(
            session,
            q=q,
            domain=domain,
            type_term=type_term,
            subtype=subtype,
            layer=layer,
            sort=sort,
        )
    }


@router.post("", response_model=APIDataEnvelope[CardDetail])
def post_card(payload: CardCreate, session: Session = Depends(get_db)) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(create_card(session, payload))}


@workspace_router.post("", response_model=APIDataEnvelope[CardDetail])
def post_workspace_card(
    workspace_slug: str,
    payload: CardCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(create_card(session, payload))}


@router.get("/{card_id}", response_model=APIDataEnvelope[CardDetail])
def get_card_detail(card_id: int, session: Session = Depends(get_db)) -> dict[str, CardDetail]:
    return {"data": _get_card_detail_payload(session, card_id)}


@workspace_router.get("/{card_id}", response_model=APIDataEnvelope[CardDetail])
def get_workspace_card_detail(
    workspace_slug: str,
    card_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    return {"data": _get_card_detail_payload(session, card_id)}


@router.patch("/{card_id}", response_model=APIDataEnvelope[CardDetail])
def patch_card(card_id: int, payload: CardUpdate, session: Session = Depends(get_db)) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(update_card(session, card_id, payload))}


@workspace_router.patch("/{card_id}", response_model=APIDataEnvelope[CardDetail])
def patch_workspace_card(
    workspace_slug: str,
    card_id: int,
    payload: CardUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(update_card(session, card_id, payload))}


@router.delete("/{card_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_card(card_id: int, session: Session = Depends(get_db)) -> dict[str, ActionStatus]:
    delete_card(session, card_id)
    return {"data": ActionStatus(message="Card deleted.")}


@workspace_router.delete("/{card_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_workspace_card(
    workspace_slug: str,
    card_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_card(session, card_id)
    return {"data": ActionStatus(message="Card deleted.")}


@router.post("/reorder", response_model=APIDataEnvelope[ActionStatus])
def post_reorder(payload: CardReorderPayload, session: Session = Depends(get_db)) -> dict[str, ActionStatus]:
    reorder_cards(session, payload.ordered_ids)
    return {"data": ActionStatus(message="Cards reordered.")}


@workspace_router.post("/reorder", response_model=APIDataEnvelope[ActionStatus])
def post_workspace_reorder(
    workspace_slug: str,
    payload: CardReorderPayload,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    reorder_cards(session, payload.ordered_ids)
    return {"data": ActionStatus(message="Cards reordered.")}


@router.post("/{card_id}/sources", response_model=APIDataEnvelope[CardSourceRead])
def post_source(
    card_id: int,
    payload: CardSourceCreate,
    session: Session = Depends(get_db),
) -> dict[str, CardSourceRead]:
    return {"data": CardSourceRead.model_validate(add_source(session, card_id, payload))}


@workspace_router.post("/{card_id}/sources", response_model=APIDataEnvelope[CardSourceRead])
def post_workspace_source(
    workspace_slug: str,
    card_id: int,
    payload: CardSourceCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardSourceRead]:
    return {"data": CardSourceRead.model_validate(add_source(session, card_id, payload))}


@router.put("/sources/{source_id}", response_model=APIDataEnvelope[CardSourceRead])
def put_source(
    source_id: int,
    payload: CardSourceCreate,
    session: Session = Depends(get_db),
) -> dict[str, CardSourceRead]:
    return {"data": CardSourceRead.model_validate(update_source(session, source_id, payload))}


@workspace_router.put("/sources/{source_id}", response_model=APIDataEnvelope[CardSourceRead])
def put_workspace_source(
    workspace_slug: str,
    source_id: int,
    payload: CardSourceCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardSourceRead]:
    return {"data": CardSourceRead.model_validate(update_source(session, source_id, payload))}


@router.delete("/sources/{source_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_source(source_id: int, session: Session = Depends(get_db)) -> dict[str, ActionStatus]:
    delete_source(session, source_id)
    return {"data": ActionStatus(message="Source deleted.")}


@workspace_router.delete("/sources/{source_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_workspace_source(
    workspace_slug: str,
    source_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_source(session, source_id)
    return {"data": ActionStatus(message="Source deleted.")}


@router.post("/{card_id}/relations", response_model=APIDataEnvelope[CardDetail])
def post_relation(
    card_id: int,
    payload: CardRelationCreate,
    session: Session = Depends(get_db),
) -> dict[str, CardDetail]:
    add_relation(session, card_id, payload)
    return {"data": _get_card_detail_payload(session, card_id)}


@workspace_router.post("/{card_id}/relations", response_model=APIDataEnvelope[CardDetail])
def post_workspace_relation(
    workspace_slug: str,
    card_id: int,
    payload: CardRelationCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    add_relation(session, card_id, payload)
    return {"data": _get_card_detail_payload(session, card_id)}


@router.delete("/relations/{relation_id}", response_model=APIDataEnvelope[CardDetail])
def remove_relation(
    relation_id: int,
    card_id: int = Query(...),
    session: Session = Depends(get_db),
) -> dict[str, CardDetail]:
    delete_relation(session, relation_id)
    return {"data": _get_card_detail_payload(session, card_id)}


@workspace_router.delete("/relations/{relation_id}", response_model=APIDataEnvelope[CardDetail])
def remove_workspace_relation(
    workspace_slug: str,
    relation_id: int,
    card_id: int = Query(...),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    delete_relation(session, relation_id)
    return {"data": _get_card_detail_payload(session, card_id)}


@router.post("/{card_id}/assets/{kind}", response_model=APIDataEnvelope[CardDetail])
def post_asset(
    card_id: int,
    kind: str,
    upload: UploadFile = File(...),
    session: Session = Depends(get_db),
    workspace_slug: str = Depends(get_workspace_slug),
) -> dict[str, CardDetail]:
    add_asset(session, workspace_slug=workspace_slug, card_id=card_id, kind=kind, upload=upload)
    return {"data": _get_card_detail_payload(session, card_id)}


@workspace_router.post("/{card_id}/assets/{kind}", response_model=APIDataEnvelope[CardDetail])
def post_workspace_asset(
    workspace_slug: str,
    card_id: int,
    kind: str,
    upload: UploadFile = File(...),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    add_asset(session, workspace_slug=workspace_slug, card_id=card_id, kind=kind, upload=upload)
    return {"data": _get_card_detail_payload(session, card_id)}


@router.delete("/assets/{asset_id}", response_model=APIDataEnvelope[CardDetail])
def remove_asset(
    asset_id: int,
    card_id: int = Query(...),
    session: Session = Depends(get_db),
    workspace_slug: str = Depends(get_workspace_slug),
) -> dict[str, CardDetail]:
    delete_asset(session, workspace_slug=workspace_slug, asset_id=asset_id)
    return {"data": _get_card_detail_payload(session, card_id)}


@workspace_router.delete("/assets/{asset_id}", response_model=APIDataEnvelope[CardDetail])
def remove_workspace_asset(
    workspace_slug: str,
    asset_id: int,
    card_id: int = Query(...),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    delete_asset(session, workspace_slug=workspace_slug, asset_id=asset_id)
    return {"data": _get_card_detail_payload(session, card_id)}


@router.post("/{card_id}/gallery/reorder", response_model=APIDataEnvelope[CardDetail])
def post_gallery_reorder(
    card_id: int,
    payload: CardReorderPayload,
    session: Session = Depends(get_db),
) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(reorder_gallery(session, card_id, payload.ordered_ids))}


@workspace_router.post("/{card_id}/gallery/reorder", response_model=APIDataEnvelope[CardDetail])
def post_workspace_gallery_reorder(
    workspace_slug: str,
    card_id: int,
    payload: CardReorderPayload,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardDetail]:
    return {"data": serialize_card_detail(reorder_gallery(session, card_id, payload.ordered_ids))}


@router.post("/rebuild-index", response_model=APIDataEnvelope[ActionStatus])
def post_rebuild_index(session: Session = Depends(get_db)) -> dict[str, ActionStatus]:
    rebuild_index(session)
    return {"data": ActionStatus(message="Search index rebuilt.")}


@workspace_router.post("/rebuild-index", response_model=APIDataEnvelope[ActionStatus])
def post_workspace_rebuild_index(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    rebuild_index(session)
    return {"data": ActionStatus(message="Search index rebuilt.")}

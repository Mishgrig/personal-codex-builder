from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_workspace_db
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.schemas.taxonomy import TaxonomyTermCreate, TaxonomyTermRead, TaxonomyTermUpdate
from app.services.taxonomy_service import create_term, delete_term, list_terms, update_term

router = APIRouter()
workspace_router = APIRouter(prefix="/workspaces/{workspace_slug}/taxonomy")


@router.get("", response_model=APIDataEnvelope[list[TaxonomyTermRead]])
def get_terms(session: Session = Depends(get_db)) -> dict[str, list[TaxonomyTermRead]]:
    return {"data": [TaxonomyTermRead.model_validate(term) for term in list_terms(session)]}


@workspace_router.get("", response_model=APIDataEnvelope[list[TaxonomyTermRead]])
def get_workspace_terms(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, list[TaxonomyTermRead]]:
    return {"data": [TaxonomyTermRead.model_validate(term) for term in list_terms(session)]}


@router.post("", response_model=APIDataEnvelope[TaxonomyTermRead])
def post_term(payload: TaxonomyTermCreate, session: Session = Depends(get_db)) -> dict[str, TaxonomyTermRead]:
    return {"data": TaxonomyTermRead.model_validate(create_term(session, payload))}


@workspace_router.post("", response_model=APIDataEnvelope[TaxonomyTermRead])
def post_workspace_term(
    workspace_slug: str,
    payload: TaxonomyTermCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, TaxonomyTermRead]:
    return {"data": TaxonomyTermRead.model_validate(create_term(session, payload))}


@router.patch("/{term_id}", response_model=APIDataEnvelope[TaxonomyTermRead])
def patch_term(
    term_id: int,
    payload: TaxonomyTermUpdate,
    session: Session = Depends(get_db),
) -> dict[str, TaxonomyTermRead]:
    return {"data": TaxonomyTermRead.model_validate(update_term(session, term_id, payload))}


@workspace_router.patch("/{term_id}", response_model=APIDataEnvelope[TaxonomyTermRead])
def patch_workspace_term(
    workspace_slug: str,
    term_id: int,
    payload: TaxonomyTermUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, TaxonomyTermRead]:
    return {"data": TaxonomyTermRead.model_validate(update_term(session, term_id, payload))}


@router.delete("/{term_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_term(term_id: int, session: Session = Depends(get_db)) -> dict[str, ActionStatus]:
    delete_term(session, term_id)
    return {"data": ActionStatus(message="Taxonomy term deleted.")}


@workspace_router.delete("/{term_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_workspace_term(
    workspace_slug: str,
    term_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_term(session, term_id)
    return {"data": ActionStatus(message="Taxonomy term deleted.")}

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.workspace import TaxonomyTerm
from app.schemas.taxonomy import TaxonomyTermCreate, TaxonomyTermUpdate


def list_terms(session: Session) -> list[TaxonomyTerm]:
    return list(
        session.execute(
            select(TaxonomyTerm).order_by(
                TaxonomyTerm.category.asc(),
                TaxonomyTerm.sort_order.asc(),
                TaxonomyTerm.label.asc(),
            )
        ).scalars()
    )


def create_term(session: Session, payload: TaxonomyTermCreate) -> TaxonomyTerm:
    term = TaxonomyTerm(**payload.model_dump())
    session.add(term)
    session.commit()
    session.refresh(term)
    return term


def update_term(session: Session, term_id: int, payload: TaxonomyTermUpdate) -> TaxonomyTerm:
    term = session.get(TaxonomyTerm, term_id)
    if not term:
        raise NotFoundError("Taxonomy term was not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(term, key, value)
    session.add(term)
    session.commit()
    session.refresh(term)
    return term


def delete_term(session: Session, term_id: int) -> None:
    term = session.get(TaxonomyTerm, term_id)
    if not term:
        raise NotFoundError("Taxonomy term was not found.")
    session.delete(term)
    session.commit()


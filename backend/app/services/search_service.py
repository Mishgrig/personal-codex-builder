from __future__ import annotations

import re
from datetime import datetime, timezone
from sqlalchemy import Select, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.workspace import Card, CardAsset, CardTaxonomyTerm
from app.schemas.card import SearchResult


def _normalize_terms(query: str) -> list[str]:
    return [part.lower() for part in re.findall(r"[a-zA-Z0-9]+", query) if part.strip()]


def _count_mentions(haystack: str, query: str) -> int:
    count = 0
    lowered = haystack.lower()
    for term in _normalize_terms(query):
        count += lowered.count(term)
    return count


def rebuild_index(session: Session) -> None:
    session.execute(text("DELETE FROM card_search"))
    cards = session.execute(
        select(Card)
        .options(
            selectinload(Card.taxonomy_links).selectinload(CardTaxonomyTerm.term),
            selectinload(Card.sources),
            selectinload(Card.assets),
        )
        .order_by(Card.id)
    ).scalars()
    for card in cards:
        index_card(session, card)
    session.commit()


def index_card(session: Session, card: Card) -> None:
    taxonomy_text = " ".join(link.term.label for link in card.taxonomy_links if link.term)
    source_text = " ".join(
        f"{source.title} {source.url} {source.note}" for source in card.sources
    )
    attachment_text = " ".join(asset.original_name for asset in card.assets)
    dynamic_text = " ".join(str(value) for value in (card.dynamic_fields or {}).values())
    session.execute(text("DELETE FROM card_search WHERE rowid = :rowid"), {"rowid": card.id})
    session.execute(
        text(
            """
            INSERT INTO card_search (
                rowid,
                title,
                summary,
                body_text,
                dynamic_text,
                taxonomy_text,
                source_text,
                attachment_text
            ) VALUES (
                :rowid,
                :title,
                :summary,
                :body_text,
                :dynamic_text,
                :taxonomy_text,
                :source_text,
                :attachment_text
            )
            """
        ),
        {
            "rowid": card.id,
            "title": card.title,
            "summary": card.summary,
            "body_text": card.body_text,
            "dynamic_text": dynamic_text,
            "taxonomy_text": taxonomy_text,
            "source_text": source_text,
            "attachment_text": attachment_text,
        },
    )


def remove_from_index(session: Session, card_id: int) -> None:
    session.execute(text("DELETE FROM card_search WHERE rowid = :rowid"), {"rowid": card_id})


def search_cards(
    session: Session,
    *,
    q: str = "",
    domain: int | None = None,
    type_term: int | None = None,
    subtype: int | None = None,
    layer: int | None = None,
    sort_mode: str = "manual",
):
    stmt: Select[tuple[Card]] = select(Card).options(
        selectinload(Card.schema),
        selectinload(Card.taxonomy_links).selectinload(CardTaxonomyTerm.term),
        selectinload(Card.assets),
    )

    if q.strip():
        normalized_query = " ".join(_normalize_terms(q.strip()))
        if not normalized_query:
            return SearchResult(items=[], total=0, q=q, grouping="domain", generated_at=datetime.now(timezone.utc))
        matching_ids = [
            row[0]
            for row in session.execute(
                text(
                    """
                    SELECT rowid
                    FROM card_search
                    WHERE card_search MATCH :query
                    ORDER BY bm25(card_search)
                    """
                ),
                {"query": normalized_query},
            ).all()
        ]
        if not matching_ids:
            return SearchResult(items=[], total=0, q=q, grouping="domain", generated_at=datetime.now(timezone.utc))
        stmt = stmt.where(Card.id.in_(matching_ids))

    for selected_term in [domain, type_term, subtype, layer]:
        if selected_term:
            stmt = stmt.where(Card.taxonomy_links.any(CardTaxonomyTerm.term_id == selected_term))

    if sort_mode == "az":
        stmt = stmt.order_by(Card.title.asc())
    else:
        stmt = stmt.order_by(Card.sort_order.asc(), Card.title.asc())

    cards = list(session.execute(stmt).scalars().unique())
    items = []
    for card in cards:
        combined_text = " ".join(
            [
                card.title,
                card.summary,
                card.body_text,
                " ".join(str(value) for value in (card.dynamic_fields or {}).values()),
                " ".join(link.term.label for link in card.taxonomy_links if link.term),
            ]
        )
        mention_count = _count_mentions(combined_text, q) if q else 0
        cover = next((asset for asset in card.assets if asset.kind == "gallery"), None)
        from app.services.card_service import serialize_card_list_item

        items.append(
            serialize_card_list_item(
                card,
                mention_count=mention_count,
                cover_url=build_asset_url(cover) if cover else None,
            )
        )
    grouping = "type" if domain else "domain"
    return SearchResult(
        items=items,
        total=len(items),
        q=q,
        grouping=grouping,
        generated_at=datetime.now(timezone.utc),
    )


def build_asset_url(asset: CardAsset | None) -> str | None:
    if not asset:
        return None
    return f"/media/{asset.stored_path}"

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError
from app.models.workspace import Card, CardRelation, CardSource, CardTaxonomyTerm
from app.schemas.card import (
    CardAssetRead,
    CardCreate,
    CardDetail,
    CardListItem,
    CardRelationCreate,
    CardRelationRead,
    CardSourceCreate,
    CardSourceRead,
    CardUpdate,
)
from app.schemas.schema import CardSchemaRead
from app.schemas.taxonomy import TaxonomyTermRead
from app.services.search_service import build_asset_url, index_card, remove_from_index
from app.services.validation_service import validate_card_payload
from app.utils.rich_text import extract_plain_text
from app.utils.slug import generate_card_slug, generate_uid


def _card_query():
    return (
        select(Card)
        .options(selectinload(Card.schema))
        .options(selectinload(Card.taxonomy_links).selectinload(CardTaxonomyTerm.term))
        .options(selectinload(Card.sources))
        .options(selectinload(Card.assets))
        .options(selectinload(Card.outgoing_relations).selectinload(CardRelation.target_card))
    )


def serialize_card_list_item(
    card: Card,
    *,
    mention_count: int = 0,
    cover_url: str | None = None,
) -> CardListItem:
    taxonomy_terms = [TaxonomyTermRead.model_validate(link.term) for link in card.taxonomy_links if link.term]
    return CardListItem(
        id=card.id,
        uid=card.uid,
        slug=card.slug,
        title=card.title,
        summary=card.summary,
        status=card.status,
        schema_id=card.schema_id,
        schema_label=card.schema.label if card.schema else None,
        dynamic_fields=card.dynamic_fields or {},
        taxonomy_terms=taxonomy_terms,
        mention_count=mention_count,
        cover_url=cover_url,
        sort_order=card.sort_order,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def serialize_card_detail(card: Card) -> CardDetail:
    gallery = []
    attachments = []
    for asset in card.assets:
        item = CardAssetRead(
            id=asset.id,
            kind=asset.kind,
            stored_path=asset.stored_path,
            original_name=asset.original_name,
            mime_type=asset.mime_type,
            size=asset.size,
            note=asset.note,
            sort_order=asset.sort_order,
            url=f"/media/{asset.stored_path}",
            created_at=asset.created_at,
            updated_at=asset.updated_at,
        )
        if asset.kind == "gallery":
            gallery.append(item)
        else:
            attachments.append(item)
    relations = [
        CardRelationRead(
            id=relation.id,
            target_card_id=relation.target_card.id,
            target_uid=relation.target_card.uid,
            target_slug=relation.target_card.slug,
            target_title=relation.target_card.title,
            note=relation.note,
        )
        for relation in card.outgoing_relations
        if relation.target_card
    ]
    sources = [CardSourceRead.model_validate(source) for source in card.sources]
    return CardDetail(
        **serialize_card_list_item(
            card,
            cover_url=build_asset_url(next((asset for asset in card.assets if asset.kind == "gallery"), None)),
        ).model_dump(),
        body_json=card.body_json or {},
        body_text=card.body_text,
        gallery=gallery,
        attachments=attachments,
        sources=sources,
        relations=relations,
        schema=CardSchemaRead.model_validate(card.schema) if card.schema else None,
    )


def _apply_taxonomy(session: Session, card: Card, taxonomy_term_ids: list[int]) -> None:
    current = {link.term_id: link for link in card.taxonomy_links}
    desired = set(taxonomy_term_ids)
    for term_id, link in list(current.items()):
        if term_id not in desired:
            card.taxonomy_links.remove(link)
    for term_id in desired:
        if term_id not in current:
            card.taxonomy_links.append(CardTaxonomyTerm(term_id=term_id))


def create_card(session: Session, payload: CardCreate) -> Card:
    highest_sort = session.execute(select(func.max(Card.sort_order))).scalar() or 0
    slug = generate_card_slug()
    while session.execute(select(Card).where(Card.slug == slug)).scalar_one_or_none():
        slug = generate_card_slug()
    card = Card(
        uid=generate_uid(),
        slug=slug,
        title=payload.title,
        summary=payload.summary,
        status=payload.status,
        schema_id=payload.schema_id,
        body_json={"type": "doc", "content": []},
        body_text="",
        dynamic_fields={},
        sort_order=float(highest_sort) + 100.0,
    )
    validate_card_payload(
        session,
        slug=card.slug,
        schema_id=card.schema_id,
        dynamic_fields=card.dynamic_fields,
    )
    session.add(card)
    session.flush()
    _apply_taxonomy(session, card, payload.taxonomy_term_ids)
    session.commit()
    fresh = session.execute(_card_query().where(Card.id == card.id)).scalar_one()
    index_card(session, fresh)
    session.commit()
    return fresh


def get_card(session: Session, card_id: int) -> Card:
    card = session.execute(_card_query().where(Card.id == card_id)).scalar_one_or_none()
    if not card:
        raise NotFoundError("Card was not found.")
    return card


def update_card(session: Session, card_id: int, payload: CardUpdate) -> Card:
    card = get_card(session, card_id)
    data = payload.model_dump(exclude_unset=True)
    body_json = data.get("body_json", card.body_json)
    dynamic_fields = data.get("dynamic_fields", card.dynamic_fields or {})
    slug = data.get("slug", card.slug)
    schema_id = data.get("schema_id", card.schema_id)
    validate_card_payload(
        session,
        slug=slug,
        schema_id=schema_id,
        dynamic_fields=dynamic_fields or {},
        card_id=card.id,
    )
    for key, value in data.items():
        if key == "taxonomy_term_ids":
            continue
        setattr(card, key, value)
    card.body_text = extract_plain_text(body_json)
    if payload.taxonomy_term_ids is not None:
        _apply_taxonomy(session, card, payload.taxonomy_term_ids)
    session.add(card)
    session.commit()
    updated = get_card(session, card_id)
    index_card(session, updated)
    session.commit()
    return updated


def delete_card(session: Session, card_id: int) -> None:
    card = get_card(session, card_id)
    session.delete(card)
    session.commit()
    remove_from_index(session, card_id)
    session.commit()


def reorder_cards(session: Session, ordered_ids: list[int]) -> None:
    cards = session.execute(select(Card).where(Card.id.in_(ordered_ids))).scalars()
    mapping = {card.id: card for card in cards}
    for index, card_id in enumerate(ordered_ids):
        card = mapping.get(card_id)
        if card:
            card.sort_order = (index + 1) * 100.0
    session.commit()


def add_source(session: Session, card_id: int, payload: CardSourceCreate) -> CardSource:
    card = get_card(session, card_id)
    source = CardSource(card_id=card.id, **payload.model_dump())
    session.add(source)
    session.commit()
    refreshed = get_card(session, card_id)
    index_card(session, refreshed)
    session.commit()
    return source


def update_source(session: Session, source_id: int, payload: CardSourceCreate) -> CardSource:
    source = session.get(CardSource, source_id)
    if not source:
        raise NotFoundError("Source was not found.")
    for key, value in payload.model_dump().items():
        setattr(source, key, value)
    session.add(source)
    session.commit()
    refreshed = get_card(session, source.card_id)
    index_card(session, refreshed)
    session.commit()
    return source


def delete_source(session: Session, source_id: int) -> None:
    source = session.get(CardSource, source_id)
    if not source:
        raise NotFoundError("Source was not found.")
    card_id = source.card_id
    session.delete(source)
    session.commit()
    refreshed = get_card(session, card_id)
    index_card(session, refreshed)
    session.commit()


def add_relation(session: Session, card_id: int, payload: CardRelationCreate) -> CardRelation:
    get_card(session, card_id)
    target = get_card(session, payload.target_card_id)
    relation = CardRelation(source_card_id=card_id, target_card_id=target.id, note=payload.note)
    session.add(relation)
    session.commit()
    session.refresh(relation)
    return relation


def delete_relation(session: Session, relation_id: int) -> None:
    relation = session.get(CardRelation, relation_id)
    if not relation:
        raise NotFoundError("Relation was not found.")
    session.delete(relation)
    session.commit()


def reorder_gallery(session: Session, card_id: int, ordered_asset_ids: list[int]) -> Card:
    card = get_card(session, card_id)
    gallery_assets = {asset.id: asset for asset in card.assets if asset.kind == "gallery"}
    for index, asset_id in enumerate(ordered_asset_ids):
        asset = gallery_assets.get(asset_id)
        if asset:
            asset.sort_order = index
    session.commit()
    return get_card(session, card_id)

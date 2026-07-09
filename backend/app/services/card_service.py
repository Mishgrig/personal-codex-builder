from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError, ValidationAPIError
from app.models.workspace import (
    Asset,
    Card,
    CardAttachmentAsset,
    CardGalleryAsset,
    CardRegistry,
    CardRelation,
    CardSource,
    CardSourceAsset,
    CardTaxonomyTerm,
    CardTypeDefinition,
)
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
from app.services.schema_service import card_type_table_name
from app.services.search_service import index_card, remove_from_index
from app.services.validation_service import validate_card_payload
from app.utils.rich_text import extract_plain_text
from app.utils.slug import generate_card_slug, generate_uid


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _card_query():
    return (
        select(Card)
        .options(selectinload(Card.schema))
        .options(selectinload(Card.taxonomy_links).selectinload(CardTaxonomyTerm.term))
        .options(selectinload(Card.sources).selectinload(CardSource.asset_links).selectinload(CardSourceAsset.asset))
        .options(selectinload(Card.outgoing_relations).selectinload(CardRelation.target_card))
        .options(selectinload(Card.registry_entry))
        .options(selectinload(Card.gallery_asset_links).selectinload(CardGalleryAsset.asset))
        .options(selectinload(Card.attachment_asset_links).selectinload(CardAttachmentAsset.asset))
        .options(selectinload(Card.assets))
    )


def _active_card_clause():
    return ~Card.registry_entry.has(CardRegistry.deleted_at.is_not(None))


def _serialize_asset(asset: Asset, *, kind: str, sort_order: int, note: str = "") -> CardAssetRead:
    return CardAssetRead(
        id=asset.id,  # type: ignore[arg-type]
        kind=kind,
        stored_path=asset.relative_path,
        original_name=asset.original_filename,
        mime_type=asset.mime_type,
        size=asset.size_bytes,
        note=note,
        sort_order=sort_order,
        url=f"/media/{asset.relative_path}",
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def _gallery_assets(card: Card) -> list[CardAssetRead]:
    linked = [
        _serialize_asset(link.asset, kind="gallery", sort_order=link.sort_order, note=link.note)
        for link in sorted(card.gallery_asset_links, key=lambda item: item.sort_order)
        if link.asset
    ]
    if linked:
        return linked
    legacy = [
        CardAssetRead(
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
        for asset in card.assets
        if asset.kind == "gallery"
    ]
    return legacy


def _attachment_assets(card: Card) -> list[CardAssetRead]:
    linked = [
        _serialize_asset(link.asset, kind="attachment", sort_order=link.sort_order, note=link.note)
        for link in sorted(card.attachment_asset_links, key=lambda item: item.sort_order)
        if link.asset
    ]
    if linked:
        return linked
    legacy = [
        CardAssetRead(
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
        for asset in card.assets
        if asset.kind != "gallery"
    ]
    return legacy


def _source_assets(source: CardSource) -> list[CardAssetRead]:
    return [
        _serialize_asset(link.asset, kind="source", sort_order=index, note="")
        for index, link in enumerate(source.asset_links)
        if link.asset
    ]


def _card_cover_url(card: Card) -> str | None:
    gallery = _gallery_assets(card)
    if card.cover_asset_id:
        linked_asset = next(
            (link.asset for link in card.gallery_asset_links if link.asset_id == str(card.cover_asset_id) and link.asset),
            None,
        )
        if linked_asset:
            return f"/media/{linked_asset.relative_path}"
        chosen = next((asset for asset in gallery if str(asset.id) == str(card.cover_asset_id)), None)
        if chosen:
            return chosen.url
    return gallery[0].url if gallery else None


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
        cover_asset_id=card.cover_asset_id,
        sort_order=card.sort_order,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def serialize_card_detail(card: Card) -> CardDetail:
    gallery = _gallery_assets(card)
    attachments = _attachment_assets(card)
    relations = [
        CardRelationRead(
            id=relation.id,
            target_card_id=relation.target_card.id,
            target_uid=relation.target_card.uid,
            target_slug=relation.target_card.slug,
            target_title=relation.target_card.title,
            relation_type=relation.relation_type,
            note=relation.note or relation.relation_type,
        )
        for relation in card.outgoing_relations
        if relation.target_card
    ]
    sources = [
        CardSourceRead(
            id=source.id,
            title=source.title,
            url=source.url,
            note=source.note,
            source_type=source.source_type,
            assets=_source_assets(source),
            created_at=source.created_at,
            updated_at=source.updated_at,
        )
        for source in card.sources
    ]
    return CardDetail(
        **serialize_card_list_item(
            card,
            cover_url=_card_cover_url(card),
        ).model_dump(),
        body_json=card.body_json or {},
        body_text=card.body_text,
        gallery=gallery,
        attachments=attachments,
        sources=sources,
        relations=relations,
        card_schema=CardSchemaRead.model_validate(card.schema) if card.schema else None,
    )


def _apply_taxonomy(card: Card, taxonomy_term_ids: list[int]) -> None:
    current = {link.term_id: link for link in card.taxonomy_links}
    desired = set(taxonomy_term_ids)
    for term_id, link in list(current.items()):
        if term_id not in desired:
            card.taxonomy_links.remove(link)
    for term_id in desired:
        if term_id not in current:
            card.taxonomy_links.append(CardTaxonomyTerm(term_id=term_id))


def _ensure_card_type(session: Session, schema_id: str | None) -> CardTypeDefinition:
    slug = (schema_id or "general").strip() or "general"
    definition = session.get(CardTypeDefinition, slug)
    if definition is None:
        definition = CardTypeDefinition(
            slug=slug,
            name="General" if slug == "general" else slug.replace("-", " ").title(),
            table_name=card_type_table_name(slug),
            description="Auto-generated card type",
            icon="*",
            is_active=True,
            layout_json={},
        )
        session.add(definition)
        session.flush()
        session.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS "{definition.table_name}" (
                    card_id INTEGER PRIMARY KEY,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
                """
            )
        )
    return definition


def _encode_field_value(value: Any) -> Any:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float, str)) or value is None:
        return value
    return str(value)


def _sync_card_type_row(session: Session, card: Card, definition: CardTypeDefinition) -> None:
    columns = ["card_id", "created_at", "updated_at"]
    values: dict[str, Any] = {
        "card_id": card.id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    update_assignments = ['updated_at = excluded.updated_at']
    for field in definition.fields:
        if not field.is_active:
            continue
        value = _encode_field_value((card.dynamic_fields or {}).get(field.field_slug))
        columns.append(field.sql_column_name)
        values[field.sql_column_name] = value
        update_assignments.append(f'"{field.sql_column_name}" = excluded."{field.sql_column_name}"')
    quoted_columns = ", ".join(f'"{column}"' for column in columns)
    placeholders = ", ".join(f":{column}" for column in columns)
    update_sql = ", ".join(update_assignments)
    session.execute(
        text(
            f"""
            INSERT INTO "{definition.table_name}" ({quoted_columns})
            VALUES ({placeholders})
            ON CONFLICT(card_id) DO UPDATE SET {update_sql}
            """
        ),
        values,
    )


def _sync_registry(session: Session, card: Card) -> CardRegistry:
    definition = _ensure_card_type(session, card.schema_id)
    registry = card.registry_entry or session.execute(
        select(CardRegistry).where(CardRegistry.legacy_card_id == card.id)
    ).scalar_one_or_none()
    if registry is None:
        registry = CardRegistry(legacy_card_id=card.id)
    registry.card_type_slug = definition.slug
    registry.card_type_table = definition.table_name
    registry.title = card.title
    registry.summary = card.summary
    registry.status = card.status
    registry.body_json = card.body_json or {}
    registry.body_plain_text = card.body_text
    registry.cover_asset_id = card.cover_asset_id
    registry.sort_order = card.sort_order
    session.add(registry)
    session.flush()
    _sync_card_type_row(session, card, definition)
    return registry


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
    _apply_taxonomy(card, payload.taxonomy_term_ids)
    _sync_registry(session, card)
    session.commit()
    fresh = session.execute(_card_query().where(Card.id == card.id, _active_card_clause())).scalar_one()
    index_card(session, fresh)
    session.commit()
    return fresh


def get_card(session: Session, card_id: int, *, include_deleted: bool = False) -> Card:
    stmt = _card_query().where(Card.id == card_id)
    if not include_deleted:
        stmt = stmt.where(_active_card_clause())
    card = session.execute(stmt).scalar_one_or_none()
    if not card:
        raise NotFoundError("Card was not found.")
    return card


def update_card(session: Session, card_id: int, payload: CardUpdate) -> Card:
    card = get_card(session, card_id)
    data = payload.model_dump(exclude_unset=True)
    body_json = data.get("body_json", card.body_json)
    dynamic_fields = {**(card.dynamic_fields or {}), **(data.get("dynamic_fields") or {})}
    slug = data.get("slug", card.slug)
    schema_id = data.get("schema_id", card.schema_id)
    validate_card_payload(
        session,
        slug=slug,
        schema_id=schema_id,
        dynamic_fields=dynamic_fields or {},
        card_id=card.id,
    )
    if "cover_asset_id" in data:
        cover_asset_id = data.get("cover_asset_id") or None
        if cover_asset_id is not None:
            gallery_asset_ids = {str(asset.id) for asset in _gallery_assets(card)}
            gallery_asset_ids.update(str(link.asset_id) for link in card.gallery_asset_links if link.asset_id)
            if str(cover_asset_id) not in gallery_asset_ids:
                raise ValidationAPIError("Cover asset must belong to the card gallery.")
        data["cover_asset_id"] = cover_asset_id
    for key, value in data.items():
        if key in {"taxonomy_term_ids", "dynamic_fields"}:
            continue
        setattr(card, key, value)
    card.dynamic_fields = dynamic_fields
    card.body_text = extract_plain_text(body_json)
    if payload.taxonomy_term_ids is not None:
        _apply_taxonomy(card, payload.taxonomy_term_ids)
    _sync_registry(session, card)
    session.add(card)
    session.commit()
    updated = get_card(session, card_id)
    index_card(session, updated)
    session.commit()
    return updated


def delete_card(session: Session, card_id: int, *, hard_delete: bool = False) -> None:
    card = get_card(session, card_id, include_deleted=hard_delete)
    if card.registry_entry:
        card.registry_entry.deleted_at = datetime.now(timezone.utc)
        card.registry_entry.status = "archived"
        session.add(card.registry_entry)
    card.status = "archived"
    session.add(card)
    if hard_delete:
        session.delete(card)
    session.commit()
    remove_from_index(session, card_id)
    session.commit()


def reorder_cards(session: Session, ordered_ids: list[int]) -> None:
    cards = session.execute(select(Card).where(Card.id.in_(ordered_ids), _active_card_clause())).scalars()
    mapping = {card.id: card for card in cards}
    for index, card_id in enumerate(ordered_ids):
        card = mapping.get(card_id)
        if card:
            card.sort_order = (index + 1) * 100.0
            _sync_registry(session, card)
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
    relation = CardRelation(
        source_card_id=card_id,
        target_card_id=target.id,
        relation_type=payload.relation_type,
        note=payload.note,
    )
    session.add(relation)
    session.commit()
    session.refresh(relation)
    refreshed = get_card(session, card_id)
    index_card(session, refreshed)
    session.commit()
    return relation


def delete_relation(session: Session, relation_id: int) -> None:
    relation = session.get(CardRelation, relation_id)
    if not relation:
        raise NotFoundError("Relation was not found.")
    card_id = relation.source_card_id
    session.delete(relation)
    session.commit()
    refreshed = get_card(session, card_id)
    index_card(session, refreshed)
    session.commit()


def reorder_gallery(session: Session, card_id: int, ordered_asset_ids: list[int | str]) -> Card:
    card = get_card(session, card_id)
    if card.gallery_asset_links:
        link_map = {str(link.asset_id): link for link in card.gallery_asset_links}
        for index, asset_id in enumerate(ordered_asset_ids):
            link = link_map.get(str(asset_id))
            if link:
                link.sort_order = index
                if index == 0 and not card.cover_asset_id:
                    card.cover_asset_id = link.asset_id
    else:
        legacy_assets = {asset.id: asset for asset in card.assets if asset.kind == "gallery"}
        for index, asset_id in enumerate(ordered_asset_ids):
            asset = legacy_assets.get(int(asset_id))
            if asset:
                asset.sort_order = index
                if index == 0 and not card.cover_asset_id:
                    card.cover_asset_id = str(asset.id)
    session.commit()
    return get_card(session, card_id)

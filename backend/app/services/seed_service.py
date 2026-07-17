from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.workspace import CardSchema, SchemaFieldDefinition, TaxonomyTerm, WorkspaceSetting
from app.schemas.card import CardCreate, CardRelationCreate, CardSourceCreate, CardUpdate
from app.services.card_service import add_relation, add_source, create_card, update_card
from app.services.product_defaults import merge_product_ui_preferences


def _field(field_id: str, label: str, kind: str = "text", *, sort_order: int = 0) -> SchemaFieldDefinition:
    return SchemaFieldDefinition(
        field_id=field_id,
        label=label,
        kind=kind,
        show_in_card=True,
        show_in_list=sort_order < 2,
        show_in_filters=sort_order < 2,
        sort_order=sort_order,
    )


def _schema(schema_id: str, label: str, description: str, fields: list[tuple[str, str, str]]) -> CardSchema:
    card_schema = CardSchema(
        id=schema_id,
        label=label,
        description=description,
        icon=schema_id[:1].upper(),
        field_order=[field_id for field_id, _label, _kind in fields],
    )
    card_schema.fields = [
        _field(field_id, field_label, kind, sort_order=index)
        for index, (field_id, field_label, kind) in enumerate(fields)
    ]
    return card_schema


def _seed_baseline_entity_types(session: Session) -> None:
    existing_ids = {
        schema_id
        for (schema_id,) in session.query(CardSchema.id).all()
    }
    baseline = [
        _schema(
            "character",
            "Character",
            "Player characters, protagonists and important people.",
            [
                ("role", "Role", "text"),
                ("group", "Group", "text"),
                ("motivation", "Motivation", "long_text"),
                ("relationships", "Relationships", "long_text"),
            ],
        ),
        _schema(
            "npc",
            "NPC",
            "Non-player characters, patrons, rivals and allies.",
            [
                ("affiliation", "Affiliation", "text"),
                ("role", "Role", "text"),
                ("location", "Location", "text"),
            ],
        ),
        _schema(
            "creature",
            "Creature",
            "Creatures, monsters, species and encounter-ready beings.",
            [
                ("habitat", "Habitat", "text"),
                ("threat", "Threat", "text"),
                ("traits", "Traits", "long_text"),
            ],
        ),
        _schema(
            "location",
            "Location",
            "Regions, settlements, landmarks, rooms and map-ready places.",
            [
                ("region", "Region", "text"),
                ("climate", "Climate", "text"),
                ("danger", "Danger", "number"),
            ],
        ),
        _schema(
            "organization",
            "Organization",
            "Factions, guilds, orders, governments and social powers.",
            [
                ("type", "Type", "text"),
                ("agenda", "Agenda", "long_text"),
                ("members", "Members", "long_text"),
            ],
        ),
        _schema(
            "deity",
            "Deity",
            "Gods, patrons, saints, spirits and mythic powers.",
            [
                ("domain", "Domain", "text"),
                ("symbol", "Symbol", "text"),
                ("followers", "Followers", "long_text"),
                ("rites", "Rites", "long_text"),
            ],
        ),
        _schema(
            "item",
            "Item",
            "Artifacts, equipment, resources and meaningful possessions.",
            [
                ("item_type", "Item type", "text"),
                ("owner", "Owner", "text"),
                ("properties", "Properties", "long_text"),
            ],
        ),
        _schema(
            "lore",
            "Lore",
            "General world facts, myths, history and encyclopedic notes.",
            [
                ("topic", "Topic", "text"),
                ("source", "Source", "text"),
                ("details", "Details", "long_text"),
            ],
        ),
        _schema(
            "magic",
            "Magic",
            "Spells, rituals, supernatural systems and magical rules.",
            [
                ("tradition", "Tradition", "text"),
                ("effect", "Effect", "long_text"),
                ("cost", "Cost", "text"),
            ],
        ),
        _schema(
            "note",
            "Note",
            "Loose notes, session thoughts and temporary prep material.",
            [
                ("context", "Context", "text"),
                ("status", "Status", "text"),
                ("body", "Body", "long_text"),
            ],
        ),
    ]
    session.add_all([schema for schema in baseline if schema.id not in existing_ids])


def seed_workspace(
    session: Session,
    *,
    workspace_name: str,
    theme: str,
    include_demo: bool = False,
) -> None:
    if session.get(WorkspaceSetting, 1):
        return

    settings = WorkspaceSetting(
        name=workspace_name,
        description="A personal local-first RPG and worldbuilding workspace.",
        theme=theme,
        ui_preferences=merge_product_ui_preferences({}),
    )
    session.add(settings)
    session.add(
        TaxonomyTerm(
            category="layer",
            slug="uncategorized",
            label="Uncategorized",
            sort_order=999,
        )
    )
    session.commit()
    _seed_baseline_entity_types(session)
    session.commit()

    if not include_demo:
        return

    taxonomy_seed = [
        ("domain", "world-model", "World Model", None, 0),
        ("domain", "ships", "Ships", None, 1),
        ("domain", "factions", "Factions", None, 2),
        ("type", "npc", "NPC", None, 0),
        ("type", "location", "Location", None, 1),
        ("type", "ship", "Ship", None, 2),
        ("subtype", "captain", "Captain", None, 0),
        ("subtype", "port-city", "Port City", None, 1),
        ("layer", "wildspace", "Wildspace", None, 0),
        ("layer", "astral-sea", "Astral Sea", None, 1),
    ]
    for category, slug, label, parent_id, sort_order in taxonomy_seed:
        session.add(
            TaxonomyTerm(
                category=category,
                slug=slug,
                label=label,
                parent_id=parent_id,
                sort_order=sort_order,
            )
        )
    session.commit()

    terms = {
        (term.category, term.slug): term.id
        for term in session.query(TaxonomyTerm).all()
    }
    captain = create_card(
        session,
        CardCreate(
            title="Captain Seraph Vale",
            summary="Navigator of the lantern brig Nightglass.",
            schema_id="npc",
            taxonomy_term_ids=[
                terms[("domain", "ships")],
                terms[("type", "npc")],
                terms[("subtype", "captain")],
                terms[("layer", "wildspace")],
            ],
        ),
    )
    update_card(
        session,
        captain.id,
        CardUpdate(
            dynamic_fields={
                "affiliation": "Nightglass Crew",
                "role": "Captain and occult navigator",
                "location": "Bral Anchorage",
            },
            body_json={
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 1},
                        "content": [{"type": "text", "text": "Overview"}],
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Seraph charts impossible routes by reading heat shimmer across astral sails.",
                            }
                        ],
                    },
                ],
            },
        ),
    )
    bral = create_card(
        session,
        CardCreate(
            title="Bral Anchorage",
            summary="A lantern-lit port city suspended above the trade lanes.",
            schema_id="location",
            taxonomy_term_ids=[
                terms[("domain", "world-model")],
                terms[("type", "location")],
                terms[("subtype", "port-city")],
                terms[("layer", "wildspace")],
            ],
        ),
    )
    update_card(
        session,
        bral.id,
        CardUpdate(
            dynamic_fields={
                "region": "Bral Expanse",
                "climate": "Warm dock fog and drifting embers",
                "danger": 3,
            },
            body_json={
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 1},
                        "content": [{"type": "text", "text": "Atmosphere"}],
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Merchants, rumor-brokers and spelljammers crowd the harbor terraces.",
                            }
                        ],
                    },
                ],
            },
        ),
    )
    add_source(
        session,
        bral.id,
        CardSourceCreate(
            title="Dock Ledger 43-B",
            note="Lists seasonal arrivals and missing cargo manifests.",
            source_type="note",
        ),
    )
    add_relation(session, captain.id, CardRelationCreate(target_card_id=bral.id, note="Anchored at"))

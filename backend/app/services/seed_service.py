from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.workspace import CardSchema, SchemaFieldDefinition, TaxonomyTerm, WorkspaceSetting
from app.schemas.card import CardCreate, CardRelationCreate, CardSourceCreate, CardUpdate
from app.services.card_service import add_relation, add_source, create_card, update_card


def seed_workspace(
    session: Session,
    *,
    workspace_name: str,
    theme: str,
    include_demo: bool = False,
) -> None:
    if session.get(WorkspaceSetting, 1):
        return

    settings = WorkspaceSetting(name=workspace_name, description="A personal local-first codex.", theme=theme)
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

    if not include_demo:
        return

    npc_schema = CardSchema(
        id="npc",
        label="NPC",
        description="People, patrons, rivals and allies.",
        icon="☆",
        field_order=["affiliation", "role", "location"],
    )
    npc_schema.fields = [
        SchemaFieldDefinition(
            field_id="affiliation",
            label="Affiliation",
            kind="text",
            show_in_card=True,
            show_in_list=True,
            show_in_filters=True,
            sort_order=0,
        ),
        SchemaFieldDefinition(
            field_id="role",
            label="Role",
            kind="text",
            show_in_card=True,
            show_in_list=True,
            sort_order=1,
        ),
        SchemaFieldDefinition(
            field_id="location",
            label="Location",
            kind="text",
            show_in_card=True,
            show_in_list=False,
            sort_order=2,
        ),
    ]
    location_schema = CardSchema(
        id="location",
        label="Location",
        description="Places, ports, ruins and star charts.",
        icon="✦",
        field_order=["region", "climate", "danger"],
    )
    location_schema.fields = [
        SchemaFieldDefinition(field_id="region", label="Region", kind="text", sort_order=0),
        SchemaFieldDefinition(field_id="climate", label="Climate", kind="text", sort_order=1),
        SchemaFieldDefinition(field_id="danger", label="Danger", kind="number", sort_order=2),
    ]
    session.add_all([npc_schema, location_schema])

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

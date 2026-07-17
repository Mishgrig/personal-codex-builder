from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import ValidationAPIError
from app.models.workspace import CardSchema, SchemaFieldDefinition, WorkspaceSetting
from app.schemas.card import CardCreate, CardUpdate
from app.schemas.sharing import WorkspaceShareLink, WorkspaceShareRequest, WorkspaceShareResult
from app.services.card_service import create_card, get_card, serialize_card_detail, update_card
from app.services.workspace_manager import get_workspace_manager


def share_workspace_entity(source_workspace_slug: str, payload: WorkspaceShareRequest) -> WorkspaceShareResult:
    if source_workspace_slug == payload.target_workspace_slug:
        raise ValidationAPIError("Choose a different target workspace.")
    if payload.entity_type != "card":
        raise ValidationAPIError("Only card sharing is available in this phase.")

    manager = get_workspace_manager()
    source_summary = manager.get_workspace_summary(source_workspace_slug)
    manager.get_workspace_summary(payload.target_workspace_slug)

    source_session = manager.get_workspace_session(source_workspace_slug)
    target_session = manager.get_workspace_session(payload.target_workspace_slug)
    try:
        source_card = get_card(source_session, payload.entity_id)
        copied_card_id: int | None = None
        copied_detail = None

        if payload.mode == "snapshot":
            _ensure_schema_snapshot(source_session, target_session, source_card.schema_id)
            copied = create_card(
                target_session,
                CardCreate(
                    title=source_card.title,
                    summary=source_card.summary,
                    status=source_card.status,
                    schema_id=source_card.schema_id,
                ),
            )
            provenance = {
                "mode": "snapshot",
                "source_workspace_slug": source_workspace_slug,
                "source_workspace_name": source_summary["name"],
                "source_card_id": source_card.id,
                "source_card_uid": source_card.uid,
                "source_card_title": source_card.title,
                "snapshot_created_at": _now().isoformat(),
            }
            copied = update_card(
                target_session,
                copied.id,
                CardUpdate(
                    title=source_card.title,
                    summary=source_card.summary,
                    status=source_card.status,
                    schema_id=source_card.schema_id,
                    body_json=source_card.body_json or {},
                    dynamic_fields={
                        **(source_card.dynamic_fields or {}),
                        "_provenance": provenance,
                    },
                ),
            )
            copied_card_id = copied.id
            copied_detail = serialize_card_detail(copied)

        link = WorkspaceShareLink(
            id=f"share-{uuid4().hex[:10]}",
            mode=payload.mode,
            entity_type=payload.entity_type,
            source_workspace_slug=source_workspace_slug,
            source_workspace_name=source_summary["name"],
            source_entity_id=source_card.id,
            source_entity_title=source_card.title,
            target_workspace_slug=payload.target_workspace_slug,
            target_entity_id=copied_card_id,
            created_at=_now(),
        )
        _append_share_link(target_session, link)
        return WorkspaceShareResult(mode=payload.mode, link=link, copied_card=copied_detail)
    finally:
        source_session.close()
        target_session.close()


def list_workspace_share_links(workspace_slug: str) -> list[WorkspaceShareLink]:
    session = get_workspace_manager().get_workspace_session(workspace_slug)
    try:
        settings = _settings(session)
        return [WorkspaceShareLink(**item) for item in settings.ui_preferences.get("cross_workspace_links", []) if isinstance(item, dict)]
    finally:
        session.close()


def _append_share_link(session: Session, link: WorkspaceShareLink) -> None:
    settings = _settings(session)
    preferences = dict(settings.ui_preferences or {})
    links = [item for item in preferences.get("cross_workspace_links", []) if isinstance(item, dict)]
    links.insert(0, link.model_dump(mode="json"))
    preferences["cross_workspace_links"] = links[:200]
    settings.ui_preferences = preferences
    session.add(settings)
    session.commit()


def _ensure_schema_snapshot(source_session: Session, target_session: Session, schema_id: str | None) -> None:
    if not schema_id or target_session.get(CardSchema, schema_id):
        return
    source_schema = source_session.get(CardSchema, schema_id)
    if not source_schema:
        return
    target_schema = CardSchema(
        id=source_schema.id,
        label=source_schema.label,
        description=source_schema.description,
        icon=source_schema.icon,
        field_order=list(source_schema.field_order or []),
        is_active=source_schema.is_active,
    )
    target_session.add(target_schema)
    target_session.flush()
    for field in source_schema.fields:
        target_session.add(
            SchemaFieldDefinition(
                schema_id=target_schema.id,
                field_id=field.field_id,
                label=field.label,
                kind=field.kind,
                description=field.description,
                required=field.required,
                repeatable=field.repeatable,
                default_value=field.default_value,
                options=field.options,
                placeholder=field.placeholder,
                show_in_card=field.show_in_card,
                show_in_list=field.show_in_list,
                show_in_filters=field.show_in_filters,
                validation=field.validation,
                sort_order=field.sort_order,
                is_active=field.is_active,
            )
        )
    target_session.commit()


def _settings(session: Session) -> WorkspaceSetting:
    settings = session.get(WorkspaceSetting, 1)
    if not settings:
        raise ValidationAPIError("Workspace settings were not found.")
    return settings


def _now() -> datetime:
    return datetime.now(timezone.utc)

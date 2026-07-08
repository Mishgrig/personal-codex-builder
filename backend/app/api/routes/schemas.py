from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_workspace_db
from app.schemas.common import APIDataEnvelope
from app.schemas.schema import CardSchemaCreate, CardSchemaRead
from app.services.schema_service import list_schemas, upsert_schema

router = APIRouter()
workspace_router = APIRouter(prefix="/workspaces/{workspace_slug}/schemas")


def _upsert_schema(schema_id: str, payload: CardSchemaCreate, session: Session) -> CardSchemaRead:
    if schema_id != payload.id:
        payload = payload.model_copy(update={"id": schema_id})
    return CardSchemaRead.model_validate(upsert_schema(session, payload))


@router.get("", response_model=APIDataEnvelope[list[CardSchemaRead]])
def get_schemas(session: Session = Depends(get_db)) -> dict[str, list[CardSchemaRead]]:
    return {"data": [CardSchemaRead.model_validate(schema) for schema in list_schemas(session)]}


@workspace_router.get("", response_model=APIDataEnvelope[list[CardSchemaRead]])
def get_workspace_schemas(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, list[CardSchemaRead]]:
    return {"data": [CardSchemaRead.model_validate(schema) for schema in list_schemas(session)]}


@router.put("/{schema_id}", response_model=APIDataEnvelope[CardSchemaRead])
def put_schema(
    schema_id: str,
    payload: CardSchemaCreate,
    session: Session = Depends(get_db),
) -> dict[str, CardSchemaRead]:
    return {"data": _upsert_schema(schema_id, payload, session)}


@workspace_router.put("/{schema_id}", response_model=APIDataEnvelope[CardSchemaRead])
def put_workspace_schema(
    workspace_slug: str,
    schema_id: str,
    payload: CardSchemaCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardSchemaRead]:
    return {"data": _upsert_schema(schema_id, payload, session)}

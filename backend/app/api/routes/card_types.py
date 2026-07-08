from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_workspace_db
from app.schemas.common import APIDataEnvelope
from app.schemas.schema import (
    CardTypeDefinitionRead,
    CardTypeImportPreviewRead,
    CardTypeImportRequest,
    CardTypeImportResultRead,
    CardTypeStructureExportRead,
    CardTypeTableExportRead,
    CardTypeTableRead,
)
from app.services.schema_service import (
    apply_card_type_import,
    export_card_type_table,
    export_card_type_structure,
    get_card_type_table,
    list_card_types,
    preview_card_type_import,
)
from app.services.workspace_manager import get_workspace_manager

router = APIRouter(prefix="/workspaces/{workspace_slug}/card-types")


@router.get("", response_model=APIDataEnvelope[list[CardTypeDefinitionRead]])
def get_workspace_card_types(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, list[CardTypeDefinitionRead]]:
    return {"data": [CardTypeDefinitionRead.model_validate(item) for item in list_card_types(session)]}


@router.get("/{card_type_slug}/table", response_model=APIDataEnvelope[CardTypeTableRead])
def get_workspace_card_type_table(
    workspace_slug: str,
    card_type_slug: str,
    q: str = Query(default=""),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardTypeTableRead]:
    return {"data": CardTypeTableRead.model_validate(get_card_type_table(session, card_type_slug, q=q))}


@router.get(
    "/{card_type_slug}/structure-export",
    response_model=APIDataEnvelope[CardTypeStructureExportRead],
)
def get_workspace_card_type_structure_export(
    workspace_slug: str,
    card_type_slug: str,
    format: str = Query(default="json"),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardTypeStructureExportRead]:
    exported = export_card_type_structure(session, card_type_slug, export_format=format)
    return {"data": CardTypeStructureExportRead.model_validate(exported)}


@router.get(
    "/{card_type_slug}/table-export",
    response_model=APIDataEnvelope[CardTypeTableExportRead],
)
def get_workspace_card_type_table_export(
    workspace_slug: str,
    card_type_slug: str,
    format: str = Query(default="json"),
    q: str = Query(default=""),
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardTypeTableExportRead]:
    exported = export_card_type_table(session, card_type_slug, export_format=format, q=q)
    return {"data": CardTypeTableExportRead.model_validate(exported)}


@router.post(
    "/{card_type_slug}/import-preview",
    response_model=APIDataEnvelope[CardTypeImportPreviewRead],
)
def post_workspace_card_type_import_preview(
    workspace_slug: str,
    card_type_slug: str,
    payload: CardTypeImportRequest,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardTypeImportPreviewRead]:
    preview = preview_card_type_import(
        session,
        card_type_slug,
        import_format=payload.format,
        content_text=payload.content_text,
        content_base64=payload.content_base64,
    )
    return {"data": CardTypeImportPreviewRead.model_validate(preview)}


@router.post(
    "/{card_type_slug}/import-apply",
    response_model=APIDataEnvelope[CardTypeImportResultRead],
)
def post_workspace_card_type_import_apply(
    workspace_slug: str,
    card_type_slug: str,
    payload: CardTypeImportRequest,
    session: Session = Depends(get_workspace_db),
) -> dict[str, CardTypeImportResultRead]:
    get_workspace_manager().create_backup(
        workspace_slug,
        reason=f"import-{card_type_slug}",
    )
    imported = apply_card_type_import(
        session,
        card_type_slug,
        import_format=payload.format,
        content_text=payload.content_text,
        content_base64=payload.content_base64,
    )
    return {"data": CardTypeImportResultRead.model_validate(imported)}

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.common import APIDataEnvelope
from app.schemas.workspace import AppInfoRead
from app.services.workspace_manager import get_workspace_manager

router = APIRouter()


@router.get("/health", response_model=APIDataEnvelope[dict[str, str]])
def get_health() -> dict[str, dict[str, str]]:
    return {"data": {"status": "ok"}}


@router.get("/app-info", response_model=APIDataEnvelope[AppInfoRead])
def get_app_info() -> dict[str, AppInfoRead]:
    return {"data": AppInfoRead(**get_workspace_manager().get_app_info())}

from fastapi import APIRouter

from app.api.routes import card_types, cards, schemas, system, taxonomy, workspaces

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(card_types.router, tags=["workspace-card-types"])
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])
api_router.include_router(cards.workspace_router, tags=["workspace-cards"])
api_router.include_router(taxonomy.router, prefix="/taxonomy", tags=["taxonomy"])
api_router.include_router(taxonomy.workspace_router, tags=["workspace-taxonomy"])
api_router.include_router(schemas.router, prefix="/schemas", tags=["schemas"])
api_router.include_router(schemas.workspace_router, tags=["workspace-schemas"])

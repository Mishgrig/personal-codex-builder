from fastapi import APIRouter

from app.api.routes import boards, card_types, cards, chapters, character_graph, plots, schemas, system, taxonomy, workspaces

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(card_types.router, tags=["workspace-card-types"])
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])
api_router.include_router(cards.workspace_router, tags=["workspace-cards"])
api_router.include_router(plots.router, tags=["workspace-plots"])
api_router.include_router(boards.router, tags=["workspace-boards"])
api_router.include_router(chapters.router, tags=["workspace-chapters"])
api_router.include_router(character_graph.router, tags=["workspace-character-graph"])
api_router.include_router(taxonomy.router, prefix="/taxonomy", tags=["taxonomy"])
api_router.include_router(taxonomy.workspace_router, tags=["workspace-taxonomy"])
api_router.include_router(schemas.router, prefix="/schemas", tags=["schemas"])
api_router.include_router(schemas.workspace_router, tags=["workspace-schemas"])

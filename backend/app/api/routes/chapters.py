from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_workspace_db
from app.schemas.chapter import (
    ChapterCreate,
    ChapterListRead,
    ChapterRead,
    ChapterReferenceCreate,
    ChapterUpdate,
    DiceShortcutCreate,
    DiceShortcutUpdate,
    SceneCreate,
    SceneReferenceCreate,
    SceneTokenCreate,
    SceneTokenUpdate,
    SceneUpdate,
)
from app.schemas.common import APIDataEnvelope, ActionStatus
from app.services.chapter_service import (
    add_chapter_reference,
    add_dice_shortcut,
    add_scene_reference,
    add_scene_token,
    create_chapter,
    create_scene,
    delete_chapter,
    delete_chapter_reference,
    delete_dice_shortcut,
    delete_scene,
    delete_scene_reference,
    delete_scene_token,
    get_chapter,
    list_chapters,
    serialize_chapter,
    update_chapter,
    update_dice_shortcut,
    update_scene,
    update_scene_token,
)

router = APIRouter(prefix="/workspaces/{workspace_slug}/chapters")


@router.get("", response_model=APIDataEnvelope[ChapterListRead])
def get_chapters(
    workspace_slug: str,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterListRead]:
    items = list_chapters(session)
    return {"data": ChapterListRead(items=items, total=len(items))}


@router.post("", response_model=APIDataEnvelope[ChapterRead])
def post_chapter(
    workspace_slug: str,
    payload: ChapterCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": create_chapter(session, payload)}


@router.get("/{chapter_id}", response_model=APIDataEnvelope[ChapterRead])
def get_chapter_detail(
    workspace_slug: str,
    chapter_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": serialize_chapter(get_chapter(session, chapter_id))}


@router.patch("/{chapter_id}", response_model=APIDataEnvelope[ChapterRead])
def patch_chapter(
    workspace_slug: str,
    chapter_id: int,
    payload: ChapterUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": update_chapter(session, chapter_id, payload)}


@router.delete("/{chapter_id}", response_model=APIDataEnvelope[ActionStatus])
def remove_chapter(
    workspace_slug: str,
    chapter_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ActionStatus]:
    delete_chapter(session, chapter_id)
    return {"data": ActionStatus(message="Chapter deleted.")}


@router.post("/{chapter_id}/references", response_model=APIDataEnvelope[ChapterRead])
def post_chapter_reference(
    workspace_slug: str,
    chapter_id: int,
    payload: ChapterReferenceCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": add_chapter_reference(session, chapter_id, payload)}


@router.delete("/references/{reference_id}", response_model=APIDataEnvelope[ChapterRead])
def remove_chapter_reference(
    workspace_slug: str,
    reference_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": delete_chapter_reference(session, reference_id)}


@router.post("/{chapter_id}/scenes", response_model=APIDataEnvelope[ChapterRead])
def post_scene(
    workspace_slug: str,
    chapter_id: int,
    payload: SceneCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": create_scene(session, chapter_id, payload)}


@router.patch("/scenes/{scene_id}", response_model=APIDataEnvelope[ChapterRead])
def patch_scene(
    workspace_slug: str,
    scene_id: int,
    payload: SceneUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": update_scene(session, scene_id, payload)}


@router.delete("/scenes/{scene_id}", response_model=APIDataEnvelope[ChapterRead])
def remove_scene(
    workspace_slug: str,
    scene_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": delete_scene(session, scene_id)}


@router.post("/scenes/{scene_id}/references", response_model=APIDataEnvelope[ChapterRead])
def post_scene_reference(
    workspace_slug: str,
    scene_id: int,
    payload: SceneReferenceCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": add_scene_reference(session, scene_id, payload)}


@router.delete("/scenes/references/{reference_id}", response_model=APIDataEnvelope[ChapterRead])
def remove_scene_reference(
    workspace_slug: str,
    reference_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": delete_scene_reference(session, reference_id)}


@router.post("/scenes/{scene_id}/tokens", response_model=APIDataEnvelope[ChapterRead])
def post_scene_token(
    workspace_slug: str,
    scene_id: int,
    payload: SceneTokenCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": add_scene_token(session, scene_id, payload)}


@router.patch("/scenes/tokens/{token_id}", response_model=APIDataEnvelope[ChapterRead])
def patch_scene_token(
    workspace_slug: str,
    token_id: int,
    payload: SceneTokenUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": update_scene_token(session, token_id, payload)}


@router.delete("/scenes/tokens/{token_id}", response_model=APIDataEnvelope[ChapterRead])
def remove_scene_token(
    workspace_slug: str,
    token_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": delete_scene_token(session, token_id)}


@router.post("/{chapter_id}/dice-shortcuts", response_model=APIDataEnvelope[ChapterRead])
def post_chapter_dice_shortcut(
    workspace_slug: str,
    chapter_id: int,
    payload: DiceShortcutCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": add_dice_shortcut(session, chapter_id=chapter_id, payload=payload)}


@router.post("/scenes/{scene_id}/dice-shortcuts", response_model=APIDataEnvelope[ChapterRead])
def post_scene_dice_shortcut(
    workspace_slug: str,
    scene_id: int,
    payload: DiceShortcutCreate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": add_dice_shortcut(session, scene_id=scene_id, payload=payload)}


@router.patch("/dice-shortcuts/{shortcut_id}", response_model=APIDataEnvelope[ChapterRead])
def patch_dice_shortcut(
    workspace_slug: str,
    shortcut_id: int,
    payload: DiceShortcutUpdate,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": update_dice_shortcut(session, shortcut_id, payload)}


@router.delete("/dice-shortcuts/{shortcut_id}", response_model=APIDataEnvelope[ChapterRead])
def remove_dice_shortcut(
    workspace_slug: str,
    shortcut_id: int,
    session: Session = Depends(get_workspace_db),
) -> dict[str, ChapterRead]:
    return {"data": delete_dice_shortcut(session, shortcut_id)}

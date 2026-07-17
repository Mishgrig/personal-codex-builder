from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.models.workspace import (
    Asset,
    Board,
    Card,
    Chapter,
    ChapterReference,
    DiceShortcut,
    PlotEvent,
    Scene,
    SceneReference,
    SceneToken,
)
from app.schemas.chapter import (
    ChapterCreate,
    ChapterRead,
    ChapterReferenceCreate,
    ChapterReferenceRead,
    ChapterUpdate,
    DiceShortcutCreate,
    DiceShortcutRead,
    DiceShortcutUpdate,
    SceneCreate,
    SceneRead,
    SceneReferenceCreate,
    SceneReferenceRead,
    SceneTokenCreate,
    SceneTokenRead,
    SceneTokenUpdate,
    SceneUpdate,
)


def _chapter_options():
    return (
        selectinload(Chapter.cover_asset),
        selectinload(Chapter.references),
        selectinload(Chapter.scenes).selectinload(Scene.background_asset),
        selectinload(Chapter.scenes).selectinload(Scene.map_asset),
        selectinload(Chapter.scenes).selectinload(Scene.references),
        selectinload(Chapter.scenes).selectinload(Scene.tokens).selectinload(SceneToken.card),
        selectinload(Chapter.scenes).selectinload(Scene.tokens).selectinload(SceneToken.asset),
        selectinload(Chapter.scenes).selectinload(Scene.dice_shortcuts),
        selectinload(Chapter.dice_shortcuts),
    )


def list_chapters(session: Session) -> list[ChapterRead]:
    chapters = session.execute(
        select(Chapter).options(*_chapter_options()).order_by(Chapter.sort_order.asc(), Chapter.created_at.asc())
    ).scalars().unique()
    return [serialize_chapter(chapter) for chapter in chapters]


def get_chapter(session: Session, chapter_id: int) -> Chapter:
    chapter = session.execute(
        select(Chapter).options(*_chapter_options()).where(Chapter.id == chapter_id)
    ).scalar_one_or_none()
    if not chapter:
        raise NotFoundError("Chapter was not found.")
    return chapter


def create_chapter(session: Session, payload: ChapterCreate) -> ChapterRead:
    _validate_asset(session, payload.cover_asset_id, "Chapter cover asset")
    chapter = Chapter(
        uid=f"chp-{uuid4().hex[:12]}",
        title=payload.title,
        description=payload.description,
        status=payload.status,
        notes_json=payload.notes_json,
        notes_text=payload.notes_text,
        cover_asset_id=payload.cover_asset_id,
        view_settings=payload.view_settings,
        sort_order=payload.sort_order or _next_chapter_sort_order(session),
    )
    session.add(chapter)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter.id))


def update_chapter(session: Session, chapter_id: int, payload: ChapterUpdate) -> ChapterRead:
    chapter = get_chapter(session, chapter_id)
    data = payload.model_dump(exclude_unset=True)
    if "cover_asset_id" in data:
        _validate_asset(session, data["cover_asset_id"], "Chapter cover asset")
    for key, value in data.items():
        setattr(chapter, key, value)
    session.add(chapter)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def delete_chapter(session: Session, chapter_id: int) -> None:
    chapter = get_chapter(session, chapter_id)
    session.delete(chapter)
    session.commit()


def add_chapter_reference(session: Session, chapter_id: int, payload: ChapterReferenceCreate) -> ChapterRead:
    get_chapter(session, chapter_id)
    target = _resolve_reference_target(session, payload.target_type, payload.target_id)
    exists = session.execute(
        select(ChapterReference).where(
            ChapterReference.chapter_id == chapter_id,
            ChapterReference.target_type == payload.target_type,
            ChapterReference.target_id == payload.target_id,
            ChapterReference.role == payload.role,
        )
    ).scalar_one_or_none()
    if not exists:
        session.add(
            ChapterReference(
                chapter_id=chapter_id,
                target_type=payload.target_type,
                target_id=payload.target_id,
                role=payload.role,
                label=payload.label or target["title"],
                sort_order=payload.sort_order or _next_chapter_reference_sort_order(session, chapter_id),
            )
        )
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def delete_chapter_reference(session: Session, reference_id: int) -> ChapterRead:
    reference = session.get(ChapterReference, reference_id)
    if not reference:
        raise NotFoundError("Chapter reference was not found.")
    chapter_id = reference.chapter_id
    session.delete(reference)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def create_scene(session: Session, chapter_id: int, payload: SceneCreate) -> ChapterRead:
    get_chapter(session, chapter_id)
    _validate_asset(session, payload.background_asset_id, "Scene background asset")
    _validate_asset(session, payload.map_asset_id, "Scene map asset")
    scene = Scene(
        uid=f"scn-{uuid4().hex[:12]}",
        chapter_id=chapter_id,
        title=payload.title,
        summary=payload.summary,
        status=payload.status,
        gm_notes_json=payload.gm_notes_json,
        gm_notes_text=payload.gm_notes_text,
        player_notes_json=payload.player_notes_json,
        player_notes_text=payload.player_notes_text,
        quick_notes_json=payload.quick_notes_json,
        background_asset_id=payload.background_asset_id,
        map_asset_id=payload.map_asset_id,
        play_settings=payload.play_settings,
        runtime_state=payload.runtime_state,
        sort_order=payload.sort_order or _next_scene_sort_order(session, chapter_id),
    )
    session.add(scene)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def get_scene(session: Session, scene_id: int) -> Scene:
    scene = session.execute(
        select(Scene)
        .options(
            selectinload(Scene.background_asset),
            selectinload(Scene.map_asset),
            selectinload(Scene.references),
            selectinload(Scene.tokens).selectinload(SceneToken.card),
            selectinload(Scene.tokens).selectinload(SceneToken.asset),
            selectinload(Scene.dice_shortcuts),
        )
        .where(Scene.id == scene_id)
    ).scalar_one_or_none()
    if not scene:
        raise NotFoundError("Scene was not found.")
    return scene


def update_scene(session: Session, scene_id: int, payload: SceneUpdate) -> ChapterRead:
    scene = get_scene(session, scene_id)
    data = payload.model_dump(exclude_unset=True)
    if "background_asset_id" in data:
        _validate_asset(session, data["background_asset_id"], "Scene background asset")
    if "map_asset_id" in data:
        _validate_asset(session, data["map_asset_id"], "Scene map asset")
    for key, value in data.items():
        setattr(scene, key, value)
    chapter_id = scene.chapter_id
    session.add(scene)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def delete_scene(session: Session, scene_id: int) -> ChapterRead:
    scene = get_scene(session, scene_id)
    chapter_id = scene.chapter_id
    session.delete(scene)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def add_scene_reference(session: Session, scene_id: int, payload: SceneReferenceCreate) -> ChapterRead:
    scene = get_scene(session, scene_id)
    target = _resolve_reference_target(session, payload.target_type, payload.target_id)
    exists = session.execute(
        select(SceneReference).where(
            SceneReference.scene_id == scene_id,
            SceneReference.target_type == payload.target_type,
            SceneReference.target_id == payload.target_id,
            SceneReference.role == payload.role,
        )
    ).scalar_one_or_none()
    if not exists:
        session.add(
            SceneReference(
                scene_id=scene_id,
                target_type=payload.target_type,
                target_id=payload.target_id,
                role=payload.role,
                label=payload.label or target["title"],
                visibility=_normalize_visibility(payload.visibility),
                sort_order=payload.sort_order or _next_scene_reference_sort_order(session, scene_id),
            )
        )
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, scene.chapter_id))


def delete_scene_reference(session: Session, reference_id: int) -> ChapterRead:
    reference = session.get(SceneReference, reference_id)
    if not reference:
        raise NotFoundError("Scene reference was not found.")
    scene = get_scene(session, reference.scene_id)
    chapter_id = scene.chapter_id
    session.delete(reference)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def add_scene_token(session: Session, scene_id: int, payload: SceneTokenCreate) -> ChapterRead:
    scene = get_scene(session, scene_id)
    _validate_card(session, payload.card_id, "Scene token entity")
    _validate_asset(session, payload.asset_id, "Scene token asset")
    session.add(
        SceneToken(
            scene_id=scene_id,
            label=payload.label,
            card_id=payload.card_id,
            asset_id=payload.asset_id,
            visibility=_normalize_visibility(payload.visibility),
            x=payload.x,
            y=payload.y,
            width=payload.width,
            height=payload.height,
            z_index=payload.z_index or _next_token_z_index(session, scene_id),
            notes=payload.notes,
        )
    )
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, scene.chapter_id))


def update_scene_token(session: Session, token_id: int, payload: SceneTokenUpdate) -> ChapterRead:
    token = session.get(SceneToken, token_id)
    if not token:
        raise NotFoundError("Scene token was not found.")
    data = payload.model_dump(exclude_unset=True)
    if "card_id" in data:
        _validate_card(session, data["card_id"], "Scene token entity")
    if "asset_id" in data:
        _validate_asset(session, data["asset_id"], "Scene token asset")
    if "visibility" in data:
        data["visibility"] = _normalize_visibility(data["visibility"])
    for key, value in data.items():
        setattr(token, key, value)
    scene = get_scene(session, token.scene_id)
    session.add(token)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, scene.chapter_id))


def delete_scene_token(session: Session, token_id: int) -> ChapterRead:
    token = session.get(SceneToken, token_id)
    if not token:
        raise NotFoundError("Scene token was not found.")
    scene = get_scene(session, token.scene_id)
    chapter_id = scene.chapter_id
    session.delete(token)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def add_dice_shortcut(
    session: Session,
    *,
    chapter_id: int | None = None,
    scene_id: int | None = None,
    payload: DiceShortcutCreate,
) -> ChapterRead:
    if not chapter_id and not scene_id:
        raise ConflictError("Dice shortcut requires a chapter or scene.")
    scene = get_scene(session, scene_id) if scene_id else None
    if scene:
        chapter_id = scene.chapter_id
    if chapter_id:
        get_chapter(session, chapter_id)
    session.add(
        DiceShortcut(
            chapter_id=chapter_id if scene is None else None,
            scene_id=scene_id,
            label=payload.label,
            formula=payload.formula,
            visibility=_normalize_visibility(payload.visibility),
            sort_order=payload.sort_order or _next_dice_sort_order(session, chapter_id, scene_id),
        )
    )
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def update_dice_shortcut(session: Session, shortcut_id: int, payload: DiceShortcutUpdate) -> ChapterRead:
    shortcut = session.get(DiceShortcut, shortcut_id)
    if not shortcut:
        raise NotFoundError("Dice shortcut was not found.")
    data = payload.model_dump(exclude_unset=True)
    if "visibility" in data:
        data["visibility"] = _normalize_visibility(data["visibility"])
    for key, value in data.items():
        setattr(shortcut, key, value)
    chapter_id = shortcut.chapter_id or get_scene(session, shortcut.scene_id).chapter_id if shortcut.scene_id else shortcut.chapter_id
    session.add(shortcut)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def delete_dice_shortcut(session: Session, shortcut_id: int) -> ChapterRead:
    shortcut = session.get(DiceShortcut, shortcut_id)
    if not shortcut:
        raise NotFoundError("Dice shortcut was not found.")
    chapter_id = shortcut.chapter_id or get_scene(session, shortcut.scene_id).chapter_id if shortcut.scene_id else shortcut.chapter_id
    session.delete(shortcut)
    session.commit()
    session.expire_all()
    return serialize_chapter(get_chapter(session, chapter_id))


def serialize_chapter(chapter: Chapter) -> ChapterRead:
    return ChapterRead(
        id=chapter.id,
        uid=chapter.uid,
        title=chapter.title,
        description=chapter.description,
        status=chapter.status,
        notes_json=chapter.notes_json,
        notes_text=chapter.notes_text,
        cover_asset_id=chapter.cover_asset_id,
        cover_asset_url=_asset_url(chapter.cover_asset),
        view_settings=chapter.view_settings,
        sort_order=chapter.sort_order,
        references=[serialize_chapter_reference(reference, session_obj=chapter) for reference in chapter.references],
        scenes=[serialize_scene(scene) for scene in chapter.scenes],
        dice_shortcuts=[serialize_dice_shortcut(shortcut) for shortcut in chapter.dice_shortcuts],
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


def serialize_scene(scene: Scene) -> SceneRead:
    return SceneRead(
        id=scene.id,
        uid=scene.uid,
        chapter_id=scene.chapter_id,
        title=scene.title,
        summary=scene.summary,
        status=scene.status,
        gm_notes_json=scene.gm_notes_json,
        gm_notes_text=scene.gm_notes_text,
        player_notes_json=scene.player_notes_json,
        player_notes_text=scene.player_notes_text,
        quick_notes_json=scene.quick_notes_json,
        background_asset_id=scene.background_asset_id,
        background_asset_url=_asset_url(scene.background_asset),
        map_asset_id=scene.map_asset_id,
        map_asset_url=_asset_url(scene.map_asset),
        play_settings=scene.play_settings,
        runtime_state=scene.runtime_state,
        sort_order=scene.sort_order,
        references=[serialize_scene_reference(reference, scene) for reference in scene.references],
        tokens=[serialize_scene_token(token) for token in scene.tokens],
        dice_shortcuts=[serialize_dice_shortcut(shortcut) for shortcut in scene.dice_shortcuts],
        created_at=scene.created_at,
        updated_at=scene.updated_at,
    )


def serialize_chapter_reference(reference: ChapterReference, session_obj: Chapter | None = None) -> ChapterReferenceRead:
    target = _reference_title_from_loaded(reference.target_type, reference.target_id, session_obj)
    return ChapterReferenceRead(
        id=reference.id,
        target_type=reference.target_type,
        target_id=reference.target_id,
        role=reference.role,
        label=reference.label,
        sort_order=reference.sort_order,
        target_title=target,
        target_url=None,
        created_at=reference.created_at,
        updated_at=reference.updated_at,
    )


def serialize_scene_reference(reference: SceneReference, scene: Scene | None = None) -> SceneReferenceRead:
    target = _reference_title_from_loaded(reference.target_type, reference.target_id, scene)
    return SceneReferenceRead(
        id=reference.id,
        target_type=reference.target_type,
        target_id=reference.target_id,
        role=reference.role,
        label=reference.label,
        visibility=reference.visibility,
        sort_order=reference.sort_order,
        target_title=target,
        target_url=None,
        created_at=reference.created_at,
        updated_at=reference.updated_at,
    )


def serialize_scene_token(token: SceneToken) -> SceneTokenRead:
    return SceneTokenRead(
        id=token.id,
        scene_id=token.scene_id,
        label=token.label,
        card_id=token.card_id,
        asset_id=token.asset_id,
        visibility=token.visibility,
        x=token.x,
        y=token.y,
        width=token.width,
        height=token.height,
        z_index=token.z_index,
        notes=token.notes,
        card_title=token.card.title if token.card else None,
        asset_filename=token.asset.original_filename if token.asset else None,
        asset_url=_asset_url(token.asset),
        created_at=token.created_at,
        updated_at=token.updated_at,
    )


def serialize_dice_shortcut(shortcut: DiceShortcut) -> DiceShortcutRead:
    return DiceShortcutRead(
        id=shortcut.id,
        chapter_id=shortcut.chapter_id,
        scene_id=shortcut.scene_id,
        label=shortcut.label,
        formula=shortcut.formula,
        visibility=shortcut.visibility,
        sort_order=shortcut.sort_order,
        created_at=shortcut.created_at,
        updated_at=shortcut.updated_at,
    )


def _resolve_reference_target(session: Session, target_type: str, target_id: str) -> dict[str, str | None]:
    if target_type == "entity":
        card = _validate_card(session, _int_id(target_id, "entity"), "Referenced entity")
        return {"title": card.title, "url": None}
    if target_type in {"asset", "map"}:
        asset = _validate_asset(session, target_id, "Referenced asset")
        return {"title": asset.original_filename, "url": _asset_url(asset)}
    if target_type == "board":
        board = session.get(Board, _int_id(target_id, "board"))
        if not board:
            raise NotFoundError("Referenced board was not found.")
        return {"title": board.title, "url": None}
    if target_type == "event":
        event = session.get(PlotEvent, _int_id(target_id, "event"))
        if not event:
            raise NotFoundError("Referenced timeline event was not found.")
        return {"title": event.title, "url": None}
    raise ConflictError("Unsupported reference target type.")


def _validate_card(session: Session, card_id: int | None, label: str) -> Card | None:
    if card_id is None:
        return None
    card = session.get(Card, card_id)
    if not card:
        raise NotFoundError(f"{label} was not found.")
    return card


def _validate_asset(session: Session, asset_id: str | None, label: str) -> Asset | None:
    if asset_id is None:
        return None
    asset = session.get(Asset, asset_id)
    if not asset:
        raise NotFoundError(f"{label} was not found.")
    return asset


def _int_id(value: str, label: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise ConflictError(f"Referenced {label} id must be an integer.") from exc


def _asset_url(asset: Asset | None) -> str | None:
    return f"/media/{asset.relative_path}" if asset else None


def _normalize_visibility(value: str | None) -> str:
    return "players" if value == "players" else "gm"


def _reference_title_from_loaded(target_type: str, target_id: str, loaded_root: object | None) -> str | None:
    if not loaded_root:
        return None
    # Loaded title resolution is intentionally conservative; full details are validated on writes.
    if target_type == "entity":
        return None
    if target_type in {"asset", "map"}:
        return None
    return None


def _next_chapter_sort_order(session: Session) -> float:
    latest = session.execute(select(Chapter).order_by(Chapter.sort_order.desc())).scalars().first()
    return (latest.sort_order + 100.0) if latest else 100.0


def _next_scene_sort_order(session: Session, chapter_id: int) -> float:
    latest = session.execute(
        select(Scene).where(Scene.chapter_id == chapter_id).order_by(Scene.sort_order.desc())
    ).scalars().first()
    return (latest.sort_order + 100.0) if latest else 100.0


def _next_chapter_reference_sort_order(session: Session, chapter_id: int) -> int:
    latest = session.execute(
        select(ChapterReference).where(ChapterReference.chapter_id == chapter_id).order_by(ChapterReference.sort_order.desc())
    ).scalars().first()
    return (latest.sort_order + 1) if latest else 1


def _next_scene_reference_sort_order(session: Session, scene_id: int) -> int:
    latest = session.execute(
        select(SceneReference).where(SceneReference.scene_id == scene_id).order_by(SceneReference.sort_order.desc())
    ).scalars().first()
    return (latest.sort_order + 1) if latest else 1


def _next_token_z_index(session: Session, scene_id: int) -> int:
    latest = session.execute(
        select(SceneToken).where(SceneToken.scene_id == scene_id).order_by(SceneToken.z_index.desc())
    ).scalars().first()
    return (latest.z_index + 1) if latest else 1


def _next_dice_sort_order(session: Session, chapter_id: int | None, scene_id: int | None) -> int:
    stmt = select(DiceShortcut).order_by(DiceShortcut.sort_order.desc())
    if scene_id:
        stmt = stmt.where(DiceShortcut.scene_id == scene_id)
    else:
        stmt = stmt.where(DiceShortcut.chapter_id == chapter_id, DiceShortcut.scene_id.is_(None))
    latest = session.execute(stmt).scalars().first()
    return (latest.sort_order + 1) if latest else 1

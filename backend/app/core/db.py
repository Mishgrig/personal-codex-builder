from __future__ import annotations

from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.base import Base

_ENGINE_CACHE: dict[Path, Engine] = {}
_SESSION_CACHE: dict[Path, sessionmaker[Session]] = {}


def _ensure_sqlite_pragmas(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def create_sqlite_engine(db_path: Path) -> Engine:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    event.listen(engine, "connect", _ensure_sqlite_pragmas)
    return engine


def get_engine(db_path: Path) -> Engine:
    if db_path not in _ENGINE_CACHE:
        _ENGINE_CACHE[db_path] = create_sqlite_engine(db_path)
    return _ENGINE_CACHE[db_path]


def get_session_factory(db_path: Path) -> sessionmaker[Session]:
    if db_path not in _SESSION_CACHE:
        _SESSION_CACHE[db_path] = sessionmaker(
            bind=get_engine(db_path),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )
    return _SESSION_CACHE[db_path]


def dispose_sqlite_handles(db_path: Path) -> None:
    engine = _ENGINE_CACHE.pop(db_path, None)
    _SESSION_CACHE.pop(db_path, None)
    if engine is not None:
        engine.dispose()


def create_workspace_schema(db_path: Path) -> None:
    engine = get_engine(db_path)
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS card_search
                USING fts5(
                    title,
                    summary,
                    body_text,
                    dynamic_text,
                    taxonomy_text,
                    source_text,
                    attachment_text
                )
                """
            )
        )


def workspace_session(db_path: Path) -> Iterator[Session]:
    session_factory = get_session_factory(db_path)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

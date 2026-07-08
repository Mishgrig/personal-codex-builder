from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.db import create_sqlite_engine
from app.models.app_index import AppIndexBase

_ENGINE_CACHE: dict[str, Engine] = {}
_SESSION_CACHE: dict[str, sessionmaker[Session]] = {}


def get_app_index_engine() -> Engine:
    key = str(get_settings().app_index_path)
    if key not in _ENGINE_CACHE:
        _ENGINE_CACHE[key] = create_sqlite_engine(get_settings().app_index_path)
    return _ENGINE_CACHE[key]


def get_app_index_session_factory() -> sessionmaker[Session]:
    key = str(get_settings().app_index_path)
    if key not in _SESSION_CACHE:
        _SESSION_CACHE[key] = sessionmaker(
            bind=get_app_index_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )
    return _SESSION_CACHE[key]


def create_app_index_schema() -> None:
    engine = get_app_index_engine()
    AppIndexBase.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(workspaces)")).all()
        }
        if "sort_order" not in columns:
            connection.execute(
                text("ALTER TABLE workspaces ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL")
            )


@contextmanager
def app_index_session() -> Iterator[Session]:
    session = get_app_index_session_factory()()
    try:
        yield session
    finally:
        session.close()

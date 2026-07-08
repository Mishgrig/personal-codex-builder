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


def _table_columns(connection, table_name: str) -> set[str]:
    return {
        row[1]
        for row in connection.execute(text(f'PRAGMA table_info("{table_name}")')).all()
    }


def _ensure_table_columns(connection, table_name: str, columns: dict[str, str]) -> None:
    existing = _table_columns(connection, table_name)
    for column_name, column_sql in columns.items():
        if column_name in existing:
            continue
        connection.execute(
            text(
                f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_sql}'
            )
        )


def create_workspace_schema(db_path: Path) -> None:
    engine = get_engine(db_path)
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        _ensure_table_columns(
            connection,
            "workspace_settings",
            {
                "taxonomy_labels": "JSON NOT NULL DEFAULT '{}'",
                "ui_preferences": "JSON NOT NULL DEFAULT '{}'",
                "notebook_json": "JSON NOT NULL DEFAULT '{}'",
            },
        )
        _ensure_table_columns(
            connection,
            "cards",
            {
                "body_json": "JSON NOT NULL DEFAULT '{}'",
                "body_text": "TEXT NOT NULL DEFAULT ''",
                "dynamic_fields": "JSON NOT NULL DEFAULT '{}'",
                "sort_order": "REAL NOT NULL DEFAULT 0",
                "cover_asset_id": "TEXT",
            },
        )
        _ensure_table_columns(
            connection,
            "card_relations",
            {
                "relation_type": "TEXT NOT NULL DEFAULT 'one-to-one'",
                "note": "TEXT NOT NULL DEFAULT ''",
            },
        )
        _ensure_table_columns(
            connection,
            "card_sources",
            {
                "url": "TEXT NOT NULL DEFAULT ''",
                "note": "TEXT NOT NULL DEFAULT ''",
                "source_type": "TEXT NOT NULL DEFAULT 'web_page'",
            },
        )
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
        connection.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS card_search_index
                USING fts5(
                    card_id UNINDEXED,
                    card_type_slug,
                    title,
                    summary,
                    body_plain_text,
                    custom_fields_plain_text,
                    categories_plain_text,
                    sources_plain_text,
                    relations_plain_text,
                    combined_plain_text
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

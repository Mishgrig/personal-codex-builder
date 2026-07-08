from __future__ import annotations

from collections.abc import Generator

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import APIError
from app.services.workspace_service import get_workspace_session


def get_workspace_slug(x_workspace_slug: str | None = Header(default=None)) -> str:
    if not x_workspace_slug:
        raise APIError(
            "X-Workspace-Slug header is required.",
            status_code=400,
            code="MISSING_WORKSPACE_SLUG",
        )
    return x_workspace_slug


def get_db(workspace_slug: str = Depends(get_workspace_slug)) -> Generator[Session, None, None]:
    session = get_workspace_session(workspace_slug)
    try:
        yield session
    finally:
        session.close()


def get_workspace_db(workspace_slug: str) -> Generator[Session, None, None]:
    session = get_workspace_session(workspace_slug)
    try:
        yield session
    finally:
        session.close()

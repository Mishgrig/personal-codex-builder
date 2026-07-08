from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedModel(ORMModel):
    created_at: datetime
    updated_at: datetime


class APIDataEnvelope(BaseModel, Generic[T]):
    data: T


class APIErrorPayload(BaseModel):
    code: str
    message: str
    details: Any | None = None


class APIErrorEnvelope(BaseModel):
    error: APIErrorPayload


class ActionStatus(BaseModel):
    status: str = "ok"
    message: str = "Operation completed."

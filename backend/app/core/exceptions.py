from __future__ import annotations

from typing import Any


class APIError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "API_ERROR",
        details: Any | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        super().__init__(message)


class NotFoundError(APIError):
    def __init__(self, message: str, *, code: str = "NOT_FOUND", details: Any | None = None) -> None:
        super().__init__(message, status_code=404, code=code, details=details)


class ConflictError(APIError):
    def __init__(self, message: str, *, code: str = "CONFLICT", details: Any | None = None) -> None:
        super().__init__(message, status_code=409, code=code, details=details)


class ValidationAPIError(APIError):
    def __init__(self, message: str, *, details: Any | None = None) -> None:
        super().__init__(message, status_code=422, code="VALIDATION_ERROR", details=details)

"""One error format for the whole API: `{"error": {"code", "message", "details"}}`.

Clients (including the frontend form, which maps `details` onto fields) only ever have
to handle this shape, whether the error came from validation, a 404, or a crash.
"""

from collections.abc import Mapping, Sequence
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.errors import ErrorBody, ErrorDetail, ErrorResponse

# Where a validation error originated; stripped so `field` is just the field path.
_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})

# Pydantic prefixes messages raised from custom validators; the prefix is noise to users.
_VALUE_ERROR_PREFIX = "Value error, "

# For OpenAPI: routers declare these so the docs and generated client types show the
# real error shape (FastAPI would otherwise advertise its default 422 schema).
ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Not found"},
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "model": ErrorResponse,
        "description": "Validation error",
    },
}


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: list[ErrorDetail] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or []))
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


def _status_code_slug(status_code: int) -> str:
    """404 -> "not_found", 405 -> "method_not_allowed"."""
    try:
        phrase = HTTPStatus(status_code).phrase
    except ValueError:
        return "error"
    return phrase.lower().replace(" ", "_").replace("-", "_")


def _field_path(loc: Sequence[int | str]) -> str | None:
    parts = list(loc)
    if parts and parts[0] in _LOCATION_PREFIXES:
        parts = parts[1:]
    return ".".join(str(p) for p in parts) or None


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    message = exc.detail if isinstance(exc.detail, str) else HTTPStatus(exc.status_code).phrase
    return _error_response(
        exc.status_code,
        _status_code_slug(exc.status_code),
        message,
        headers=exc.headers,  # e.g. `Allow` on 405
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = exc.errors()

    # Unparseable JSON is a malformed request, not a semantically invalid one.
    if any(err.get("type") == "json_invalid" for err in errors):
        return _error_response(
            status.HTTP_400_BAD_REQUEST, "invalid_json", "Request body is not valid JSON"
        )

    details = [
        ErrorDetail(
            field=_field_path(err.get("loc", ())),
            msg=str(err.get("msg", "Invalid value")).removeprefix(_VALUE_ERROR_PREFIX),
        )
        for err in errors
    ]
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "validation_error",
        "Request validation failed",
        details,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Never leak internals to the client. Starlette re-raises the exception after this
    # handler runs, so the server logs the traceback once; logging here would duplicate it.
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "An unexpected error occurred",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

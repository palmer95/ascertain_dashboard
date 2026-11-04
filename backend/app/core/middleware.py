import logging
import re
import time
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import request_id_var

logger = logging.getLogger("app.request")

REQUEST_ID_HEADER = "X-Request-ID"

# Accept an upstream ID (e.g. from a load balancer) only if it looks like one, so a client
# can't inject arbitrary text into the logs.
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class RequestLoggingMiddleware:
    """Log one line per request: method, path, status, duration, tagged with a request ID.

    Pure ASGI (not BaseHTTPMiddleware) so contextvars and streaming behave correctly.
    Deliberately never logs bodies or query strings: both can contain patient data (PHI).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER, "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid4().hex
        # Exposed on request.state for handlers that run after this middleware unwinds
        # (the 500 handler echoes it so users can quote it in a bug report).
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_var.set(request_id)

        # Stays 500 if the app raises before sending a response.
        status_code = 500
        start = time.perf_counter()

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.log(
                logging.ERROR if status_code >= 500 else logging.INFO,
                "%s %s %d %.1fms",
                scope["method"],
                scope["path"],
                status_code,
                duration_ms,
            )
            request_id_var.reset(token)

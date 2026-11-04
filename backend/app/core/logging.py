import logging
import logging.config
from contextvars import ContextVar

# Set per request by the logging middleware; "-" outside a request (startup, seed, etc.).
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Stamp every log record with the current request ID so log lines correlate."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging(level: str) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s",
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "filters": ["request_id"],
                    "stream": "ext://sys.stderr",
                },
            },
            "loggers": {
                "uvicorn": {"handlers": ["default"], "level": level, "propagate": False},
                # Replaced by RequestLoggingMiddleware, which adds the request ID and duration
                # and leaves out the query string (it can carry PHI, e.g. a searched name).
                "uvicorn.access": {"handlers": [], "propagate": False},
            },
            "root": {"handlers": ["default"], "level": level},
        }
    )

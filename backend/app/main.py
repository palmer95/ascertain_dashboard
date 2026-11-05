from fastapi import FastAPI
from fastapi.routing import APIRoute

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.routers import dashboard, health, notes, patients, summary


def _operation_id(route: APIRoute) -> str:
    """Use the route function's name (e.g. `list_patients`) as its OpenAPI operationId.

    FastAPI's default (`list_patients_patients_get`) leaks into generated client types.
    """
    return route.name


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        generate_unique_id_function=_operation_id,
    )
    app.add_middleware(RequestLoggingMiddleware)
    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(patients.router)
    app.include_router(notes.router)
    app.include_router(summary.router)
    app.include_router(dashboard.router)
    return app


app = create_app()

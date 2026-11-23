"""App factory de la API del POS."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, catalog, health, reports, sync


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Pollería el wero — API", version=settings.app_version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(catalog.router)
    app.include_router(sync.router)
    app.include_router(reports.router)
    app.include_router(admin.router)
    return app


app = create_app()

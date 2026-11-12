"""Configuración de la aplicación leída desde variables de entorno."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_TIME_ZONE = "America/Mexico_City"


class Settings(BaseSettings):
    """Ajustes de la API. Los secretos solo llegan por entorno."""

    database_url: str = ""
    frontend_origin: str = "http://localhost:5173"
    app_version: str = "0.1.0"
    app_time_zone: str = DEFAULT_TIME_ZONE

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        """Orígenes de CORS declarados como lista separada por comas."""
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Devuelve una única instancia de Settings por proceso."""
    return Settings()

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    """Application settings, read from environment variables.

    For local development, values can also come from the repo-root `.env` (when running
    from `backend/`). Real environment variables always take precedence, which is how
    Docker Compose overrides the host/port inside the container network.
    """

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "Ascertain Healthcare API"
    environment: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"

    # Defaults match docker-compose.yml so local development works with no .env at all.
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str = "localhost"
    postgres_port: int = 5433
    postgres_db: str = "ascertain"

    @property
    def database_url(self) -> URL:
        # URL.create escapes special characters in credentials safely.
        return URL.create(
            drivername="postgresql+asyncpg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

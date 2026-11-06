from functools import lru_cache
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import SecretStr, field_validator
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

    # The practice's IANA time zone. Calendar dates (today, ages, the day a note was taken) are
    # worked out in it, so they match the clinic's wall clock wherever the server or browser is.
    clinic_timezone: str = "America/New_York"

    # Optional. Without a key, patient summaries use the built-in template narrative.
    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-haiku-5-5"
    # Short on purpose: past this, the summary falls back to the template rather than hang.
    summary_timeout_seconds: float = 10.0

    @field_validator("anthropic_api_key", mode="before")
    @classmethod
    def _blank_key_is_none(cls, value: object) -> object:
        # `ANTHROPIC_API_KEY=` (as in .env.example) means "not configured".
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("clinic_timezone")
    @classmethod
    def _known_time_zone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError, ValueError:
            raise ValueError(f"{value!r} is not an IANA time zone, e.g. America/New_York") from None
        return value

    @property
    def clinic_tz(self) -> ZoneInfo:
        return ZoneInfo(self.clinic_timezone)

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

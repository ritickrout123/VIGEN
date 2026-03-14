from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "VIGEN"
    app_env: str = "development"
    app_secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    database_url: str = "sqlite+aiosqlite:///./storage/vigen.db"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    storage_backend: str = "filesystem"
    filesystem_storage_root: Path = Path("./storage")
    r2_bucket: str | None = None
    r2_endpoint_url: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_public_base_url: str | None = None

    email_from: str = "noreply@example.com"
    sendgrid_api_key: str | None = None

    google_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    kling_api_key: str | None = None
    litellm_base_url: str | None = None

    use_mock_pipeline: bool = Field(default=True, alias="USE_MOCK_PIPELINE")
    preview_scene_threshold: int = 5
    storyboard_max_scenes: int = 30
    cost_cap_usd_default: float = 20.0


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.filesystem_storage_root.mkdir(parents=True, exist_ok=True)
    return settings


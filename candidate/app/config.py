from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://resume:resume@localhost:5432/resume"
    # Map high-entropy platform API keys to trusted tenant IDs. Never take tenant from a body.
    api_keys: dict[str, str] = Field(default_factory=dict)
    provider_url: str = "https://api.openai.com/v1"
    provider_api_key: SecretStr = SecretStr("")
    extraction_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    provider_timeout: int = Field(default=60, ge=1, le=180)
    max_resume_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=10 * 1024 * 1024)
    max_text_chars: int = Field(default=250_000, ge=20, le=250_000)
    max_pages: int = Field(default=100, ge=1, le=100)
    max_attempts: int = Field(default=3, ge=1, le=10)

    @model_validator(mode="after")
    def validate_config(self):
        if self.embedding_dimensions != 1536:
            raise ValueError("Schema version 1 requires 1536-dimensional embeddings")
        if any(
            len(key) < 32 or not tenant.strip() or len(tenant) > 128
            for key, tenant in self.api_keys.items()
        ):
            raise ValueError("API keys require at least 32 characters and a nonempty tenant")
        if not self.provider_url.startswith("https://"):
            raise ValueError("Provider URL must use HTTPS")
        return self


@lru_cache
def settings():
    return Settings()

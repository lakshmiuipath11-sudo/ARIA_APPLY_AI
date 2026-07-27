from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ARIA Apply AI API"
    app_version: str = "0.3.0"
    environment: str = "development"

    # Gemini configuration
    gemini_api_key: str | None = Field(
        default=None,
        alias="GEMINI_API_KEY",
    )

    gemini_model: str = Field(
        default="gemini-2.5-flash",
        alias="GEMINI_MODEL",
    )

    # Keep OpenAI temporarily as a fallback.
    # Remove these only after Gemini is tested successfully.
    openai_api_key: str | None = Field(
        default=None,
        alias="OPENAI_API_KEY",
    )

    openai_model: str = Field(
        default="gpt-5-mini",
        alias="OPENAI_MODEL",
    )

    allowed_origins: str = Field(
        default="*",
        alias="ALLOWED_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origins(self) -> list[str]:
        value = self.allowed_origins.strip()

        if value == "*":
            return ["*"]

        return [
            origin.strip()
            for origin in value.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()

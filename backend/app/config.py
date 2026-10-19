from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://aria:aria@localhost:55432/aria"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
    default_rule_variant: str = "A"


@lru_cache
def get_settings() -> Settings:
    return Settings()

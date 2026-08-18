from __future__ import annotations
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 480
    upload_dir: str
    anthropic_api_key: Optional[str] = None
    mcp_enabled: bool = True
    cors_origins: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
"""
backend/config.py
=================
Application configuration via Pydantic BaseSettings.
All settings are read from environment variables with the VFT_ prefix.
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    data_dir: Path = Path.home() / "VFTStudio"
    dev_mode: bool = True

    model_config = {"env_prefix": "VFT_"}


settings = Settings()

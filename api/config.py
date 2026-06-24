"""Configuração da API SLT (variáveis de ambiente)."""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

from api.sigma_dsn import build_sigma_database_url

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    slt_database_url: str
    sigma_api_base: str
    sigma_database_url: str
    session_secret: str
    port: int


@lru_cache
def get_settings() -> Settings:
    default_dsn = "postgresql://slt_user:slt_pass@127.0.0.1:5434/slt_db"
    session_secret = os.getenv("SLT_SESSION_SECRET", "").strip()
    if not session_secret:
        session_secret = secrets.token_hex(32)
    return Settings(
        slt_database_url=os.getenv("SLT_DATABASE_URL", default_dsn).strip(),
        sigma_api_base=os.getenv("SIGMA_API_BASE", "http://56.125.163.194").rstrip("/"),
        sigma_database_url=build_sigma_database_url(),
        session_secret=session_secret,
        port=int(os.getenv("PORT", "8080")),
    )

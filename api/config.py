"""Configuração da API SLT (variáveis de ambiente)."""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import quote_plus
from dotenv import load_dotenv

from api.path_policy import project_path
from api.sigma_dsn import build_sigma_database_url

load_dotenv(project_path(".env"))


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
    slt_database_url = os.getenv("SLT_DATABASE_URL", default_dsn).strip()
    if os.getenv("SLT_USE_SIGMA_POSTGRES", "").strip().lower() == "true":
        host = os.getenv("SIGMA_POSTGRES_HOST", "56.125.163.194").strip()
        port = os.getenv("SIGMA_POSTGRES_PORT", "5433").strip()
        user = quote_plus(os.getenv("SIGMA_POSTGRES_USER", "sigma_user").strip())
        password = quote_plus(os.getenv("SIGMA_POSTGRES_PASSWORD", "").strip())
        sslmode = quote_plus(os.getenv("SIGMA_POSTGRES_SSLMODE", "disable").strip())
        slt_database_url = (
            f"postgresql://{user}:{password}@{host}:{port}/slt_db?sslmode={sslmode}"
        )
    session_secret = os.getenv("SLT_SESSION_SECRET", "").strip()
    if not session_secret:
        session_secret = secrets.token_hex(32)
    return Settings(
        slt_database_url=slt_database_url,
        sigma_api_base=os.getenv("SIGMA_API_BASE", "https://56.125.163.194").rstrip("/"),
        sigma_database_url=build_sigma_database_url(),
        session_secret=session_secret,
        port=int(os.getenv("PORT", "8080")),
    )

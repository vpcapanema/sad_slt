"""Monta DSN PostgreSQL do SIGMA (somente leitura — usuarios.usuario)."""
from __future__ import annotations

import os
from urllib.parse import quote_plus


def build_sigma_database_url() -> str:
    """SIGMA_DATABASE_URL ou SIGMA_POSTGRES_* (mesmo padrão do PLI-HazardTrack)."""
    url = os.getenv("SIGMA_DATABASE_URL", "").strip()
    if url:
        for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://"):
            if url.startswith(prefix):
                return "postgresql://" + url.split(prefix, 1)[1]
        return url

    host = os.getenv("SIGMA_POSTGRES_HOST", "").strip()
    password = os.getenv("SIGMA_POSTGRES_PASSWORD", "").strip()
    if not host or not password:
        return ""

    user = quote_plus(os.getenv("SIGMA_POSTGRES_USER", "sigma_user").strip() or "sigma_user")
    pw = quote_plus(password)
    port = os.getenv("SIGMA_POSTGRES_PORT", "5433").strip() or "5433"
    db = os.getenv("SIGMA_POSTGRES_DATABASE", "sigma_pli_qr53").strip() or "sigma_pli_qr53"
    sslmode = os.getenv("SIGMA_POSTGRES_SSLMODE", "disable").strip() or "disable"
    return f"postgresql://{user}:{pw}@{host}:{port}/{db}?sslmode={sslmode}"

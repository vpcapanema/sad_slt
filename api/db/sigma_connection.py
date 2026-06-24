"""Conexão PostgreSQL read-only — banco SIGMA (usuarios)."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row

from api.config import get_settings
from api.exceptions import DatabaseUnavailableError


@contextmanager
def get_sigma_connection() -> Generator[psycopg.Connection, None, None]:
    dsn = get_settings().sigma_database_url
    if not dsn:
        raise DatabaseUnavailableError(
            "Banco SIGMA não configurado. Defina SIGMA_POSTGRES_HOST, "
            "SIGMA_POSTGRES_PASSWORD e demais variáveis SIGMA_POSTGRES_* no .env "
            "(mesmo padrão do PLI-HazardTrack)."
        )
    try:
        with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=8) as conn:
            conn.execute("SET default_transaction_read_only = ON")
            yield conn
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        raise DatabaseUnavailableError(f"Falha ao conectar ao banco SIGMA: {exc}") from exc

"""Conexão PostgreSQL/PostGIS do banco SLT."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row

from api.config import get_settings
from api.exceptions import DatabaseUnavailableError


@contextmanager
def get_connection() -> Generator[psycopg.Connection, None, None]:
    dsn = get_settings().slt_database_url
    if not dsn:
        raise DatabaseUnavailableError("SLT_DATABASE_URL não configurada.")
    try:
        with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=5) as conn:
            yield conn
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        raise DatabaseUnavailableError(f"Falha ao conectar ao banco SLT: {exc}") from exc

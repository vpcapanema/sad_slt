"""Conexão PostgreSQL/PostGIS do banco SLT."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Generator, cast

import psycopg
from psycopg.rows import dict_row

from api.config import get_settings
from api.exceptions import DatabaseUnavailableError

ConnectionDict = psycopg.Connection[dict[str, Any]]


@contextmanager
def get_connection() -> Generator[ConnectionDict, None, None]:
    """Retorna conexão do banco SLT configurada para linhas em formato dict."""
    dsn = get_settings().slt_database_url
    if not dsn:
        raise DatabaseUnavailableError("SLT_DATABASE_URL não configurada.")
    try:
        with cast(
            ConnectionDict,
            psycopg.connect(
                dsn,
                row_factory=cast(Any, dict_row),
                connect_timeout=5,
            ),
        ) as conn:
            yield conn
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        raise DatabaseUnavailableError(f"Falha ao conectar ao banco SLT: {exc}") from exc

"""Conexão PostgreSQL/PostGIS do banco SLT."""
from __future__ import annotations

from contextlib import contextmanager
from threading import local
from typing import Any, Generator, cast

import psycopg
from psycopg.rows import dict_row

from api.config import get_settings
from api.exceptions import DatabaseUnavailableError

ConnectionDict = psycopg.Connection[dict[str, Any]]
_thread_connections = local()


def _persistent_connection(dsn: str) -> ConnectionDict:
    """Reutiliza uma conexão por worker para evitar handshake remoto por requisição."""
    conn = getattr(_thread_connections, "connection", None)
    stored_dsn = getattr(_thread_connections, "dsn", None)
    if conn is not None and stored_dsn == dsn and not conn.closed:
        try:
            conn.execute("SELECT 1")
            return cast(ConnectionDict, conn)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
    conn = psycopg.connect(
        dsn, row_factory=cast(Any, dict_row), connect_timeout=5,
    )
    _thread_connections.connection = conn
    _thread_connections.dsn = dsn
    return cast(ConnectionDict, conn)


@contextmanager
def get_connection() -> Generator[ConnectionDict, None, None]:
    """Retorna conexão do banco SLT configurada para linhas em formato dict."""
    dsn = get_settings().slt_database_url
    if not dsn:
        raise DatabaseUnavailableError("SLT_DATABASE_URL não configurada.")
    try:
        conn = _persistent_connection(dsn)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        conn = getattr(_thread_connections, "connection", None)
        if conn is not None and conn.closed:
            _thread_connections.connection = None
        raise DatabaseUnavailableError(f"Falha ao conectar ao banco SLT: {exc}") from exc

"""Conexão PostgreSQL/PostGIS do banco SLT."""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from threading import BoundedSemaphore, Lock, local
from typing import Any, Generator, cast

import psycopg
from psycopg.rows import dict_row

from api.config import get_settings
from api.exceptions import DatabaseUnavailableError

ConnectionDict = psycopg.Connection[dict[str, Any]]
_thread_connections = local()

# O PostgreSQL fica em outra maquina, pela internet. Cinco segundos derrubavam
# varias leituras quando a bancada abria muitos arquivos de uma vez.
_CONNECT_TIMEOUT = max(5, int(os.getenv("SLT_DB_CONNECT_TIMEOUT", "15")))

# As rotas rodam em threads; uma conexão por thread chegaria a dezenas de
# conexões remotas. O pool limita o total e reaproveita o handshake.
_POOL_MAX = max(1, int(os.getenv("SLT_DB_POOL_MAX", "10")))
_POOL_TIMEOUT = max(1.0, float(os.getenv("SLT_DB_POOL_TIMEOUT", "60")))
# Cada ida ao banco custa uma volta pela rede. Só vale conferir a conexão com
# SELECT 1 quando ela ficou parada tempo suficiente para o túnel ou o servidor
# a terem derrubado; em uso contínuo, a própria consulta revela a falha.
_IDLE_CHECK_SECONDS = max(0.0, float(os.getenv("SLT_DB_IDLE_CHECK_SECONDS", "30")))


class _Pool:
    def __init__(self, size: int) -> None:
        self._slots = BoundedSemaphore(size)
        self._lock = Lock()
        self._idle: list[tuple[ConnectionDict, str, float]] = []

    def acquire(self, dsn: str) -> ConnectionDict:
        if not self._slots.acquire(timeout=_POOL_TIMEOUT):
            raise DatabaseUnavailableError(
                "Todas as conexões com o banco SLT estão ocupadas. Tente novamente em instantes."
            )
        try:
            return self._take(dsn)
        except BaseException:
            self._slots.release()
            raise

    def _take(self, dsn: str) -> ConnectionDict:
        while True:
            with self._lock:
                entry = self._idle.pop() if self._idle else None
            if entry is None:
                return cast(ConnectionDict, psycopg.connect(
                    dsn, row_factory=cast(Any, dict_row), connect_timeout=_CONNECT_TIMEOUT,
                ))
            conn, stored_dsn, since = entry
            if stored_dsn != dsn or conn.closed or conn.broken:
                _close(conn)
                continue
            if time.monotonic() - since >= _IDLE_CHECK_SECONDS:
                try:
                    conn.execute("SELECT 1")
                    conn.commit()
                except Exception:
                    _close(conn)
                    continue
            return conn

    def release(self, conn: ConnectionDict, dsn: str) -> None:
        try:
            usable = not conn.closed and not conn.broken
            if usable and conn.info.transaction_status != psycopg.pq.TransactionStatus.IDLE:
                try:
                    conn.rollback()
                except Exception:
                    usable = False
            if usable:
                with self._lock:
                    self._idle.append((conn, dsn, time.monotonic()))
            else:
                _close(conn)
        finally:
            self._slots.release()


def _close(conn: ConnectionDict) -> None:
    try:
        conn.close()
    except Exception:
        pass


_pool = _Pool(_POOL_MAX)


@contextmanager
def _borrow(dsn: str) -> Generator[ConnectionDict, None, None]:
    """Empresta uma conexão do pool; blocos aninhados na mesma thread a compartilham."""
    conn = getattr(_thread_connections, "connection", None)
    if conn is not None and getattr(_thread_connections, "dsn", None) == dsn and not conn.closed:
        _thread_connections.depth += 1
        try:
            yield cast(ConnectionDict, conn)
        finally:
            _thread_connections.depth -= 1
        return
    conn = _pool.acquire(dsn)
    _thread_connections.connection, _thread_connections.dsn, _thread_connections.depth = conn, dsn, 1
    try:
        yield conn
    finally:
        _thread_connections.connection = None
        _thread_connections.dsn = None
        _thread_connections.depth = 0
        _pool.release(conn, dsn)


@contextmanager
def get_connection() -> Generator[ConnectionDict, None, None]:
    """Retorna conexão do banco SLT configurada para linhas em formato dict."""
    dsn = get_settings().slt_database_url
    if not dsn:
        raise DatabaseUnavailableError("SLT_DATABASE_URL não configurada.")
    try:
        with _borrow(dsn) as conn:
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        raise DatabaseUnavailableError(f"Falha ao conectar ao banco SLT: {exc}") from exc

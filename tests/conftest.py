"""Fixtures opt-in para dados sinteticos; nenhuma montagem real e criada."""
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import contextmanager
from threading import Lock

import pytest


@pytest.fixture
def storage_sintetico(monkeypatch):
    from api import storage_policy
    from api.services import storage_geoespacial
    from api.services import edicao_storage

    locks = {}
    guard = Lock()

    class Connection:
        def execute(self, sql, params):
            key = params[0]
            with guard:
                lock = locks.setdefault(key, Lock())
            if "pg_try_advisory_lock" in sql:
                self.acquired = lock.acquire(blocking=False)
            elif "pg_advisory_unlock" in sql:
                lock.release()
            else:
                raise AssertionError("SQL inesperado no bloqueio sintético: " + sql)
            return self

        def fetchone(self):
            return {"adquirido": self.acquired}

    @contextmanager
    def connection():
        yield Connection()

    monkeypatch.setattr(edicao_storage, "get_connection", connection)

    with TemporaryDirectory(prefix="sicard-teste-storage-") as directory:
        root = Path(directory)
        temporary = root / "temporarios-sicard"
        temporary.mkdir()
        monkeypatch.setenv("SICARD_STORAGE_WRITE_DIR", str(root))
        monkeypatch.setenv("SICARD_STORAGE_TEMP_DIR", str(temporary))
        monkeypatch.setattr(storage_policy, "montagem", lambda path: Path(path) == root)
        # Somente testes opt-in simulam montagem; testes da politica nao a usam.
        monkeypatch.setattr(storage_geoespacial, "montado", lambda: True)
        yield root

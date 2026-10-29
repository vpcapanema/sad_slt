"""Fixtures opt-in para dados sinteticos; nenhuma montagem real e criada."""
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import contextmanager
from threading import Lock
import tempfile as stdlib_tempfile

import pytest


@pytest.fixture(autouse=True)
def email_desabilitado(monkeypatch):
    # O .env local pode habilitar o SMTP; nenhum teste deve enviar email real.
    # Testes de email definem suas proprias variaveis depois desta fixture.
    monkeypatch.setenv("SICARD_EMAIL_ENABLED", "false")

@pytest.fixture
def execucoes_sinteticas(monkeypatch):
    from datetime import datetime, timezone
    from api.services import saidas_storage

    def pasta(execucao, *, conn=None):
        return saidas_storage.pasta_analise(
            'geoprocessamento', 'resultado', execucao,
            quando=datetime(2026, 10, 20, 15, 0, tzinfo=timezone.utc))

    monkeypatch.setattr(saidas_storage, 'pasta_execucao', pasta)
    return pasta


@pytest.fixture
def storage_sintetico(monkeypatch):
    # Os serviços podem configurar tempfile.tempdir para o storage sintético.
    # Restaurar o diretório global antes do próximo teste, após remover a fixture.
    monkeypatch.setattr(stdlib_tempfile, "tempdir", stdlib_tempfile.gettempdir())
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

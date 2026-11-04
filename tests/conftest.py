"""Fixtures opt-in para dados sinteticos; nenhuma montagem real e criada."""
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import contextmanager
from threading import Lock
import tempfile as stdlib_tempfile

import pytest


@pytest.fixture(autouse=True)
def nomes_storage_sinteticos(monkeypatch):
    from api.services import nomes_storage, saidas_storage, republicacao_storage
    reservas = {}
    guard = Lock()

    def reservar(escopo, identidade, nome, *, conn=None):
        with guard:
            chave = (escopo, identidade)
            if chave not in reservas:
                candidato, indice = nome, 2
                ocupados = {v.casefold() for (p, _), v in reservas.items() if p == escopo}
                while candidato.casefold() in ocupados:
                    candidato = f'{Path(nome).stem}_{indice}{Path(nome).suffix}'
                    indice += 1
                reservas[chave] = candidato
            return reservas[chave]

    monkeypatch.setattr(nomes_storage, 'reservar', reservar)
    @contextmanager
    def bloqueio(caminho, **kwargs):
        yield
    monkeypatch.setattr(saidas_storage, 'bloquear_arquivo', bloqueio)
    class BancoPublicacao:
        def execute(self, *args, **kwargs):
            return self
        def fetchall(self):
            return []
    @contextmanager
    def atomic_sintetico(conn=None):
        yield conn if conn is not None else BancoPublicacao()
        if conn is not None:
            conn.commit()
    monkeypatch.setattr(republicacao_storage, 'atomic_connection', atomic_sintetico)
    monkeypatch.setattr(republicacao_storage, 'jsons_operacionais', lambda: iter(()))
    return reservas


@pytest.fixture(autouse=True)
def sessoes_sinteticas(monkeypatch):
    """Tokens de testes usam registro e contas sintéticos, nunca bancos oficiais."""
    from api.services import session_service
    from api.repositories import session_repository, sigma_usuario_repository
    sessions, accounts = {}, {}

    def register(sid, user, expires):
        sessions[sid] = {"user": user.id, "expires": expires, "revoked": False}
        accounts[user.id] = {
            "id": user.id, "username": user.username, "ativo": True,
            "nome_pessoa": user.nome, "email_institucional": user.email,
        }

    def revoke(sid):
        if sid in sessions:
            sessions[sid]["revoked"] = True

    def revoke_user(uid):
        for sid, row in sessions.items():
            if row["user"] == uid:
                revoke(sid)

    monkeypatch.setattr(session_repository, "register", register)
    monkeypatch.setattr(session_repository, "is_active", lambda sid, uid: (
        sid in sessions and sessions[sid]["user"] == uid and not sessions[sid]["revoked"]
        and sessions[sid]["expires"] > session_service.time.time()))
    monkeypatch.setattr(session_repository, "revoke", revoke)
    monkeypatch.setattr(session_repository, "revoke_user", revoke_user)
    monkeypatch.setattr(sigma_usuario_repository, "find_active_by_id", lambda uid: accounts.get(uid))
    return sessions, accounts


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
        info = type('Info', (), {'transaction_status': None})()
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

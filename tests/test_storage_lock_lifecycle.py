"""Reproduções determinísticas de sessões PostgreSQL reutilizadas e concorrência."""
from contextlib import contextmanager
from threading import Event, Thread, local

import pytest
from psycopg.pq import TransactionStatus

from api.services import edicao_storage as storage, republicacao_storage as publicacao


@pytest.fixture
def banco(monkeypatch):
    locks, connections = {}, []
    current = local()

    class Connection:
        closed = False

        def __init__(self):
            self.info = type('Info', (), {'transaction_status': TransactionStatus.IDLE})()

        def execute(self, sql, params):
            if self.info.transaction_status == TransactionStatus.INERROR:
                raise RuntimeError('transaction aborted')
            key = params[0]
            if 'pg_try_advisory_lock' in sql:
                self.acquired = key not in locks or locks[key][0] is self
                if self.acquired:
                    locks[key] = (self, locks.get(key, (None, 0))[1] + 1)
            elif 'pg_advisory_unlock' in sql:
                owner, count = locks[key]
                assert owner is self
                if count == 1:
                    del locks[key]
                else:
                    locks[key] = (self, count - 1)
            return self

        def fetchone(self):
            return {'adquirido': self.acquired}

        def rollback(self):
            self.info.transaction_status = TransactionStatus.IDLE

        def close(self):
            self.closed = True
            for key, (owner, _) in list(locks.items()):
                if owner is self:
                    del locks[key]

    @contextmanager
    def connection():
        if not hasattr(current, 'conn'):
            current.conn = Connection()
            connections.append(current.conn)
        try:
            yield current.conn
        except Exception:
            current.conn.rollback()
            raise

    monkeypatch.setattr(storage, 'get_connection', connection)
    # A fixture geral neutraliza esse alias; esta reprodução usa o bloqueio real.
    from api.services import saidas_storage
    monkeypatch.setattr(saidas_storage, 'bloquear_arquivo', storage.bloquear_arquivo)
    return locks, connections


def test_erro_sql_nao_vaza_lock_nem_mascara_erro_original(banco):
    locks, connections = banco
    with pytest.raises(ValueError, match='erro original'):
        with storage.bloquear_arquivo('arquivo.gpkg'):
            connections[0].info.transaction_status = TransactionStatus.INERROR
            raise ValueError('erro original')
    assert not locks


def test_locks_aninhados_sobrevivem_commit_e_liberam_contagem(banco):
    locks, connections = banco
    with storage.bloquear_arquivo('arquivo.gpkg'):
        with storage.bloquear_arquivo('ARQUIVO.gpkg'):
            connections[0].info.transaction_status = TransactionStatus.IDLE
        assert locks
    assert not locks


@pytest.mark.parametrize('erro_corpo', [False, True])
def test_unlock_falho_descarta_sessao_sem_mascarar_erro(banco, monkeypatch, erro_corpo):
    locks, connections = banco
    expected = ValueError if erro_corpo else RuntimeError
    with pytest.raises(expected, match='original' if erro_corpo else 'unlock falhou'):
        with storage.bloquear_arquivo('arquivo.gpkg'):
            conn = connections[0]
            execute = conn.execute
            def falhar(sql, params):
                if 'pg_advisory_unlock' in sql:
                    raise RuntimeError('unlock falhou')
                return execute(sql, params)
            monkeypatch.setattr(conn, 'execute', falhar)
            if erro_corpo:
                raise ValueError('erro original')
    assert connections[0].closed
    assert not locks


def test_arquivo_concorrente_continua_rejeitado(banco):
    errors = []
    def disputar():
        try:
            with storage.bloquear_arquivo('arquivo.gpkg'):
                errors.append('adquirido indevidamente')
        except ValueError:
            pass
    with storage.bloquear_arquivo('arquivo.gpkg'):
        thread = Thread(target=disputar)
        thread.start()
        thread.join(2)
    assert not thread.is_alive() and not errors


def test_referencias_concorrentes_serializam_sem_abortar_processamento(banco):
    entrou, terminou = Event(), Event()
    errors = []
    def publicar():
        entrou.set()
        try:
            with publicacao.bloquear_referencias():
                terminou.set()
        except Exception as exc:
            errors.append(exc)
    with publicacao.bloquear_referencias():
        thread = Thread(target=publicar)
        thread.start()
        assert entrou.wait(2)
        assert not terminou.wait(.05)
    thread.join(2)
    assert not thread.is_alive()
    assert not errors
    assert terminou.is_set()

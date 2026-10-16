"""Falhas de arquivo nao devem ser apresentadas como indisponibilidade do banco."""
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock

import psycopg
import pytest

from api.db import connection as db
from api.exceptions import DatabaseUnavailableError


@pytest.fixture
def connection(monkeypatch):
    conn = Mock()
    @contextmanager
    def borrow(dsn):
        assert dsn == "teste"
        yield conn
    monkeypatch.setattr(db, "_borrow", borrow)
    monkeypatch.setattr(db, "get_settings", lambda: SimpleNamespace(slt_database_url="teste"))
    return conn


@pytest.mark.parametrize("error", [RuntimeError("falha de arquivo"), ValueError("contrato invalido")])
def test_rollback_preserva_erro_de_processamento(connection, error):
    with pytest.raises(type(error)) as caught:
        with db.get_connection():
            raise error
    assert caught.value is error
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()


def test_falha_postgres_continua_indisponibilidade(connection):
    error = psycopg.OperationalError("conexao encerrada")
    with pytest.raises(DatabaseUnavailableError) as caught:
        with db.get_connection():
            raise error
    assert caught.value.__cause__ is error
    connection.rollback.assert_called_once()


def test_sucesso_confirma_transacao(connection):
    with db.get_connection() as conn:
        assert conn is connection
    connection.commit.assert_called_once()
    connection.rollback.assert_not_called()

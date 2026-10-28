"""Falhas de arquivo nao devem ser apresentadas como indisponibilidade do banco."""
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock

import psycopg
import pytest

from api.db import connection as db
from api.exceptions import DatabaseUnavailableError
from api.repositories import demanda_repository, plano_repository, programa_repository, hierarquizacao_repository


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


@pytest.mark.parametrize('repo', [
    demanda_repository, plano_repository, programa_repository, hierarquizacao_repository,
])
def test_update_participa_da_transacao_atomica(connection, monkeypatch, repo):
    monkeypatch.setattr(repo, 'get_by_codigo', lambda codigo: {'codigo': codigo})
    connection.execute.return_value.fetchone.return_value = {'status': 'calculada'}
    with db.atomic_connection():
        data = {'dados_hierarquizacao': {'objetos': []}} if repo is hierarquizacao_repository else {
            'prazo_referencia_meses': 24, 'atributos_cadastrais': {'data_base_capex': '2026-10-01'},
        }
        repo.update('X', data)
        params = connection.execute.call_args.args[1]
        assert all(chave in params for chave in data)
        connection.commit.assert_not_called()
    connection.commit.assert_called_once()
    connection.rollback.assert_not_called()


def test_falha_em_lote_nao_confirma_updates_parciais(connection, monkeypatch):
    for repo in (demanda_repository, hierarquizacao_repository):
        monkeypatch.setattr(repo, 'get_by_codigo', lambda codigo: {'codigo': codigo})
    connection.execute.return_value.fetchone.return_value = {'status': 'calculada'}
    with pytest.raises(RuntimeError, match='falha'):
        with db.atomic_connection():
            demanda_repository.update('X', {'nome': 'Nome atualizado'})
            hierarquizacao_repository.update('H', {'dados_hierarquizacao': {'objetos': []}})
            raise RuntimeError('falha')
    connection.commit.assert_not_called()
    connection.rollback.assert_called_once()

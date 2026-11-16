from contextlib import contextmanager
from unittest.mock import Mock
from uuid import uuid4

import pytest

from api.services import usuarios_sigma_sync as sync


@pytest.fixture
def origem():
    perfis = [dict(id=uuid4(), nome=nome, ativo=True) for nome in sorted(sync.PERFIS)]
    usuarios = [dict(id=uuid4(), tipo_usuario='OPERADOR', ativo=True, username='exemplo_ADMIN')]
    return perfis, usuarios


def test_vinculo_usa_tipo_sigma_e_uuid_do_papel_sem_inferir_username(origem):
    perfis, usuarios = origem
    vinculo = sync.validar_origem(perfis, usuarios)[0]
    papel = next(p for p in perfis if p['nome'] == 'OPERADOR')
    assert vinculo['perfil_codigo'] == str(papel['id'])
    assert vinculo['sigma_usuario_id'] == str(usuarios[0]['id'])
    assert set(vinculo) == {'perfil_codigo', 'sigma_usuario_id', 'sigma_ativo'}


def test_usuario_inativo_tambem_e_listado(origem):
    perfis, usuarios = origem
    usuarios[0]['ativo'] = False
    assert sync.validar_origem(perfis, usuarios)[0]['sigma_ativo'] is False


@pytest.mark.parametrize('falha', ['perfil_ausente', 'sigla_repetida', 'uuid_papel_repetido',
                                   'tipo_desconhecido', 'usuario_duplicado', 'uuid_invalido',
                                   'ativo_usuario_invalido', 'ativo_papel_invalido'])
def test_origem_invalida_falha_antes_de_escrever(origem, falha):
    perfis, usuarios = origem
    if falha == 'perfil_ausente':
        perfis.pop()
    elif falha == 'sigla_repetida':
        perfis[1]['nome'] = perfis[0]['nome']
    elif falha == 'uuid_papel_repetido':
        perfis[1]['id'] = perfis[0]['id']
    elif falha == 'tipo_desconhecido':
        usuarios[0]['tipo_usuario'] = 'SUPERADMIN'
    elif falha == 'usuario_duplicado':
        usuarios.append(dict(usuarios[0]))
    elif falha == 'uuid_invalido':
        usuarios[0]['id'] = 'invalido'
    elif falha == 'ativo_usuario_invalido':
        usuarios[0]['ativo'] = 'false'
    else:
        perfis[0]['ativo'] = 'false'
    conn = Mock()
    with pytest.raises(ValueError):
        sync.aplicar_origem(conn, perfis, usuarios, migrar=True)
    conn.execute.assert_not_called()


def test_falha_sigma_nao_altera_espelho_local(monkeypatch):
    destino = Mock()
    monkeypatch.setattr(sync, 'get_connection', destino)

    def falhar():
        raise ConnectionError('origem indisponivel')

    monkeypatch.setattr(sync, 'ler_origem', falhar)
    with pytest.raises(ConnectionError):
        sync.sincronizar()
    destino.assert_not_called()


def test_simulacao_reverte_transacao(monkeypatch, origem):
    conn = Mock()

    @contextmanager
    def conectar():
        yield conn

    monkeypatch.setattr(sync, 'get_connection', conectar)
    monkeypatch.setattr(sync, 'ler_origem', lambda: origem)
    aplicar = Mock(return_value={'usuarios_sigma': 1})
    monkeypatch.setattr(sync, 'aplicar_origem', aplicar)
    assert sync.sincronizar(migrar=True, simular=True) == {'usuarios_sigma': 1}
    conn.rollback.assert_called_once()
    aplicar.assert_called_once_with(conn, *origem, migrar=True)

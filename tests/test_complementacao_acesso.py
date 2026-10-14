from unittest.mock import patch
import pytest
from fastapi import HTTPException
from api.routers import complementacao as mod
from api.services.session_service import SessionUser

def user(profile='OPERADOR'):
    return SessionUser('criador', '', '', '', profile)

@pytest.mark.parametrize('owner,person,allowed', [('criador','outra',True),('outro','pessoa',True),('outro','outra',False)])
def test_autoria_ou_representacao(owner,person,allowed):
    assert mod._pode_editar({}, pessoa_id='pessoa',usuario_id='criador',
                           demanda={'criado_por':owner,'sigma_pessoa_id':person}) is allowed

@pytest.mark.parametrize('profile,owned,state,allowed', [
    ('OPERADOR',True,'em_complementacao',True),
    ('OPERADOR',False,'em_complementacao',False),
    ('OPERADOR',True,'complementada',True),
    ('GESTOR',False,'em_complementacao',False),
    ('GESTOR',True,'complementada',True),
    ('ADMIN',False,'em_complementacao',False),
    ('ADMIN',True,'complementada',True),
])
def test_listagem(profile,owned,state,allowed):
    assert mod._pode_listar({'pode_editar':owned,'situacao_complementacao':state},user(profile)) is allowed

def test_acesso_direto_nao_contorna_filtro():
    row={'codigo':'H','dados_hierarquizacao':{'objetos':[{'cabecalho_objeto':{'codigo':'X'}}]}}
    with patch.object(mod.hierarquizacao_repository,'get_by_codigo',return_value=row), \
         patch.object(mod,'_pessoa_id',return_value='pessoa'), \
         patch.object(mod,'_cadastros',return_value={'X':{'criado_por':'outro','sigma_pessoa_id':'outra'}}), \
         patch.object(mod,'_matriz',return_value=[]):
        with pytest.raises(HTTPException) as err:
            mod.obter_complementacao('H','X',user())
        assert err.value.status_code==403

def test_snapshot_antigo_nao_concede_acesso():
    assert not mod._acesso({'codigo':'X','atributos':{'criado_por':'criador'}},user(),'pessoa',{})


@pytest.mark.parametrize('profile', ['OPERADOR', 'ANALISTA', 'GESTOR', 'ADMIN'])
@pytest.mark.parametrize('state', [mod.STATUS_COMPLEMENTACAO, 'analise_em_avaliacao', 'analise_aprovada'])
@pytest.mark.parametrize('owner,person', [('criador', 'outra'), ('outro', 'pessoa'), ('outro', 'outra')])
def test_status_e_perfil_filtram_demanda(profile, state, owner, person):
    row = {'status': state, 'criado_por': owner, 'sigma_pessoa_id': person}
    esperado = state == mod.STATUS_COMPLEMENTACAO and (profile != 'OPERADOR' or owner == 'criador' or person == 'pessoa')
    assert mod._visivel(row, user(profile), 'pessoa') is esperado


@pytest.mark.parametrize('tipo', ['projeto', 'plano', 'programa'])
def test_listagem_filtra_antes_de_serializar(monkeypatch, tipo):
    repo, service, _, _ = mod.CADASTROS[tipo]
    rows = [
        {'codigo': 'PROPRIA', 'criado_por': 'criador', 'status': mod.STATUS_COMPLEMENTACAO},
        {'codigo': 'ALHEIA', 'criado_por': 'outro', 'status': mod.STATUS_COMPLEMENTACAO},
        {'codigo': 'OUTRO_STATUS', 'criado_por': 'criador', 'status': 'analise_aprovada'},
    ]
    monkeypatch.setattr(repo, 'list_all', lambda: rows)
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: 'pessoa')
    monkeypatch.setattr(mod, 'resolver_nomes_registros', lambda registros: registros)
    monkeypatch.setattr(service, '_row_to_response', lambda row, **kw: row)
    assert [row['codigo'] for row in mod.listar_demandas_complementaveis(tipo, user())] == ['PROPRIA']
    assert [row['codigo'] for row in mod.listar_demandas_complementaveis(tipo, user('ANALISTA'))] == ['PROPRIA', 'ALHEIA']


@pytest.mark.parametrize('tipo', ['projeto', 'plano', 'programa'])
def test_cadastro_revalida_acesso_e_nao_permite_status(monkeypatch, tipo):
    repo = mod.CADASTROS[tipo][0]
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: None)
    monkeypatch.setattr(repo, 'get_by_codigo', lambda codigo: {'criado_por': 'outro', 'status': mod.STATUS_COMPLEMENTACAO})
    with pytest.raises(HTTPException) as erro:
        mod.salvar_cadastro(tipo, 'X', {'nome': 'Teste'}, user())
    assert erro.value.status_code == 403
    with pytest.raises(HTTPException) as erro:
        mod.salvar_cadastro(tipo, 'X', {'status': 'analise_aprovada'}, user('ADMIN'))
    assert erro.value.status_code == 422


@pytest.mark.parametrize('acao', ['conferir', 'substituir'])
def test_geometria_revalida_proprietario_antes_de_ler_upload(monkeypatch, acao):
    import asyncio
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: 'pessoa')
    monkeypatch.setattr(mod.demanda_repository, 'get_by_codigo', lambda codigo: {
        'criado_por': 'outro', 'sigma_pessoa_id': 'outra', 'status': mod.STATUS_COMPLEMENTACAO,
    })
    with pytest.raises(HTTPException) as erro:
        if acao == 'conferir':
            asyncio.run(mod.conferir_geometria_complementacao('projeto', 'X', None, user()))
        else:
            asyncio.run(mod.substituir_geometria_complementacao('projeto', 'X', 'token', None, user()))
    assert erro.value.status_code == 403


def test_api_complementacao_exige_sessao():
    from fastapi.testclient import TestClient
    from api.server import app
    client = TestClient(app)
    assert client.get('/api/complementacao/demandas/projeto').status_code == 401
    assert client.patch('/api/complementacao/demandas/projeto/X/cadastro', json={'nome': 'X'}).status_code == 401

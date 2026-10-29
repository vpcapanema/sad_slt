from unittest.mock import patch
from contextlib import contextmanager
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import Mock
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from api.routers import complementacao as mod
from api.services import atributos_hierarquizacao as atributos_objetos
from api.services.session_service import SessionUser
from api.services.campos_demanda import extrair_atributos_nativos, mesclar_atributos_nativos

def user(profile='OPERADOR'):
    return SessionUser('criador', '', '', '', profile)


@pytest.fixture
def tabela(monkeypatch):
    matriz = [
        {'Etapa': 'Priorização', 'Critério': 'Custo', 'Métrica': 'Custo', 'Unidade': 'R$'},
        {'Etapa': 'Priorização', 'Critério': 'Prazo', 'Métrica': 'Prazo', 'Unidade': 'meses'},
        {'Etapa': 'Priorização', 'Critério': 'Decisão', 'Métrica': 'Decisão', 'Unidade': 'Sim/Não'},
    ]
    row = {'codigo': 'H', 'nome': 'Rodada', 'criado_em': '2026-10-20T12:00:00-03:00',
           'dados_hierarquizacao': {
               'cabecalho_grupo': {'matriz_premissas_criterios': matriz},
               'objetos': [{'cabecalho_objeto': {
                   'codigo': codigo, 'tipo_demanda': 'projeto', 'nome': codigo,
                   'atributos': {'atributos_cadastrais': {'prazo_referencia_meses': 99}},
                   'atributos_fase3': {'custo': {'origem': 'gestor', 'valor_bruto': 5, 'peso': 0.4}},
               }} for codigo in ['X', 'Y', 'Z']],
           }}
    cadastros = {codigo: {'codigo': codigo, 'criado_por': 'criador' if codigo != 'Z' else 'outro',
                         'status': 'hierarq_aguardando_complementacao', 'prazo_referencia_meses': 12, 'capex_estimado': 100,
                         'atributos_cadastrais': {'data_base_capex': '2026-10-01'}}
                 for codigo in ['X', 'Y', 'Z']}
    dominios = [
        {'codigo': 'prazo_referencia_meses', 'tipo_dado': 'inteiro',
         'tipos_objeto': ['plano', 'programa', 'projeto'], 'regras_validacao': {'minimo': 0}},
        {'codigo': 'capex_estimado', 'tipo_dado': 'monetario',
         'tipos_objeto': ['programa', 'projeto'], 'regras_validacao': {'minimo': 0}},
        {'codigo': 'maturidade_objeto', 'tipo_dado': 'categoria',
         'tipos_objeto': ['plano', 'programa', 'projeto'],
         'configuracao_por_tipo': {tipo: {'opcoes': [{'rotulo': 'Nível 1'}, {'rotulo': 'Nível 2'}]}
                                  for tipo in ['plano', 'programa', 'projeto']}},
    ]
    conn, gravacoes, atualizacoes = Mock(), [], []

    @contextmanager
    def atomic():
        anterior, cadastros_antes = deepcopy(row), deepcopy(cadastros)
        try:
            yield conn
        except Exception:
            conn.rollback()
            row.clear()
            row.update(anterior)
            cadastros.clear()
            cadastros.update(cadastros_antes)
            raise
        else:
            conn.commit()

    def salvar(codigo, data):
        assert codigo == 'H'
        row.update(deepcopy(data))
        gravacoes.append(deepcopy(data))
        return row

    def atualizar(codigo, payload, *, usuario_id):
        data = payload.model_dump(exclude_unset=True)
        atualizacoes.append((codigo, deepcopy(data), usuario_id))
        cadastros[codigo].update(extrair_atributos_nativos(data))
        return SimpleNamespace(atributos_cadastrais=mesclar_atributos_nativos(cadastros[codigo]))

    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [
        {'demanda_codigo': codigo, 'demanda_tipo': kw.get('tipo'),
         'categorias': ['atributos_objeto'], 'hierarquizacao_codigo': 'H'} for codigo in ['X','Y','Z'] if not kw.get('codigo') or kw['codigo'] == codigo])
    monkeypatch.setattr(mod.solicitacoes, 'registrar_edicao', lambda *args: None)
    monkeypatch.setattr(mod, 'atomic_connection', atomic)
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: None)
    monkeypatch.setattr(mod, '_cadastros', lambda: cadastros)
    monkeypatch.setattr(mod.dominio_repository, 'list_atributos_objeto', lambda: dominios)
    monkeypatch.setattr(atributos_objetos, '_colunas_configuradas', AsyncMock(return_value=[]))
    monkeypatch.setattr(mod.hierarquizacao_repository, 'get_by_codigo', lambda codigo, **kw: row if codigo == 'H' else None)
    monkeypatch.setattr(mod.hierarquizacao_repository, 'list_all', lambda: [row])
    monkeypatch.setattr(mod.hierarquizacao_repository, 'update', salvar)
    for tipo, (repo, service, schema, _) in mod.CADASTROS.items():
        monkeypatch.setattr(repo, 'get_by_codigo', lambda codigo: cadastros.get(codigo))
        monkeypatch.setitem(mod.CADASTROS, tipo, (repo, service, schema, atualizar))
    return SimpleNamespace(row=row, cadastros=cadastros, dominios=dominios, conn=conn,
                           gravacoes=gravacoes, atualizacoes=atualizacoes)


def test_tabela_filtra_objetos_e_usa_cadastro_atual(tabela):
    original = deepcopy(tabela.row)
    resposta = mod.obter_tabela('H', user())
    objetos = resposta['dados_hierarquizacao']['objetos']
    assert [obj['cabecalho_objeto']['codigo'] for obj in objetos] == ['X', 'Y']
    assert objetos[0]['cabecalho_objeto']['atributos']['atributos_cadastrais']['prazo_referencia_meses'] == 12
    assert resposta['criado_em'] == tabela.row['criado_em']
    assert tabela.row == original
    assert len(mod.obter_tabela('H', user('ADMIN'))['dados_hierarquizacao']['objetos']) == 3


@pytest.mark.parametrize('tipo', ['plano', 'programa', 'projeto'])
def test_tabela_grava_cadastro_oficial_e_snapshot_sem_apagar_demais_atributos(tabela, tipo):
    for obj in tabela.row['dados_hierarquizacao']['objetos']:
        obj['cabecalho_objeto']['tipo_demanda'] = tipo
    alheio = deepcopy(tabela.row['dados_hierarquizacao']['objetos'][2])
    resposta = mod.salvar_tabela('H', {
        'X': {'cadastro:prazo_referencia_meses': 24, 'cadastro:maturidade_objeto': 'Nível 2', 'custo': 8},
        'Y': {'prazo': 6},
    }, user())
    assert tabela.cadastros['X']['prazo_referencia_meses'] == 24
    assert tabela.cadastros['X']['maturidade'] == 'Nível 2'
    assert tabela.cadastros['X']['atributos_cadastrais'] == {'data_base_capex': '2026-10-01'}
    assert tabela.cadastros['X']['status'] == 'hierarq_aguardando_complementacao'
    assert tabela.atualizacoes[0][2] == 'criador'
    cab = tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    assert cab['atributos']['atributos_cadastrais']['prazo_referencia_meses'] == 24
    assert cab['atributos']['atributos_cadastrais']['data_base_capex'] == '2026-10-01'
    assert cab['atributos_fase3']['custo'] == {
        'origem': 'complementacao', 'valor_bruto': 8, 'valor': 8,
        'valor_rescalonado': None, 'preenchido_por': 'criador', 'peso': 0.4,
    }
    assert tabela.row['dados_hierarquizacao']['objetos'][2] == alheio
    assert tabela.row['dados_hierarquizacao']['objetos'][1]['cabecalho_objeto']['atributos']['atributos_cadastrais']['prazo_referencia_meses'] == 12
    assert resposta['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['atributos']['atributos_cadastrais']['prazo_referencia_meses'] == 24
    assert len(tabela.gravacoes) == 1
    tabela.conn.commit.assert_called_once()
    tabela.conn.rollback.assert_not_called()


@pytest.mark.parametrize('objeto', ['Z', 'AUSENTE'])
def test_tabela_rejeita_lote_inteiro_com_objeto_nao_autorizado(tabela, objeto):
    with pytest.raises(HTTPException) as erro:
        mod.salvar_tabela('H', {'X': {'cadastro:prazo_referencia_meses': 24}, objeto: {'custo': 4}}, user())
    assert erro.value.status_code == 403
    assert tabela.atualizacoes == tabela.gravacoes == []
    tabela.conn.commit.assert_not_called()
    tabela.conn.rollback.assert_called_once()


@pytest.mark.parametrize('atributo,valor', [
    ('cadastro:inexistente', 1), ('inexistente', 1),
    ('cadastro:prazo_referencia_meses', -1), ('cadastro:prazo_referencia_meses', 1.5),
    ('cadastro:prazo_referencia_meses', 2147483648), ('cadastro:prazo_referencia_meses', True),
    ('cadastro:capex_estimado', -0.01), ('cadastro:capex_estimado', float('inf')),
    ('cadastro:maturidade_objeto', 'nivel_inventado'),
    ('custo', 'abc'), ('custo', float('nan')), ('custo', True),
    ('decisao', 'true'), ('decisao', []),
])
def test_tabela_valida_atributos_antes_de_qualquer_gravacao(tabela, atributo, valor):
    with pytest.raises(HTTPException) as erro:
        mod.salvar_tabela('H', {'X': {'custo': 4}, 'Y': {atributo: valor}}, user())
    assert erro.value.status_code == 422
    assert tabela.atualizacoes == tabela.gravacoes == []
    tabela.conn.commit.assert_not_called()


def test_tabela_nao_permite_campo_cadastral_inaplicavel_ao_tipo(tabela):
    tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['tipo_demanda'] = 'plano'
    with pytest.raises(HTTPException) as erro:
        mod.salvar_tabela('H', {'X': {'cadastro:capex_estimado': 100}}, user())
    assert erro.value.status_code == 422
    assert tabela.atualizacoes == []


def test_tabela_rollback_se_gravacao_da_hierarquizacao_falhar(tabela, monkeypatch):
    antes = deepcopy(tabela.cadastros)
    def falhar(*args):
        raise RuntimeError('Falha ao gravar a rodada')
    monkeypatch.setattr(mod.hierarquizacao_repository, 'update', falhar)
    with pytest.raises(RuntimeError, match='Falha ao gravar'):
        mod.salvar_tabela('H', {'X': {'cadastro:prazo_referencia_meses': 24, 'custo': 8}}, user())
    assert tabela.atualizacoes
    assert tabela.cadastros == antes
    tabela.conn.commit.assert_not_called()
    tabela.conn.rollback.assert_called_once()


def test_tabela_permite_limpar_valores_e_rejeita_lote_vazio(tabela):
    mod.salvar_tabela('H', {'X': {'cadastro:prazo_referencia_meses': None, 'custo': None}}, user())
    assert tabela.cadastros['X']['prazo_referencia_meses'] is None
    cab = tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    assert 'prazo_referencia_meses' not in cab['atributos']['atributos_cadastrais']
    assert cab['atributos']['prazo_referencia_meses'] is None
    assert cab['atributos_fase3']['custo']['valor_bruto'] is None
    with pytest.raises(HTTPException) as erro:
        mod.salvar_tabela('H', {}, user())
    assert erro.value.status_code == 422


def test_tabela_nao_duplica_edicao_de_slot_obtido_do_cadastro(tabela):
    tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['atributos_fase3']['custo']['origem'] = 'cadastro'
    with pytest.raises(HTTPException) as erro:
        mod.salvar_tabela('H', {'X': {'custo': 10}}, user())
    assert erro.value.status_code == 422


def test_tabela_indisponivel_sem_objetos_autorizados(tabela):
    for cadastro in tabela.cadastros.values():
        cadastro['criado_por'] = 'outro'
    with pytest.raises(HTTPException) as erro:
        mod.obter_tabela('H', user())
    assert erro.value.status_code == 403


def test_tabela_usa_as_mesmas_colunas_da_fase3_incluindo_configurador(tabela, monkeypatch):
    monkeypatch.setattr(atributos_objetos, '_colunas_configuradas', AsyncMock(return_value=[
        {'id': 'extra', 'tipo': 'numerico', 'origem': 'configurador_fase3'},
        {'id': 'custo', 'tipo': 'texto', 'origem': 'configurador_fase3'},
    ]))
    resposta = mod.obter_tabela('H', user())
    assert [col['id'] for col in resposta['colunas']] == ['custo', 'prazo', 'decisao', 'extra']
    assert resposta['colunas'][0]['tipo'] == 'numerico'
    salvo = mod.salvar_tabela('H', {'X': {'extra': 2}}, user())
    cab = salvo['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    assert cab['atributos_fase3']['extra']['valor_bruto'] == 2
    from api.routers.atributos_objetos import colunas_por_hierarquizacao
    assert colunas_por_hierarquizacao('H', user())['colunas'] == resposta['colunas']


def test_atributo_configurado_vazio_reabre_listagem_mesmo_com_marcador_concluido(tabela, monkeypatch):
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [])
    monkeypatch.setattr(atributos_objetos, '_colunas_configuradas', AsyncMock(return_value=[
        {'id': 'extra', 'tipo': 'numerico', 'origem': 'configurador_fase3'},
    ]))
    for codigo, cadastro in tabela.cadastros.items():
        cadastro['maturidade'] = 'Nível 2'
    for obj in tabela.row['dados_hierarquizacao']['objetos']:
        cab = obj['cabecalho_objeto']
        cab['complementacao_atributos'] = {'concluida': True}
        cab['atributos_fase3'].update(prazo={'valor_bruto': 0}, decisao={'valor_bruto': False})
    itens = mod.listar_objetos(user())
    assert [i['objeto_codigo'] for i in itens] == ['X', 'Y']
    assert all(i['pendencias'] == ['extra'] and i['atributos_preenchidos'] == i['total_atributos'] - 1 for i in itens)
    assert len(mod.listar_objetos(user('ADMIN'))) == 3


def test_ultimo_valor_atende_pedido_e_retorna_tabela_sem_403(tabela, monkeypatch):
    pedidos = [{'id': 'pedido-X', 'demanda_codigo': 'X', 'categorias': ['atributos_objeto'],
                'hierarquizacao_codigo': 'H'}]
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: pedidos)
    atendidos = []
    def atender(id, usuario):
        atendidos.append((id, usuario))
        pedidos.clear()
    monkeypatch.setattr(mod.solicitacoes, 'atender', atender)
    salvo = mod.salvar_tabela('H', {'X': {
        'cadastro:maturidade_objeto': 'Nível 2', 'prazo': 0, 'decisao': False,
    }}, user())
    cab = salvo['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    assert cab['complementacao_atributos']['concluida'] is True
    assert cab['complementacao_atributos']['automatica'] is True
    assert cab['status'] == 'hierarq_em_andamento'
    assert atendidos == [('pedido-X', 'criador')]
    assert [i['objeto_codigo'] for i in mod.listar_objetos(user())] == ['Y']


def test_rotas_da_tabela_nao_colidem_com_consulta_individual(tabela):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(mod.router, prefix='/api')
    app.dependency_overrides[mod.require_operator] = user
    with TestClient(app) as client:
        resposta = client.get('/api/complementacao/hierarquizacoes/H')
        assert resposta.status_code == 200
        assert resposta.json()['codigo'] == 'H'
        resposta = client.patch('/api/complementacao/hierarquizacoes/H', json={
            'valores': {'X': {'cadastro:prazo_referencia_meses': 36, 'decisao': False}},
        })
        assert resposta.status_code == 200
        assert tabela.cadastros['X']['prazo_referencia_meses'] == 36
        assert client.patch('/api/complementacao/hierarquizacoes/H', json={
            'valores': {'X': [1, 2]},
        }).status_code == 422


@pytest.mark.parametrize('tipo', ['plano', 'programa', 'projeto'])
def test_tabela_usa_servico_oficial_para_coluna_nativa_e_auditoria(tabela, monkeypatch, tipo):
    repo, service, schema, _ = mod.CADASTROS[tipo]
    for obj in tabela.row['dados_hierarquizacao']['objetos']:
        obj['cabecalho_objeto']['tipo_demanda'] = tipo
    atualizar = getattr(service, 'atualizar_demanda' if tipo == 'projeto' else f'atualizar_{tipo}')
    monkeypatch.setitem(mod.CADASTROS, tipo, (repo, service, schema, atualizar))

    def update(codigo, data):
        tabela.cadastros[codigo].update(data)
        return tabela.cadastros[codigo]

    monkeypatch.setattr(repo, 'update', update)
    monkeypatch.setattr(service, '_row_to_response', lambda row, **kw: SimpleNamespace(
        atributos_cadastrais=mesclar_atributos_nativos(row)))
    mod.salvar_tabela('H', {'X': {'cadastro:prazo_referencia_meses': 36}}, user())
    assert tabela.cadastros['X']['prazo_referencia_meses'] == 36
    assert tabela.cadastros['X']['atualizado_por'] == 'criador'
    assert tabela.cadastros['X']['atributos_cadastrais'] == {'data_base_capex': '2026-10-01'}


def test_lista_inclui_hierarquizacao_com_apenas_atributos_cadastrais(tabela, monkeypatch):
    tabela.row['dados_hierarquizacao']['cabecalho_grupo']['matriz_premissas_criterios'] = []
    monkeypatch.setattr(mod.hierarquizacao_repository, 'list_all', lambda: [tabela.row])
    assert [item['objeto_codigo'] for item in mod.listar_objetos(user())] == ['X', 'Y']
    assert mod.obter_tabela('H', user())['colunas'] == []

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
@pytest.mark.parametrize('state', [mod.STATUS_COMPLEMENTACAO, 'analise_aprovada', 'hierarquizacao_em_hierarquizacao'])
@pytest.mark.parametrize('owner,person', [('criador', 'outra'), ('outro', 'pessoa'), ('outro', 'outra')])
def test_atributos_independem_do_status_cadastral(profile, state, owner, person):
    demanda = {'status': state, 'criado_por': owner, 'sigma_pessoa_id': person}
    esperado = profile in {'ADMIN', 'GESTOR', 'ANALISTA'} or owner == 'criador' or person == 'pessoa'
    assert mod._acesso({'codigo': 'X'}, user(profile), 'pessoa', {'X': demanda}) is esperado


def test_lista_atributos_exclui_objeto_proprio_sem_pedido_de_complementacao(monkeypatch):
    monkeypatch.setattr(mod.solicitacoes, "listar", lambda **kw: [])
    matriz = [{'Etapa': 'Priorização', 'Critério': 'Custo', 'Métrica': 'Custo', 'Unidade': 'R$'}]
    row = {'codigo': 'H', 'dados_hierarquizacao': {
        'cabecalho_grupo': {'matriz_premissas_criterios': matriz},
        'objetos': [{'cabecalho_objeto': {'codigo': 'X'}}],
    }}
    monkeypatch.setattr(mod.hierarquizacao_repository, 'list_all', lambda: [row])
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: None)
    monkeypatch.setattr(mod, '_cadastros', lambda: {'X': {'criado_por': 'criador', 'status': 'analise_aprovada'}})
    monkeypatch.setattr(mod.dominio_repository, 'list_atributos_objeto', lambda: [])
    assert mod.listar_objetos(user()) == []


def test_rota_individual_reutiliza_validacao_da_tabela(tabela):
    with pytest.raises(HTTPException) as erro:
        mod.salvar_complementacao('H', 'X', {'custo': 'inválido'}, user())
    assert erro.value.status_code == 422
    result = mod.salvar_complementacao('H', 'X', {'prazo': 12}, user())
    assert result['valores']['prazo']['valor_bruto'] == 12


def test_operador_nao_grava_atributos_de_objeto_alheio(tabela):
    with pytest.raises(HTTPException) as erro:
        mod.salvar_complementacao('H', 'Z', {'custo': 10}, user())
    assert erro.value.status_code == 403
    assert tabela.gravacoes == []


def test_pendencias_adiadas_aparecem_sem_criar_solicitacao(tabela, monkeypatch):
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [])
    itens = mod.listar_objetos(user())
    assert [i['objeto_codigo'] for i in itens] == ['X', 'Y']
    assert all(i['solicitacoes'] == [] for i in itens)
    assert 'cadastro:maturidade_objeto' in itens[0]['pendencias']
    assert 'prazo' in itens[0]['pendencias']
    assert tabela.gravacoes == tabela.atualizacoes == []
    assert len(mod.obter_tabela('H', user(), demanda_codigo='X')['dados_hierarquizacao']['objetos']) == 1
    with pytest.raises(HTTPException) as erro:
        mod.obter_tabela('H', user(), demanda_codigo='Z')
    assert erro.value.status_code == 403


def test_conclusao_valida_cadastrais_dinamicos_e_retorna_hierarquizacao(tabela, monkeypatch):
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [])
    monkeypatch.setattr(mod, 'bloquear', lambda *args: tabela.cadastros['X'])
    with pytest.raises(HTTPException) as erro:
        mod.concluir_atributos('H', 'X', user())
    assert erro.value.status_code == 422
    assert 'cadastro:maturidade_objeto' in erro.value.detail
    assert tabela.gravacoes == []
    mod.salvar_tabela('H', {'X': {'cadastro:maturidade_objeto': 'Nível 2', 'prazo': 0, 'decisao': False}}, user())
    assert tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['status'] == 'hierarq_em_andamento'
    assert [i['objeto_codigo'] for i in mod.listar_objetos(user())] == ['Y']
    cab = tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    assert cab['complementacao_atributos']['concluida'] is True
    assert cab['complementacao_atributos']['concluida_por'] == 'criador'
    tabela.conn.execute.assert_any_call(
        sql_status_update(), ('hierarq_em_andamento', 'criador', 'X'))


def sql_status_update():
    from psycopg import sql
    return sql.SQL("UPDATE demandas.{} SET status=%s, atualizado_por=%s WHERE codigo=%s").format(sql.Identifier('projeto'))


def test_conclusao_nao_admite_atributos_dinamicos_invalidos(tabela, monkeypatch):
    monkeypatch.setattr(mod, 'bloquear', lambda *args: tabela.cadastros['X'])
    tabela.cadastros['X']['maturidade'] = 'Nível 2'
    cab = tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']
    cab['atributos_fase3'].update(prazo={'valor_bruto': 'abc'}, decisao={'valor_bruto': False})
    with pytest.raises(HTTPException) as erro:
        mod.concluir_atributos('H', 'X', user())
    assert erro.value.status_code == 422
    assert tabela.gravacoes == []


def test_conclusao_preserva_espera_quando_outra_rodada_esta_pendente(tabela, monkeypatch):
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [])
    monkeypatch.setattr(mod, 'bloquear', lambda *args: tabela.cadastros['X'])
    outra = deepcopy(tabela.row)
    outra['codigo'] = 'OUTRA'
    outra['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['complementacao_atributos'] = {'concluida': False}
    monkeypatch.setattr(mod.hierarquizacao_repository, 'list_all', lambda: [tabela.row, outra])
    mod.salvar_tabela('H', {'X': {'cadastro:maturidade_objeto': 'Nível 2', 'prazo': 0, 'decisao': False}}, user())
    assert tabela.row['dados_hierarquizacao']['objetos'][0]['cabecalho_objeto']['status'] == 'hierarq_aguardando_complementacao'


def test_conclusao_nao_permite_que_operador_conclua_demanda_alheia(tabela, monkeypatch):
    monkeypatch.setattr(mod, 'bloquear', lambda *args: tabela.cadastros['Z'])
    with pytest.raises(HTTPException) as erro:
        mod.concluir_atributos('H', 'Z', user())
    assert erro.value.status_code == 403
    assert tabela.gravacoes == []


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
    monkeypatch.setattr(repo, 'get_by_codigo', lambda codigo: next((r for r in rows if r['codigo'] == codigo), None))
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [
        {'demanda_codigo': r['codigo'], 'hierarquizacao_codigo': None} for r in rows])
    monkeypatch.setattr(mod, '_pessoa_id', lambda usuario: 'pessoa')
    monkeypatch.setattr(mod, 'resolver_nomes_registros', lambda registros: registros)
    monkeypatch.setattr(service, '_row_to_response', lambda row, **kw: SimpleNamespace(model_dump=lambda: row))
    assert [row['codigo'] for row in mod.listar_demandas_complementaveis(tipo, user())] == ['PROPRIA']
    assert [row['codigo'] for row in mod.listar_demandas_complementaveis(tipo, user('ANALISTA'))] == ['PROPRIA', 'ALHEIA']


@pytest.mark.parametrize('tipo', ['projeto', 'plano', 'programa'])
def test_cadastro_revalida_acesso_e_nao_permite_status(monkeypatch, tipo):
    monkeypatch.setattr(mod.solicitacoes, 'listar', lambda **kw: [{'categorias': ['dados_cadastrais'], 'hierarquizacao_codigo': None}])
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

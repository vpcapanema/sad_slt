from contextlib import nullcontext
from copy import deepcopy
from datetime import datetime, timezone

import pytest

from api.db import connection
from api.services import elegibilidade_relatorio, hierarquizacao_service as service

BASES = [
    {'id': 'b-restricao', 'nome': 'Unidades de Conservação', 'papel': 'restricao'},
    {'id': 'b-risco', 'nome': 'Áreas de Risco', 'papel': 'risco'},
    {'id': 'b-risco-2', 'nome': 'Várzeas', 'papel': 'risco'},
]
RESULTADO = {'arquivo': 'saidas-geoespaciais/a.gpkg', 'sha256': 'abc', 'lote_id': 'L1',
             'elegibilidade': {'campos': BASES, 'entrada': {'id': 'e'}},
             'favorabilidade': {'campos': [{'id': 'g', 'nome': 'Grade', 'papel': 'grade'},
                                           {'id': 'r', 'nome': 'Rede', 'papel': 'rede'}], 'entrada': {'id': 'e'}}}


def _sobreposicao(base_id, papel, area_m2, **extra):
    return {'base_id': base_id, 'papel': papel, 'nome': f'Feição {base_id}', 'id': f'f-{base_id}', 'identificador': '1',
            'area_m2': area_m2, 'percentual': area_m2 / 1000 * 100, **extra}


def _fav(indice, estado='valido'):
    return {'campo_indice': 'idx', 'indice': indice, 'estado_indice': estado, 'indice_original': indice,
            'campo_classe': 'cls', 'classe': 'Alta', 'estado_classe': 'valido'}


def _dados(fases=(1, 2)):
    def objeto(codigo):
        return {'cabecalho_objeto': {'codigo': codigo, 'nome': codigo},
                'hierarquizacao': {'fase_1': service._fase1_vazia(), 'fase_2': {'score_fase2': None},
                                   'fase_3': {'score_fase3': 'preservar'}, 'sintese': {}}}
    return {'cabecalho_grupo': {'codigo': 'H', 'fases_a_executar': list(fases)},
            'objetos': [objeto('D-1'), objeto('D-2'), objeto('D-3')]}


@pytest.fixture
def banco(monkeypatch):
    row = {'codigo': 'H', 'status': 'em_julgamento', 'dados_hierarquizacao': _dados(), 'relatorio_fase3': {'ok': 1},
           'relatorio_consolidado': {}, 'atualizado_em': datetime.now(timezone.utc)}
    travas = []

    def carregar(_codigo, *, for_update=False):
        travas.append(for_update)
        return deepcopy(row)

    monkeypatch.setattr(service.repo, 'get_by_codigo', carregar)
    monkeypatch.setattr(service.repo, 'update', lambda _c, mudancas: row.update(deepcopy(mudancas)))
    monkeypatch.setattr(connection, 'atomic_connection', nullcontext)
    row['_travas'] = travas
    return row


def _linhas(monkeypatch, linhas):
    monkeypatch.setattr(elegibilidade_relatorio, 'resumo_por_demanda', lambda *a, **k: deepcopy(linhas))


def test_fase1_grava_situacao_por_demanda_e_criterios_de_risco(banco, monkeypatch):
    _linhas(monkeypatch, [
        {'codigo_demanda': 'D-1', 'area_total_m2': 1000.0, 'sobreposicoes': [
            _sobreposicao('b-restricao', 'restricao', 100.0), _sobreposicao('b-risco', 'risco', 200.0)]},
        {'codigo_demanda': 'D-2', 'area_total_m2': 1000.0, 'sobreposicoes': [_sobreposicao('b-risco', 'risco', 50000.0)]},
        {'codigo_demanda': 'D-3', 'area_total_m2': 1000.0, 'sobreposicoes': []},
    ])
    r = service.registrar_resultado_por_demanda('H', 1, RESULTADO, 'autor')
    assert r == {'registrado': True, 'demandas': 3}
    assert True in banco['_travas']
    objetos = {o['cabecalho_objeto']['codigo']: o['hierarquizacao'] for o in banco['dados_hierarquizacao']['objetos']}
    assert [objetos[c]['fase_1']['status_fase1'] for c in ('D-1', 'D-2', 'D-3')] == ['restrito', 'apto_com_ressalva', 'apto']
    f1 = objetos['D-1']['fase_1']
    assert f1['restricoes_intersectadas'][0]['criterio_id'] == 'b-restricao'
    assert f1['sobreposicoes_risco']['b-risco']['area_ha'] == pytest.approx(0.02)
    assert f1['sobreposicoes_risco']['b-risco-2']['area_m2'] == 0.0
    assert objetos['D-2']['fase_1']['sobreposicoes_risco']['b-risco']['area_ha'] == pytest.approx(5.0)
    assert objetos['D-1']['fase_1']['resumo_elegibilidade'] is None
    assert objetos['D-3']['fase_1']['resumo_elegibilidade'] == {
        'camadas_de_risco': [], 'area_de_sobreposicao_ha': 0.0, 'porcentagem_sobreposta': 0.0,
        'indice_de_risco_ambiental_e_territorial': 1.0}
    assert objetos['D-2']['fase_1']['resumo_elegibilidade']['indice_de_risco_ambiental_e_territorial'] == 0.0
    assert objetos['D-2']['fase_1']['resumo_elegibilidade']['camadas_de_risco'] == ['Áreas de Risco']
    assert objetos['D-1']['fase_3']['score_fase3'] is None
    sugeridos = banco['dados_hierarquizacao']['cabecalho_grupo']['criterios_fase3_sugeridos']
    assert [s['atributo_id'] for s in sugeridos] == ['indice_de_risco_ambiental_e_territorial']
    assert sugeridos[0]['grupo_atributo'] == 'risco_ambiental_territorial' and sugeridos[0]['direcao'] == 'maior_melhor'
    assert sugeridos[0]['valor_minimo'] == 0 and sugeridos[0]['valor_maximo'] == 1
    assert banco['relatorio_fase3'] == {}
    assert banco['relatorio_consolidado'] == {}


def test_fase1_preserva_tratamentos_antigos_de_risco(banco, monkeypatch):
    banco['dados_hierarquizacao']['objetos'][0]['hierarquizacao']['fase_1']['tratamentos_riscos_fase3'] = {'x': 'ignorar'}
    _linhas(monkeypatch, [{'codigo_demanda': c, 'area_total_m2': 1000.0, 'sobreposicoes': []} for c in ('D-1', 'D-2', 'D-3')])
    service.registrar_resultado_por_demanda('H', 1, RESULTADO, 'autor')
    f1 = banco['dados_hierarquizacao']['objetos'][0]['hierarquizacao']['fase_1']
    assert f1['tratamentos_riscos_fase3'] == {'x': 'ignorar'}


def test_fase2_grava_extracao_por_feicao_e_so_define_indice_quando_unico(banco, monkeypatch):
    _linhas(monkeypatch, [
        {'codigo_demanda': 'D-1', 'area_total_m2': 1000.0, 'sobreposicoes': [
            _sobreposicao('g', 'grade', 600.0, favorabilidade=_fav(0.8)), _sobreposicao('r', 'rede', 300.0, favorabilidade=_fav(0.4))]},
        {'codigo_demanda': 'D-2', 'area_total_m2': 1000.0, 'sobreposicoes': [
            _sobreposicao('g', 'grade', 500.0, favorabilidade=_fav(0.2)), _sobreposicao('g', 'grade', 100.0, favorabilidade=_fav(0.6)),
            _sobreposicao('r', 'rede', 300.0, favorabilidade=_fav(0.4, 'ausente'))]},
        {'codigo_demanda': 'D-3', 'area_total_m2': 1000.0, 'sobreposicoes': []},
    ])
    assert service.registrar_resultado_por_demanda('H', 2, RESULTADO, 'autor')['registrado']
    f2 = {o['cabecalho_objeto']['codigo']: o['hierarquizacao']['fase_2'] for o in banco['dados_hierarquizacao']['objetos']}
    assert f2['D-1']['indice_favorabilidade_grade'] == 0.8 and f2['D-1']['indice_favorabilidade_rede'] == 0.4
    assert f2['D-1']['score_fase2'] == pytest.approx(0.6)
    assert f2['D-2']['indice_favorabilidade_grade'] is None and f2['D-2']['score_fase2'] is None
    assert f2['D-2']['estatisticas_por_dimensao']['grade']['media'] == pytest.approx(0.4)
    assert f2['D-2']['estatisticas_por_dimensao']['rede']['validos'] == 0
    assert len(f2['D-2']['extracao_por_feicao']['grade']) == 2
    assert f2['D-3']['score_fase2'] is None


@pytest.mark.parametrize('status', ['homologada', 'arquivada'])
def test_status_final_nao_recebe_resultado_por_demanda(banco, monkeypatch, status):
    banco['status'] = status
    antes = deepcopy(banco['dados_hierarquizacao'])
    _linhas(monkeypatch, [])
    r = service.registrar_resultado_por_demanda('H', 1, RESULTADO, 'autor')
    assert r['registrado'] is False and banco['dados_hierarquizacao'] == antes and banco['status'] == status


def test_fase_fora_da_rodada_nao_grava(banco, monkeypatch):
    banco['dados_hierarquizacao'] = _dados(fases=(1,))
    _linhas(monkeypatch, [])
    assert service.registrar_resultado_por_demanda('H', 2, RESULTADO, 'autor')['registrado'] is False


def test_demanda_sem_correspondencia_interrompe_sem_gravar(banco, monkeypatch):
    antes = deepcopy(banco['dados_hierarquizacao'])
    _linhas(monkeypatch, [{'codigo_demanda': 'D-9', 'area_total_m2': 1.0, 'sobreposicoes': []}])
    with pytest.raises(ValueError, match='D-9'):
        service.registrar_resultado_por_demanda('H', 1, RESULTADO, 'autor')
    assert banco['dados_hierarquizacao'] == antes


def test_arquivo_relatorio_entrega_a_planilha_do_resumo_registrada(monkeypatch):
    from hashlib import sha256
    from api.services import storage_remoto
    dados = b'planilha'
    registro = {'analises_geoespaciais': [{'arquivo': 'a/camada.gpkg', 'sha256': 'x', 'relatorio': {
        'arquivo': 'a/rel.pdf', 'sha256': 'y',
        'tabela_resumo': {'arquivo': 'a/Resumo da Elegibilidade_1.xlsx', 'sha256': sha256(dados).hexdigest()}}}]}
    monkeypatch.setattr(service, '_carregar', lambda codigo: {'relatorio_fase1': registro})
    monkeypatch.setattr(storage_remoto, 'baixar', lambda caminho: dados)
    assert service.arquivo_relatorio('H', 'fase1', 'a/Resumo da Elegibilidade_1.xlsx') == (dados, 'Resumo da Elegibilidade_1.xlsx')
    with pytest.raises(FileNotFoundError):
        service.arquivo_relatorio('H', 'fase1', 'a/outro.xlsx')


def test_valor_e_normalizacao_do_criterio_de_risco_por_area():
    obj = {'cabecalho_objeto': {}, 'hierarquizacao': {'fase_1': {'executada': True, 'sobreposicoes_risco': {'b': {'area_ha': 3.5}}}}}
    assert service._valor_atributo_objeto(obj, 'risco_area:b') == 3.5
    assert service._valor_atributo_objeto(obj, 'risco_area:outra') == 0.0
    obj['hierarquizacao']['fase_1']['executada'] = False
    assert service._valor_atributo_objeto(obj, 'risco_area:b') is None


def test_normalizacao_absoluta_do_risco_sem_variacao_favorece_quem_nao_sobrepoe():
    criterio = service._atributo_risco('b', 'Áreas de Risco')
    n, _, _ = service._normalizar([0.0, 0.0], criterio)
    assert n == {'0': 1.0, '1': 1.0}
    n, _, _ = service._normalizar([0.0, 4.0, 2.0], criterio)
    assert n == {'0': 1.0, '1': 0.0, '2': 0.5}
    n, _, _ = service._normalizar([3.0, 3.0], criterio)
    assert n == {'0': 0.0, '1': 0.0}
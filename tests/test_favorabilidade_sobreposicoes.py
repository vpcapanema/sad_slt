"""Dados completos da rosca, lidos das saídas persistidas e restritos ao usuário."""
from copy import deepcopy
from hashlib import sha256
from types import SimpleNamespace

import geopandas as gpd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shapely.geometry import box

from api.services import elegibilidade_processamento as processamento, elegibilidade_relatorio as service
from api.services.controle_processamento import ControleProcessamento


@pytest.fixture
def analise(monkeypatch):
    entrada = gpd.GeoDataFrame({'nome': ['A', 'B', 'Sem interseção']},
                              geometry=[box(0, 0, 10, 10), box(20, 0, 30, 10), box(40, 0, 50, 10)], crs=5880)
    grade = gpd.GeoDataFrame({'nome': ['Mesmo nome', 'Mesmo nome'], 'classe': ['Alta', 'Baixa']},
                            geometry=[box(0, 0, 5, 10), box(20, 0, 24, 10)], crs=5880)
    rede = gpd.GeoDataFrame({'nome': ['Contato']}, geometry=[box(10, 0, 11, 10)], crs=5880)
    resultados, arquivos = {}, {}
    for numero in (1, 2):
        recortes = []
        saida, auditoria = processamento.calcular(entrada, [('grade', 'Grade', 'g', grade), ('rede', 'Rede', 'r', rede)],
            ControleProcessamento(), intersecoes=recortes, analise='favorabilidade')
        auditoria['entrada'] = {'id': f'entrada-{numero}', 'nome': f'Entrada {numero}'}
        conteudo = processamento.serializar(saida, auditoria, recortes, 'f2.gpkg', analise='favorabilidade')['f2.gpkg']
        arquivo = f'saidas-geoespaciais/f2-{numero}.gpkg'
        resultados[f'job-{numero}'] = {'arquivo': arquivo, 'sha256': sha256(conteudo).hexdigest(),
                                     'lote_id': 'lote', 'total_entradas': 2, 'favorabilidade': auditoria}
        arquivos[arquivo] = conteudo
    def consultar(ident, dono, *, analise):
        assert analise == 'favorabilidade'
        if dono != 'autor' or ident not in resultados:
            raise FileNotFoundError('Execução não encontrada.')
        return {'status': 'concluido', 'resultado': deepcopy(resultados[ident])}
    monkeypatch.setattr(service.jobs, 'consultar', consultar)
    monkeypatch.setattr(service.storage_remoto, 'baixar', arquivos.__getitem__)
    return resultados, arquivos


def test_todas_entradas_demandas_e_feicoes_sem_agrupar_nomes(analise, monkeypatch):
    def sem_geometrias(*args, **kwargs):
        pytest.fail('A rosca não precisa reprojetar ou transmitir geometrias.')
    monkeypatch.setattr(service, 'reproject', sem_geometrias)
    resposta = service.sobreposicoes_favorabilidade(['job-1', 'job-2'], 'autor')
    assert resposta['concluidas'] == resposta['previstas'] == 2
    assert len(resposta['entradas']) == 2
    for entrada in resposta['entradas']:
        assert 'geometrias' not in entrada and 'intersecoes' not in entrada
        assert len(entrada['linhas']) == 3
        a, b, vazia = entrada['linhas']
        assert [c['area_m2'] for c in a['sobreposicoes']] == [50, 0]
        assert [c['area_m2'] for c in b['sobreposicoes']] == [40]
        assert vazia['sobreposicoes'] == []
        assert a['sobreposicoes'][0]['nome'] == b['sobreposicoes'][0]['nome']
        assert a['sobreposicoes'][0]['id'] != b['sobreposicoes'][0]['id']
        assert a['sobreposicoes'][1]['percentual'] == 0
    assert sum(c['area_m2'] for e in resposta['entradas'] for l in e['linhas'] for c in l['sobreposicoes']) == 180


def test_saidas_parciais_explicitam_quantidade_e_nao_inventam_valores(analise):
    resposta = service.sobreposicoes_favorabilidade(['job-1'], 'autor')
    assert resposta['concluidas'] == 1 and resposta['previstas'] == 2
    assert len(resposta['entradas']) == 1


def test_saida_alterada_nao_produz_grafico_divergente(analise):
    resultados, arquivos = analise
    arquivos[resultados['job-1']['arquivo']] += b'alterado'
    with pytest.raises(ValueError, match='mudou'):
        service.sobreposicoes_favorabilidade(['job-1'], 'autor')


def test_usuario_lote_e_duplicacao_conferidos(analise):
    with pytest.raises(FileNotFoundError):
        service.sobreposicoes_favorabilidade(['job-1'], 'outro')
    with pytest.raises(ValueError, match='sem repetições'):
        service.sobreposicoes_favorabilidade(['job-1', 'job-1'], 'autor')
    analise[0]['job-2']['lote_id'] = 'outro'
    with pytest.raises(ValueError, match='mesma execução'):
        service.sobreposicoes_favorabilidade(['job-1', 'job-2'], 'autor')


def test_rota_autenticada_e_erros_explicitos(analise):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    rota = '/extracao-atributos/favorabilidade/resultados/sobreposicoes'
    with TestClient(app) as client:
        assert client.post(rota, json={'execucoes': ['job-1', 'job-2']}).status_code == 200
        assert client.post(rota, json={'execucoes': []}).status_code == 422
        assert client.post(rota, json={'execucoes': ['inexistente']}).status_code == 404
        app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='outro')
        assert client.post(rota, json={'execucoes': ['job-1']}).status_code == 404
        app.dependency_overrides.clear()
        assert client.post(rota, json={'execucoes': ['job-1']}).status_code in {401, 403}

from copy import deepcopy
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.services import agregacao_favorabilidade as service


@pytest.mark.parametrize('medida,esperado', [
    ('media', .5), ('mediana', .5), ('amplitude', 1), ('variancia', .125),
    ('desvio', .125 ** .5), ('cv', .125 ** .5 / .5 * 100), ('iqr', .5),
    ('minimo', 0), ('q1', .25), ('q2', .5), ('q3', .75), ('maximo', 1), ('percentil', .9),
])
def test_mesmo_calculo_da_previa(medida, esperado):
    valores = [1, 0, .5, .25, .75]
    assert service.calcular(valores, service.configurar(medida, 90)) == pytest.approx(esperado)
    assert valores == [1, 0, .5, .25, .75]


def test_unicidade_zeros_ausencias_e_repeticoes():
    assert service.calcular([.2, .2, .9], {'medida': 'moda'}) == .2
    assert service.calcular([0, 0], {'medida': 'media'}) == 0
    assert service.calcular([], {'medida': 'media'}) is None
    assert service.calcular([.2, .2, .9], {'medida': 'media'}) == pytest.approx(1.3 / 3)
    for valores in ([.2, .8], [.2, .2, .8, .8]):
        with pytest.raises(ValueError, match='único'):
            service.calcular(valores, {'medida': 'moda'})
    with pytest.raises(ValueError, match='média é zero'):
        service.calcular([0, 0], {'medida': 'cv'})


@pytest.fixture
def armazenamento(monkeypatch):
    arquivos = {}
    resultado = {'arquivo': 'saida.gpkg', 'sha256': 'original'}
    linha = {'sobreposicoes': [
        {'papel': 'grade', 'favorabilidade': {'indice': v, 'estado_indice': 'valido'}} for v in [.2, .8]] + [
        {'papel': 'rede', 'favorabilidade': {'indice': 0, 'estado_indice': 'valido'}},
        {'papel': 'rede', 'favorabilidade': {'indice': None, 'estado_indice': 'ausente'}}]}
    def baixar(caminho):
        if caminho not in arquivos:
            raise FileNotFoundError(caminho)
        return arquivos[caminho]
    monkeypatch.setattr(service.storage_remoto, 'baixar', baixar)
    monkeypatch.setattr(service.storage_remoto, 'enviar_bytes', lambda c, d: arquivos.update({c: d}))
    monkeypatch.setattr(service.relatorios, '_selecionar', lambda *a, **k: [deepcopy(resultado)])
    monkeypatch.setattr(service.relatorios, 'resumo_por_demanda', lambda *a, **k: [deepcopy(linha)])
    return resultado, linha, arquivos


def test_salvar_preserva_escolha_sem_mudar_banco_e_isola_saida_usuario(armazenamento):
    resultado, linha, arquivos = armazenamento
    config = service.salvar(['j'], 'autor', 'media')['configuracao']
    assert service.carregar([resultado], 'autor') == config
    assert service.carregar([resultado], 'outro') is None
    assert service.carregar([{**resultado, 'sha256': 'nova'}], 'autor') is None
    assert service.valores_linha(linha, config) == {'grade': .5, 'rede': 0}
    antes = dict(arquivos)
    with pytest.raises(ValueError, match='único'):
        service.salvar(['j'], 'autor', 'moda')
    assert arquivos == antes


def test_rotas_salvam_e_recuperam_medida(armazenamento):
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='autor')
    rota = '/extracao-atributos/favorabilidade/resultados/agregacao'
    with TestClient(app) as client:
        assert client.post(rota + '/consultar', json={'execucoes': ['j']}).json()['configuracao'] is None
        assert client.post(rota + '/salvar', json={'execucoes': ['j'], 'medida': 'media'}).status_code == 200
        assert client.post(rota + '/consultar', json={'execucoes': ['j']}).json()['configuracao']['medida'] == 'media'
        for medida in ('', 'moda', 'invalida'):
            assert client.post(rota + '/salvar', json={'execucoes': ['j'], 'medida': medida}).status_code == 422

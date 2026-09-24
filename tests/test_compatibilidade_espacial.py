"""Preparação espacial usa cópias integrais e os motores da execução."""
import base64
import json

import geopandas as gpd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shapely.geometry import Point, Polygon

from api.services.compatibilidade_espacial import conferir, normalizar_crs
from api.services import municipal_layer
from api.routers.extracao_atributos import router
from api.deps.auth import require_geospatial_access


def frame(geometry=None, crs=4674):
    return gpd.GeoDataFrame({'codigo': ['0001'], 'valor': [0]}, geometry=[geometry or Point(-47, -23)], crs=crs)


def test_crs_diferentes_preservam_campos_e_originais():
    original = frame()
    projetada = original.to_crs(31983)
    for fonte in [original, projetada]:
        antes = fonte.copy()
        resultado = normalizar_crs(fonte, 'Fonte')
        assert resultado.crs.to_epsg() == 5880
        assert resultado.drop(columns='geometry').equals(antes.drop(columns='geometry'))
        assert fonte.equals(antes)
    assert normalizar_crs(original, 'A').geometry.iloc[0].distance(normalizar_crs(projetada, 'B').geometry.iloc[0]) < .01


@pytest.mark.parametrize('fonte', [frame(crs=None), frame(Point(1000, -23)), frame(Point(float('inf'), 0))])
def test_recusa_crs_ausente_coordenadas_incoerentes_e_infinitas(fonte):
    with pytest.raises(ValueError):
        normalizar_crs(fonte, 'Fonte')


@pytest.mark.parametrize('modo', ['estatisticas', 'enriquecimento', None])
def test_conjunto_inteiro_e_correcao_em_copia(monkeypatch, modo):
    invalida = frame(Polygon([(-47,-23),(-46,-22),(-47,-22),(-46,-23),(-47,-23)]))
    original = invalida.geometry.to_wkb().copy()
    fontes = {'entrada': frame().to_crs(31983), 'base': invalida, 'ruim': frame(crs=None)}
    chamadas = []
    def carregar(ident):
        chamadas.append(ident)
        return fontes[ident]
    monkeypatch.setattr(municipal_layer, 'carregar_para_extracao', carregar)
    camadas = [{'id': k, 'papel': 'entrada' if k == 'entrada' else 'base'} for k in fontes]
    resultado = conferir(camadas, modo)
    assert chamadas == list(fontes)
    assert not resultado['compativel']
    assert resultado['erros'][0]['id'] == 'ruim'
    assert resultado['camadas'][1]['geometrias_corrigidas_na_copia'] == 1
    assert invalida.geometry.to_wkb().equals(original)
    assert conferir(camadas[:2], modo)['compativel']


def test_regra_de_correcao_e_recorte_respeitada(monkeypatch):
    invalida = frame(Polygon([(-47,-23),(-46,-22),(-47,-22),(-46,-23),(-47,-23)]))
    monkeypatch.setattr(municipal_layer, 'carregar_para_extracao', lambda _: invalida)
    camada = {'id': 'base', 'papel': 'base', 'regra': {'preparacao': {'corrigir_geometrias': False}}}
    assert not conferir([camada], 'enriquecimento')['compativel']
    monkeypatch.setattr(municipal_layer, 'carregar_para_extracao', lambda _: frame())
    camada['regra'] = {'papel': 'recorte'}
    assert not conferir([camada], 'enriquecimento')['compativel']


def test_rota_autenticada_arquivo_local_integral_e_erros(monkeypatch):
    from api.services import extracao_entrada_local
    monkeypatch.setattr(extracao_entrada_local, 'localizacao', lambda _: {'status': 'não consultado neste teste'})
    app = FastAPI(); app.include_router(router)
    client = TestClient(app)
    fc = json.loads(frame().to_json())
    arquivo = {'nome': 'entrada.geojson', 'conteudo_base64': base64.b64encode(json.dumps(fc).encode()).decode()}
    payload = {'operacao': 'estatisticas', 'camadas': [{'id': 'local:entrada', 'papel': 'entrada', 'arquivo_local': arquivo}]}
    assert client.post('/extracao-atributos/compatibilizar', json=payload).status_code == 401
    app.dependency_overrides[require_geospatial_access] = lambda: object()
    def proibido(_):
        raise AssertionError('Uma entrada local não deve consultar o banco/storage')
    monkeypatch.setattr(municipal_layer, 'carregar_para_extracao', proibido)
    response = client.post('/extracao-atributos/compatibilizar', json=payload)
    assert response.status_code == 200
    assert response.json()['compativel'], response.json()
    payload['camadas'] *= 2
    assert client.post('/extracao-atributos/compatibilizar', json=payload).status_code == 422
    payload['camadas'] = [{'id': 'local:sem-original', 'papel': 'entrada'}]
    assert client.post('/extracao-atributos/compatibilizar', json=payload).status_code == 422

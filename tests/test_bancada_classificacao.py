"""Synthetic GPKG classifications; no persistent catalog or database access."""
from types import SimpleNamespace
from itertools import combinations

from osgeo import ogr, osr
import numpy as np
import pandas as pd
import pytest

from api.services import bancada_camada_original as original
from api.services.bancada_classificacao import classificar
from api.services import bancada_temporaria
from api.services.geoespacial_service import geoespacial_service


@pytest.fixture
def source(tmp_path):
    token = 'a' * 32
    path = tmp_path / f'{token}.gpkg'
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(4326)
    layer = ds.CreateLayer('camada', crs, ogr.wkbPoint)
    layer.CreateField(ogr.FieldDefn('valor', ogr.OFTReal))
    layer.CreateField(ogr.FieldDefn('grupo', ogr.OFTString))
    for value, group in [(0, 'A'), (10, 'A'), (20, 'B'), (30, None)]:
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetField('valor', value)
        if group is not None:
            feature.SetField('grupo', group)
        geometry = ogr.Geometry(ogr.wkbPoint)
        geometry.AddPoint_2D(-45, -20)
        feature.SetGeometry(geometry)
        layer.CreateFeature(feature)
    feature = layer = ds = None
    return original.Fonte('local:' + 'b' * 32, path, '', 'camada', 'Synthetic',
                          {'tipo': 'local_temporaria', 'token': token}, True)


def test_classifies_only_requested_field_without_geometry(source, monkeypatch):
    open_original = original._abrir

    class CheckedLayer:
        def __init__(self, layer):
            self.layer = layer

        def __getattr__(self, key):
            return getattr(self.layer, key)

        def GetNextFeature(self):
            feature = self.layer.GetNextFeature()
            if feature is not None:
                assert feature.GetGeometryRef() is None
                assert feature.GetField('grupo') is None
            return feature

    def checked_open(fonte):
        ds, layer = open_original(fonte)
        return ds, CheckedLayer(layer)

    monkeypatch.setattr(original, '_abrir', checked_open)
    result = classificar(source.ident, '', 'a' * 32, 'valor', classes=3, _source=source)
    assert result['quebras'] == [10.0, 20.0]
    assert result['min'] == 0 and result['max'] == 30


def test_categories_and_revision_guard(source):
    result = classificar(source.ident, '', 'a' * 32, 'grupo', 'valores_unicos', _source=source)
    assert result['categorias'] == [{'valor': 'A', 'contagem': 2}, {'valor': 'B', 'contagem': 1}]
    with pytest.raises(ValueError, match='mudou'):
        classificar(source.ident, '', 'wrong', 'valor', _source=source)
    with pytest.raises(ValueError, match='inexistente'):
        classificar(source.ident, '', 'a' * 32, 'missing', _source=source)


def test_temporary_classification_scoped_to_owner(source, monkeypatch):
    other = source.caminho.parent / 'other'
    other.mkdir()
    monkeypatch.setattr(bancada_temporaria, '_pasta', lambda owner: source.caminho.parent if owner == 'owner' else other)
    payload = SimpleNamespace(id=source.ident, tiles_token='a' * 32, revisao='a' * 32,
                              campo='valor', metodo='quantis', classes=3)
    result = bancada_temporaria.consultar('classificacao', payload, 'owner')
    assert result['quebras'] == [10.0, 20.0]
    payload.metodo = 'jenks'
    payload.classes = 5
    payload.dominio = (0, 20)
    assert bancada_temporaria.consultar('classificacao', payload, 'owner')['quebras'] == [10, 20]
    with pytest.raises(FileNotFoundError):
        bancada_temporaria.consultar('classificacao', payload, 'other')


@pytest.mark.parametrize("seed", range(8))
def test_jenks_exato_minimiza_variancia_global_sem_amostragem(seed):
    valores = np.random.default_rng(seed).integers(0, 12, size=24).astype(float)
    unicos = np.unique(valores)
    classes = min(5, len(unicos))
    resultado = geoespacial_service.classificar_serie("teste", "valor", pd.Series(valores), "jenks", classes)

    def variancia(quebras):
        grupos = np.searchsorted(quebras, valores, side="right")
        return sum(float(np.sum((grupo - grupo.mean()) ** 2))
                   for indice in range(classes) if (grupo := valores[grupos == indice]).size)

    otimo = min(variancia(quebras) for quebras in combinations(unicos[1:], classes - 1))
    assert variancia(resultado["quebras"]) == pytest.approx(otimo, abs=1e-10)
    assert resultado["classes"] == classes
    assert resultado["quebras"] == sorted(set(resultado["quebras"]))


def test_jenks_preserva_precisao_pesos_e_casos_degenerados():
    valores = np.repeat([.10000001, .10000002, .10000003, .10000004, .10000005],
                        [30000, 2000, 10000, 8000, 500])
    resultado = geoespacial_service.classificar_serie("teste", "valor", pd.Series(valores), "jenks", 5)
    assert resultado["quebras"] == [.10000002, .10000003, .10000004, .10000005]
    constante = geoespacial_service.classificar_serie("teste", "valor", pd.Series([.3, .3, None]), "jenks", 5)
    assert constante["classes"] == 1 and constante["quebras"] == []
    reduzido = geoespacial_service.classificar_serie("teste", "valor", pd.Series([0, .5, 1]), "jenks", 5)
    assert reduzido["classes"] == 3 and reduzido["quebras"] == [.5, 1]


def test_classificacao_jenks_filtra_dominio_sem_alterar_a_fonte(source):
    resultado = classificar(source.ident, "", "a" * 32, "valor", "jenks", 5, (0, 20), _source=source)
    assert resultado["min"] == 0 and resultado["max"] == 20
    assert resultado["quebras"] == [10, 20]
    with pytest.raises(ValueError, match="Domínio"):
        classificar(source.ident, "", "a" * 32, "valor", "jenks", 5, (1, 0), _source=source)
    with pytest.raises(ValueError, match="não possui valores numéricos"):
        classificar(source.ident, "", "a" * 32, "valor", "jenks", 5, (.1, .2), _source=source)


def test_api_jenks_encaminha_dominio_e_revisao(source, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.bancada_arquivos import router
    from api.deps.auth import require_geospatial_access

    app = FastAPI()
    app.include_router(router, prefix="/api/geoespacial")
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id="teste")
    monkeypatch.setattr(original, "_fonte", lambda *args: source)
    with TestClient(app) as client:
        payload = {"camada_id": source.ident, "arquivo": "origem.gpkg", "revisao": "a" * 32,
                   "campo": "valor", "metodo": "jenks", "classes": 5, "dominio": [0, 20]}
        response = client.post("/api/geoespacial/bancada-arquivos/classificacao", json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["quebras"] == [10, 20]
        payload["revisao"] = "desatualizada"
        assert client.post("/api/geoespacial/bancada-arquivos/classificacao", json=payload).status_code == 422

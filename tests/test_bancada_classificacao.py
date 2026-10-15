"""Synthetic GPKG classifications; no persistent catalog or database access."""
from types import SimpleNamespace

from osgeo import ogr, osr
import pytest

from api.services import bancada_camada_original as original
from api.services.bancada_classificacao import classificar
from api.services import bancada_temporaria


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
    with pytest.raises(FileNotFoundError):
        bancada_temporaria.consultar('classificacao', payload, 'other')

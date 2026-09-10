import pytest
from osgeo import ogr, osr

from api.services import visualizacao_arquivo as service


@pytest.fixture
def arquivo(tmp_path, monkeypatch):
    relative = 'data/geoespacial/outputs/ponto.gpkg'
    path = tmp_path / relative
    path.parent.mkdir(parents=True)
    dataset = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    crs = osr.SpatialReference()
    crs.ImportFromEPSG(3857)
    layer = dataset.CreateLayer('ponto', crs, ogr.wkbPoint)
    layer.CreateField(ogr.FieldDefn('origem', ogr.OFTString))
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetField('origem', 'arquivo original')
    feature.SetGeometry(ogr.CreateGeometryFromWkt('POINT (111319.49079327357 0)'))
    layer.CreateFeature(feature)
    dataset = None
    monkeypatch.setattr(service, 'project_path', lambda value: tmp_path / value)
    monkeypatch.setattr(service, 'camadas_dos_arquivos', lambda paths: [{'id': 'catalogo'}])
    return relative, path


def test_le_gpkg_reprojeta_e_reflete_alteracao_no_storage(arquivo):
    relative, path = arquivo
    result = service.ler_arquivo(relative)
    assert result['origem_geometria'] == 'storage'
    point = result['geojson']['features'][0]
    assert point['geometry']['coordinates'] == pytest.approx([1, 0])
    assert point['properties']['origem'] == 'arquivo original'
    dataset = ogr.Open(str(path), 1)
    layer = dataset.GetLayer(0)
    feature = layer.GetNextFeature()
    feature.SetField('origem', 'arquivo alterado')
    layer.SetFeature(feature)
    dataset = None
    assert service.ler_arquivo(relative)['geojson']['features'][0]['properties']['origem'] == 'arquivo alterado'


def test_sem_arquivo_nao_recorre_a_geometria_do_banco(arquivo):
    relative, path = arquivo
    path.unlink()
    with pytest.raises(FileNotFoundError):
        service.ler_arquivo(relative)


@pytest.mark.parametrize('path', ['../fora.gpkg', 'data/geoespacial/local/a.gpkg', 'C:/fora.gpkg'])
def test_rejeita_caminhos_fora_do_storage(path):
    with pytest.raises(ValueError):
        service.ler_arquivo(path)


def test_rejeita_arquivo_sem_registro(arquivo, monkeypatch):
    monkeypatch.setattr(service, 'camadas_dos_arquivos', lambda paths: [])
    with pytest.raises(ValueError, match='vínculo'):
        service.ler_arquivo(arquivo[0])

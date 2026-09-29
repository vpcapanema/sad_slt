import os
import shutil
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.services import bancada_arquivos as service
from api.services import storage_geoespacial as storage
from api.services import storage_remoto


OPERADOR = SimpleNamespace(id='teste', tipo_usuario='OPERADOR')


def _revisao(path):
    estado = path.stat()
    return f'{estado.st_mtime_ns}-{estado.st_size}'


def _camada(ds, nome):
    return ds.GetLayerByName(nome)


def _feicoes(path, nome='editar'):
    ds = ogr.Open(str(path))
    layer = _camada(ds, nome)
    result = {
        feature.GetFID(): (
            feature.GetField('valor'),
            feature.GetField('nome'),
            feature.GetGeometryRef().Clone(),
        )
        for feature in layer
    }
    ds = None
    return result


@pytest.fixture
def remoto(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, 'diretorio_storage', lambda: tmp_path)
    calls = {'enviar': [], 'mover': [], 'apagar': []}

    def enviar(destino, origem):
        calls['enviar'].append(destino)
        shutil.copyfile(origem, tmp_path / destino)

    def mover(origem, destino):
        calls['mover'].append((origem, destino))
        os.replace(tmp_path / origem, tmp_path / destino)

    def apagar(caminho):
        calls['apagar'].append(caminho)
        (tmp_path / caminho).unlink(missing_ok=True)

    monkeypatch.setattr(storage_remoto, 'enviar', enviar)
    monkeypatch.setattr(storage_remoto, 'mover', mover)
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', apagar)
    monkeypatch.setattr(storage, 'ler_para_mapa', lambda *args: pytest.fail('Não converter para GeoJSON'))
    monkeypatch.setattr('api.services.edicao_storage.time.sleep', lambda _: None)
    return calls


@pytest.fixture
def gpkg(tmp_path, remoto):
    path = tmp_path / 'base-geoespacial' / 'original.gpkg'
    path.parent.mkdir()
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(31983)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    for nome in ('editar', 'preservar'):
        layer = ds.CreateLayer(nome, srs, ogr.wkbPoint)
        layer.CreateField(ogr.FieldDefn('valor', ogr.OFTInteger))
        layer.CreateField(ogr.FieldDefn('nome', ogr.OFTString))
        for fid in (3, 7, 12):
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetFID(fid)
            feature.SetField('valor', fid)
            feature.SetField('nome', f'n{fid}')
            feature.SetGeometry(ogr.CreateGeometryFromWkt(f'POINT (300000 {7400000 + fid})'))
            assert layer.CreateFeature(feature) == 0
    ds = None
    return path, 'base-geoespacial/original.gpkg', 'storage:base-geoespacial/original.gpkg::editar'


def _cliente():
    from api.deps.auth import require_geospatial_access
    from api.routers.bancada_arquivos import router

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: OPERADOR
    return TestClient(app)


def _geometry(lon=-46.7, lat=-23.6):
    return {'type': 'Point', 'coordinates': [lon, lat]}


def test_endpoint_edita_geometrias_em_lote_sem_retornar_geojson(gpkg, remoto):
    path, arquivo, camada_id = gpkg
    antes = _feicoes(path)
    camada_preservada = _feicoes(path, 'preservar')
    revisao = _revisao(path)

    with _cliente() as client:
        response = client.post('/bancada-arquivos/salvar-geometrias', json={
            'arquivo': arquivo,
            'camada_id': camada_id,
            'revisao': revisao,
            'edicoes': [{'fid': 3, 'geometry': _geometry(), 'campos': {'nome': 'alterado'}}],
            'excluidos': ['7'],
            'novas': [{'geometry': _geometry(-46.8, -23.7), 'properties': {'valor': 50, 'nome': 'novo'}}],
        })

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['id'] == camada_id
    assert body['revisao'] == _revisao(path) != revisao
    assert body['geometrias_atualizadas'] == 1
    assert body['atributos_atualizados'] == 1
    assert body['novas'] == 1 and body['excluidas'] == 1
    assert body['total_feicoes'] == 3 and body['recarregar'] is True
    assert body['fids_excluidos'] == ['7']
    assert body['atributos']['3'] == {'nome': 'alterado'}
    assert 'geojson' not in body and 'features' not in body

    depois = _feicoes(path)
    assert 7 not in depois and 3 in depois and len(depois) == 3
    assert depois[3][0:2] == (3, 'alterado')
    assert antes[3][2].ExportToIsoWkt() != depois[3][2].ExportToIsoWkt()
    assert depois[12][0:2] == antes[12][0:2]
    assert sorted((row[0], row[1]) for row in depois.values()) == [
        (3, 'alterado'), (12, 'n12'), (50, 'novo')
    ]
    assert _feicoes(path, 'preservar').keys() == camada_preservada.keys()
    assert [(r[0], r[1], r[2].ExportToIsoWkt()) for r in _feicoes(path, 'preservar').values()] == [
        (r[0], r[1], r[2].ExportToIsoWkt()) for r in camada_preservada.values()
    ]

    transform_source = osr.SpatialReference()
    transform_source.ImportFromEPSG(4326)
    transform_source.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    transform_target = osr.SpatialReference()
    transform_target.ImportFromEPSG(31983)
    transform_target.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    expected = ogr.CreateGeometryFromWkt('POINT (-46.7 -23.6)')
    expected.AssignSpatialReference(transform_source)
    expected.Transform(osr.CoordinateTransformation(transform_source, transform_target))
    actual = depois[3][2]
    assert actual.GetX() == pytest.approx(expected.GetX(), abs=0.01)
    assert actual.GetY() == pytest.approx(expected.GetY(), abs=0.01)
    assert len(remoto['mover']) == 1 and remoto['mover'][0][1] == arquivo


@pytest.mark.parametrize(('geometry', 'campos', 'fid', 'message'), [
    ({'type': 'LineString', 'coordinates': [[0, 0], [1, 1]]}, {}, 3, 'tipo de geometria'),
    (_geometry(181, 0), {}, 3, 'longitude/latitude'),
    (_geometry(), {'inexistente': 1}, 3, 'não existe na camada'),
    (_geometry(), {}, 99, 'FID 99'),
])
def test_rejeita_geometria_ou_edicao_invalida_sem_publicar(gpkg, remoto, geometry, campos, fid, message):
    path, arquivo, camada_id = gpkg
    anterior = path.read_bytes()
    with pytest.raises(ValueError, match=message):
        service.salvar_geometrias(arquivo, camada_id, _revisao(path),
                                  [{'fid': fid, 'geometry': geometry, 'campos': campos}], [], [], OPERADOR)
    assert path.read_bytes() == anterior
    assert not remoto['enviar'] and not remoto['mover']


def test_revisao_obsoleta_e_lote_acima_do_limite_nao_publicam(gpkg, remoto):
    path, arquivo, camada_id = gpkg
    request = [{'fid': 3, 'geometry': _geometry()}]
    with pytest.raises(ValueError, match='mudou'):
        service.salvar_geometrias(arquivo, camada_id, '1-1', request, [], [], OPERADOR)
    acima_do_limite = [{'fid': fid, 'geometry': _geometry()} for fid in range(101)]
    with pytest.raises(ValueError, match='no máximo 100'):
        service.salvar_geometrias(arquivo, camada_id, _revisao(path), acima_do_limite, [], [], OPERADOR)
    assert not remoto['enviar'] and not remoto['mover']


def test_confere_revisao_antes_de_publicar_geometrias(gpkg, remoto, monkeypatch):
    path, arquivo, camada_id = gpkg
    original = path.read_bytes()
    enviar = storage_remoto.enviar

    def alterar_durante_envio(destino, origem):
        enviar(destino, origem)
        os.utime(path, ns=(1, 1))

    monkeypatch.setattr(storage_remoto, 'enviar', alterar_durante_envio)
    with pytest.raises(ValueError, match='mudou'):
        service.salvar_geometrias(arquivo, camada_id, _revisao(path),
                                  [{'fid': 3, 'geometry': _geometry()}], [], [], OPERADOR)
    assert path.read_bytes() == original
    assert not remoto['mover']
    assert not [item for item in path.parent.iterdir() if '.sicard-' in item.name]


def test_recusa_driver_nao_suportado(gpkg, remoto):
    path, _, _ = gpkg
    fgb = path.with_name('nao-editavel.fgb')
    fgb.write_bytes(b'not a vector')
    with pytest.raises(ValueError, match='apenas para GeoPackage'):
        service.salvar_geometrias('base-geoespacial/nao-editavel.fgb',
                                  'storage:base-geoespacial/nao-editavel.fgb',
                                  _revisao(fgb), [{'fid': 1, 'geometry': _geometry()}], [], [], OPERADOR)
    assert not remoto['enviar']


def test_rejeita_geometria_ogr_invalida(gpkg, remoto):
    path, arquivo, camada_id = gpkg
    ds = ogr.Open(str(path), update=1)
    source = _camada(ds, 'editar').GetSpatialRef().Clone()
    layer = ds.CreateLayer('areas', source, ogr.wkbPolygon)
    layer.CreateField(ogr.FieldDefn('valor', ogr.OFTInteger))
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetField('valor', 1)
    feature.SetGeometry(ogr.CreateGeometryFromWkt(
        'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'))
    assert layer.CreateFeature(feature) == 0
    ds = None
    polygon_invalido = {
        'type': 'Polygon',
        'coordinates': [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
    }

    with pytest.raises(ValueError, match='vazia ou inválida'):
        service.salvar_geometrias(arquivo, camada_id.rsplit('::', 1)[0] + '::areas',
                                  _revisao(path), [{'fid': 1, 'geometry': polygon_invalido}], [], [], OPERADOR)
    assert not remoto['enviar']


def test_rejeita_camadas_sem_crs(gpkg, remoto):
    path, arquivo, camada_id = gpkg
    ds = ogr.Open(str(path), update=1)
    layer = ds.CreateLayer('sem_crs', None, ogr.wkbPoint)
    feature = ogr.Feature(layer.GetLayerDefn())
    feature.SetGeometry(ogr.CreateGeometryFromWkt('POINT (0 0)'))
    assert layer.CreateFeature(feature) == 0
    ds = None

    with pytest.raises(ValueError, match='não informa seu CRS'):
        service.salvar_geometrias(arquivo, camada_id.rsplit('::', 1)[0] + '::sem_crs',
                                  _revisao(path), [{'fid': 1, 'geometry': _geometry()}], [], [], OPERADOR)
    assert not remoto['enviar']


def test_shapefile_reverte_publicacao_se_um_componente_falhar(tmp_path, remoto, monkeypatch):
    import geopandas as gpd
    from shapely.geometry import Point

    path = tmp_path / 'base-geoespacial' / 'pontos.shp'
    path.parent.mkdir()
    gpd.GeoDataFrame({'valor': [1, 2], 'nome': ['a', 'b']},
                     geometry=[Point(0, 0), Point(1, 1)], crs=4326).to_file(path)
    original = {path.with_suffix(ext): path.with_suffix(ext).read_bytes()
                for ext in ('.shp', '.shx', '.dbf')}
    mover = storage_remoto.mover
    tentativas = {'count': 0}

    def falha_segundo_mover(origem, destino):
        tentativas['count'] += 1
        if tentativas['count'] == 2:
            raise storage_remoto.StorageIndisponivel('falha parcial simulada')
        mover(origem, destino)

    monkeypatch.setattr(storage_remoto, 'mover', falha_segundo_mover)
    with pytest.raises(RuntimeError, match='revertida'):
        service.salvar_geometrias('base-geoespacial/pontos.shp', None, _revisao(path),
                                  [{'fid': 0, 'geometry': _geometry(-46.7, -23.6)}], [], [], OPERADOR)
    assert {item: item.read_bytes() for item in original} == original
    assert not [item for item in path.parent.iterdir() if '.sicard-' in item.name]
    assert any('.sicard-backup-' in destino for destino in remoto['apagar'])

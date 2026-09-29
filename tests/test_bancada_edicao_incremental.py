"""Edição incremental de atributos por FID em arquivos nativos do storage."""
import os
from pathlib import Path
from types import SimpleNamespace
import shutil

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from osgeo import ogr, osr

from api.services import bancada_arquivos as service, storage_geoespacial as storage, storage_remoto

OPERADOR = SimpleNamespace(id='teste', tipo_usuario='OPERADOR')


def _revisao(path):
    estado = path.stat()
    return f'{estado.st_mtime_ns}-{estado.st_size}'


def _valores(path, camada=None):
    ds = ogr.Open(str(path))
    layer = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
    result = {f.GetFID(): (f.GetField('valor'), f.GetField('nome'), f.GetGeometryRef().ExportToWkt())
              for f in layer}
    crs = layer.GetSpatialRef().GetAuthorityCode(None)
    return result, crs


@pytest.fixture
def remoto(tmp_path, monkeypatch):
    """SFTPGo simulado sobre a pasta do storage montada no teste."""
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
    monkeypatch.setattr(storage, 'ler_para_mapa', lambda *a: pytest.fail('Não converter a camada em GeoJSON'))
    monkeypatch.setattr(service, 'frame_editado', lambda *a: pytest.fail('Não usar a gravação completa'))
    monkeypatch.setattr('api.services.edicao_storage.time.sleep', lambda _: None)
    return calls


@pytest.fixture
def gpkg(tmp_path, remoto):
    path = tmp_path / 'base-geoespacial' / 'original.gpkg'
    path.parent.mkdir()
    ds = ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(31983)
    for name in ['editar', 'preservar']:
        layer = ds.CreateLayer(name, srs, ogr.wkbPoint)
        layer.CreateField(ogr.FieldDefn('valor', ogr.OFTInteger))
        layer.CreateField(ogr.FieldDefn('nome', ogr.OFTString))
        for fid in [3, 7, 12]:
            f = ogr.Feature(layer.GetLayerDefn())
            f.SetFID(fid)
            f.SetField('valor', fid)
            f.SetField('nome', f'n{fid}')
            f.SetGeometry(ogr.CreateGeometryFromWkt(f'POINT (300000 {7400000 + fid})'))
            layer.CreateFeature(f)
    ds = None
    return path, 'base-geoespacial/original.gpkg', 'storage:base-geoespacial/original.gpkg::editar'


def _cliente(user=OPERADOR):
    from api.routers.bancada_arquivos import router
    from api.deps.auth import require_geospatial_access
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: user
    return TestClient(app)


def test_gpkg_grava_so_alteracoes_preservando_crs_geometria_e_outras_camadas(gpkg, remoto):
    path, arquivo, ident = gpkg
    antes, _ = _valores(path, 'editar')
    outra = _valores(path, 'preservar')
    revisao = _revisao(path)
    with _cliente() as client:
        response = client.post('/bancada-arquivos/salvar-edicoes', json={
            'arquivo': arquivo, 'camada_id': ident, 'revisao': revisao,
            'edicoes': [{'fid': 3, 'campos': {'valor': 99, 'nome': 'novo'}}, {'fid': '12', 'campos': {'nome': None}}],
            'excluidos': ['7']})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['revisao'] == _revisao(path) != revisao
    assert body['editadas'] == 2 and body['excluidas'] == 1 and body['total_feicoes'] == 2
    assert body['recarregar'] is False and body['fids_excluidos'] == ['7']
    assert body['atributos'] == {'3': {'valor': 99, 'nome': 'novo'}, '12': {'nome': None}}
    depois, crs = _valores(path, 'editar')
    assert crs == '31983'
    assert set(depois) == {3, 12}
    assert depois[3] == (99, 'novo', antes[3][2])
    assert depois[12] == (12, None, antes[12][2])
    assert _valores(path, 'preservar') == outra
    # Envio para nome temporário e troca por renomeação no mesmo caminho.
    assert len(remoto['enviar']) == 1 and remoto['enviar'][0].endswith('.tmp')
    assert remoto['mover'] == [(remoto['enviar'][0], arquivo)]
    assert list(path.parent.iterdir()) == [path]


def test_revisao_obsoleta_nao_envia_nada(gpkg, remoto):
    path, arquivo, ident = gpkg
    before = path.read_bytes()
    with _cliente() as client:
        response = client.post('/bancada-arquivos/salvar-edicoes', json={
            'arquivo': arquivo, 'camada_id': ident, 'revisao': '1-1', 'edicoes': [{'fid': 3, 'campos': {'valor': 1}}]})
    assert response.status_code == 422 and 'mudou' in response.json()['detail']
    assert path.read_bytes() == before and not remoto['enviar']


@pytest.mark.parametrize('edicoes,excluidos,mensagem', [
    ({'3': {'inexistente': 1}}, [], 'não existe na camada'),
    ({'3': {'valor': 'texto'}}, [], 'inteiro'),
    ({'3': {'valor': 2 ** 40}}, [], '32 bits'),
    ({'3': {'nome': 5}}, [], 'texto'),
    ({'99': {'valor': 1}}, [], 'FID 99'),
    ({'abc': {'valor': 1}}, [], 'FID inválido'),
    ({'3': {'valor': 1}}, ['3'], 'editada e excluída'),
    ({'3': {'geometry': None}}, [], 'geometria'),
    ({}, ['3', '7', '12'], 'ao menos uma'),
    ({}, ['7', '7'], 'repetidos'),
    ({}, ['50'], 'FID 50'),
    ({}, [], 'Nenhuma alteração'),
    ([{'fid': 3, 'campos': {'valor': 1}}, {'fid': '3', 'campos': {'nome': 'x'}}], [], 'repetidos'),
    ([{'campos': {'valor': 1}}], [], 'formato'),
])
def test_rejeita_pedido_invalido_sem_tocar_no_original(gpkg, remoto, edicoes, excluidos, mensagem):
    path, arquivo, ident = gpkg
    before = path.read_bytes()
    with pytest.raises(ValueError, match=mensagem):
        service.salvar_edicoes(arquivo, ident, _revisao(path), edicoes, excluidos, OPERADOR)
    assert path.read_bytes() == before and not remoto['enviar']


def test_rejeita_perfil_sem_direito_e_sessoes_nao_nativas(gpkg, remoto, tmp_path):
    path, arquivo, ident = gpkg
    with _cliente(SimpleNamespace(id='x', tipo_usuario='CONSULTA')) as client:
        response = client.post('/bancada-arquivos/salvar-edicoes', json={
            'arquivo': arquivo, 'camada_id': ident, 'revisao': _revisao(path), 'edicoes': {'3': {'valor': 1}}})
    assert response.status_code == 403
    with pytest.raises(ValueError, match='nativos do storage'):
        service.salvar_edicoes('data/geoespacial/x.gpkg', 'camada-acervo', 'r', {'3': {'valor': 1}}, [], OPERADOR)
    with pytest.raises(ValueError, match='não corresponde'):
        service.salvar_edicoes('base-geoespacial/outro.gpkg', ident, 'r', {'3': {'valor': 1}}, [], OPERADOR)
    with pytest.raises(ValueError, match='compactados'):
        service.salvar_edicoes('base-geoespacial/a.zip', 'storage:base-geoespacial/a.zip', 'r',
                               {'3': {'valor': 1}}, [], OPERADOR)
    fgb = tmp_path / 'base-geoespacial' / 'x.fgb'
    fgb.write_bytes(b'')
    with pytest.raises(ValueError, match='FlatGeobuf'):
        service.salvar_edicoes('base-geoespacial/x.fgb', 'storage:base-geoespacial/x.fgb', _revisao(fgb),
                               {'0': {'valor': 1}}, [], OPERADOR)
    assert not remoto['enviar']


def test_falha_na_troca_preserva_original_e_limpa_temporario(gpkg, remoto, monkeypatch):
    path, arquivo, ident = gpkg
    before = path.read_bytes()
    def recusa(origem, destino):
        raise storage_remoto.StorageIndisponivel('sem permissão de sobrescrita')
    monkeypatch.setattr(storage_remoto, 'mover', recusa)
    with pytest.raises(RuntimeError, match='original foi preservado'):
        service.salvar_edicoes(arquivo, ident, _revisao(path), {'3': {'valor': 1}}, [], OPERADOR)
    assert path.read_bytes() == before
    assert list(path.parent.iterdir()) == [path]


def test_alteracao_concorrente_durante_envio_aborta_antes_da_troca(gpkg, remoto, monkeypatch, tmp_path):
    path, arquivo, ident = gpkg
    enviar = storage_remoto.enviar
    def concorrente(destino, origem):
        enviar(destino, origem)
        os.utime(path, ns=(1, 1))
    monkeypatch.setattr(storage_remoto, 'enviar', concorrente)
    with pytest.raises(ValueError, match='mudou'):
        service.salvar_edicoes(arquivo, ident, _revisao(path), {'3': {'valor': 1}}, [], OPERADOR)
    assert not remoto['mover']
    assert list(path.parent.iterdir()) == [path]
    assert _valores(path, 'editar')[0][3][0] == 3


def test_shapefile_exclusao_compacta_remove_indice_e_pede_recarga(tmp_path, remoto):
    import geopandas as gpd
    from shapely.geometry import Point
    root = tmp_path / 'base-geoespacial'
    root.mkdir()
    path = root / 'pontos.shp'
    gpd.GeoDataFrame({'valor': [1, 2, 3], 'nome': ['a', 'b', 'c']},
                     geometry=[Point(0, 0), Point(1, 1), Point(2, 2)], crs=31983).to_file(path)
    path.with_suffix('.qix').write_bytes(b'indice-antigo')
    result = service.salvar_edicoes('base-geoespacial/pontos.shp', None, _revisao(path),
                                    {'2': {'nome': 'z'}}, ['0'], OPERADOR)
    assert result['recarregar'] is True and result['atributos'] == {}
    assert result['revisao'] == _revisao(path)
    valores, crs = _valores(path)
    assert crs == '31983'
    assert sorted(valores.values()) == [(2, 'b', 'POINT (1 1)'), (3, 'z', 'POINT (2 2)')]
    assert not path.with_suffix('.qix').exists()
    assert {Path(destino).name for _, destino in remoto['mover']} == {'pontos.shp', 'pontos.shx', 'pontos.dbf'}
    assert remoto['mover'][-1][1].endswith('.shp')
    assert not [p for p in root.iterdir() if p.suffix == '.tmp']


def test_shapefile_recusa_texto_maior_que_largura(tmp_path, remoto):
    import geopandas as gpd
    from shapely.geometry import Point
    root = tmp_path / 'base-geoespacial'
    root.mkdir()
    path = root / 'curto.shp'
    gpd.GeoDataFrame({'nome': ['a']}, geometry=[Point(0, 0)], crs=4326).to_file(
        path, engine='pyogrio', layer_options={'RESIZE': 'NO'})
    ds = ogr.Open(str(path))
    largura = ds.GetLayer(0).GetLayerDefn().GetFieldDefn(0).GetWidth()
    ds = None
    with pytest.raises(ValueError, match='no máximo'):
        service.salvar_edicoes('base-geoespacial/curto.shp', None, _revisao(path),
                               {'0': {'nome': 'x' * (largura + 1)}}, [], OPERADOR)
    assert not remoto['enviar']


def test_geojson_edicao_sem_exclusao_mantem_fids(tmp_path, remoto):
    import geopandas as gpd
    from shapely.geometry import Point
    root = tmp_path / 'base-geoespacial'
    root.mkdir()
    path = root / 'g.geojson'
    gpd.GeoDataFrame({'valor': [1, 2], 'nome': ['a', 'b']},
                     geometry=[Point(-46, -23), Point(-47, -22)], crs=4326).to_file(path, driver='GeoJSON')
    result = service.salvar_edicoes('base-geoespacial/g.geojson', None, _revisao(path),
                                    {'1': {'valor': 20}}, [], OPERADOR)
    assert result['recarregar'] is False and result['atributos'] == {'1': {'valor': 20}}
    valores, _ = _valores(path)
    assert valores[0][0] == 1 and valores[1][0] == 20


def test_endpoint_aceita_mapa_por_fid_e_recusa_lista_malformada(gpkg, remoto):
    path, arquivo, ident = gpkg
    with _cliente() as client:
        ruim = client.post('/bancada-arquivos/salvar-edicoes', json={
            'arquivo': arquivo, 'camada_id': ident, 'revisao': _revisao(path),
            'edicoes': [{'fid': 3, 'campos': 'x'}]})
        assert ruim.status_code == 422 and not remoto['enviar']
        response = client.post('/bancada-arquivos/salvar-edicoes', json={
            'arquivo': arquivo, 'camada_id': ident, 'revisao': _revisao(path),
            'edicoes': {'3': {'valor': 5}}})
    assert response.status_code == 200, response.text
    assert response.json()['atributos']['3']['valor'] == 5
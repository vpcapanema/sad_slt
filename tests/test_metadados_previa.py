import geopandas as gpd
import pytest
from shapely.geometry import Point, Polygon, LineString
from api.services.metadados_previa import descrever_vetor

@pytest.fixture(autouse=True)
def sem_banco(monkeypatch):
    from api.services import extracao_entrada_local
    monkeypatch.setattr(extracao_entrada_local, 'localizacao', lambda _: {'status':'consultado','ufs':['SP'],'municipios':[]})
    import psycopg
    monkeypatch.setattr(psycopg, 'connect', lambda *a, **k: pytest.fail('Teste não deve acessar o banco'))


def test_ficha_poligono_crs_arquivo_e_geometria_original(tmp_path):
    path=tmp_path/'camada.gpkg';path.write_bytes(b'12345')
    frame=gpd.GeoDataFrame({'nome':['Área']},geometry=[Polygon([(0,0),(1000,0),(1000,1000),(0,1000),(0,0)])],crs=3857)
    meta=descrever_vetor(frame,arquivo=path,componente='area')
    assert meta['feicoes']==1 and meta['vertices']==5
    assert meta['campos_total']==1 and meta['bytes']==5
    assert meta['crs']=='EPSG:3857' and meta['unidade']=='metre'
    assert meta['area_km2']==pytest.approx(1,rel=.01)
    assert meta['comprimento_km']==0
    assert meta['localizacao']['ufs']==['SP']
    assert len(meta['limites_wgs84'])==4


def test_linhas_e_pontos_sem_inferir_area():
    line=gpd.GeoDataFrame(geometry=[LineString([(0,0),(.01,0)])],crs=4326)
    assert descrever_vetor(line)['comprimento_km']==pytest.approx(1.113,rel=.001)
    point=gpd.GeoDataFrame(geometry=[Point(-47,-23)],crs=4326)
    meta=descrever_vetor(point)
    assert meta['campos_total']==0 and meta['vertices']==1
    assert meta['area_km2']==meta['comprimento_km']==0


def test_metadados_cadastro_sem_consultas_extras_ou_crs_inventado(monkeypatch):
    from api.services.metadados_previa import descrever_geojson
    from api.services import extracao_entrada_local
    monkeypatch.setattr(extracao_entrada_local, 'localizacao',
                        lambda _: pytest.fail('Metadados cadastrais não devem iniciar consulta municipal'))
    data = {'crs_arquivo': 'EPSG:4674', 'geojson': {'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {'codigo': 'D-1'},
         'geometry': {'type': 'LineString', 'coordinates': [[0, 0], [.01, 0]]}},
    ]}}
    meta = descrever_geojson(data, formato='PostGIS', consultar_localizacao=False)
    assert meta['vertices'] == 2
    assert meta['comprimento_km'] == pytest.approx(1.113, rel=.001)
    assert meta['crs'] == 'EPSG:4674'
    assert meta['crs_nome'] == 'SIRGAS 2000'
    assert meta['unidade'] == 'degree'
    assert 'localizacao' not in meta


def test_arquivo_remoto_usa_tamanho_real_sem_converter_vsi_em_path(monkeypatch):
    from api.services.storage_geoespacial import ArquivoStorage
    source = ArquivoStorage('base-geoespacial/demandas.gpkg', 123456, 1)
    monkeypatch.setattr(ArquivoStorage, '__fspath__',
                        lambda _: pytest.fail('Ficha não deve abrir endereço remoto nem renovar credenciais'))
    meta = descrever_vetor(gpd.GeoDataFrame(geometry=[Point(0, 0)], crs=4326), arquivo=source)
    assert meta['formato'] == 'GPKG'
    assert meta['bytes'] == 123456
    assert meta['bytes_descompactados'] == 123456


@pytest.mark.parametrize('extension', ['.zip', '.tbz2', '.shp'])
def test_arquivo_remoto_nao_inventa_tamanho_descompactado(extension):
    from api.services.storage_geoespacial import ArquivoStorage
    source = ArquivoStorage(f'base-geoespacial/demandas{extension}', 1234, 1)
    meta = descrever_vetor(gpd.GeoDataFrame(geometry=[Point(0, 0)], crs=4326), arquivo=source)
    assert meta['bytes'] == 1234
    assert 'bytes_descompactados' not in meta


@pytest.mark.parametrize('crs', ['EPSG:4674', None])
def test_api_cadastro_metadados_opcionais_sem_nova_consulta_territorial(monkeypatch, crs):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.geoespacial import router
    from api.deps.auth import require_geospatial_access
    from api.deps.execucao_geoespacial import rastrear_execucao
    from api.repositories import cadastro_geometria_repository
    from api.services import extracao_entrada_local
    calls = []
    def listar(tipo, codigo):
        calls.append((tipo, codigo))
        return [{'id': 'cadastro:projeto:D-1', 'crs_arquivo': crs,
                 'geojson': {'type': 'FeatureCollection', 'features': [
                     {'type': 'Feature', 'properties': {'codigo': 'D-1'},
                      'geometry': {'type': 'LineString', 'coordinates': [[0, 0], [.01, 0]]}},
                 ]}}]
    monkeypatch.setattr(cadastro_geometria_repository, 'listar', listar)
    monkeypatch.setattr(extracao_entrada_local, 'localizacao',
                        lambda _: pytest.fail('Não consultar municípios para esta ficha'))
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.dependency_overrides[require_geospatial_access] = lambda: None
    app.dependency_overrides[rastrear_execucao] = lambda: None
    with TestClient(app) as client:
        response = client.get('/api/geoespacial/cadastro-geometrias/projeto',
                              params={'codigo': 'D-1', 'metadados': True})
        assert response.status_code == 200, response.text
        meta = response.json()['itens'][0]['metadados_local']
        assert meta['vertices'] == 2
        assert meta['comprimento_km'] == pytest.approx(1.113, rel=.001)
        assert meta['crs'] == crs
        assert meta['componente'] == 'demandas.projeto'
        assert meta['localizacao']['status'] == 'nao_consultado'
        assert 'bytes' not in meta
        original = client.get('/api/geoespacial/cadastro-geometrias/projeto', params={'codigo': 'D-1'})
        assert 'metadados_local' not in original.json()['itens'][0]
        assert calls == [('projeto', 'D-1'), ('projeto', 'D-1')]

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

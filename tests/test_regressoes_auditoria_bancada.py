"""Regressões da auditoria com arquivos reais e nenhum acesso a serviços oficiais."""
import asyncio
import sqlite3
from contextlib import closing
import geopandas as gpd
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import Point, LineString, box
from api.services.camada_arquivo import resolver_camada
from api.services.geoespacial_service import GeoespacialService
from api.services.importar_camadas_service import validate_raster, validate_vector


@pytest.fixture(autouse=True)
def no_database(monkeypatch):
    import psycopg
    def forbidden(*a, **kw):
        raise AssertionError('Este teste não acessa bancos')
    monkeypatch.setattr(psycopg, 'connect', forbidden)


@pytest.fixture
def package(tmp_path):
    path = tmp_path/'multi.gpkg'
    gpd.GeoDataFrame({'valor':[2,6]},geometry=[Point(0,0),Point(1,1)],crs=31983).to_file(path,layer='pontos')
    gpd.GeoDataFrame({'nome':['linha']},geometry=[LineString([(0,0),(3,4)])],crs=31983).to_file(path,layer='linhas')
    with closing(sqlite3.connect(path)) as conn:
        conn.execute('CREATE TABLE anotacoes (texto TEXT)')
        conn.execute("INSERT INTO anotacoes VALUES ('preservar')")
        conn.commit()
    return path


def test_edicao_preserva_outras_camadas_e_tabelas(package):
    before=gpd.read_file(package,layer='linhas')
    edited=gpd.read_file(package,layer='pontos');edited.loc[0,'valor']=7
    GeoespacialService._reescrever_arquivo_do_acervo(package,edited,'pontos')
    assert gpd.read_file(package,layer='pontos').valor.tolist()==[7,6]
    after=gpd.read_file(package,layer='linhas')
    assert before.equals(after)
    with closing(sqlite3.connect(package)) as conn:
        assert conn.execute('SELECT texto FROM anotacoes').fetchone()==('preservar',)


def test_salvar_atributos_resolve_subcamada(package, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repository
    from api.services import ciclo_vida_arquivos
    geo = GeoespacialService()
    geo._metadados['P'] = {'nome': 'Pontos'}
    monkeypatch.setattr(repository, 'esta_homologada', lambda _: False)
    monkeypatch.setattr(repository, 'substituir_vetor', lambda *a: None)
    monkeypatch.setattr(ciclo_vida_arquivos, 'exigir_editavel', lambda _: None)
    monkeypatch.setattr(geo, '_caminho_arquivo_da_camada', lambda _: package)
    monkeypatch.setattr(geo, 'obter_camada_dados', lambda _: gpd.read_file(package, layer='pontos'))
    before = gpd.read_file(package, layer='linhas')
    result = geo.salvar_edicoes_atributos('P', [{'indice': 0, 'campos': {'valor': 7}}])
    assert result['gravado_em_arquivo']
    assert gpd.read_file(package, layer='pontos').valor.tolist() == [7, 6]
    assert before.equals(gpd.read_file(package, layer='linhas'))


def test_edicao_multicamada_exige_identidade(package):
    before=package.read_bytes()
    with pytest.raises(ValueError,match='subcamada'):
        GeoespacialService._reescrever_arquivo_do_acervo(package,gpd.read_file(package,layer='pontos'))
    assert package.read_bytes()==before


def test_identidade_explicita_legada_e_ambigua(package):
    assert resolver_camada(package,{'nome':'Linhas'})=='linhas'
    assert resolver_camada(package,{'metadados':{'metadados':{'camada_arquivo':'linhas'}}})=='linhas'
    with pytest.raises(ValueError):resolver_camada(package,{'nome':'desconhecida'})
    with pytest.raises(ValueError):resolver_camada(package,{'camada_arquivo':'ausente'})


def test_leitura_fria_da_subcamada(package,monkeypatch):
    geo=GeoespacialService();geo._metadados['L']={'nome':'Linhas'}
    monkeypatch.setattr(geo,'_caminho_arquivo_da_camada',lambda _:package)
    frame=geo._ler_do_acervo('L')
    assert len(frame)==1 and frame.geometry.iloc[0].geom_type=='LineString'


def test_selecao_espacial_nao_e_juncao(monkeypatch):
    geo=GeoespacialService()
    points=gpd.GeoDataFrame({'id':['P1','P2']},geometry=[Point(0,0),Point(1,1)],crs=31983)
    areas=gpd.GeoDataFrame(geometry=[box(0,0,2,2),box(.5,.5,3,3)],crs=31983)
    monkeypatch.setattr(geo,'obter_camada_dados',lambda ident:points if ident=='p' else areas)
    saved=[]
    monkeypatch.setattr(geo,'registrar_camada',lambda frame,*a,**kw:saved.append(frame) or 'result')
    asyncio.run(geo.selecionar_por_localizacao('p','a'))
    assert saved[0].id.tolist()==['P1','P2']
    assert list(saved[0].columns)==list(points.columns)


@pytest.mark.parametrize('dtype,nodata',[('uint16',65535),('int16',-9999),('float32',-9999)])
@pytest.mark.parametrize('clip',[False,True])
def test_nodata_inteiro_com_e_sem_recorte(tmp_path,dtype,nodata,clip):
    path=tmp_path/'r.tif';data=np.array([[1,nodata],[3,4]],dtype=dtype)
    with rasterio.open(path,'w',driver='GTiff',width=2,height=2,count=1,dtype=dtype,crs=31983,transform=from_origin(500000,7400020,10,10),nodata=nodata) as dst:dst.write(data,1)
    mask=gpd.GeoDataFrame(geometry=[box(500000,7400000,500020,7400020)],crs=31983) if clip else None
    actual,profile,meta=validate_raster(path,target_crs=None,clip_frame=mask)
    assert np.isnan(actual[0,1]) and meta['celulas_validas']==3
    assert np.nansum(actual)==8


def test_lat_long_geograficas_sem_alterar_crs():
    frame=gpd.GeoDataFrame(geometry=[Point(500000,7400000)],crs=31983)
    result,_=validate_vector(frame,target_crs=None,clip_frame=None)
    assert result.crs==frame.crs
    assert result.long.iloc[0]==pytest.approx(-45,abs=1e-7)
    assert result.lat.iloc[0]==pytest.approx(-23.5101947,abs=1e-6)


def test_fallback_selecao_sem_campos_conhecidos(monkeypatch):
    from api.services.geoprocessamento_engine import GeoprocessamentoEngine
    engine=GeoprocessamentoEngine()
    frame=gpd.GeoDataFrame({'audit_id':['P1','P2']},geometry=[Point(0,0),Point(1,1)],crs=31983)
    monkeypatch.setattr(engine,'_layer',lambda _:frame)
    with pytest.raises(ValueError,match='não foram localizadas'):
        engine._apply_selection_scope('OP-28',{'camada_id':'p','processar_sobre':'selecionadas','chaves_selecionadas':['fora'],'atributos_selecionados':[{'fora':'P2'}]})

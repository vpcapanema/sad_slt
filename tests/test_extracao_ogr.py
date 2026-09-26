"""Prova do motor OGR: predicados exatos, R-tree e ausência de operações Shapely."""
import json
import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point, LineString, Polygon, box
from osgeo import ogr,gdal
from api.services import extracao_ogr as spatial
from api.services.extracao_atributos_enriquecimento import enriquecer as com_recorte
from api.services.extracao_atributos_estatisticas import enriquecer as sem_recorte

X,Y=5_000_000,7_500_000


def test_intersection_nativa_confirma_predicado_e_preserva_posicoes():
    # Mesmo envelope, mas o ponto está no buraco: filtro por envelope não basta.
    base=Polygon([(0,0),(10,0),(10,10),(0,10)],holes=[[(2,2),(8,2),(8,8),(2,8)]])
    idx=spatial.LayerOverlay([None,base,Point(5,5)])
    assert [right for _,right,_ in idx.records([Point(5,5)])]==[2]
    assert [right for _,right,_ in idx.records([Point(1,1)],predicate_name='within')]==[1]
    assert idx.records([Point(1,1)],predicate_name='contains')==[]
    assert [(left,right) for left,right,_ in idx.records([Point(1,1),None,Point(5,5)])]==[(0,1),(2,2)]
    idx.close()


def test_base_grande_tem_indice_ogr_e_recurso_temporario_e_removido():
    idx=spatial.LayerOverlay([Point(i,i) for i in range(300)])
    path=idx.path
    assert idx.layer.TestCapability(ogr.OLCFastSpatialFilter)
    assert [right for _,right,_ in idx.records([box(100,100,101,101)])]==[100,101]
    assert gdal.VSIStatL(path) is not None
    idx.close()
    assert gdal.VSIStatL(path) is None


@pytest.mark.parametrize('motor',[com_recorte,sem_recorte])
def test_os_dois_fluxos_usam_ogr_sem_spatial_join_ou_overlay_shapely(monkeypatch,motor):
    import shapely
    entrada=gpd.GeoDataFrame({'demanda':['D1']},geometry=[LineString([(X,Y+5),(X+20,Y+5)])],crs=5880)
    base=gpd.GeoDataFrame({'nome':['A','B'],'valor':[2,6]},geometry=[box(X,Y,X+10,Y+10),box(X+10,Y,X+20,Y+10)],crs=5880)
    called=[]
    real=ogr.Geometry.Intersection
    def intersection(self,other):
        called.append(True)
        return real(self,other)
    def forbidden(*a,**kw): raise AssertionError('Operação espacial fora do GDAL/OGR')
    monkeypatch.setattr(ogr.Geometry,'Intersection',intersection)
    for name in ['intersection','difference','union_all','make_valid','buffer','intersects','contains','within','touches']:
        monkeypatch.setattr(shapely,name,forbidden)
    monkeypatch.setattr(gpd,'sjoin',forbidden)
    categorias=[{'id':'risco','nome':'Risco','camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b'}}]}]
    if motor is com_recorte:
        categorias[0]['camadas'].insert(0,{'id':'c','nome':'Recorte','frame':base,'regra':{'prefixo':'c','papel':'recorte'}})
    saida=motor(entrada,categorias)
    assert saida['relatorio']['geoprocessamento']['motor']=='GDAL/OGR'
    assert called
    registros=saida['camadas']['linhas']
    assert len(registros)==(2 if motor is com_recorte else 1)
    assert set(registros.fid_origem)=={0}
    assert all(json.loads(v) for v in registros.b_correspondencias)


def test_osr_eixos_e_coordenadas_invalidas():
    frame=gpd.GeoDataFrame(geometry=[Point(-47,-23),None,Point()],crs=4326)
    projected=spatial.reproject(frame,5880)
    restored=spatial.reproject(projected,4326)
    assert restored.geometry.iloc[0].x==pytest.approx(-47)
    assert restored.geometry.iloc[0].y==pytest.approx(-23)
    assert restored.geometry.iloc[1] is None and restored.geometry.iloc[2].is_empty
    with pytest.raises(ValueError,match='incompatíveis'):
        spatial.reproject(gpd.GeoDataFrame(geometry=[Point(500,100)],crs=4326),5880)


@pytest.mark.parametrize('motor',[com_recorte,sem_recorte])
def test_overlay_nativo_alimenta_painel_sem_nova_busca(monkeypatch,motor):
    from api.services import extracao_intersecoes_territoriais as territorial
    called=[]
    real_intersection,real_identity=ogr.Layer.Intersection,ogr.Layer.Identity
    def intersection(self,*args,**kwargs):
        called.append('Intersection')
        return real_intersection(self,*args,**kwargs)
    def identity(self,*args,**kwargs):
        called.append('Identity')
        return real_identity(self,*args,**kwargs)
    monkeypatch.setattr(ogr.Layer,'Intersection',intersection)
    monkeypatch.setattr(ogr.Layer,'Identity',identity)
    monkeypatch.setattr(territorial,'registrar',lambda *a,**k: pytest.fail('Segunda busca territorial'))
    entrada=gpd.GeoDataFrame({'demanda':['D1']},geometry=[LineString([(X,Y+5),(X+20,Y+5)])],crs=5880)
    base=gpd.GeoDataFrame({'nome':['A','B']},geometry=[box(X,Y,X+10,Y+10),box(X+10,Y,X+20,Y+10)],crs=5880)
    categorias=[{'id':'risco','nome':'Risco','camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b'}}]}]
    if motor is com_recorte:
        categorias[0]['camadas'].insert(0,{'id':'c','nome':'Recorte','frame':base,'regra':{'prefixo':'c','papel':'recorte'}})
    saida=motor(entrada,categorias)
    assert called==(['Identity','Intersection'] if motor is com_recorte else [])
    snapshot=saida['intersecoes_territoriais']
    demanda=snapshot['entradas'][0]['feicoes'][0]
    assert {'risco:b:0','risco:b:1'}<=set(demanda['areas'])
    for key in ['risco:b:0','risco:b:1']:
        assert demanda['relacoes'][key]['comprimento_m']==pytest.approx(10)
        assert demanda['relacoes'][key]['percentual_entrada']==pytest.approx(50)
    assert snapshot['areas']['risco:b:0']['atributos']['nome']=='A'


def test_identity_nativo_preserva_demanda_fora_da_base_e_contatos(monkeypatch):
    entrada=gpd.GeoDataFrame(geometry=[LineString([(X-5,Y+5),(X+15,Y+5)])],crs=5880)
    base=gpd.GeoDataFrame({'nome':['Centro']},geometry=[box(X,Y,X+10,Y+10)],crs=5880)
    categorias=[{'id':'restricao','nome':'Restrição','camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b','papel':'recorte'}}]}]
    saida=com_recorte(entrada,categorias)
    rows=saida['camadas']['linhas']
    assert set(rows.fid_origem)=={0} and len(rows)==2
    assert sum(spatial.reproject(rows,5880).geometry.map(spatial.length))==pytest.approx(20,abs=1e-5)
    assert rows.b_nome.isna().sum()==1
    evidence=saida['intersecoes_territoriais']['entradas'][0]['feicoes'][0]['relacoes']['restricao:b:0']
    assert evidence['percentual_entrada']==pytest.approx(50)


def test_spatial_join_esquerda_nativo_preserva_sem_correspondencia_e_nulos():
    # Buraco no polígono, feição fora, geometria nula e múltiplos vínculos.
    polygon=Polygon([(0,0),(10,0),(10,10),(0,10)],holes=[[(2,2),(8,2),(8,8),(2,8)]])
    join=spatial.SpatialJoin([polygon,box(0,0,2,2)])
    try:
        assert join.pairs([Point(1,1),Point(5,5),Point(20,20),None])==[(0,0),(0,1),(1,None),(2,None),(3,None)]
        # Lote posterior não conserva entradas do lote anterior.
        assert join.pairs([Point(9,9)])==[(0,0)]
    finally:
        join.close()


@pytest.mark.parametrize('geom', [Point(X+5,Y+5),LineString([(X,Y+5),(X+20,Y+5)]),box(X,Y,X+20,Y+10)])
def test_sem_recorte_usa_join_e_mantem_cardinalidade_e_atributos(monkeypatch,geom):
    def forbidden(*a,**kw): raise AssertionError('Sem recorte não pode usar álgebra de overlay')
    monkeypatch.setattr(ogr.Layer,'Intersection',forbidden)
    monkeypatch.setattr(ogr.Layer,'Identity',forbidden)
    entradas=gpd.GeoDataFrame({'codigo':['001','002','003'], 'valor':[0,2,None]},geometry=[geom,Point(X+100,Y+100),None],crs=5880)
    bases=gpd.GeoDataFrame({'codigo':['A','B']},geometry=[box(X,Y,X+10,Y+10),box(X,Y,X+20,Y+10)],crs=5880)
    saida=sem_recorte(entradas,[{'id':'social','nome':'Social','camadas':[{'id':'b','nome':'Base','frame':bases,'regra':{'prefixo':'b'}}]}])
    registros={int(row.fid_origem):row for frame in saida['camadas'].values() for _,row in frame.iterrows()}
    assert len(registros)==len(entradas)
    originais=spatial.reproject(entradas,4674)
    for pos,row in registros.items():
        assert row.codigo==entradas.iloc[pos].codigo
        assert (row.geometry is None and originais.geometry.iloc[pos] is None) or row.geometry.wkb==originais.geometry.iloc[pos].wkb
    assert json.loads(registros[0].b_codigo)==['A','B']
    assert registros[0].valor==0
    assert pd.isna(registros[1].b_codigo) and pd.isna(registros[2].b_codigo)
    for frame in saida['camadas'].values():
        for feature in json.loads(frame.to_json())['features']:
            if feature['properties']['fid_origem'] in (1,2):
                assert feature['properties']['b_codigo'] is None
    assert registros[1].b_n_feicoes==0

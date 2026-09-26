"""Prova do motor OGR: predicados exatos, R-tree e ausência de operações Shapely."""
import json
import geopandas as gpd
import pytest
from shapely.geometry import Point, LineString, Polygon, box
from osgeo import ogr,gdal
from api.services import extracao_ogr as spatial
from api.services.extracao_atributos_enriquecimento import enriquecer as com_recorte
from api.services.extracao_atributos_estatisticas import enriquecer as sem_recorte

X,Y=5_000_000,7_500_000


def test_filtro_ogr_confirma_predicado_e_preserva_posicoes():
    # Mesmo envelope, mas o ponto está no buraco: filtro por envelope não basta.
    base=Polygon([(0,0),(10,0),(10,10),(0,10)],holes=[[(2,2),(8,2),(8,8),(2,8)]])
    idx=spatial.SpatialIndex([None,base,Point(5,5)])
    assert idx.query(Point(5,5)).tolist()==[2]
    assert idx.query(Point(1,1),predicate='within').tolist()==[1]
    assert idx.query(Point(1,1),predicate='contains').tolist()==[]
    assert idx.query([Point(1,1),None,Point(5,5)]).tolist()==[[0,2],[1,2]]
    idx.close()


def test_base_grande_tem_indice_ogr_e_recurso_temporario_e_removido():
    idx=spatial.SpatialIndex([Point(i,i) for i in range(300)])
    path=idx.path
    assert idx.layer.TestCapability(ogr.OLCFastSpatialFilter)
    assert idx.query(box(100,100,101,101)).tolist()==[100,101]
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

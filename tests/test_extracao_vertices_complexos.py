"""Prévia limitada não altera os vetores integrais usados na análise."""
import base64
import json
import time

import geopandas as gpd
import numpy as np
import pytest
import shapely
from shapely.geometry import Polygon, Point, MultiPoint, shape
from api.services import extracao_entrada_local as local
from api.services.extracao_atributos_estatisticas import enriquecer


@pytest.fixture(autouse=True)
def sem_banco(monkeypatch):
    monkeypatch.setattr(local,'localizacao',lambda frame:{'status':'consultado','ufs':[],'municipios':[]})


@pytest.fixture(scope='module')
def gigante(tmp_path_factory):
    angulos=np.linspace(0,2*np.pi,600001)
    geometria=Polygon(np.column_stack((-47+np.cos(angulos)*.1,-23+np.sin(angulos)*.1)))
    frame=gpd.GeoDataFrame({'codigo':['original'],'valor':[7]},geometry=[geometria],crs=4326)
    path=tmp_path_factory.mktemp('complexa')/'entrada.gpkg'
    frame.to_file(path,driver='GPKG',layer='original')
    return frame,path.read_bytes()


def test_mais_de_600_mil_vertices_valida_previa_leve_e_processa_original(gigante):
    original,data=gigante
    inicio=time.monotonic()
    antes=set(local.gdal.ReadDir('/vsimem') or [])
    result=local.previa(data,'entrada.gpkg')
    assert result['resumo']['validas']==1 and result['resumo']['invalidas']==0
    camada=result['camadas'][0]
    meta=camada['metadados_local']
    assert meta['vertices']>600000
    assert meta['previa']['metodo']=='simplificada'
    assert meta['previa']['vertices_exibidos']<=local.MAX_VERTICES_PREVIA
    assert len(json.dumps(result))<1_000_000
    assert 'geojson_resumido' in camada
    frame,_=local.restaurar({'nome':'entrada.gpkg','conteudo_base64':base64.b64encode(data).decode(),'camadas':[camada['chave']]})
    assert frame.geometry.iloc[0].wkb==original.geometry.iloc[0].wkb
    assert frame.codigo.tolist()==['original'] and frame.valor.tolist()==[7]
    # Um ponto próximo à borda real cai fora dos segmentos da prévia simplificada.
    x,y=original.geometry.iloc[0].exterior.coords[13]
    ponto=Point(-47+(x+47)*.9999999,-23+(y+23)*.9999999)
    assert original.geometry.iloc[0].contains(ponto)
    assert not shape(camada['geojson']['features'][0]['geometry']).intersects(ponto)
    base=gpd.GeoDataFrame({'medida':[11]},geometry=[ponto],crs=4326)
    saida=enriquecer(frame,[{'id':'social','nome':'Social','camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b'}}]}])
    resultado=saida['camadas']['poligonos']
    assert resultado.geometry.iloc[0].wkb==original.to_crs(4674).geometry.iloc[0].wkb
    assert resultado['b_medida'].tolist()==['[11]']
    assert len(resultado)==1
    restaurada,_=local.restaurar({'nome':'entrada.gpkg','conteudo_base64':base64.b64encode(data).decode(),'camada':camada['chave']})
    assert restaurada.geometry.iloc[0].wkb==original.geometry.iloc[0].wkb
    inverso=enriquecer(base,[{'id':'social','nome':'Social','camadas':[{'id':'complexa','nome':'Base complexa','frame':restaurada,'regra':{'prefixo':'c'}}]}])
    assert inverso['camadas']['pontos']['c_valor'].tolist()==['[7]']
    assert set(local.gdal.ReadDir('/vsimem') or [])==antes
    print(f'600 mil vertices: previa + restauracao + analise em {time.monotonic()-inicio:.2f}s; JSON {len(json.dumps(result))} bytes')


def test_orcamento_de_vertices_do_conjunto_nao_exclui_segunda_camada(tmp_path):
    angulos=np.linspace(0,2*np.pi,260001)
    path=tmp_path/'duas.gpkg'
    for i in range(2):
        frame=gpd.GeoDataFrame({'id':[i]},geometry=[Polygon(np.column_stack((-47+i+np.cos(angulos)*.1,-23+np.sin(angulos)*.1)))],crs=4326)
        frame.to_file(path,layer=f'camada_{i}',driver='GPKG')
    result=local.previa(path.read_bytes(),'duas.gpkg')
    assert result['resumo']['validas']==2 and result['resumo']['invalidas']==0
    assert sum(c['metadados_local']['vertices'] for c in result['camadas'])>500000
    assert sum(c['metadados_local']['previa']['vertices_exibidos'] for c in result['camadas'])<=local.MAX_VERTICES_PREVIA
    assert len(result['entrada']['geojson']['features'])==2


def test_previa_irredutivel_usa_limites_sem_alterar_original():
    frame=gpd.GeoDataFrame({'nome':['multipontos']},geometry=[MultiPoint([(i/1000, i%5) for i in range(200)])],crs=4326)
    original=frame.geometry.iloc[0].wkb
    previa,meta=local._representacao_mapa(frame,20)
    assert meta['metodo']=='limites' and meta['vertices_exibidos']==5
    assert previa['features'][0]['properties']['nome']=='multipontos'
    assert frame.geometry.iloc[0].wkb==original


def test_estatisticas_em_lotes_preserva_contagens_e_geometrias():
    pontos=[Point(-47+i/10000,-23) for i in range(150)]
    entrada=gpd.GeoDataFrame({'codigo':list(range(150))},geometry=pontos,crs=4326)
    base=gpd.GeoDataFrame({'valor':[2,4]},geometry=[shapely.box(-48,-24,-46,-22)]*2,crs=4326)
    etapas=[]
    saida=enriquecer(entrada,[{'id':'social','nome':'Social','camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b','estatisticas_campos':{'valor':'total'}}}]}],progress=etapas.append)
    resultado=saida['camadas']['pontos']
    assert len(resultado)==150 and resultado['b_valor'].tolist()==[6]*150
    assert resultado['b_n_feicoes'].tolist()==[2]*150
    assert resultado.geometry.to_wkb().tolist()==entrada.to_crs(4674).geometry.to_wkb().tolist()
    assert any('64/150' in e for e in etapas) and any('150/150' in e for e in etapas)

"""Motor real com dados sintéticos; somente persistência substituída por memória."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import geopandas as gpd
import numpy as np
import pytest
from rasterio.transform import from_origin
from shapely.geometry import Point, box

from api.services.geoprocessamento_engine import GeoprocessamentoEngine
from api.services.geoespacial_service import geoespacial_service as geo


@pytest.fixture
def bancada(monkeypatch, tmp_path):
    vectors = {
        'area': gpd.GeoDataFrame({'grupo': ['A', 'A'], 'valor': [2., 4.]}, geometry=[box(0,0,100,100),box(100,0,200,100)], crs=3857),
        'mask': gpd.GeoDataFrame({'zona': ['Z']}, geometry=[box(0,0,100,100)], crs=3857),
        'points': gpd.GeoDataFrame({'valor':[1.,2.,3.,4.]},geometry=[Point(25,25),Point(25,75),Point(75,25),Point(75,75)],crs=3857),
    }
    rasters = {'r': np.array([[1.,2.],[3.,4.]], dtype='float32')}
    profiles = {'r': {'crs':'EPSG:3857','transform':from_origin(0,100,50,50)}}
    metadata={k:{'id':k,'tipo':'raster' if k=='r' else 'vetorial'} for k in [*vectors,'r']}
    def register(frame,*a,**kw):
        key='camada_'+uuid4().hex;vectors[key]=frame.copy();metadata[key]={'id':key,'tipo':'vetorial'};return key
    def register_raster(data,profile,*a,**kw):
        key='raster_'+uuid4().hex;rasters[key]=data.copy();profiles[key]=profile.copy();metadata[key]={'id':key,'tipo':'raster'};return key
    async def resource(key): return metadata.get(key)
    monkeypatch.setattr(geo,'_camadas',vectors)
    monkeypatch.setattr(geo,'_rasters',rasters)
    monkeypatch.setattr(geo,'_raster_profiles',profiles)
    monkeypatch.setattr(geo,'_metadados',metadata)
    monkeypatch.setattr(geo,'obter_camada_dados',lambda key:vectors[key])
    monkeypatch.setattr(geo,'obter_raster_dados',lambda key:rasters[key])
    monkeypatch.setattr(geo,'obter_recurso',resource)
    monkeypatch.setattr(geo,'registrar_camada',register)
    monkeypatch.setattr(geo,'registrar_raster',register_raster)
    import importlib
    module=importlib.import_module('api.services.geoespacial_service')
    source=tmp_path/'fixture.gpkg'
    vectors['area'].to_file(source,driver='GPKG')
    monkeypatch.setattr(module,'project_path',lambda value,**kwargs:source)
    monkeypatch.setattr(module,'project_relative',lambda value:'fixture.gpkg')
    from api.services import fase1_classificacao
    monkeypatch.setattr(fase1_classificacao,'_regras_do_banco',lambda ident:[])
    import psycopg
    def no_database(*a,**kw): raise AssertionError('Testes da bancada não podem acessar o banco oficial')
    monkeypatch.setattr(psycopg,'connect',no_database)
    engine=GeoprocessamentoEngine()
    return SimpleNamespace(engine=engine,vectors=vectors,rasters=rasters,profiles=profiles)


CASES = {
 'OP-CLASS':{'camada_id':'area','criterio_id':'aprm'},
 'OP-01':{'tipo_entrada':'local','caminho_arquivo':'fixture.gpkg'},
 'OP-02':{'camada_id':'area'}, 'OP-02-CORR':{'camada_id':'area'},
 'OP-03':{'camada_id':'area','crs_destino':'EPSG:4326'},
 'OP-04':{'camada_id':'points','distancia_buffer':10},
 'OP-05':{'camada_id_1':'area','camada_id_2':'mask','tipo_overlay':'intersection'},
 'OP-05-IDENT':{'camada_id_1':'area','camada_id_2':'mask'},
 'OP-06':{'camada_id':'area','campo_agrupamento':'grupo'},
 'OP-07':{'camada_id':'points','camada_ref_id':'mask'},
 'OP-08':{'camada_id':'area','resolucao_raster':50},
 'OP-10':{'camada_id':'points','resolucao_distancia':25},
 'OP-11':{'camada_id':'points','atributo_peso':'valor','resolucao_distancia':25},
 'OP-12':{'camada_id':'points','resolucao_kernel':25,'largura_kernel':50},
 'OP-13':{'raster_id':'r'},
 'OP-14':{'camada_id':'points','atributo_valor':'valor','resolucao_interpolacao':25},
 'OP-15':{'camada_id':'area','campo_unidade':'grupo','atributo_agregacao':'valor'},
 'OP-16':{'camada_id':'area'}, 'OP-17':{'raster_ids':['r','r']},
 'OP-20':{'raster_id':'r'}, 'OP-21':{'raster_id':'r','camada_mascara_id':'mask'},
 'OP-22':{'raster_id':'r','camada_zona_id':'mask'},
 'OP-23':{'raster_id':'r','camada_pontos_id':'points'},
 'OP-24':{'raster_id':'r','camada_poligono_id':'mask'},
 'OP-25':{'camada_id':'area'},'OP-26':{'raster_id':'r'},'OP-27':{'entrada':'area'},
 **{f'OP-{i}':{'camada_id':'area'} for i in [28,29,30,32,37,38]},
 'OP-31':{'camada_id':'area','tolerancia':1},
 'OP-33':{'camada_id':'area','camada_mascara_id':'mask'},
 'OP-34':{'camada_id':'points','camada_ref_id':'mask'},
 'OP-35':{'camada_ids':['area','mask']},
 'OP-36':{'camada_id':'area','crs_destino':'EPSG:4326'},
 'OP-39':{'raster_id':'r','classes':'[{"min":0,"max":3,"valor":1},{"min":3,"max":5,"valor":2}]'},
 'OP-40':{'raster_id':'r','limiar':2},'OP-41':{'raster_id':'r'},
 'OP-42':{'raster_id':'r'},'OP-43':{'raster_id':'r'},
}


@pytest.mark.parametrize('operation', CASES)
def test_motor_real_produz_resultado(operation,bancada):
    params={'destino':'memoria','nome_saida':'Teste','crs_saida':'entrada','formato_saida':'JSON',**CASES[operation]}
    result=asyncio.run(bancada.engine.execute(operation,params))
    assert isinstance(result,dict) and result
    if 'camada_id' in result:
        assert not bancada.vectors[result['camada_id']].empty
        assert bancada.vectors[result['camada_id']].geometry.is_valid.all()
    if 'raster_id' in result:
        data=bancada.rasters[result['raster_id']]
        assert data.ndim==2 and np.isfinite(data).any()
    if operation=='OP-22': assert result['estatisticas'][0]['soma']==10
    if operation=='OP-23': assert result['valores']==[3.,1.,4.,2.]
    if operation=='OP-37': assert bancada.vectors[result['camada_id']]['area'].tolist()==[10000.,10000.]
    if operation=='OP-38': assert bancada.vectors[result['camada_id']]['comprimento'].tolist()==[400.,400.]


def test_no_data_nao_vira_classe_e_e_serializavel(bancada):
    import json
    bancada.rasters['r'][0,0]=np.nan
    threshold=asyncio.run(bancada.engine.execute('OP-40',{'raster_id':'r','limiar':2}))
    assert np.isnan(bancada.rasters[threshold['raster_id']][0,0])
    exported=asyncio.run(bancada.engine.execute('OP-26',{'raster_id':'r','destino':'memoria','nome_saida':'teste','crs_saida':'entrada','formato_saida':'JSON'}))
    assert exported['raster_data'][0][0] is None
    json.dumps(exported,allow_nan=False)
    sample=asyncio.run(bancada.engine.execute('OP-23',CASES['OP-23']))
    assert sample['valores'][1] is None
    json.dumps(sample,allow_nan=False)


def test_grade_zero_rejeitada(bancada):
    with pytest.raises(ValueError,match='resolução'):
        asyncio.run(bancada.engine.execute('OP-08',{'camada_id':'area','resolucao_raster':0}))


def test_rasters_mesmo_shape_mas_grades_diferentes_rejeitados(bancada):
    bancada.rasters['shift']=bancada.rasters['r'].copy()
    bancada.profiles['shift']={'crs':'EPSG:3857','transform':from_origin(1000,100,50,50)}
    with pytest.raises(ValueError,match='grade espacial'):
        asyncio.run(bancada.engine.execute('OP-17',{'raster_ids':['r','shift']}))


def test_parametros_obrigatorios_identity(bancada):
    with pytest.raises(ValueError,match='camada_id_2'):
        asyncio.run(bancada.engine.execute('OP-05-IDENT',{'camada_id_1':'area'}))


def test_consultas_atributivas(bancada):
    from api.services.expressoes_atributos import selecionar, avaliar
    frame=bancada.vectors['area']
    assert selecionar(frame,'valor > 2 and grupo == "A"')['valor'].tolist()==[4.]
    assert selecionar(frame,'valor in [2, 8]')['valor'].tolist()==[2.]
    assert avaliar(frame,'valor * 2').tolist()==[4.,8.]
    with pytest.raises(ValueError): selecionar(frame,'__import__("os").getcwd()')


def test_cancelamento_so_antes_do_motor(monkeypatch):
    from api.services.geoprocessamento_jobs import GeoprocessamentoJobs, OperacaoCancelada
    jobs=GeoprocessamentoJobs()
    try:
        ident=jobs._new('operacao',['preparar','executar'])
        jobs._jobs[ident].update(cancelavel=True,responsavel='user')
        with pytest.raises(KeyError): jobs.cancel(ident,'outro')
        jobs.cancel(ident,'user')
        with pytest.raises(OperacaoCancelada): jobs._begin_execution(ident)
        other=jobs._new('operacao',['preparar','executar'])
        jobs._jobs[other].update(cancelavel=True,responsavel='user')
        jobs._begin_execution(other)
        with pytest.raises(ValueError,match='interrupção segura'):jobs.cancel(other,'user')
    finally:jobs._executor.shutdown(wait=False)


@pytest.fixture
def api_client(bancada, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers import geoespacial as routes
    from api.deps.auth import require_geospatial_access
    from api.deps.execucao_geoespacial import rastrear_execucao
    app=FastAPI()
    app.include_router(routes.router,prefix='/api')
    app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
    app.dependency_overrides[rastrear_execucao]=lambda:None
    monkeypatch.setattr(routes,'geoprocessamento_engine',bancada.engine)
    with TestClient(app) as client:
        yield client


@pytest.mark.parametrize('operation', CASES)
def test_rota_http_executa_motor_e_serializa_resultado(operation,api_client):
    params={'destino':'memoria','nome_saida':'Teste','crs_saida':'entrada','formato_saida':'JSON',**CASES[operation]}
    response=api_client.post(f'/api/geoespacial/algoritmos/{operation}/executar',json=params)
    assert response.status_code==200,response.text
    assert isinstance(response.json(),dict) and response.json()


@pytest.fixture
def jobs_api(api_client,bancada,monkeypatch):
    from contextlib import nullcontext
    from api.routers import geoespacial as routes
    from api.services import geoprocessamento_jobs as module
    from api.db import connection
    async def catalog(): return list(geo._metadados.values())
    monkeypatch.setattr(geo,'listar_recursos',catalog)
    monkeypatch.setattr(module,'geoprocessamento_engine',bancada.engine)
    monkeypatch.setattr(module.ciclo,'iniciar',lambda *args:'execucao-isolada')
    monkeypatch.setattr(module.ciclo,'finalizar',lambda *args,**kwargs:None)
    monkeypatch.setattr(module.ciclo,'registrar_uso',lambda *args:None)
    monkeypatch.setattr(module.geoprocessamento_relatorio,'salvar',lambda *args:[])
    monkeypatch.setattr(connection,'get_connection',lambda:nullcontext(None))
    jobs=module.GeoprocessamentoJobs()
    monkeypatch.setattr(routes,'geoprocessamento_jobs',jobs)
    yield api_client,jobs
    jobs._executor.shutdown(wait=True)


@pytest.mark.parametrize('operation', CASES)
def test_rota_jobs_usada_pelos_botoes(operation,jobs_api):
    import time
    client,jobs=jobs_api
    params={'destino':'memoria','nome_saida':'Teste','crs_saida':'entrada','formato_saida':'JSON',**CASES[operation]}
    response=client.post(f'/api/geoespacial/operacoes-jobs/{operation}',json=params)
    assert response.status_code==202,response.text
    ident=response.json()['id']
    for _ in range(200):
        response=client.get(f'/api/geoespacial/operacoes-jobs/status/{ident}')
        assert response.status_code==200
        job=response.json()
        if job['status'] in {'concluido','erro','cancelado'}:break
        time.sleep(.02)
    assert job['status']=='concluido',job.get('erro')
    assert job['resultado'] and job['percentual']==100


@pytest.mark.parametrize('kind,key',[('funcoes','passos'),('fluxos','itens')])
def test_definicao_criar_editar_validar_executar_excluir(kind,key,api_client,bancada,monkeypatch):
    from copy import deepcopy
    from api.routers import geoespacial as routes
    saved={}
    def save(body,category): saved[(category,body['id'])]=deepcopy(body);return body
    monkeypatch.setattr(routes.modelo_repo,'salvar',save)
    monkeypatch.setattr(routes.modelo_repo,'obter',lambda ident,category:deepcopy(saved.get((category,ident))))
    monkeypatch.setattr(routes.modelo_repo,'listar',lambda category,*a,**kw:[deepcopy(v) for (k,_),v in saved.items() if k==category])
    monkeypatch.setattr(routes.modelo_repo,'excluir',lambda ident,category:saved.pop((category,ident),None) is not None)
    body={'id':'teste','nome':'Modelo de teste',key:[{'algoritmo_id':'OP-28','parametros':{'camada_id':'area'}}]}
    url=f'/api/geoespacial/{kind}'
    created=api_client.post(url,json=body)
    assert created.status_code==200,created.text
    body['nome']='Modelo editado'
    assert api_client.put(url+'/teste',json=body).status_code==200
    assert api_client.get(url+'/teste').json()['nome']=='Modelo editado'
    assert api_client.post(url+'/teste/validar').json()['valido']
    executed=api_client.post(url+'/teste/executar',json={})
    assert executed.status_code==200,executed.text
    assert executed.json()['resultados']
    output=executed.json()['resultados'][0]['camada_id']
    assert bancada.vectors[output].geometry.iloc[0].equals(Point(50,50))
    assert api_client.delete(url+'/teste').status_code==200
    assert api_client.get(url+'/teste').status_code==404


@pytest.mark.parametrize('operation',['OP-42','OP-43'])
def test_filtros_raster_nao_espalham_no_data(operation,bancada):
    bancada.rasters['r'][0,0]=np.nan
    result=asyncio.run(bancada.engine.execute(operation,{'raster_id':'r'}))
    data=bancada.rasters[result['raster_id']]
    assert np.isnan(data[0,0])
    assert np.isfinite(data[1,:]).all() and np.isfinite(data[0,1])


def test_distancia_em_metros_reprojeta_entrada_geografica(bancada):
    bancada.vectors['geo']=gpd.GeoDataFrame(geometry=[Point(-46,-23),Point(-45.99,-22.99)],crs=4326)
    result=asyncio.run(bancada.engine.execute('OP-10',{'camada_id':'geo','resolucao_distancia':100,'unidade_distancia':'metros'}))
    from pyproj import CRS
    assert CRS.from_user_input(bancada.profiles[result['raster_id']]['crs']).is_projected
    assert max(bancada.rasters[result['raster_id']].shape)>1


def test_rasterizacao_nao_perde_pontos_nos_extremos(bancada):
    result=asyncio.run(bancada.engine.execute('OP-08',{'camada_id':'points','resolucao_raster':25,'atributo_rasterizacao':'valor'}))
    data=bancada.rasters[result['raster_id']]
    assert data.sum()==10
    assert np.count_nonzero(data)==4


def test_atributos_incluem_geometria_da_pagina_em_wgs84(bancada, monkeypatch):
    from api.repositories import camada_geoespacial_repository
    monkeypatch.setattr(camada_geoespacial_repository, 'esta_homologada', lambda _: False)
    result = asyncio.run(geo.atributos_camada('points', limite=1, offset=2))
    row = result['registros'][0]
    assert row['_indice'] == 2
    assert row['__gp_feature']['id'] == '2'
    assert row['__gp_feature']['geometry']['type'] == 'Point'
    assert 0 < row['__gp_feature']['geometry']['coordinates'][0] < 0.001
    assert len(result['registros']) == 1


@pytest.fixture
def atributo_editavel(bancada, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repo
    from api.services import ciclo_vida_arquivos as ciclo
    monkeypatch.setattr(repo, 'esta_homologada', lambda _: False)
    monkeypatch.setattr(ciclo, 'exigir_editavel', lambda _: None)
    monkeypatch.setattr(geo, '_caminho_arquivo_da_camada', lambda _: None)
    monkeypatch.setattr(repo, 'substituir_vetor', lambda ident, frame, metadata: None)
    return bancada


def test_tabela_edita_e_exclui_com_revisao(atributo_editavel):
    body=asyncio.run(geo.tabela_atributos('points'))
    result=geo.salvar_edicoes_atributos('points', [{'indice':0,'campos':{'valor':99.}}], [1], body['revisao'])
    assert result['linhas_excluidas']==1
    assert geo._camadas['points']['valor'].tolist()==[99.,3.,4.]
    assert geo._camadas['points'].geometry.iloc[0].equals(Point(25,25))


def test_tabela_recusa_revisao_antiga_sem_alterar(atributo_editavel):
    before=geo._camadas['points'].copy()
    with pytest.raises(ValueError, match='mudou'):
        geo.salvar_edicoes_atributos('points', [], [0], 'antiga')
    assert geo._camadas['points'].equals(before)


def test_tabela_valida_tipos_antes_de_gravar(atributo_editavel):
    before=geo._camadas['points'].copy()
    with pytest.raises(ValueError, match='número'):
        geo.salvar_edicoes_atributos('points', [{'indice':0,'campos':{'valor':'invalido'}}])
    assert geo._camadas['points'].equals(before)


def test_tabela_nao_exclui_homologada(atributo_editavel, monkeypatch):
    from api.repositories import camada_geoespacial_repository as repo
    monkeypatch.setattr(repo, 'esta_homologada', lambda _: True)
    with pytest.raises(ValueError, match='homologada'):
        geo.salvar_edicoes_atributos('points', [], [0], geo.revisao_atributos(geo._camadas['points']))


def test_tabela_http_edita_exclui_e_recusa_revisao(api_client, atributo_editavel):
    url='/api/geoespacial/camadas/points/atributos'
    table=api_client.get(url+'/tabela')
    assert table.status_code==200
    payload={'edicoes':[{'indice':0,'campos':{'valor':12.}}], 'excluidos':[2], 'revisao':table.json()['revisao']}
    saved=api_client.post(url+'/salvar',json=payload)
    assert saved.status_code==200
    assert saved.json()['linhas_excluidas']==1
    assert api_client.post(url+'/salvar',json=payload).status_code==422
    assert len(api_client.get(url+'/tabela').json()['registros'])==3

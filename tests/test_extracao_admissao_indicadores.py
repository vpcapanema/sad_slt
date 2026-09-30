import csv
import io
import json

import geopandas as gpd
import pytest
from shapely.geometry import Point, box

from api.services import extracao_entrada_local as local
from api.services.extracao_atributos_estatisticas import enriquecer
from api.services.extracao_resultados_territoriais import da_saida, consultar


@pytest.mark.parametrize('geometry', [None, Point(), Point(float('inf'), 1)])
def test_validacao_recusa_registro_sem_geometria_e_identifica_fid(geometry):
    frame = gpd.GeoDataFrame({'codigo':['ok','erro']}, geometry=[Point(-46,-23),geometry], index=[10,42], crs=4674)
    with pytest.raises(ValueError, match=r'1 feição.*linha 2 .*42'):
        local.validar(frame)
    assert len(frame) == 2


def test_catalogo_bloqueia_antes_de_criar_tiles(monkeypatch):
    from api.services import extracao_preparacao as preparo
    from api.repositories import camada_geoespacial_repository as repo
    frame = gpd.GeoDataFrame(geometry=[Point(-46,-23),None],crs=4674)
    monkeypatch.setattr(repo,'carregar_vetor_bruto',lambda _: (frame,{'nome':'Base'}))
    monkeypatch.setattr(preparo,'representar',lambda *a: pytest.fail('Não deve gerar tiles'))
    with pytest.raises(ValueError, match='sem geometria utilizável'):
        preparo.preparar('base','autor')


@pytest.mark.parametrize('papel',['entrada','base'])
def test_compatibilizacao_revalida_original(monkeypatch,papel):
    from api.services.compatibilidade_espacial import conferir
    from api.services import municipal_layer
    frame = gpd.GeoDataFrame(geometry=[Point(-46,-23),None],crs=4674)
    monkeypatch.setattr(municipal_layer,'carregar_para_extracao',lambda _: frame)
    result = conferir([{'id':'a','papel':papel}],'estatisticas')
    assert not result['compativel']
    assert 'linha 2' in result['erros'][0]['motivo']


def test_upload_nao_admite_camada_com_registro_vazio():
    raw = json.dumps({'type':'FeatureCollection','features':[
        {'type':'Feature','properties':{'id':1},'geometry':{'type':'Point','coordinates':[-46,-23]}},
        {'type':'Feature','properties':{'id':2},'geometry':None}]}).encode()
    result = local.previa(raw,'entrada.geojson',dono_tiles='teste')
    assert result['resumo']['validas'] == 0
    assert result['camadas'][0]['status_validacao'] == 'invalida'


def test_tres_estados_borda_campos_e_precisao_csv(tmp_path):
    from api.services.extracao_atributos_exportacao import escrever_csv
    x,y=5000000,7500000
    entrada=gpd.GeoDataFrame({'valor':[1.123456789,0.000000123,2.0], 'intersecta_risco':['original']*3},
        geometry=[Point(x,y),Point(x+100,y),None],crs=5880)
    base=gpd.GeoDataFrame({'grau':['alto']},geometry=[box(x,y,x+10,y+10)],crs=5880)
    cats=[{'id':t,'nome':t,'camadas':[{'id':t,'nome':t,'frame':base,'regra':{}}]} for t in ['risco','restricao']]
    result=enriquecer(entrada,cats)
    rows=[]
    tables={}
    for name, frame in result['camadas'].items():
        rows.extend(frame.to_dict('records'))
        tables[name]=[{'ordem':i,'propriedades':row.drop(frame.geometry.name).to_dict()} for i,(_,row) in enumerate(frame.iterrows())]
        path=tmp_path/(name+'.csv')
        escrever_csv(frame,path)
        for row in csv.DictReader(io.StringIO(path.read_text(encoding='utf-8-sig')),delimiter=';'):
            expected=entrada.iloc[int(row['fid_origem'])].valor
            assert float(row['valor'].replace(',','.')) == expected
            assert row['intersecta_risco'] in ('sim','não','não avaliado')
    rows.sort(key=lambda r:r['fid_origem'])
    assert [r['intersecta_risco'] for r in rows] == ['sim','não','não avaliado']
    assert [r['intersecta_restricao'] for r in rows] == ['sim','não','não avaliado']
    assert rows[0]['risco_n_contato_borda'] == 1
    assert json.loads(rows[0]['risco_grau']) == ['alto']
    original=next(d['campo'] for d in result['dicionario'] if d.get('campo_origem')=='intersecta_risco')
    assert all(r[original]=='original' for r in rows)
    data=consultar(da_saida(tables))
    assert {str(r['fid']):r['estados']['risco'] for r in data['linhas']} == {'0':'com','1':'sem','2':'nao_avaliado'}


def test_gdal_fecha_explicitamente_sem_avisos():
    from api.services.extracao_ogr import SpatialJoin
    join=SpatialJoin([Point(1,1)])
    assert join.pairs([Point(1,1)]) == [(0,0)]
    join.close()
    join.close()
    assert join.dataset is None

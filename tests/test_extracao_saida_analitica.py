import json
import geopandas as gpd
import pytest
from shapely.geometry import Point, LineString, box
from api.services.extracao_atributos_estatisticas import enriquecer as join
from api.services.extracao_atributos_enriquecimento import enriquecer as identity
from api.services.extracao_resultados_territoriais import da_saida, consultar

X,Y=5_000_000,7_500_000


def tabelas(saida):
    return {name:[{'ordem':i,'propriedades':row.drop(frame.geometry.name).to_dict()}
                  for i,(_,row) in enumerate(frame.iterrows())] for name,frame in saida['camadas'].items()}


@pytest.mark.parametrize('motor',[join,identity])
def test_preserva_atributos_e_flags_independem_de_valores_nulos(motor):
    entrada=gpd.GeoDataFrame({'codigo':['001','002'],'risco':['original A','original B']},geometry=[Point(X+1,Y+1),Point(X+50,Y+50)],crs=5880)
    base=gpd.GeoDataFrame({'nome':[None],'restricao':['dado original']},geometry=[box(X,Y,X+10,Y+10)],crs=5880)
    cats=[{'id':t,'nome':t,'camadas':[{'id':t,'nome':t,'frame':base,'regra':{'prefixo':t}}]} for t in ['risco','restricao']]
    res=motor(entrada,cats)
    frame=res['camadas']['pontos']
    assert frame.risco.tolist()==[1,0] and frame.restricao.tolist()==[1,0]
    origem=next(d['campo'] for d in res['dicionario'] if d['tema']=='Entrada' and d['campo_origem']=='risco')
    assert frame[origem].tolist()==['original A','original B']
    assert json.loads(frame.iloc[0].risco_nome)==[None]
    # A leitura do painel não recebe entradas, bases nem relatório do algoritmo.
    snapshot=da_saida(tabelas(res))
    data=consultar(snapshot)
    assert data['resumo']=={'feicoes':2,'risco':1,'restricao':1,'areas':2}
    assert snapshot['areas']['risco:risco:0']['atributos']['nome'] is None
    assert snapshot['entradas'][0]['feicoes'][1]['flags']=={'risco':0,'restricao':0}


def test_flags_por_fragmento_do_identity_e_painel_da_saida():
    entrada=gpd.GeoDataFrame({'codigo':['L1']},geometry=[LineString([(X,Y+5),(X+20,Y+5)])],crs=5880)
    unidades=gpd.GeoDataFrame({'codigo':['A','B'],'campo_extra':[10,20]},geometry=[box(X,Y,X+10,Y+10),box(X+10,Y,X+20,Y+10)],crs=5880)
    risco=gpd.GeoDataFrame({'nome':['R']},geometry=[box(X,Y,X+5,Y+10)],crs=5880)
    res=identity(entrada,[{'id':'territorio','nome':'Território','camadas':[{'id':'u','nome':'U','frame':unidades,'regra':{'papel':'recorte','prefixo':'u','campos':['codigo']}}]},
                         {'id':'risco','nome':'Risco','camadas':[{'id':'r','nome':'R','frame':risco,'regra':{'prefixo':'r'}}]}])
    frame=res['camadas']['linhas']
    assert frame.risco.tolist()==[1,0]
    assert frame.u_campo_extra.tolist()==[10,20]
    assert 'restricao' not in frame
    assert consultar(da_saida(tabelas(res)))['resumo']['risco']==1


def test_categoria_nao_muda_agregacao_configurada():
    entrada=gpd.GeoDataFrame(geometry=[Point(X+1,Y+1)],crs=5880)
    base=gpd.GeoDataFrame({'valor':[2,4]},geometry=[box(X,Y,X+5,Y+5),box(X,Y,X+10,Y+10)],crs=5880)
    for categoria in ['risco','social']:
        res=join(entrada,[{'id':categoria,'nome':categoria,'camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b','estatisticas_campos':{'valor':'total'}}}]}])
        row=res['camadas']['pontos'].iloc[0]
        assert row.b_valor==6
        assert [p['atributos']['valor'] for p in json.loads(row.b_correspondencias)]==[2,4]


def test_endpoint_ignora_snapshot_antigo_quando_fonte_e_saida(monkeypatch):
    from api.services import extracao_atributos as service
    payload=json.dumps([{'base_id':'b','base':'Base','categoria_id':'risco','categoria':'Risco','tipo':'risco','espacial':True,'correspondencias':[]}])
    monkeypatch.setattr(service,'consultar',lambda *a,**k:{'status':'concluido','resultado':{'fonte_analitica':'camada_saida','intersecoes_territoriais':{'INVALIDO':True},'camadas':{'pontos':{'camada_resultado_id':'saida'}}}})
    monkeypatch.setattr(service.repo,'atributos_dashboard',lambda ident:[{'ordem':0,'propriedades':{'camada_origem':'D','fid_origem':0,'sicard_vinculos':payload,'risco':0}}])
    monkeypatch.setattr(service.repo,'geometrias_dashboard',lambda *a:[])
    result=service.intersecoes_resultado('execucao',object())
    assert result['fonte']=='camada_saida' and result['resumo']['risco']==0

def test_exportacao_e_dashboard_autossuficientes(tmp_path):
    from types import SimpleNamespace
    from api.services.extracao_atributos_pacote_enriquecimento import escrever_gpkg
    from api.services.extracao_atributos_dashboard import carregar
    entrada=gpd.GeoDataFrame({'codigo':['A','B']},geometry=[Point(X+1,Y+1),Point(X+50,Y+50)],crs=5880)
    base=gpd.GeoDataFrame({'nome':[None]},geometry=[box(X,Y,X+10,Y+10)],crs=5880)
    res=join(entrada,[{'id':'risco','nome':'Risco','camadas':[{'id':'r','nome':'R','frame':base,'regra':{'prefixo':'r'}}]}])
    path=tmp_path/'saida.gpkg'
    escrever_gpkg(res['camadas'],entrada,res['dicionario'],path,preservar_geometrias=True,incluir_entrada=False)
    frame=gpd.read_file(path,layer='pontos')
    assert frame.risco.tolist()==[1,0]
    assert json.loads(frame.iloc[0].sicard_vinculos)[0]['correspondencias'][0]['atributos']['nome'] is None
    loaded=[{'ordem':i,'propriedades':row.drop(frame.geometry.name).to_dict()} for i,(_,row) in enumerate(frame.iterrows())]
    def proibido():
        raise AssertionError('Não deve consultar conceitos fora da saída')
    result=carregar('id',object(),'pontos',consultar=lambda *a,**k:{'status':'concluido','resultado':{
        'modo':'enriquecimento','fonte_analitica':'camada_saida','camadas':{'pontos':{'camada_resultado_id':'saida'}}}},
        repo=SimpleNamespace(atributos_dashboard=lambda _:loaded,geometrias_dashboard=lambda *a:[]),
        carregar_conceitos=proibido,representar_mapa=proibido)
    assert result['conceito_origem']=='Conceitos preservados na camada de saída'
    assert result['linhas']

import io
import json
import zipfile
import geopandas as gpd
import pytest
from shapely.geometry import Point, LineString, box
from api.services.extracao_lote import entradas_do_lote, executar
from api.services.extracao_saida_analitica import snapshot_saida
from api.services.extracao_resultados_territoriais import consultar
from api.services.extracao_identificacao import inspecionar

X,Y=5_000_000,7_500_000

def dados():
    points=gpd.GeoDataFrame({'cod_demanda':['A','A','A','B'],'tipo':['Escola','Escola','Hospital','Hospital']},
        geometry=[Point(X+1,Y+1),Point(X+2,Y+2),Point(X+50,Y+50),Point(X+3,Y+3)],crs=5880)
    lines=gpd.GeoDataFrame({'cod_demanda':['A']},geometry=[LineString([(X,Y+5),(X+20,Y+5)])],crs=5880)
    polygons=gpd.GeoDataFrame({'cod_demanda':['P']},geometry=[box(X,Y,X+20,Y+10)],crs=5880)
    bases=gpd.GeoDataFrame({'nome':['Área X','Área Y'],'classe':['Alta','Baixa'],'codigo':[12,42]},geometry=[box(X,Y,X+5,Y+10),box(X+5,Y,X+10,Y+10)],crs=5880)
    cats=[{'id':'restricao','nome':'Restrição','camadas':[{'id':'base','nome':'Elementos','frame':bases,'regra':{}}]},
          {'id':'social','nome':'Social','camadas':[{'id':'social','nome':'Indicadores','frame':bases,'regra':{}}]}]
    entries=[{'id':str(i),'nome':name,'frame':df,'config':{'campo_id':'cod_demanda','identificacao_confirmada':True,
        'categoria_pontos':'tipo' if i==0 else None,'operacao':'enriquecimento' if i==1 else 'estatisticas','camada_recorte':'base'}}
        for i,(name,df) in enumerate([('Pontos',points),('Linhas',lines),('Áreas',polygons)])]
    return entries,cats

def test_sugestao_nao_confirma_e_repeticoes_agrupam():
    entries,_=dados()
    info=inspecionar(entries[0]['frame'])
    assert info['sugestao']=='cod_demanda'
    c=next(c for c in info['campos'] if c['nome']=='cod_demanda')
    assert c['distintos']==2 and c['repetidos']==2
    entries[0]['config']['identificacao_confirmada']=False
    with pytest.raises(ValueError,match='confirme'):entradas_do_lote(entries)

def test_lote_metricas_ranking_e_pacotes(tmp_path):
    from api.services.extracao_atributos_pacote_enriquecimento import montar_lote
    entries,cats=dados()
    res=executar(entradas_do_lote(entries),cats,'estatisticas',lambda _:None)
    assert len(res['individuais'])==3
    assert len(res['camadas']['entrada_1_pontos'])==4
    snap=snapshot_saida(res['camadas'])
    data=consultar(snap)
    assert data['resumo']['feicoes']==4 # dois códigos em pontos, um em linhas e um em polígonos
    a=next(i for i in data['linhas'] if i['entrada']=='Pontos' and i['identificador']=='A')
    assert a['contagens']['restricao']==1
    rel=a['relacoes']['restricao:base:0']
    assert rel['pontos']==2 and rel['por_categoria']['Escola']==2
    assert rel['percentual_entrada']==pytest.approx(200/3)
    line=next(i for i in data['linhas'] if i['entrada']=='Linhas')
    assert line['contagens']['restricao']==2
    assert line['relacoes']['restricao:base:0']['comprimento_m']==pytest.approx(5)
    assert line['relacoes']['restricao:base:0']['percentual_entrada']==pytest.approx(25,abs=0.001)
    poly=next(i for i in data['linhas'] if i['entrada']=='Áreas')
    assert poly['relacoes']['restricao:base:0']['area_m2']==pytest.approx(50)
    assert poly['relacoes']['restricao:base:0']['perimetro_m']==pytest.approx(30)
    assert data['rankings']['restricao'][0]['ocorrencias']==2
    assert data['rankings']['restricao'][0]['posicao']==data['rankings']['restricao'][1]['posicao']==1
    conteudo,_,manifest=montar_lote(res,{'execucao_id':'teste'},'Teste')
    with zipfile.ZipFile(io.BytesIO(conteudo)) as pacote:
        assert len([n for n in pacote.namelist() if n.endswith('.gpkg')])==3
        assert 'unificado/demandas.csv' in pacote.namelist()
        for item in res['individuais']:
            member=next(m['nome'] for m in manifest if m['chave']==item['chave'])
            with zipfile.ZipFile(io.BytesIO(pacote.read(member))) as individual:
                gpkg=next(n for n in individual.namelist() if n.endswith('.gpkg'))
                path=tmp_path/(item['chave']+'.gpkg');path.write_bytes(individual.read(gpkg))
                df=gpd.read_file(path,layer=item['camadas'][0])
                assert df['camada_origem'].nunique()==1
                assert len(gpd.read_file(path,layer='elementos_relacionados'))>0

def test_separa_componentes_de_arquivo_sem_perder_atributos():
    from api.services.extracao_entrada_local import _agrupar_vetores
    entries,_=dados()
    met=lambda name,df:{'camada':name,'nome_camada':name,'vertices':4,'crs':'EPSG:5880','area_km2':0,'comprimento_km':0}
    frame,_=_agrupar_vetores([(e['frame'],met(e['nome'],e['frame'])) for e in entries],'pacote.gpkg')
    configs={e['nome']:e['config'] for e in entries}
    result=entradas_do_lote([{'id':'local:arquivo','nome':'pacote.gpkg','frame':frame,'config':{'camadas':configs}}])
    assert len(result)==3
    assert [len(e['frame']) for e in result]==[4,1,1]
    assert 'tipo' not in result[1]['frame']

def test_download_individual_exige_execucao_autorizada(monkeypatch):
    from contextlib import contextmanager
    from api.services import extracao_atributos as service
    memory=io.BytesIO()
    with zipfile.ZipFile(memory,'w') as z:z.writestr('entrada_1/pontos.zip',b'zip individual')
    calls=[]
    monkeypatch.setattr(service,'consultar',lambda ident,user: calls.append((ident,user)) or {'id':'execucao'})
    class Conn:
        def execute(self,*args):return self
        def fetchone(self):return {'pacote':memory.getvalue(),'pacote_nome':'lote.zip','pacote_arquivos':[{'chave':'entrada_1','nome':'entrada_1/pontos.zip'}]}
    @contextmanager
    def connection():yield Conn()
    monkeypatch.setattr(service,'get_connection',connection)
    assert service.arquivo_do_pacote('execucao','usuario','entrada_1')==(b'zip individual','entrada_1/pontos.zip')
    assert calls==[('execucao','usuario')]
    with pytest.raises(LookupError):service.arquivo_do_pacote('execucao','usuario','../entrada_1')

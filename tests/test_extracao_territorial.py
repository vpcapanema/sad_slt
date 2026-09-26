"""Relações espaciais verificáveis, sem inferência de risco ou impedimento."""
import geopandas as gpd
from shapely.geometry import Point, box
from api.services.extracao_intersecoes_territoriais import registrar
from api.services.extracao_resultados_territoriais import consultar, legado


def snapshot():
    entrada = gpd.GeoDataFrame({'codigo':['A','A','B','C']},geometry=[Point(1,1),Point(4,4),Point(20,20),None],crs=5880)
    risco = gpd.GeoDataFrame({'nome':['Inundação','Encosta']},geometry=[box(0,0,2,2),box(1,1,5,5)],crs=5880)
    restricao = gpd.GeoDataFrame({'nome':['Área protegida']},geometry=[box(3,3,6,6)],crs=5880)
    return registrar([{'nome':'Demandas','frame':entrada,'config':{'campo_id':'codigo'}},
                      {'nome':'Outra entrada','frame':entrada.iloc[:1],'config':{'campo_id':'codigo'}}],
                     [{'id':'risco','nome':'Risco','camadas':[{'id':'r','nome':'Riscos','frame':risco}]},
                      {'id':'restricao','nome':'Restrição','camadas':[{'id':'s','nome':'Restrições','frame':restricao}]}])


def test_pares_originais_borda_multiplas_areas_e_ids_repetidos():
    saved=snapshot()
    features=saved['entradas'][0]['feicoes']
    assert features[0]['areas']==['risco:r:0','risco:r:1']  # inclui contato na borda
    assert features[1]['areas']==['risco:r:1','restricao:s:0']
    assert features[2]['areas']==[]
    assert saved['areas']['risco:r:0']['atributos']=={'nome':'Inundação'}
    assert len(saved['areas'])==3
    data=consultar(saved)
    assert data['resumo']=={'feicoes':5,'risco':3,'restricao':1,'areas':3}
    assert len({i['chave'] for i in data['linhas']})==5
    states={i['fid']:i['estados'] for i in data['linhas'] if i['entrada']=='Demandas'}
    assert states[2]=={'risco':'sem','restricao':'sem'}
    assert states[3]=={'risco':'nao_informado','restricao':'nao_informado'}
    assert consultar(saved,entrada='Demandas',categoria='risco',situacao='com')['total']==2
    assert consultar(saved,busca='Inundação')['total']==2
    assert consultar(saved,base='restricao:s')['total']==1
    page=consultar(saved,tamanho=1,pagina=1)
    assert len(page['linhas'])==1 and page['resumo']==data['resumo']


def test_filtro_preserva_posicao_original_e_nao_inventa_areas_para_pontos():
    frame=gpd.GeoDataFrame({'id':['a','b']},geometry=[Point(0,0),Point(10,10)],crs=5880)
    saved=registrar([{'nome':'Entrada','frame':frame,'config':{'campo_id':'id','filtro':{'campo':'id','operador':'igual','valor':'b'}}}],
                    [{'id':'risco','nome':'Risco','camadas':[{'id':'p','nome':'Pontos','frame':frame}]}])
    assert saved['entradas'][0]['feicoes'][0]['fid']==1
    data=consultar(saved)
    assert data['resumo']['risco'] is None and data['resumo']['restricao'] is None
    assert data['grafico'][0]['feicoes'] is None
    assert data['linhas'][0]['estados']=={'risco':'nao_informado','restricao':'nao_avaliado'}


def test_legado_deduplica_saidas_e_nao_trata_ligacao_por_atributo_como_intersecao():
    fields=[{'camada':'linhas','tema':'Risco','base':'Riscos','campo':'n','regra':'Contagem espacial de feições','apelido':'Riscos · nº de feições intersectadas'},
            {'camada':'linhas','tema':'Restrição','base':'Restrições','campo':'n2','regra':'atributo (id)','apelido':'Restrições · nº de feições tocadas'}]
    rows=[{'ordem':i,'propriedades':{'camada_origem':'Entrada','fid_origem':0,'id_origem':'A','n':1,'n2':1}} for i in range(2)]
    saved=legado({'dicionario':fields},{'linhas':rows})
    data=consultar(saved)
    assert data['total']==1
    assert data['linhas'][0]['estados']=={'risco':'com','restricao':'nao_informado'}
    assert data['areas']=={} and data['resumo']['areas'] is None
    assert data['resumo']['restricao'] is None
    assert len(data['linhas'][0]['_mapa'])==2


def test_relatorio_anterior_preserva_identidade_da_area_sem_reler_base():
    result={'input_nome':'Entrada','categorias':[{'id':'risco','nome':'Risco','camadas':[
        {'id':'r','nome':'Riscos','ocorrencias':[{'input_id':'0','feicao_base_id':'7','dimensao':0,
          'dentro':True,'atributos':{'nome':'Área A'},'atributos_input':{'nome':'Ponto A'}}]}]}]}
    saved=legado(result,{'resultado':[{'ordem':1,'propriedades':{'fid_entrada':0}}]})
    data=consultar(saved)
    assert data['linhas'][0]['estados']['risco']=='com'
    assert list(data['areas'].values())[0]['atributos']=={'nome':'Área A'}
    assert data['linhas'][0]['atributos']=={'nome':'Ponto A'}


def test_comparacao_de_snapshot_anterior_conta_elementos_sem_duplicar():
    saved = snapshot()
    # Arquivos anteriores não contêm contagens pré-calculadas.
    feature = saved['entradas'][0]['feicoes'][0]
    feature['areas'].append(feature['areas'][0])
    data = consultar(saved)
    first = next(i for i in data['linhas'] if i['entrada'] == 'Demandas' and i['fid'] == 0)
    assert first['contagens']['risco'] == 2
    assert data['rankings']['risco'][0]['ocorrencias'] == 2
    assert data['rankings']['risco'][0]['posicao'] == 1

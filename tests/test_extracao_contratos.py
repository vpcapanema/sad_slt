"""Contratos da bancada: autenticação, seleção exata e saídas paginadas."""
from types import SimpleNamespace
from uuid import uuid4

import geopandas as gpd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from shapely.geometry import Point

from api.deps.auth import require_geospatial_access
from api.routers import extracao_atributos as routes
from api.services import configuracao_bancada as config
from api.services import extracao_atributos as service


def test_identificador_longo_e_entradas_invalidas():
    payload = dict(input_id='storage:base-geoespacial/'+'a'*150+'.gpkg::entrada',
                   categorias=[{'id':'ambiental','camadas':['base']}])
    assert routes.Extracao(**payload,operacao='intersection').input_id == payload['input_id']
    with pytest.raises(ValidationError, match='duas vezes'):
        routes.Extracao(**payload,operacao='enriquecimento',entradas=[{'id':'a'},{'id':'a'}])
    with pytest.raises(ValidationError, match='exigem'):
        routes.Extracao(**payload,operacao='intersection',entradas=[{'id':'a'}])
    with pytest.raises(ValidationError, match='Selecione'):
        routes.ArquivoMapa()


def test_visualizacao_banco_usa_id_exato_e_preserva_atributos(monkeypatch):
    frame=gpd.GeoDataFrame({'nome':['Água'], 'campo_nulo':[None]},geometry=[Point(-47,-23)],crs=4674)
    calls=[]
    monkeypatch.setattr(service.repo,'carregar_vetor',lambda ident:(calls.append(ident) or frame,{'nome':'Camada escolhida'}))
    response=routes.arquivo_mapa(routes.ArquivoMapa(id='camada_exata',arquivo='arquivo_com_outra_versao.gpkg'))
    assert calls==['camada_exata']
    assert response['geojson']['features'][0]['properties']=={'nome':'Água','campo_nulo':None}
    assert response['origem_geometria']=='banco'
    assert {c['nome'] for c in response['campos']}=={'nome','campo_nulo'}


@pytest.mark.parametrize('modo,camada,resultado',[
    ('intersection','resultado',{'camada_resultado_id':'saida'}),
    ('enriquecimento','linhas',{'modo':'enriquecimento','camadas':{'linhas':{'camada_resultado_id':'saida'}}})])
def test_tabela_so_consulta_saida_da_execucao(monkeypatch,modo,camada,resultado):
    user=object();ident=uuid4();calls=[]
    def consultar(i,u,completo=False):
        assert i==ident and u is user and completo
        return {'status':'concluido','resultado':resultado}
    monkeypatch.setattr(service,'consultar',consultar)
    monkeypatch.setattr(service.repo,'atributos_paginados',lambda *args:calls.append(args) or {'campos':['valor'],'linhas':[{'valor':1}],'total':101})
    assert service.tabela_resultado(ident,user,camada,100,100)['linhas']==[{'valor':1}]
    assert calls==[('saida',100,100)]
    with pytest.raises(LookupError,match='nesta extração'):
        service.tabela_resultado(ident,user,'camada_alheia')
    assert len(calls)==1
    def denied(*args,**kwargs):
        raise LookupError('Extração não encontrada para esta sessão.')
    monkeypatch.setattr(service,'consultar',denied)
    with pytest.raises(LookupError,match='sessão'):
        service.tabela_resultado(ident,user,camada)
    assert len(calls)==1


def test_rota_tabela_paginacao_e_sessao(monkeypatch):
    app=FastAPI();app.include_router(routes.router)
    with TestClient(app) as client:
        path=f'/extracao-atributos/execucoes/{uuid4()}/tabela'
        assert client.get(path).status_code==401
        app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
        monkeypatch.setattr(service,'tabela_resultado',lambda *a:{'campos':[],'linhas':[],'total':0})
        assert client.get(path).status_code==200
        for params in ['offset=-1','limite=0','limite=1001']:
            assert client.get(path+'?'+params).status_code==422


def test_configuracao_preserva_analise_completa(tmp_path,monkeypatch):
    monkeypatch.setattr(config,'raiz',lambda:tmp_path)
    monkeypatch.setattr(service,'catalogo',lambda:{'categorias':[{'id':'ambiental','nome':'Ambiental'}],
        'camadas':[{'id':i,'nome':i} for i in ['entrada','base']]})
    config.salvar('Análise completa',[{'id':'ambiental','camadas':['base']}],SimpleNamespace(id='teste'),
        entradas=[{'id':'entrada'}],operacao='identity',opcoes={'pretestar_continencia':True},nome_saida='Resultado conferido')
    saved=config.carregar('analise-completa')
    assert saved['operacao']=='identity' and saved['opcoes']['pretestar_continencia']
    assert saved['nome_saida']=='Resultado conferido' and saved['entradas'][0]['id']=='entrada'
    with pytest.raises(ValueError,match='também uma base'):
        config.salvar('Inválida',[{'id':'ambiental','camadas':['base']}],None,entradas=[{'id':'base'}])


def test_visualizacao_municipal_usa_arquivo_materializado(monkeypatch):
    from api.services import municipal_layer
    vazio=gpd.GeoDataFrame(geometry=[],crs=4674)
    materializado=gpd.GeoDataFrame({'CD_MUN':['3550308']},geometry=[Point(-46.6,-23.5)],crs=4674)
    monkeypatch.setattr(service.repo,'carregar_vetor',lambda ident:(vazio,{'nome':'Municipal','metadados':{'origem':'municipal-layer'}}))
    calls=[]
    monkeypatch.setattr(municipal_layer,'carregar_para_extracao',lambda ident:calls.append(ident) or materializado)
    result=service.camada_para_mapa('municipal_exata')
    assert calls==['municipal_exata']
    assert result['geojson']['features'][0]['properties']['CD_MUN']=='3550308'


def test_configuracao_municipal_preserva_referencia_e_indica_ausencia(tmp_path,monkeypatch):
    monkeypatch.setattr(config,'raiz',lambda:tmp_path)
    catalog={'categorias':[{'id':'social','nome':'Social'}], 'camadas':[
        {'id':'municipal','nome':'Municípios','origem':'municipal-layer',
         'arquivo':'data/geoespacial/uploads/datastorage/vetor/municipios_sp_teste/base.fgb'}]}
    monkeypatch.setattr(service,'catalogo',lambda:catalog)
    saved=config.salvar('Municipal',[{'id':'social','camadas':['municipal']}],SimpleNamespace(id='teste'))
    assert saved['camadas']==1 and saved['camadas_ignoradas']==0
    loaded=config.carregar('municipal')
    assert loaded['categorias'][0]['camadas'][0]['id']=='municipal'
    assert not list(tmp_path.glob('*.tmp'))
    catalog['camadas']=[]
    assert config.carregar('municipal')['ausentes']==['Municípios']


def test_falha_na_gravacao_preserva_configuracao_anterior(tmp_path,monkeypatch):
    monkeypatch.setattr(config,'raiz',lambda:tmp_path)
    monkeypatch.setattr(config,'montar',lambda *a,**k:{'nome':'Anterior'})
    original=config.arquivo('anterior');original.write_text('conteudo anterior')
    def fail(*args):
        raise OSError('disco indisponivel')
    monkeypatch.setattr(config.os,'replace',fail)
    with pytest.raises(OSError):
        config.salvar('Anterior',[],None)
    assert original.read_text()=='conteudo anterior'
    assert not list(tmp_path.glob('*.tmp'))


def test_categorias_municipais_independem_do_storage(monkeypatch):
    from api.routers.municipal_layer import router
    from api.services import municipal_layer
    app=FastAPI();app.include_router(router)
    with TestClient(app) as client:
        assert client.get('/municipal/categorias').status_code==401
        app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
        monkeypatch.setattr(municipal_layer,'categorias',lambda:[{'id':'social','nome':'Social'}])
        def forbidden():
            raise AssertionError('Não deve listar camadas para escolher uma categoria')
        monkeypatch.setattr(service,'catalogo',forbidden)
        assert client.get('/municipal/categorias').json()=={'categorias':[{'id':'social','nome':'Social'}]}


def test_execucao_exige_entrada_base_e_algoritmo_mas_nome_e_opcional():
    valido={'input_id':'entrada','operacao':'estatisticas','categorias':[{'id':'social','camadas':['base']}]}
    assert routes.Extracao(**valido).nome_saida==''
    for campo in ['input_id','operacao','categorias']:
        with pytest.raises(ValidationError):
            routes.Extracao(**{k:v for k,v in valido.items() if k!=campo})
    with pytest.raises(ValidationError):
        routes.Extracao(**{**valido,'categorias':[{'id':'social','camadas':[]}]})


def test_intersecoes_snapshot_e_autorizacao(monkeypatch):
    user=object(); ident=uuid4()
    saved={'versao':1,'entradas':[],'bases':[],'areas':{}}
    def allowed(i,u,completo=False):
        assert i==ident and u is user and completo
        return {'status':'concluido','resultado':{'intersecoes_territoriais':saved}}
    monkeypatch.setattr(service,'consultar',allowed)
    def forbidden(*args):
        raise AssertionError('Snapshot não deve reler bases ou saídas atuais')
    monkeypatch.setattr(service.repo,'atributos_dashboard',forbidden)
    assert service.intersecoes_resultado(ident,user)['total']==0
    def denied(*args,**kwargs):
        raise LookupError('Extração não encontrada para esta sessão.')
    monkeypatch.setattr(service,'consultar',denied)
    with pytest.raises(LookupError,match='sessão'):
        service.intersecoes_resultado(ident,user)


def test_rota_intersecoes_exige_sessao_e_valida_filtros(monkeypatch):
    app=FastAPI();app.include_router(routes.router)
    with TestClient(app) as client:
        path=f'/extracao-atributos/execucoes/{uuid4()}/intersecoes'
        assert client.post(path,json={}).status_code==401
        app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='teste')
        monkeypatch.setattr(service,'intersecoes_resultado',lambda *a,**k:{'total':0})
        response=client.post(path,json={})
        assert response.status_code==200 and response.headers['cache-control']=='no-store'
        assert client.post(path,json={'categoria':'social','atributo':'nome'}).status_code==200
        for body in [{'pagina':-1},{'categoria':'x'*501},{'situacao':'provavel'}]:
            assert client.post(path,json=body).status_code==422


def test_configuracoes_api_isola_escopos(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(config, 'raiz', lambda: tmp_path)
    for escopo in ['analise', 'bases']:
        config.arquivo('comum', escopo).write_text(json.dumps({
            'versao':5, 'escopo':escopo, 'nome':escopo, 'categorias':[]}))
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='teste')
    with TestClient(app) as client:
        base = '/extracao-atributos/configuracoes'
        for escopo, diretorio in [('bases','config-lista-camadas-base'), ('analise','config-analise')]:
            response = client.get(base, params={'escopo':escopo})
            assert response.status_code == 200
            assert response.json()['pasta'].endswith('/' + diretorio)
            assert [item['nome'] for item in response.json()['configuracoes']] == [escopo]
            response = client.get(base+'/comum', params={'escopo':escopo, 'lista':'true'})
            assert response.status_code == 200 and response.json()['nome'] == escopo
        assert client.get(base, params={'escopo':'../fora'}).status_code == 422
        assert client.delete(base+'/comum', params={'escopo':'bases'}).status_code == 204
        assert config.arquivo('comum').is_file()
        assert client.get(base+'/comum', params={'escopo':'bases'}).status_code == 404

"""Upload em RAM, isolamento de persistência e uso da entrada pelos motores."""
import base64
import io
import json
from pathlib import Path
from types import SimpleNamespace
from zipfile import ZipFile

import geopandas as gpd
import pytest
from osgeo import gdal
from shapely.geometry import Point

from api.services import extracao_entrada_local as local


def geojson():
    return json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'codigo':'001','valor':0},
        'geometry':{'type':'Point','coordinates':[-46.63,-23.55]}}]}).encode()


def test_geojson_lido_sem_disco_preserva_atributos_e_crs(monkeypatch):
    antes = set(gdal.ReadDir('/vsimem') or [])
    def negar(*a, **kw): raise AssertionError('Não pode gravar arquivo')
    monkeypatch.setattr(Path, 'write_bytes', negar)
    frame, meta = local.ler(geojson(), 'pontos.geojson')
    assert len(frame)==1 and frame.iloc[0]['codigo']=='001' and frame.iloc[0]['valor']==0
    assert frame.crs.to_epsg()==4326 and meta['bytes']==len(geojson())
    assert meta['feicoes']==1 and meta['formato']=='GeoJSON'
    assert set(gdal.ReadDir('/vsimem') or [])==antes


def test_previa_nao_cadastra_camada(monkeypatch):
    monkeypatch.setattr(local, 'localizacao', lambda f: {'ufs':['SP'],'municipios':[{'nm_mun':'São Paulo','cd_mun':'3550308','sigla_uf':'SP'}]})
    from api.services.geoespacial_service import geoespacial_service as geo
    monkeypatch.setattr(geo, 'registrar_camada', lambda *a,**kw: pytest.fail('Upload não cadastra camada'))
    resultado=local.previa(geojson(),'pontos.geojson')
    assert resultado['origem']=='local' and resultado['id'].startswith('local:')
    assert resultado['metadados_local']['localizacao']['ufs']==['SP']
    assert resultado['geojson']['features'][0]['properties']['codigo']=='001'


def zip_bytes(itens):
    stream=io.BytesIO()
    with ZipFile(stream,'w') as z:
        for nome,conteudo in itens.items():z.writestr(nome,conteudo)
    return stream.getvalue()


@pytest.mark.parametrize('nome,conteudo,trecho', [
    ('arquivo.txt', b'a', 'Use GeoPackage'), ('a.zip', b'lixo', 'descompactar'),
    ('a.zip', zip_bytes({'../f.geojson':geojson()}), 'caminho'),
    ('a.zip', zip_bytes({'base.shp':b'dummy'}), 'incompleto'),
    ('a.geojson', b'invalido', 'GeoJSON'),
    ('a.geojson', b'{"type":"FeatureCollection","features":[]}', 'entre 1'),
    ('a.shp', b'a', 'em ZIP'),
])
def test_arquivo_invalido_nao_produz_previa(nome,conteudo,trecho):
    antes=set(gdal.ReadDir('/vsimem') or [])
    with pytest.raises(ValueError,match=trecho):local.ler(conteudo,nome)
    assert set(gdal.ReadDir('/vsimem') or [])==antes


def test_zip_multicamadas_exige_escolha():
    data=zip_bytes({'a.geojson':geojson(),'sub/b.geojson':geojson()})
    frame, escolha=local.ler(data,'camadas.zip')
    assert frame is None and len(escolha['camadas'])==2
    frame,meta=local.ler(data,'camadas.zip',escolha['camadas'][1]['chave'])
    assert len(frame)==1 and meta['componente']=='sub/b.geojson'


@pytest.mark.parametrize('formato,sufixo', [('GPKG','gpkg'),('FlatGeobuf','fgb'),('ESRI Shapefile','shp')])
def test_formatos_reais_e_shapefile_compactado(tmp_path,formato,sufixo):
    entrada=gpd.GeoDataFrame({'codigo':['001'],'valor':[0]},geometry=[Point(333287,7394586)],crs=31983)
    caminho=tmp_path/f'entrada.{sufixo}'
    entrada.to_file(caminho,driver=formato,engine='pyogrio')
    data=zip_bytes({p.name:p.read_bytes() for p in tmp_path.iterdir()}) if sufixo=='shp' else caminho.read_bytes()
    frame,meta=local.ler(data,'entrada.zip' if sufixo=='shp' else caminho.name)
    assert frame.crs.to_epsg()==31983 and meta['unidade']=='metre'
    assert frame.iloc[0]['codigo']=='001' and frame.geometry.iloc[0].equals(entrada.geometry.iloc[0])


def test_limites_upload_zip_e_coordenadas(monkeypatch):
    monkeypatch.setattr(local,'MAX_ARQUIVO',1)
    with pytest.raises(ValueError,match='16 MB'):local.ler(geojson(),'p.geojson')
    monkeypatch.setattr(local,'MAX_ARQUIVO',16*1024*1024)
    monkeypatch.setattr(local,'MAX_DESCOMPACTADO',1)
    with pytest.raises(ValueError,match='descompactados'):local.ler(zip_bytes({'p.geojson':geojson()}),'p.zip')
    with pytest.raises(ValueError,match='CRS declarado'):
        local.ler(geojson().replace(b'-46.63',b'9999.0'),'p.geojson')


def test_reenvio_revalida_sem_dependencia_de_worker():
    frame,meta=local.restaurar({'nome':'entrada.geojson','conteudo_base64':base64.b64encode(geojson()).decode()})
    assert len(frame)==1 and meta['sha256']
    with pytest.raises(ValueError):local.restaurar({'nome':'entrada.geojson','conteudo_base64':'not base64'})


def test_iniciar_passa_frame_so_para_thread_nunca_parametros_persistidos(monkeypatch):
    from api.services import extracao_atributos as service
    monkeypatch.setattr(service,'catalogo',lambda:{'camadas':[{'id':'b','nome':'Base'}],'categorias':[{'id':'social','nome':'Social'}]})
    gravado=[];tarefas=[]
    monkeypatch.setattr(service.ciclo,'iniciar',lambda *args: gravado.append(args) or 'exec-local')
    monkeypatch.setattr(service._pool,'submit',lambda *args:tarefas.append(args))
    pedido={'input_id':'local:teste','operacao':'estatisticas','categorias':[{'id':'social','camadas':['b']}],
            'arquivo_local':{'nome':'entrada.geojson','conteudo_base64':base64.b64encode(geojson()).decode()}}
    service.iniciar(pedido,SimpleNamespace(id='usuario'))
    params=gravado[0][1]
    assert 'arquivo_local' not in params and 'conteudo_base64' not in json.dumps(params)
    assert params['entrada_local']['feicoes']==1
    assert len(tarefas[0])==4 and isinstance(tarefas[0][3],gpd.GeoDataFrame)


def test_pacote_nao_inclui_entrada_temporaria(tmp_path):
    import pyogrio
    from api.services.extracao_atributos_pacote_enriquecimento import montar_pacote
    frame,_=local.ler(geojson(),'p.geojson')
    pacote,_,itens=montar_pacote({'pontos':frame},frame,[],{},'Resultado',incluir_entrada=False)
    with ZipFile(io.BytesIO(pacote)) as z:
        path=tmp_path/'r.gpkg';path.write_bytes(z.read(itens[0]['nome']))
    assert list(pyogrio.list_layers(path)[:,0])==['pontos']


def test_endpoint_auth_validacao_e_nao_cache(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.extracao_atributos import router
    from api.deps.auth import require_geospatial_access
    app=FastAPI();app.include_router(router)
    with TestClient(app) as client:
        assert client.post('/extracao-atributos/entrada-local?nome=p.geojson',content=geojson()).status_code==401
    app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='u')
    monkeypatch.setattr(local,'localizacao',lambda f:{'status':'consultado','ufs':[],'municipios':[]})
    with TestClient(app) as client:
        result=client.post('/extracao-atributos/entrada-local?nome=p.geojson',content=geojson())
        assert result.status_code==200 and result.headers['cache-control']=='no-store'
        assert result.json()['metadados_local']['feicoes']==1
        assert client.post('/extracao-atributos/entrada-local?nome=a.zip',content=b'bad').status_code==422


def test_kml_kmz_e_ausencia_de_crs(tmp_path):
    kml=b'''<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Teste</name><Point><coordinates>-46.63,-23.55,0</coordinates></Point></Placemark></Document></kml>'''
    for nome,conteudo in [('p.kml',kml),('p.kmz',zip_bytes({'doc.kml':kml}))]:
        frame,meta=local.ler(conteudo,nome)
        assert len(frame)==1 and frame.crs.to_epsg()==4326
    frame=gpd.GeoDataFrame({'id':[1]},geometry=[Point(1,2)])
    path=tmp_path/'sem.gpkg';frame.to_file(path,driver='GPKG')
    # GDAL identifica a ausência por um sistema indefinido, sem autoridade EPSG.
    with pytest.raises(ValueError):local.ler(path.read_bytes(),path.name)


def test_api_recusa_upload_grande_e_reenvio_sem_arquivo(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.extracao_atributos import router, Extracao
    from api.deps.auth import require_geospatial_access
    app=FastAPI();app.include_router(router);app.dependency_overrides[require_geospatial_access]=lambda:SimpleNamespace(id='u')
    monkeypatch.setattr(local,'MAX_ARQUIVO',3)
    with TestClient(app) as client:
        assert client.post('/extracao-atributos/entrada-local?nome=p.geojson',content=b'1234').status_code==413
    with pytest.raises(ValueError,match='arquivo em memória'):
        Extracao(input_id='local:x',categorias=[{'id':'social','camadas':['b']}])

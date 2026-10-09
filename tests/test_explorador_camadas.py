from io import BytesIO
from zipfile import ZipFile
from hashlib import sha256
from pathlib import Path
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from api.server import app
from api.services import explorador_camadas as explorer, storage_geoespacial as storage
from api.services.session_service import SessionUser, create_token, cookie_name

USER=SessionUser(id='00000000-0000-0000-0000-000000000021',email='teste@example.org',username='teste_operador',nome='Teste',tipo_usuario='OPERADOR')

@pytest.fixture
def client():
    c=TestClient(app);c.cookies.set(cookie_name(),create_token(USER));return c

@pytest.fixture
def mounted(tmp_path,monkeypatch):
    (tmp_path/'base-geoespacial/vetor').mkdir(parents=True)
    monkeypatch.setattr(storage,'diretorio_storage',lambda:tmp_path)
    return tmp_path


def test_root_hub_and_auth(client):
    assert TestClient(app).get('/api/geoespacial/explorador/navegar').status_code==401
    items=client.get('/api/geoespacial/explorador/navegar').json()['itens']
    assert [x['nome'] for x in items]==['DEMANDAS','SICARD Storage','Geometrias de saída']
    assert client.get('/restrict/geoespacial/explorador-camadas/').status_code==200
    hub=client.get('/restrict/geoespacial/').text
    urls=['explorador-camadas','visualizador-camadas','bancada']
    positions=[hub.index('href="/restrict/geoespacial/'+x+'/" class="geoespacial-module-card"') for x in urls]
    assert positions==sorted(positions)


def test_demand_virtual_catalog_without_geometry(client,monkeypatch):
    monkeypatch.setattr(explorer.demandas,'listar_arquivos',lambda tipo:[dict(id='cadastro:projeto:PRJ-1',codigo='PRJ-1',nome='Meu projeto',srid=4674,tipo=tipo,geometria_tipo='ST_Polygon',status='em_analise')])
    result=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'demandas','caminho':'projeto'}).json()
    assert result['folha'] is True
    file=result['itens'][0]
    assert file['extensao']=='GEOJSON' and file['nome_arquivo']=='PRJ-1.geojson'
    assert 'geojson' not in file
    meta=client.get('/api/geoespacial/explorador/detalhes',params={'fonte':'demandas','id':file['id']}).json()
    assert meta['arquivo_virtual'] is True and meta['srid']==4674


def test_demand_zip_preserves_coordinates(client,monkeypatch):
    original={'type':'FeatureCollection','crs':{'type':'name','properties':{'name':'EPSG:4674'}},'features':[{'type':'Feature','properties':{'nome':'São Paulo'},'geometry':{'type':'Point','coordinates':[-46.123456789012345,-23.5]}}]}
    monkeypatch.setattr(explorer.demandas,'exportar_original',lambda *args:original)
    response=client.get('/api/geoespacial/explorador/download',params={'fonte':'demandas','id':'cadastro:projeto:PRJ-1'})
    assert response.status_code==200
    import json
    with ZipFile(BytesIO(response.content)) as archive:
        assert archive.namelist()==['PRJ-1.geojson']
        assert json.loads(archive.read('PRJ-1.geojson'))==original


def test_storage_zip_preserves_original_and_shapefile_companions(client,mounted):
    parent=mounted/'base-geoespacial/vetor'
    files={'dados.shp':b'shp-untouched','dados.shx':b'shx-untouched','dados.dbf':b'dbf-untouched','dados.prj':b'prj-untouched','outro.dbf':b'other'}
    for name,data in files.items():(parent/name).write_bytes(data)
    response=client.get('/api/geoespacial/explorador/download',params={'fonte':'storage','id':'storage:base-geoespacial/vetor/dados.shp'})
    assert response.status_code==200
    with ZipFile(BytesIO(response.content)) as archive:
        assert set(archive.namelist())=={'dados.shp','dados.shx','dados.dbf','dados.prj'}
        for name in archive.namelist(): assert archive.read(name)==files[name]
    assert {file.name:file.read_bytes() for file in parent.iterdir()}==files


@pytest.mark.parametrize('path',['../secret.gpkg','base-geoespacial/../../secret.gpkg','/etc/secrets','saidas-geoespaciais/other.gpkg'])
def test_storage_traversal_rejected(client,path):
    response=client.get('/api/geoespacial/explorador/download',params={'fonte':'storage','id':'storage:'+path})
    assert response.status_code==422


def test_missing_shape_components_rejected(client,mounted):
    (mounted/'base-geoespacial/vetor/falta.shp').write_bytes(b'data')
    assert client.get('/api/geoespacial/explorador/download',params={'fonte':'storage','id':'storage:base-geoespacial/vetor/falta.shp'}).status_code==422


def test_private_output_metadata_and_download_denied(client,monkeypatch):
    file=f'saidas-geoespaciais/execucoes/{uuid4()}/camadas/test.gpkg'
    monkeypatch.setattr(explorer.saidas,'listar',lambda:[{'id':'private','arquivo':file}])
    monkeypatch.setattr(explorer.saidas,'referencia',lambda path:dict(privado=True,responsavel='another-user'))
    for action in ('detalhes','download'):
        assert client.get('/api/geoespacial/explorador/'+action,params={'fonte':'saidas','id':'private'}).status_code==403


def test_output_hierarchy_tool_execution_file(monkeypatch,mounted):
    execution=str(uuid4());file=f'saidas-geoespaciais/execucoes/{execution}/camadas/test.gpkg'
    target=mounted/file;target.parent.mkdir(parents=True);target.write_bytes(b'full-original')
    row=dict(id='saida-1',arquivo=file,nome='Resultado',ferramenta='Minha ferramenta',execucao_id=execution,criado_em='2026-10-09',tipo='vetor')
    monkeypatch.setattr(explorer.saidas,'listar',lambda:[row])
    tool=explorer.navegar('saidas')['itens'][0]
    execution_folder=explorer.navegar('saidas',tool['caminho'])['itens'][0]
    leaf=explorer.navegar('saidas',execution_folder['caminho'])
    assert leaf['folha'] and leaf['itens'][0]['id']=='saida-1'
    assert leaf['itens'][0]['tamanho_bytes']==len(b'full-original')


def test_zip_binary_original_preserved_and_temporary_cleaned(client,mounted,monkeypatch):
    path=mounted/'base-geoespacial/vetor/original.gpkg';original=b'full-original'*100;path.write_bytes(original)
    owners=[];real=explorer.pacote
    def package(*args):
        result=real(*args);owners.append(Path(result[2].name));return result
    monkeypatch.setattr(explorer,'pacote',package)
    response=client.get('/api/geoespacial/explorador/download',params={'fonte':'storage','id':'storage:base-geoespacial/vetor/original.gpkg'})
    assert response.status_code==200
    with ZipFile(BytesIO(response.content)) as archive:assert archive.read('original.gpkg')==original
    assert not owners[0].exists() and path.read_bytes()==original


def test_remote_copy_streams_chunks_without_full_download(monkeypatch):
    import httpx
    from api.services import storage_remoto
    content=b"original"*200000
    seen=[]
    def handler(request):
        assert request.url.params['path']=='/base-geoespacial/original.gpkg'
        assert request.headers['Authorization']=='Bearer teste'
        return httpx.Response(200,content=content)
    monkeypatch.setattr(storage_remoto,'_cliente',lambda:httpx.Client(base_url='https://storage.test',transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(storage_remoto,'_obter_token',lambda *args,**kwargs:'teste')
    class Output:
        def write(self,block): seen.append(block)
    digest=storage_remoto.copiar_para('base-geoespacial/original.gpkg',Output())
    assert digest==sha256(content).hexdigest()
    assert b''.join(seen)==content
    assert len(seen)>1 and max(map(len,seen))<=1024*1024

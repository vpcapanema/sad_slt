from io import BytesIO
from zipfile import ZipFile
from hashlib import sha256
from pathlib import Path
from uuid import uuid4
from osgeo import gdal, ogr
import pytest
from fastapi.testclient import TestClient
from api.server import app
from api.services import explorador_camadas as explorer, storage_geoespacial as storage
from api.services.session_service import SessionUser, create_token, cookie_name

USER=SessionUser(id='00000000-0000-0000-0000-000000000021',email='teste@example.org',username='teste_operador',nome='Teste',tipo_usuario='OPERADOR')

pytestmark = pytest.mark.usefixtures("storage_sintetico")

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
    assert file['geometria_tipo']=='Polygon'
    assert file['geometria_aplicavel'] is True and file['camada_aplicavel'] is False
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


@pytest.mark.parametrize('path',['../secret.gpkg','base-geoespacial/../../secret.gpkg','/etc/secrets','C:/secret.gpkg','base-geoespacial\\secret.gpkg'])
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


def test_explorer_lists_every_physical_file_including_hidden_and_sidecars(client,mounted):
    parent=mounted/'base-geoespacial/vetor'
    names=['dados.shp','dados.shx','dados.dbf','dados.prj','dados.cpg','imagem.tif','leia-me.txt','.oculto','sem_extensao','desconhecido.xyz']
    for name in names:(parent/name).write_bytes(b'original')
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':'base-geoespacial/vetor'})
    assert response.status_code==200
    items=response.json()['itens']
    assert {item['nome_arquivo'] for item in items}==set(names)
    assert len(items)==len(names)
    assert next(x for x in items if x['nome_arquivo']=='dados.shx')['mapeavel'] is False
    assert next(x for x in items if x['nome_arquivo']=='imagem.tif')['mapeavel'] is True
    assert '.oculto' not in {x['nome'] for x in storage._listar('base-geoespacial/vetor')}


def test_storage_root_lists_real_folders_and_files(client,mounted):
    for name in ('base-geodatabase','superficies-indices','documentos','.oculta','saidas-geoespaciais'):
        (mounted/name).mkdir()
    (mounted/'leia-me.txt').write_bytes(b'root-file')
    (mounted/'.indice').write_bytes(b'hidden-file')
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage'})
    assert response.status_code==200
    items=response.json()['itens']
    assert {item['caminho'] for item in items if item['pasta']}=={
        'base-geoespacial','base-geodatabase','superficies-indices','documentos','.oculta','saidas-geoespaciais'}
    assert {item['arquivo'] for item in items if not item['pasta']}=={'leia-me.txt','.indice'}
    assert all(not item.get('arquivo','').startswith('/') for item in items)


def test_storage_root_does_not_invent_missing_folders(client,mounted):
    items=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage'}).json()['itens']
    assert [item['caminho'] for item in items]==['base-geoespacial']


def test_new_storage_folders_and_root_files_support_details_and_download(client,mounted):
    folder=mounted/'documentos/subpasta/.interna'
    folder.mkdir(parents=True)
    for relative in ('leia-me.txt','documentos/subpasta/.interna/arquivo.bin'):
        target=mounted/relative
        target.write_bytes(b'original')
        parent=target.relative_to(mounted).parent.as_posix()
        response=client.get('/api/geoespacial/explorador/navegar',params={
            'fonte':'storage','caminho':'' if parent=='.' else parent})
        assert response.status_code==200
        item=next(item for item in response.json()['itens'] if item.get('arquivo')==relative)
        query={'fonte':'storage','id':item['id']}
        details=client.get('/api/geoespacial/explorador/detalhes',params=query)
        assert details.status_code==200
        assert details.json()['tamanho_bytes']==len(b'original')
        download=client.get('/api/geoespacial/explorador/download',params=query)
        assert download.status_code==200
        with ZipFile(BytesIO(download.content)) as archive:
            assert archive.read(target.name)==b'original'
    items=explorer.navegar('storage','documentos')['itens']
    assert items[0]['caminho']=='documentos/subpasta'
    assert explorer.navegar('storage','documentos/subpasta')['itens'][0]['caminho']=='documentos/subpasta/.interna'


def test_remote_storage_root_and_new_folders(client,monkeypatch):
    calls=[]
    listings={
        '':[dict(nome='documentos',pasta=True,tamanho=0,modificado=1),
            dict(nome='raiz.txt',pasta=False,tamanho=5,modificado=1)],
        'documentos':[dict(nome='.subpasta',pasta=True,tamanho=0,modificado=1)],
        'documentos/.subpasta':[dict(nome='notas.txt',pasta=False,tamanho=7,modificado=1)],
    }
    def listing(path,estrito=False):
        assert estrito is True
        calls.append(path)
        return listings[path]
    monkeypatch.setattr(storage,'_via_api',lambda:True)
    monkeypatch.setattr(explorer.storage_remoto,'listar',listing)
    for path in listings:
        response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':path})
        assert response.status_code==200
        assert len(response.json()['itens'])==len(listings[path])
    assert calls==list(listings)
    details=client.get('/api/geoespacial/explorador/detalhes',params={
        'fonte':'storage','id':'storage:documentos/.subpasta/notas.txt'})
    assert details.status_code==200 and details.json()['tamanho_bytes']==7
    details=client.get('/api/geoespacial/explorador/detalhes',params={
        'fonte':'storage','id':'storage:raiz.txt'})
    assert details.status_code==200 and details.json()['tamanho_bytes']==5


@pytest.mark.parametrize('path',['../fora','documentos/../../fora','/etc','C:/Windows','documentos\\fora'])
def test_storage_navigation_rejects_paths_outside_storage(client,path):
    assert client.get('/api/geoespacial/explorador/navegar',params={
        'fonte':'storage','caminho':path}).status_code==422


def test_private_outputs_cannot_be_downloaded_through_storage(client,mounted,monkeypatch):
    relative=f'saidas-geoespaciais/execucoes/{uuid4()}/camadas/privado.txt'
    file=mounted/relative
    file.parent.mkdir(parents=True)
    file.write_bytes(b'private')
    monkeypatch.setattr(explorer.saidas,'listar',lambda:[dict(id='private',arquivo=relative)])
    monkeypatch.setattr(explorer.saidas,'referencia',lambda path:dict(privado=True,responsavel='another-user'))
    for action in ('detalhes','download'):
        response=client.get('/api/geoespacial/explorador/'+action,params={
            'fonte':'storage','id':'storage:'+relative})
        assert response.status_code==403


def test_storage_output_listing_does_not_read_private_contents(client,mounted,monkeypatch):
    parent=mounted/'saidas-geoespaciais/privada'
    parent.mkdir(parents=True)
    (parent/'privado.gpkg').write_bytes(b'private')
    def forbidden(*args):
        raise AssertionError('A navegação não deve abrir arquivos de saídas')
    monkeypatch.setattr(explorer,'_camadas_geopackage',forbidden)
    response=client.get('/api/geoespacial/explorador/navegar',params={
        'fonte':'storage','caminho':'saidas-geoespaciais/privada'})
    assert response.status_code==200
    item=response.json()['itens'][0]
    assert item['arquivo']=='saidas-geoespaciais/privada/privado.gpkg'
    assert item['mapeavel'] is False
    assert 'camadas' not in item


def test_storage_new_folder_reads_layer_metadata_without_expanding_map_roots(client,mounted):
    folder=mounted/'outra-base'
    folder.mkdir()
    _multilayer_file(folder/'dados.gpkg')
    response=client.get('/api/geoespacial/explorador/navegar',params={
        'fonte':'storage','caminho':'outra-base'})
    assert response.status_code==200
    item=response.json()['itens'][0]
    assert item['geometria_tipo']=='Multi Polygon; Point'
    assert item['camada']=='municipios; sedes'
    assert item['mapeavel'] is False
    assert 'metadados_erro' not in item


def test_generic_file_details_and_download_preserve_bytes(client,mounted):
    path=mounted/'base-geoespacial/vetor/dados.dbf';path.write_bytes(b'original-dbf')
    query={'fonte':'storage','id':'storage:base-geoespacial/vetor/dados.dbf'}
    details=client.get('/api/geoespacial/explorador/detalhes',params=query)
    assert details.status_code==200 and details.json()['extensao']=='DBF'
    download=client.get('/api/geoespacial/explorador/download',params=query)
    assert download.status_code==200
    with ZipFile(BytesIO(download.content)) as archive:
        assert archive.namelist()==['dados.dbf'] and archive.read('dados.dbf')==b'original-dbf'


def test_outputs_include_uncatalogued_companions_and_keep_access_checks(client,mounted,monkeypatch):
    execution=str(uuid4());parent=mounted/f'saidas-geoespaciais/execucoes/{execution}/camadas';parent.mkdir(parents=True)
    (parent/'dados.shp').write_bytes(b'shp');(parent/'dados.dbf').write_bytes(b'dbf')
    relative=f'saidas-geoespaciais/execucoes/{execution}/camadas/dados.shp'
    row=dict(id='output',arquivo=relative,nome='Resultado',execucao_id=execution,ferramenta='Teste')
    monkeypatch.setattr(explorer.saidas,'listar',lambda:[row])
    tool=explorer.navegar('saidas')['itens'][0]
    folder=explorer.navegar('saidas',tool['caminho'])['itens'][0]
    files=explorer.navegar('saidas',folder['caminho'])['itens']
    assert {x['nome_arquivo'] for x in files}=={'dados.shp','dados.dbf'}
    companion=next(x for x in files if x['nome_arquivo']=='dados.dbf')
    monkeypatch.setattr(explorer.saidas,'referencia',lambda path:dict(privado=True,responsavel='another-user'))
    assert client.get('/api/geoespacial/explorador/download',params={'fonte':'saidas','id':companion['id']}).status_code==403


def _multilayer_file(path):
    dataset=ogr.GetDriverByName('GPKG').CreateDataSource(str(path))
    dataset.CreateLayer('municipios',geom_type=ogr.wkbMultiPolygon)
    dataset.CreateLayer('sedes',geom_type=ogr.wkbPoint)
    dataset=None


def test_storage_listing_reads_real_layers_without_duplicating_files(client,mounted):
    path=mounted/'base-geoespacial/vetor/dados.gpkg'
    _multilayer_file(path)
    original=path.read_bytes()
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':'base-geoespacial/vetor'})
    assert response.status_code==200
    items=response.json()['itens']
    assert len(items)==1
    item=items[0]
    assert item['id']=='storage:base-geoespacial/vetor/dados.gpkg'
    assert item['geometria_tipo']=='Multi Polygon; Point'
    assert item['camada']=='municipios; sedes'
    assert item['geometria_aplicavel'] is True and item['camada_aplicavel'] is True
    assert [(layer['camada'],layer['geometria_tipo']) for layer in item['camadas']]==[('municipios','Multi Polygon'),('sedes','Point')]
    assert 'metadados_erro' not in item
    assert path.read_bytes()==original


def test_listing_distinguishes_rasters_auxiliary_files_and_read_errors(client,mounted):
    parent=mounted/'base-geoespacial/vetor'
    raster=gdal.GetDriverByName('GTiff').Create(str(parent/'imagem.tif'),4,4,1,gdal.GDT_Byte)
    raster=None
    (parent/'dados.prj').write_text('auxiliar',encoding='ascii')
    (parent/'corrompido.gpkg').write_bytes(b'not-a-geopackage')
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':'base-geoespacial/vetor'})
    assert response.status_code==200
    items={item['nome_arquivo']:item for item in response.json()['itens']}
    assert items['imagem.tif']['geometria_tipo']=='Raster'
    assert items['imagem.tif']['camada_aplicavel'] is False
    assert items['dados.prj']['geometria_aplicavel'] is False
    assert items['dados.prj']['camada_aplicavel'] is False
    broken=items['corrompido.gpkg']
    assert broken['metadados_erro']
    assert broken['geometria_aplicavel'] is True and broken['camada_aplicavel'] is True


def test_output_metadata_comes_from_file_not_stale_catalogue(client,monkeypatch,mounted):
    execution=str(uuid4())
    parent=mounted/f'saidas-geoespaciais/execucoes/{execution}/camadas'
    parent.mkdir(parents=True)
    path=parent/'dados.gpkg'
    _multilayer_file(path)
    relative=path.relative_to(mounted).as_posix()
    row=dict(id='output-real',arquivo=relative,nome='Resultado',execucao_id=execution,ferramenta='Teste',geometria_tipo='ST_LineString')
    monkeypatch.setattr(explorer.saidas,'listar',lambda:[row])
    monkeypatch.setattr(explorer.saidas,'referencia',lambda path:dict(privado=False,sha256=None))
    tool=explorer.navegar('saidas')['itens'][0]
    folder=explorer.navegar('saidas',tool['caminho'])['itens'][0]
    item=explorer.navegar('saidas',folder['caminho'])['itens'][0]
    assert item['geometria_tipo']=='Multi Polygon; Point'
    assert item['camada']=='municipios; sedes'
    assert item['id']=='output-real'
    detail=client.get('/api/geoespacial/explorador/detalhes',params={'fonte':'saidas','id':item['id']})
    assert detail.status_code==200
    assert detail.json()['geometria_tipo']=='Multi Polygon; Point'
    assert detail.json()['camada']=='municipios; sedes'


def test_archive_lists_actual_internal_layer_names_and_geometry(client,mounted):
    parent=mounted/'base-geoespacial/vetor'
    original=parent/'original.gpkg'
    _multilayer_file(original)
    with ZipFile(parent/'dados.zip','w') as archive:
        archive.writestr('pasta/dados.gpkg',original.read_bytes())
    original.unlink()
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':'base-geoespacial/vetor'})
    assert response.status_code==200
    item=response.json()['itens'][0]
    assert item['geometria_tipo']=='Multi Polygon; Point'
    assert item['camada']=='municipios; sedes'


@pytest.mark.parametrize('with_vector',[False,True])
def test_geopackage_raster_tables_are_not_omitted(client,mounted,with_vector):
    parent=mounted/'base-geoespacial/vetor'
    source=parent/'origem.tif'
    dataset=gdal.GetDriverByName('GTiff').Create(str(source),4,4,1,gdal.GDT_Byte)
    dataset.SetGeoTransform([-47,0.1,0,-23,0,-0.1])
    dataset=None
    path=parent/'dados.gpkg'
    dataset=gdal.Translate(str(path),str(source),format='GPKG',creationOptions=['RASTER_TABLE=imagem','RASTER_IDENTIFIER=Alias da imagem'])
    dataset=None
    if with_vector:
        dataset=ogr.Open(str(path),1)
        dataset.CreateLayer('pontos',geom_type=ogr.wkbPoint)
        dataset=None
    source.unlink()
    response=client.get('/api/geoespacial/explorador/navegar',params={'fonte':'storage','caminho':'base-geoespacial/vetor'})
    assert response.status_code==200
    item=response.json()['itens'][0]
    assert item['geometria_tipo']==('Point; Raster' if with_vector else 'Raster')
    assert item['camada']==('pontos; imagem' if with_vector else 'imagem')
    assert item['camada_aplicavel'] is True
    assert 'metadados_erro' not in item
    detail=client.get('/api/geoespacial/explorador/detalhes',params={'fonte':'storage','id':item['id']})
    assert detail.status_code==200
    assert any(layer['camada']=='imagem' and layer['geometria_tipo']=='Raster' for layer in detail.json()['camadas'])


def test_metadata_cache_refreshes_when_file_changes(client,mounted):
    import os
    path=mounted/'base-geoespacial/vetor/dados.gpkg'
    _multilayer_file(path)
    query={'fonte':'storage','caminho':'base-geoespacial/vetor'}
    first=client.get('/api/geoespacial/explorador/navegar',params=query).json()['itens'][0]
    timestamp=path.stat().st_mtime_ns+1_000_000_000
    dataset=ogr.Open(str(path),1)
    dataset.CreateLayer('rios',geom_type=ogr.wkbLineString)
    dataset=None
    os.utime(path,ns=(timestamp,timestamp))
    updated=client.get('/api/geoespacial/explorador/navegar',params=query).json()['itens'][0]
    assert first['camada']=='municipios; sedes'
    assert updated['camada']=='municipios; sedes; rios'
    assert updated['geometria_tipo']=='Multi Polygon; Point; Line String'


def test_remote_metadata_reuses_directory_listing(monkeypatch,mounted):
    path=mounted/'base-geoespacial/vetor/remoto.gpkg'
    _multilayer_file(path)
    state=path.stat()
    monkeypatch.setattr(storage,'_via_api',lambda:True)
    monkeypatch.setattr(storage,'_listar',lambda *args,**kwargs:[dict(nome=path.name,pasta=False,tamanho=state.st_size,modificado=state.st_mtime)])
    monkeypatch.setattr(storage.ArquivoStorage,'__str__',lambda self:str(path))
    def unexpected_lookup(*args):
        raise AssertionError('A pasta não deve ser consultada novamente para cada arquivo')
    monkeypatch.setattr(storage,'_meta_remoto',unexpected_lookup)
    item=explorer.navegar('storage','base-geoespacial/vetor')['itens'][0]
    assert item['camada']=='municipios; sedes'
    assert item['geometria_tipo']=='Multi Polygon; Point'
    assert 'metadados_erro' not in item

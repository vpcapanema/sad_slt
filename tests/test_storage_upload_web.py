"""Autorização da sessão SICARD e transporte nativo sem escrita em produção."""
import time
from types import SimpleNamespace
import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routers.storage_upload_web import router
from api.deps.auth import require_authenticated
from api.services import storage_upload_web as web


@pytest.fixture
def app():
    app=FastAPI();app.include_router(router)
    yield app
    web.sessoes.clear()


@pytest.mark.parametrize('perfil',['VISUALIZADOR','OPERADOR'])
def test_perfil_sicard_impede_login_storage(app,monkeypatch,perfil):
    app.dependency_overrides[require_authenticated]=lambda:SimpleNamespace(id='u',tipo_usuario=perfil)
    async def proibido(*args):pytest.fail('Não deve autenticar no storage')
    monkeypatch.setattr(web,'criar',proibido)
    with TestClient(app) as c:
        r=c.post('/storage-upload/sessoes');assert r.status_code==403
        assert 'Analista, Gestor ou Admin' in r.json()['detail']


@pytest.mark.parametrize('perfil',['ANALISTA','GESTOR','ADMIN'])
def test_perfil_sicard_elegivel(app,monkeypatch,perfil):
    app.dependency_overrides[require_authenticated]=lambda:SimpleNamespace(id='u',tipo_usuario=perfil)
    async def criar(usuario):assert usuario=='u';return 'janela'
    monkeypatch.setattr(web,'criar',criar)
    with TestClient(app) as c:
        assert c.post('/storage-upload/sessoes').json()['sessao']=='janela'
        assert c.post('/storage-upload/sessoes',headers={'Origin':'https://outro.site'}).status_code==403


def test_sem_sessao_nao_autentica(app):
    with TestClient(app) as c:assert c.post('/storage-upload/sessoes').status_code==401


def test_proxy_encaminha_bytes_e_so_registra_sucesso(app):
    app.dependency_overrides[require_authenticated]=lambda:SimpleNamespace(id='u',tipo_usuario='ANALISTA')
    enviados=[]
    async def remote(request):
        enviados.append(await request.aread())
        return httpx.Response(201 if len(enviados)==1 else 500,headers={'set-cookie':'secret=server-only'},json={})
    cliente=httpx.AsyncClient(transport=httpx.MockTransport(remote))
    web.sessoes['s']=web.Sessao('u',cliente,'https://storage.test/storage','function uploadFiles(files) {}',time.monotonic()+60)
    with TestClient(app) as c:
        raiz='/storage-upload/sessoes/s/cliente/'
        r=c.post(raiz+'web/client/file?path=/base-geoespacial/a.gpkg',content=b'original-exato')
        assert r.status_code==201 and 'set-cookie' not in r.headers
        assert enviados==[b'original-exato']
        assert c.post(raiz+'web/client/file?path=/base-geoespacial/falhou.gpkg',content=b'erro').status_code==500
        assert web.sessoes['s'].arquivos==['base-geoespacial/a.gpkg']
        assert c.post(raiz+'web/client/file?path=/base-geoespacial/../segredo',content=b'').status_code==400
        assert c.get(raiz+'web/admin/users').status_code==403
        assert c.get(raiz+'web/client/file?path=/base-geoespacial/a.html').status_code==403
        app.dependency_overrides[require_authenticated]=lambda:SimpleNamespace(id='outro',tipo_usuario='ADMIN')
        assert c.get('/storage-upload/sessoes/s/resultado').status_code==404


def test_reescrita_preserva_algoritmo_e_subpath():
    original='<body><script>function uploadFiles(files) { axios.post("\\/sicard\\/storage/web/client/file", files); }</script></body>'
    s=SimpleNamespace(raiz='https://s/sicard/storage',pagina=original)
    result=web.pagina_integrada(s,'/sicard/api/proxy','/sicard/restrict/ponte.js')
    assert 'function uploadFiles(files)' in result
    assert '\\/sicard\\/api\\/proxy/web/client/file' in result
    assert '/sicard/restrict/ponte.js' in result


def test_resultado_todas_camadas_gpkg_e_zip(tmp_path,monkeypatch):
    import geopandas as gpd
    from shapely.geometry import Point
    from zipfile import ZipFile
    from api.services import storage_geoespacial as storage
    raiz=tmp_path/'base-geoespacial';raiz.mkdir()
    arquivo=raiz/'multi.gpkg'
    for i in range(3):
        gpd.GeoDataFrame({'valor':[i]},geometry=[Point(-46,-23)],crs=4326).to_file(arquivo,layer=f'camada{i}',driver='GPKG')
    with ZipFile(raiz/'pacote.zip','w') as z:z.write(arquivo,'multi.gpkg')
    monkeypatch.setattr(storage,'diretorio_storage',lambda:tmp_path)
    resultado=web.resultados(SimpleNamespace(arquivos=['base-geoespacial/multi.gpkg','base-geoespacial/pacote.zip']))
    assert not resultado['avisos']
    assert len(resultado['camadas'])==6
    for c in resultado['camadas']:assert len(storage.carregar_gdf(c['id']))==1
    assert {c['id'] for c in resultado['camadas']} <= {c['id'] for c in storage.camadas_vetoriais()}
    assert {c['id'] for c in resultado['camadas']} <= {c['id'] for c in storage.navegar('base-geoespacial')['arquivos']}

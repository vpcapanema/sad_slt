import httpx
import pytest
from api.services import storage_httpfs as fs

@pytest.fixture
def api(monkeypatch):
    content = b'0123456789' * (fs.BLOCK // 10 + 30)
    calls = []
    def handler(request):
        calls.append(request)
        if request.url.path.endswith('/dirs'):
            return httpx.Response(200,json=[dict(name='sample.gpkg',mode=420,size=len(content),last_modified='2026-01-01T00:00:00Z')])
        start,end=map(int,request.headers['Range'][6:].split('-'))
        return httpx.Response(206,content=content[start:end+1],headers={'Content-Range':f'bytes {start}-{end}/{len(content)}'})
    client=httpx.Client(base_url='https://example.test',transport=httpx.MockTransport(handler))
    monkeypatch.setattr(fs.remote,'_cliente',lambda:client)
    monkeypatch.setattr(fs.remote,'_obter_token',lambda *a,**k:'test-token')
    return fs.StorageHTTP('/root'),content,calls

def test_random_access_and_memory_cache(api):
    reader,data,calls=api
    assert reader.read('/sample.gpkg',fs.BLOCK-3,15)==data[fs.BLOCK-3:fs.BLOCK+12]
    before=len(calls)
    assert reader.read('/sample.gpkg',fs.BLOCK+2,7)==data[fs.BLOCK+2:fs.BLOCK+9]
    assert len(calls)==before
    assert reader.read('/sample.gpkg',len(data)+1,20)==b''
    assert calls[-1].url.params['path']=='/root/sample.gpkg'

def test_missing_file(api):
    with pytest.raises(FileNotFoundError):
        api[0].info('/missing')

def test_complete_file_has_identical_sha256(api):
    import hashlib
    reader, data, _ = api
    recovered = b''.join(reader.read('/sample.gpkg', offset, 65537)
                         for offset in range(0, len(data), 65537))
    assert len(recovered) == len(data)
    assert hashlib.sha256(recovered).digest() == hashlib.sha256(data).digest()

def test_reject_traversal(api):
    with pytest.raises(ValueError):
        api[0].path('/../secret')

def test_reject_full_download(api):
    reader,_,_=api
    reader.client=httpx.Client(base_url='https://example.test',transport=httpx.MockTransport(
        lambda r:httpx.Response(200,content=b'full file')))
    with pytest.raises(OSError,match='integral recusado'):
        reader.block('/sample.gpkg',0,100,'version')

def test_token_refresh(api,monkeypatch):
    reader,_,_=api
    attempts=[]
    def handler(req):
        attempts.append(req.headers['Authorization'])
        if len(attempts)==1:
            return httpx.Response(401)
        return httpx.Response(206,content=b'ab',headers={'Content-Range':'bytes 0-1/2'})
    reader.client=httpx.Client(base_url='https://example.test',transport=httpx.MockTransport(handler))
    monkeypatch.setattr(fs.remote,'_obter_token',lambda c,renovar=False:'new' if renovar else 'old')
    assert reader.block('/sample.gpkg',0,2,'x')==b'ab'
    assert attempts==['Bearer old','Bearer new']

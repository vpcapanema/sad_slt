"""GDAL real; banco simulado nestes testes unitários, sem alterar dados reais."""
from contextlib import contextmanager
from uuid import uuid4

import geopandas as gpd
import numpy as np
import pytest
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from shapely.geometry import Point, Polygon, MultiPolygon

from api.services import ciclo_vida_arquivos as ciclo


class Connection:
    def __init__(self, existing=None, fail_insert=False):
        self.existing = existing
        self.queries = []
        self.fail_insert = fail_insert

    def execute(self, query, args=()):
        self.queries.append((query,args))
        if self.fail_insert and 'INSERT INTO geoprocessamento.arquivo_resultado' in query:
            raise RuntimeError('falha de registro simulada')
        return self

    def fetchone(self):
        return self.existing


@pytest.fixture
def storage(monkeypatch, tmp_path):
    monkeypatch.setattr(ciclo, 'project_path', lambda path: tmp_path / path)
    return tmp_path


def test_vetor_preserva_fid_atributos_geometrias_e_crs(storage):
    frame = gpd.GeoDataFrame({'fid':[9,9], 'nome':['São Paulo',None], 'medida':[0.5,np.nan]},
                             geometry=[Point(-46,-23),Point(-47,-22)],crs=4674)
    conn = Connection()
    metadata = {'outro':'preservado'}
    result = ciclo.gravar(conn,str(uuid4()),metadata,frame=frame)
    path = storage / result['caminho']
    ciclo.validar_vetor(path,frame)
    assert ciclo.digest(path) == result['sha256']
    assert metadata['outro'] == 'preservado'
    assert metadata['caminho_arquivo'] == metadata['metadados']['caminho_arquivo']


def test_vetor_misto_nao_promove_geometria(storage):
    p = Polygon([(0,0),(1,0),(1,1),(0,0)])
    frame = gpd.GeoDataFrame(geometry=[p,MultiPolygon([p])],crs=4674)
    result = ciclo.gravar(Connection(),str(uuid4()),{},frame=frame)
    ciclo.validar_vetor(storage / result['caminho'],frame)


def test_vetor_vazio_e_crs_preservados(storage):
    frame = gpd.GeoDataFrame({'nome':[]},geometry=[],crs=4674)
    result = ciclo.gravar(Connection(),str(uuid4()),{},frame=frame)
    ciclo.validar_vetor(storage / result['caminho'],frame)


def test_json_composto_e_recuperavel(storage):
    import json
    frame = gpd.GeoDataFrame({'atributo':[{'a':[1,2]},None]},geometry=[Point(1,2),None],crs=4674)
    metadata = {}
    result = ciclo.gravar(Connection(),str(uuid4()),metadata,frame=frame)
    loaded = gpd.read_file(storage / result['caminho'])
    assert [json.loads(v) for v in loaded.atributo] == frame.atributo.tolist()
    assert metadata['campos_json_arquivo'] == ['atributo']


def test_falha_de_registro_remove_apenas_arquivo_novo(storage):
    frame = gpd.GeoDataFrame(geometry=[Point(1,2)],crs=4674)
    preserved = storage / 'existente.gpkg'
    preserved.write_bytes(b'preservar')
    with pytest.raises(RuntimeError):
        ciclo.gravar(Connection(fail_insert=True),str(uuid4()),{},frame=frame)
    assert list(storage.rglob('*.gpkg')) == [preserved]
    assert preserved.read_bytes() == b'preservar'


def test_reexecucao_nao_sobrescreve_e_rejeita_divergencia(storage):
    frame = gpd.GeoDataFrame(geometry=[Point(1,2)],crs=4674)
    result = ciclo.gravar(Connection(),str(uuid4()),{},frame=frame)
    assert ciclo.gravar(Connection(result),str(uuid4()),{},frame=frame) == result
    (storage / result['caminho']).write_bytes(b'alterado')
    with pytest.raises(ValueError, match='divergente'):
        ciclo.gravar(Connection(result),str(uuid4()),{},frame=frame)


def test_raster_conserva_bytes_e_nodata(storage):
    with MemoryFile() as memory:
        with memory.open(driver='GTiff',width=2,height=2,count=1,dtype='float32',crs=4674,
                         transform=from_origin(-46,-23,0.01,0.01),nodata=-9999) as dst:
            dst.write(np.array([[1,2],[3,-9999]],dtype='float32'),1)
        content = memory.read()
    result = ciclo.gravar(Connection(),str(uuid4()),{},raster_bytes=content)
    assert (storage / result['caminho']).read_bytes() == content


@pytest.mark.parametrize('days',[0,-1,3651,True,1.5,'30'])
def test_retencao_recusa_prazos_invalidos(days):
    with pytest.raises(ValueError):
        ciclo.politica(days,salvar=True)


def test_contexto_marca_saida_temporaria(storage):
    token = ciclo.execucao_atual.set(str(uuid4()))
    try:
        result = ciclo.gravar(Connection(),str(uuid4()),{},frame=gpd.GeoDataFrame(geometry=[],crs=4674))
        assert result['estado'] == 'temporario'
    finally:
        ciclo.execucao_atual.reset(token)


def test_api_ciclo_exige_admin():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.routers.conciliacao_geoespacial import router
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        for path in ['/resultados/a/regularizar','/resultados/a/publicar','/retencao/executar']:
            assert client.post('/catalogo/conciliacao'+path).status_code == 401
        assert client.get('/catalogo/conciliacao/ciclo-vida').status_code == 401


@pytest.mark.parametrize('fail',[False,True])
def test_contexto_http_registra_sucesso_e_falha(monkeypatch,fail):
    from fastapi import FastAPI, Depends, HTTPException
    from fastapi.testclient import TestClient
    from types import SimpleNamespace
    from api.deps.auth import require_geospatial_access
    from api.deps.execucao_geoespacial import rastrear_execucao
    completed = []
    monkeypatch.setattr(ciclo,'iniciar',lambda op,p,user: 'execucao_teste')
    monkeypatch.setattr(ciclo,'finalizar',lambda ident,**kwargs: completed.append((ident,kwargs)))
    app = FastAPI()
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id='usuario_teste')
    @app.post('/operacoes/teste',dependencies=[Depends(rastrear_execucao)])
    async def operation():
        assert ciclo.execucao_atual.get() == 'execucao_teste'
        if fail: raise HTTPException(422,'Falha simulada')
        return {'ok':True}
    with TestClient(app) as client:
        response = client.post('/operacoes/teste',json={'destino':'memoria'})
    assert response.status_code == (422 if fail else 200)
    assert completed == [('execucao_teste',{'erro':'HTTPException'} if fail else {'temporario':True})]
    assert ciclo.execucao_atual.get() is None

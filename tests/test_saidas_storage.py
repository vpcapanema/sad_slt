from contextlib import contextmanager
from pathlib import PurePosixPath
from uuid import uuid4
import geopandas as gpd
import pytest
from shapely.geometry import Point
from api.services import saidas_storage as saidas, storage_remoto, ciclo_vida_arquivos as ciclo


@pytest.fixture
def remoto(monkeypatch,tmp_path):
    def enviar(caminho,arquivo):
        target=tmp_path/caminho
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(arquivo.read_bytes())
    monkeypatch.setattr(storage_remoto,'enviar',enviar)
    monkeypatch.setattr(storage_remoto,'baixar',lambda caminho:(tmp_path/caminho).read_bytes())
    monkeypatch.setattr(storage_remoto,'apagar_arquivo',lambda caminho:(tmp_path/caminho).unlink())
    return tmp_path


@pytest.mark.parametrize('caminho',['/saidas-geoespaciais/a','saidas-geoespaciais/../base-geoespacial/test.gpkg',
    'base-geoespacial/test.gpkg','saidas-geoespaciais/execucoes/invalido/camadas/test.gpkg',
    f'saidas-geoespaciais/execucoes/{uuid4()}/outro/test.gpkg'])
def test_recusa_destinos_fora_da_regra(caminho):
    with pytest.raises(ValueError): saidas.validar(caminho)


def test_hash_divergente_remove_somente_novo_arquivo(remoto,monkeypatch):
    preserved=remoto/'preservar.gpkg'
    preserved.write_bytes(b'original')
    monkeypatch.setattr(storage_remoto,'baixar',lambda caminho:b'truncado')
    with pytest.raises(ValueError,match='diverge'):
        saidas.enviar_bytes(str(uuid4()),'camadas','novo.gpkg',b'original')
    assert [p for p in remoto.rglob('*') if p.is_file()]==[preserved]


def test_companheiros_shapefile_mantem_nome_e_reabrem(remoto,monkeypatch,tmp_path):
    frame=gpd.GeoDataFrame({'nome':['São Paulo']},geometry=[Point(-46,-23)],crs=4674)
    folder=tmp_path/'temporario'
    folder.mkdir()
    path=folder/'exemplo.shp'
    frame.to_file(path,engine='pyogrio',index=False)
    execution=str(uuid4())
    monkeypatch.setattr(ciclo,'iniciar',lambda *args:execution)
    monkeypatch.setattr(ciclo,'finalizar',lambda *args:None)
    monkeypatch.setattr(ciclo,'registrar_uso',lambda *args:None)
    class Connection:
        def execute(self,*args): pass
        def commit(self): pass
    @contextmanager
    def connection(): yield Connection()
    monkeypatch.setattr(ciclo,'get_connection',connection)
    result=ciclo.registrar_exportacao(path,'entrada_teste','vetor')
    stems={PurePosixPath(item['caminho']).stem for item in result['componentes']}
    assert len(stems)==1
    restored=gpd.read_file(remoto/result['caminho'],engine='pyogrio')
    assert restored.nome.tolist()==frame.nome.tolist()
    assert restored.geometry.iloc[0].equals_exact(frame.geometry.iloc[0],0)
    assert not folder.exists()


def test_preview_raster_preserva_nodata_e_nao_altera_arquivo(remoto):
    import base64
    from hashlib import sha256
    from io import BytesIO
    import numpy as np
    from PIL import Image
    from rasterio.io import MemoryFile
    from rasterio.transform import from_origin
    with MemoryFile() as memory:
        with memory.open(driver='GTiff',height=2,width=2,count=1,dtype='float32',
                         crs=4326,transform=from_origin(-46,-23,.01,.01),nodata=-9999) as raster:
            raster.write(np.array([[0,1],[2,-9999]],dtype='float32'),1)
        content=memory.read()
    file=saidas.enviar_bytes(str(uuid4()),'camadas','raster.tif',content)
    preview=saidas.preview_raster(file['caminho'],file['sha256'])
    image=Image.open(BytesIO(base64.b64decode(preview['image'].split(',',1)[1])))
    assert image.size==(2,2) and image.getpixel((1,1))[3]==0
    assert preview['min']==0 and preview['max']==2
    assert sha256((remoto/file['caminho']).read_bytes()).hexdigest()==file['sha256']


def test_download_pacote_nao_permite_outro_proprietario(monkeypatch):
    from types import SimpleNamespace
    from fastapi import HTTPException
    from api.routers.geoespacial import baixar_saida_geoespacial
    from api.repositories import saidas_geoespaciais_repository as catalogo
    monkeypatch.setattr(catalogo,'referencia',lambda caminho:{'sha256':'hash','privado':True,'responsavel':'dono'})
    def fail(*args):raise AssertionError('Não deve baixar conteúdo privado.')
    monkeypatch.setattr(saidas,'conferir',fail)
    path=saidas.destino(str(uuid4()),'pacotes','saida.zip')
    with pytest.raises(HTTPException) as error:
        baixar_saida_geoespacial(path,SimpleNamespace(id='outro',tipo_usuario='USUARIO'))
    assert error.value.status_code==404


def test_falha_no_registro_exportacao_remove_apenas_o_envio_novo(remoto,monkeypatch,tmp_path):
    source=tmp_path/'temporario'/'saida.gpkg'
    source.parent.mkdir()
    frame=gpd.GeoDataFrame(geometry=[Point(-46,-23)],crs=4674)
    frame.to_file(source,engine='pyogrio',index=False)
    execution=str(uuid4())
    monkeypatch.setattr(ciclo,'iniciar',lambda *args:execution)
    monkeypatch.setattr(ciclo,'finalizar',lambda *args,**kwargs:None)
    class Connection:
        def execute(self,*args):raise RuntimeError('Falha de registro simulada.')
    @contextmanager
    def connection():yield Connection()
    monkeypatch.setattr(ciclo,'get_connection',connection)
    with pytest.raises(RuntimeError,match='registro'):
        ciclo.registrar_exportacao(source,'entrada','vetor')
    assert source.is_file()
    assert not any(p.is_file() for p in (remoto/saidas.RAIZ).rglob('*'))

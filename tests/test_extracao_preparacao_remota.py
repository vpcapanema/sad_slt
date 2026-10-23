from tests.territorial_ogr_helpers import camada as nativa
from api.services import fluxo_camadas_ogr as fluxo
"""Previas do acervo sem montagem e sem arquivos temporarios locais."""
from hashlib import sha256
from io import BytesIO
from pathlib import PurePosixPath

import geopandas as gpd
import pytest
from osgeo import gdal
from shapely.geometry import Point

from api.services import extracao_preparacao as preparo, storage_remoto, storage_geoespacial


@pytest.fixture
def remoto(monkeypatch):
    for key in ("SICARD_STORAGE_WRITE_DIR", "SICARD_STORAGE_TEMP_DIR"):
        monkeypatch.delenv(key, raising=False)
    files = {}
    dates = {}
    now = 100_000
    monkeypatch.setattr(preparo, "time", lambda: now)

    def listar(folder, estrito=False):
        return [
            {"nome": PurePosixPath(path).name, "pasta": False,
             "tamanho": len(content), "modificado": dates[path]}
            for path, content in files.items() if str(PurePosixPath(path).parent) == folder
        ]

    def enviar(path, content):
        files[path] = content
        dates[path] = now

    monkeypatch.setattr(storage_remoto, "listar", listar)
    monkeypatch.setattr(storage_remoto, "enviar_bytes", enviar)
    monkeypatch.setattr(storage_remoto, "baixar", files.__getitem__)
    monkeypatch.setattr(storage_remoto, "apagar_arquivo", lambda path: files.pop(path, None))
    return files, dates, now


def representar():
    from api.services.metadados_previa import descrever_vetor
    frame = gpd.GeoDataFrame({"codigo": ["001"]}, geometry=[Point(-46.1, -23.1)], crs=4674)
    return frame, preparo.representar(nativa(frame), descrever_vetor(frame), "autor")


def test_previa_sem_montagem_preserva_geometria_e_gera_tile(remoto, monkeypatch):
    files, _, _ = remoto
    frame, result = representar()
    assert result["status_validacao"] == "valida"
    assert result["representacao"] == "tiles" and "geojson" not in result
    path, content = next(iter(files.items()))
    assert path.startswith("temporarios-sicard/")
    assert sha256(b"autor").hexdigest() in path
    restored = gpd.read_file(BytesIO(content), engine="pyogrio")
    assert restored.geometry.iloc[0].wkb == frame.geometry.iloc[0].wkb
    assert restored.crs == frame.crs
    assert restored.codigo.tolist() == ['001']
    assert frame["codigo"].tolist() == ["001"]

    memory = "/vsimem/teste-previa-remota.gpkg"
    gdal.FileFromMemBuffer(memory, content)
    monkeypatch.setattr(storage_remoto, "preparar_gdal", lambda: None)
    monkeypatch.setattr(storage_remoto, "endereco_vsi", lambda target: memory if target == path else pytest.fail(target))
    try:
        assert preparo.tile(result["tiles_token"], "autor", 0, 0, 0)
        with pytest.raises(FileNotFoundError, match="expirada"):
            preparo.tile(result["tiles_token"], "outro", 0, 0, 0)
    finally:
        storage_geoespacial._tile.cache_clear()
        gdal.Unlink(memory)


def test_expira_e_remove_apenas_previa_vencida_do_dono(remoto):
    files, dates, now = remoto
    _, result = representar()
    path = next(iter(files))
    dates[path] = now - preparo.TTL - 1
    unrelated = str(PurePosixPath(path).parent / "outro.txt")
    files[unrelated] = b"preservar"
    dates[unrelated] = 0
    other_owner = path.replace(sha256(b"autor").hexdigest(), sha256(b"outro").hexdigest())
    files[other_owner] = files[path]
    dates[other_owner] = 0
    with pytest.raises(FileNotFoundError, match="expirada"):
        preparo.tile(result["tiles_token"], "autor", 0, 0, 0)
    representar()
    assert path not in files
    assert files[unrelated] == b"preservar" and other_owner in files
    assert len(files) == 3


def test_conteudo_divergente_nao_produz_sucesso(remoto, monkeypatch):
    files, _, _ = remoto
    monkeypatch.setattr(storage_remoto, "baixar", lambda path: b"corrompido")
    with pytest.raises(ValueError, match="diverge"):
        representar()
    assert not files


def test_storage_indisponivel_nao_cria_fallback(remoto, monkeypatch):
    def indisponivel(*args, **kwargs):
        raise storage_remoto.StorageIndisponivel("Storage indisponivel")
    monkeypatch.setattr(storage_remoto, "listar", indisponivel)
    with pytest.raises(storage_remoto.StorageIndisponivel):
        representar()


def test_preparar_pacote_storage_pelo_endpoint_sem_montagem(remoto, monkeypatch):
    from types import SimpleNamespace
    from zipfile import ZipFile
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from api.deps.auth import require_geospatial_access
    from api.routers.extracao_atributos import router
    from api.services import extracao_entrada_local, storage_pacotes
    from api.services.arquivos_geoespaciais_memoria import vetor

    files, dates, now = remoto
    frame = gpd.GeoDataFrame({"codigo": ["001"]}, geometry=[Point(-46.1, -23.1)], crs=4674)
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr("entrada.gpkg", vetor(frame, "entrada.gpkg", "GPKG", layer="demanda")["entrada.gpkg"])
    path = "base-geoespacial/entrada.zip"
    original = buffer.getvalue()
    files[path], dates[path] = original, now
    source = storage_geoespacial.ArquivoStorage(path, len(original), now)
    monkeypatch.setattr(storage_geoespacial, "resolver", lambda ref: source if ref == path else pytest.fail(ref))
    monkeypatch.setattr(fluxo, "localizacao", lambda frame: {"status": "consultado"})
    ident = storage_pacotes.inventario(source, path)[0]["id"]
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_geospatial_access] = lambda: SimpleNamespace(id="autor")
    with TestClient(app) as client:
        response = client.post("/extracao-atributos/preparar-camada", json={"id": ident})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == ident and data["arquivo"] == path
    assert data["status_validacao"] == "valida" and data["feicoes"] == 1
    assert data["representacao"] == "tiles" and 'tiles_token' not in data
    assert '/storage/camada/tiles/' in data['tiles_url']
    estado = source.stat()
    assert data["revisao_fonte"] == f"{estado.st_mtime_ns}-{estado.st_size}"
    assert data["revisao"] == data["revisao_fonte"]
    assert data["metadados_local"]["campos"][0]["nome"] == "codigo"
    assert files[path] == original
    assert list(files) == [path], 'A prévia não deve subir outra cópia para o storage.'

"""Processamento real em RAM; API do storage e catalogo substituidos em memoria."""
import asyncio
from contextlib import contextmanager
from pathlib import PurePosixPath
from uuid import uuid4

import geopandas as gpd
import numpy as np
import pytest
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from shapely.geometry import Point

from api import storage_policy
from api.services import ciclo_vida_arquivos as ciclo, saidas_storage, storage_remoto
from api.services.geoespacial_service import geoespacial_service as geo
from api.services.geoprocessamento_engine import geoprocessamento_engine as engine


@pytest.fixture
def remoto(monkeypatch, execucoes_sinteticas):
    for key in ("SICARD_STORAGE_WRITE_DIR", "SICARD_STORAGE_TEMP_DIR"):
        monkeypatch.delenv(key, raising=False)
    files = {}
    folders = {"temporarios-sicard", "saidas-geoespaciais", "saidas-geoespaciais/Teste"}
    sent = []
    queries = []

    def listar(path, estrito=False):
        if path not in folders:
            raise FileNotFoundError(path)
        return [{"nome": PurePosixPath(item).name, "pasta": item in folders}
                for item in sorted(folders | files.keys()) if str(PurePosixPath(item).parent) == path]

    def enviar(path, content):
        files[path] = content
        sent.append(path)

    monkeypatch.setattr(storage_remoto, "listar", listar)
    monkeypatch.setattr(storage_remoto, "enviar_bytes", enviar)
    monkeypatch.setattr(storage_remoto, "baixar", lambda path: files[path])
    monkeypatch.setattr(storage_remoto, "criar_pasta", folders.add)
    monkeypatch.setattr(storage_remoto, "apagar_arquivo", lambda path: files.pop(path, None))
    monkeypatch.setattr(storage_remoto, "apagar_pasta", folders.remove)

    class Connection:
        def execute(self, sql, params=()):
            queries.append((sql, params))
            self.row = {"adquirido": True} if "advisory" in sql else None
            return self

        def fetchone(self):
            return self.row

        def commit(self):
            pass

    conn = Connection()

    @contextmanager
    def connection():
        yield conn

    def forbid(*args, **kwargs):
        raise AssertionError("O processamento sem montagem tentou criar arquivo no disco.")

    monkeypatch.setattr(ciclo, "get_connection", connection)
    monkeypatch.setattr(ciclo, "iniciar", lambda *args: str(uuid4()))
    monkeypatch.setattr(ciclo, "finalizar", lambda *args, **kwargs: None)
    monkeypatch.setattr(ciclo, "registrar_uso", lambda *args: None)
    monkeypatch.setattr(ciclo, "mkdtemp", forbid)
    monkeypatch.setattr(ciclo, "caminho_exportacao", forbid)
    monkeypatch.setattr(storage_policy, "raiz_temporaria", forbid)
    monkeypatch.setattr(geo, "_catalogar_persistidas", lambda: None)
    for name in ("_camadas", "_rasters", "_metadados", "_raster_profiles"):
        monkeypatch.setattr(geo, name, {})
    return files, folders, sent, queries, conn


@pytest.mark.parametrize("formato,ext", [("GeoPackage", "gpkg"), ("GeoJSON", "geojson"), ("Shapefile", "shp")])
def test_op03_grava_canonico_exporta_e_reabre_sem_montagem(remoto, monkeypatch, formato, ext):
    files, folders, sent, queries, conn = remoto
    source = gpd.GeoDataFrame({"valor": [7, 8]}, geometry=[Point(-46, -23), Point(-47, -24)], crs=4326)
    geo._camadas["entrada"] = source.copy()
    geo._metadados["entrada"] = {"tipo": "vetorial"}

    def register(frame, name, origem="processamento", **kwargs):
        metadata = {"nome": name}
        ident = "camada_" + uuid4().hex
        ciclo.gravar(conn, str(uuid4()), metadata, frame=frame)
        geo._camadas[ident] = frame
        geo._metadados[ident] = {**metadata, "tipo": "vetorial"}
        return ident

    monkeypatch.setattr(geo, "registrar_camada", register)
    result = asyncio.run(engine.execute("OP-03", dict(
        camada_id="entrada", crs_destino="EPSG:3857", destino="storage",
        pasta_saida="saidas-geoespaciais/Teste", nome_saida="Resultado",
        formato_saida=formato, crs_saida="entrada",
    )))
    import re
    path = result["arquivo_saida"]["caminho"]
    assert re.fullmatch(r'saidas-geoespaciais/Teste/\d{8}_\d{6}_[0-9a-f]{32}\.' + ext, path)
    from api.services.arquivos_geoespaciais_memoria import ler_vetor
    components = {PurePosixPath(p).name: content for p, content in files.items()
                  if p.startswith("saidas-geoespaciais/Teste/")}
    loaded = ler_vetor(components, PurePosixPath(path).name)
    assert loaded.crs.to_epsg() == 3857
    assert loaded.valor.tolist() == [7, 8]
    assert geo._camadas["entrada"].equals(source)
    assert any(path.startswith("temporarios-sicard/execucao-") for path in sent)
    assert not any(path.startswith("temporarios-sicard/") for path in files)
    assert folders == {"temporarios-sicard", "saidas-geoespaciais", "saidas-geoespaciais/Teste"}
    canonical = geo._metadados[result["camada_id"]]["caminho_arquivo"]
    cold = saidas_storage.vetor({"storage_caminho": canonical})
    assert cold.valor.tolist() == [7, 8]
    assert cold.crs.to_epsg() == 3857
    assert any("INSERT INTO geoprocessamento.arquivo_resultado" in sql for sql, _ in queries)
    assert any("INSERT INTO geoprocessamento.arquivo_exportado" in sql for sql, _ in queries)


def test_raster_salva_sem_montagem_preserva_nodata(remoto):
    files, folders, sent, _, conn = remoto
    data = np.array([[1, 2], [3, np.nan]], dtype="float32")
    profile = dict(crs="EPSG:4326", transform=from_origin(-46, -23, .01, .01))
    geo._rasters["raster"] = data
    geo._raster_profiles["raster"] = profile
    geo._metadados["raster"] = {"tipo": "raster"}
    result = asyncio.run(geo.salvar_camada("raster", "saidas-geoespaciais/Teste", "Raster.tif", formato="geotiff"))
    with MemoryFile(files[result["caminho"]]) as memory:
        with memory.open() as source:
            np.testing.assert_allclose(source.read(1), data, equal_nan=True)
            assert source.crs.to_epsg() == 4326
    metadata = {"nome": "Raster"}
    canonical = ciclo.gravar(conn, str(uuid4()), metadata, raster_bytes=files[result["caminho"]])
    assert files[canonical["caminho"]] == files[result["caminho"]]
    assert not any(path.startswith("temporarios-sicard/") for path in files)
    legacy = asyncio.run(geo.exportar_raster("raster", "Legado.tif", opcao_salvamento="persistir_sistema"))
    with MemoryFile(files[legacy["caminho"]]) as memory:
        with memory.open() as source:
            np.testing.assert_allclose(source.read(1), data, equal_nan=True)


@pytest.mark.parametrize("formato,ext", [("GeoPackage", "gpkg"), ("GeoJSON", "geojson"), ("Shapefile", "shp")])
def test_exportacao_legada_sem_montagem(remoto, formato, ext):
    files, *_ = remoto
    geo._camadas["entrada"] = gpd.GeoDataFrame({"valor": [7]}, geometry=[Point(-46, -23)], crs=4326)
    geo._metadados["entrada"] = {"tipo": "vetorial"}
    result = asyncio.run(geo.exportar_camada("entrada", "Legado." + ext, formato,
                                           opcao_salvamento="persistir_sistema"))
    assert result["caminho"] in files
    assert not any(path.startswith("temporarios-sicard/") for path in files)


def test_relatorio_json_sem_montagem(remoto):
    files, *_ = remoto
    result = ciclo.exportar_relatorio({"valido": True}, "saidas-geoespaciais/Teste", "Diagnostico", "entrada")
    assert files[result["caminho"]] == b'{"valido": true}'
    assert not any(path.startswith("temporarios-sicard/") for path in files)


def test_overlay_sem_montagem_preserva_geometria_e_limpa_temporarios(remoto):
    from api.services.geoespacial_service import _overlay_ogr
    from shapely.geometry import box
    files, folders, sent, *_ = remoto
    first = gpd.GeoDataFrame({"origem": [1]}, geometry=[box(0, 0, 2, 2)], crs=3857)
    second = gpd.GeoDataFrame({"corte": [2]}, geometry=[box(1, 1, 3, 3)], crs=3857)
    result = _overlay_ogr(first, second, "intersection")
    assert len(result) == 1
    assert result.geometry.iloc[0].equals(box(1, 1, 2, 2))
    assert result.crs.to_epsg() == 3857
    assert not files
    assert not any(folder.startswith("temporarios-sicard/") for folder in folders)
    assert any(path.endswith("/entrada.gpkg") for path in sent)


def test_temporarios_ausentes_nao_criam_fallback_local(remoto):
    files, folders, _, _, conn = remoto
    folders.remove("temporarios-sicard")
    frame = gpd.GeoDataFrame(geometry=[Point(-46, -23)], crs=4326)
    with pytest.raises(FileNotFoundError, match="temporarios-sicard"):
        ciclo.gravar(conn, str(uuid4()), {"nome": "Falha"}, frame=frame)
    assert not files


def test_falha_storage_limpa_temporarios_e_nao_registra_sucesso(remoto, monkeypatch):
    files, folders, sent, queries, conn = remoto
    original = storage_remoto.enviar_bytes

    def fail(path, content):
        if path.startswith("saidas-geoespaciais/"):
            original(path, b"parcial")
            raise storage_remoto.StorageIndisponivel("Envio interrompido")
        original(path, content)

    monkeypatch.setattr(storage_remoto, "enviar_bytes", fail)
    frame = gpd.GeoDataFrame(geometry=[Point(-46, -23)], crs=4326)
    with pytest.raises(storage_remoto.StorageIndisponivel, match="interrompido"):
        ciclo.gravar(conn, str(uuid4()), {"nome": "Falha"}, frame=frame)
    assert not files
    assert not any(folder.startswith("temporarios-sicard/") for folder in folders)
    assert not any("INSERT INTO geoprocessamento.arquivo_resultado" in sql for sql, _ in queries)
    monkeypatch.setattr(storage_remoto, "enviar_bytes", original)
    result = ciclo.gravar(conn, str(uuid4()), {"nome": "Recuperada"}, frame=frame)
    assert result["caminho"] in files
    assert not any(folder.startswith("temporarios-sicard/") for folder in folders)


def test_falha_catalogo_remove_saida_orfa_e_permite_nova_execucao(remoto, monkeypatch):
    from api.exceptions import DatabaseUnavailableError

    files, folders, _, queries, conn = remoto
    execute = conn.execute

    def fail(sql, params=()):
        if "INSERT INTO geoprocessamento.arquivo_resultado" in sql:
            raise DatabaseUnavailableError("Banco indisponível durante o registro")
        return execute(sql, params)

    monkeypatch.setattr(conn, "execute", fail)
    frame = gpd.GeoDataFrame({"valor": [7]}, geometry=[Point(-46, -23)], crs=4326)
    with pytest.raises(DatabaseUnavailableError, match="indisponível"):
        ciclo.gravar(conn, str(uuid4()), {"nome": "Falha"}, frame=frame)
    assert not files, "Saída sem registro no catálogo deve ser removida."
    assert not any(folder.startswith("temporarios-sicard/") for folder in folders)
    monkeypatch.setattr(conn, "execute", execute)
    result = ciclo.gravar(conn, str(uuid4()), {"nome": "Recuperada"}, frame=frame)
    assert result["caminho"] in files
    assert any("INSERT INTO geoprocessamento.arquivo_resultado" in sql for sql, _ in queries)

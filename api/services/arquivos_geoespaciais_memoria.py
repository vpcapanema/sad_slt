"""Serializacao em RAM e trabalho temporario no storage, sem disco local."""
from __future__ import annotations

from contextlib import contextmanager
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from zipfile import ZipFile

import geopandas as gpd
from osgeo import gdal

from api.services import storage_remoto
from api.services.pastas_storage import nome_valido


def vetor(frame: gpd.GeoDataFrame, nome: str, driver: str, **kwargs) -> dict[str, bytes]:
    nome_valido(nome)
    output = BytesIO()
    frame.to_file(output, driver="GPKG" if driver == "ESRI Shapefile" else driver,
                  engine="pyogrio", index=False, **kwargs)
    if driver != "ESRI Shapefile":
        return {nome: output.getvalue()}
    root = f"/vsimem/sicard-exportacao-{uuid4().hex}"
    gdal.Mkdir(root, 0o755)
    try:
        source = root + "/entrada.gpkg"
        gdal.FileFromMemBuffer(source, output.getvalue())
        result = gdal.VectorTranslate(root + "/" + nome, source, format=driver,
                                      layerCreationOptions=["ENCODING=UTF-8"])
        if result is None:
            raise RuntimeError("O GDAL não gerou o Shapefile em memória.")
        result = None
        return {item: bytes(gdal.VSIGetMemFileBuffer_unsafe(root + "/" + item))
                for item in gdal.ReadDir(root) if item != "entrada.gpkg"}
    finally:
        gdal.RmdirRecursive(root)


def ler_vetor(componentes: dict[str, bytes], nome: str) -> gpd.GeoDataFrame:
    if Path(nome).suffix.lower() != ".shp":
        return gpd.read_file(BytesIO(componentes[nome]), engine="pyogrio")
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        for name, content in componentes.items():
            archive.writestr(name, content)
    return gpd.read_file(BytesIO(output.getvalue()), engine="pyogrio")


@contextmanager
def diretorio(componentes: dict[str, bytes]):
    root = f"/vsimem/sicard-trabalho-{uuid4().hex}"
    with trabalho(componentes):
        gdal.Mkdir(root, 0o755)
        try:
            for name, content in componentes.items():
                gdal.FileFromMemBuffer(root + "/" + name, content)
            yield root
        finally:
            gdal.RmdirRecursive(root)


@contextmanager
def trabalho(componentes: dict[str, bytes]):
    """Arquivos transitorios ficam exclusivamente em temporarios-sicard."""
    for name in componentes:
        nome_valido(name)
    storage_remoto.listar("temporarios-sicard", estrito=True)
    folder = "temporarios-sicard/execucao-" + uuid4().hex
    storage_remoto.criar_pasta(folder)
    uploaded = []
    try:
        for name, content in componentes.items():
            target = folder + "/" + name
            uploaded.append(target)
            storage_remoto.enviar_bytes(target, content)
            if sha256(storage_remoto.baixar(target)).digest() != sha256(content).digest():
                raise ValueError("O arquivo temporário no storage diverge do conteúdo enviado.")
        yield
    finally:
        for target in uploaded:
            storage_remoto.apagar_arquivo(target)
        storage_remoto.apagar_pasta(folder)

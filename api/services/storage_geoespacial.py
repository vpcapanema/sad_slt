"""Leitura das camadas do storage do SICARD (SFTPGo, contêiner sicard_storage).

O storage guarda arquivos brutos, editáveis no QGIS; nada aqui grava neles nem
os copia para o banco. As pastas viram grupos de camadas e cada camada de um
arquivo vetorial é servida em tiles MVT gerados pelo GDAL na hora, a partir do
próprio arquivo.

Na VM a pasta de dados do storage é montada somente leitura dentro do projeto
(docker-compose.vm.yml). O caminho é configurável por SICARD_STORAGE_DIR,
sempre relativo à raiz do projeto.
"""
from __future__ import annotations

import os
import uuid
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Any

import mercantile
from osgeo import gdal, ogr, osr

from api.path_policy import project_path

gdal.UseExceptions()

# Pastas do storage que o sistema publica. Outras (base-geodatabase) ficam fora.
RAIZES: tuple[str, ...] = ("base-geoespacial", "superficies-indices")

EXTENSOES_VETOR = {".gpkg", ".geojson", ".json", ".fgb", ".shp", ".kml"}
EXTENSOES_RASTER = {".tif", ".tiff", ".img"}

# Margem do tile em unidades de extensão MVT (4096), a mesma do ST_AsMVTGeom
# das camadas do banco: evita cortes visíveis na borda entre tiles vizinhos.
_MARGEM_TILE = 64
_EXTENSAO_TILE = 4096


def diretorio_storage() -> Path:
    return project_path(os.getenv("SICARD_STORAGE_DIR", "data/storage"), label="storage")


def resolver(caminho: str) -> Path:
    """Caminho relativo ao storage -> arquivo, recusando fuga e raízes não publicadas."""
    bruto = str(caminho or "").strip().replace("\\", "/")
    partes = PurePosixPath(bruto).parts
    if not partes or bruto.startswith("/") or ".." in partes or partes[0] not in RAIZES:
        raise ValueError("Caminho de camada inválido")
    alvo = diretorio_storage().joinpath(*partes)
    if not alvo.is_file():
        raise FileNotFoundError("Camada não encontrada no storage")
    return alvo


def _srs(camada: ogr.Layer | None = None, epsg: int | None = None) -> osr.SpatialReference | None:
    srs = camada.GetSpatialRef() if camada is not None else osr.SpatialReference()
    if srs is None:
        return None
    srs = srs.Clone()
    if epsg:
        srs.ImportFromEPSG(epsg)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return srs


def _crs_texto(srs: osr.SpatialReference | None) -> str | None:
    if srs is None:
        return None
    autoridade, codigo = srs.GetAuthorityName(None), srs.GetAuthorityCode(None)
    return f"{autoridade}:{codigo}" if autoridade and codigo else srs.GetName()


@lru_cache(maxsize=256)
def _camadas_do_arquivo(arquivo: str, _versao: tuple[int, int]) -> tuple[dict[str, Any], ...]:
    """Camadas de um arquivo vetorial. `_versao` (mtime, tamanho) invalida o cache."""
    # Sem `with`: o Dataset só virou gerenciador de contexto no GDAL 3.8 e a
    # referência solta já fecha o arquivo ao sair da função.
    ds = gdal.OpenEx(arquivo, gdal.OF_VECTOR)
    camadas = []
    for indice in range(ds.GetLayerCount()):
        camada = ds.GetLayer(indice)
        camadas.append({
            "camada": camada.GetName(),
            "geometria_tipo": ogr.GeometryTypeToName(camada.GetGeomType()),
            "crs": _crs_texto(camada.GetSpatialRef()),
            "feicoes": camada.GetFeatureCount(),
        })
    return tuple(camadas)


def _itens_do_arquivo(arquivo: Path, relativo: str) -> list[dict[str, Any]]:
    extensao = arquivo.suffix.lower()
    estado = arquivo.stat()
    base = {"arquivo": relativo, "tamanho_bytes": estado.st_size, "modificado_em": estado.st_mtime}
    if extensao in EXTENSOES_RASTER:
        return [{**base, "id": f"storage:{relativo}", "nome": arquivo.stem, "tipo": "raster",
                 "camada": None, "geometria_tipo": "Raster"}]
    try:
        camadas = _camadas_do_arquivo(str(arquivo), (estado.st_mtime_ns, estado.st_size))
    except RuntimeError:
        return [{**base, "id": f"storage:{relativo}", "nome": arquivo.stem, "tipo": "vetor",
                 "camada": None, "erro": "Arquivo não pôde ser lido pelo GDAL"}]
    # Um arquivo com uma só camada aparece com o nome do arquivo, que é o que o
    # usuário vê no storage; com várias, cada camada leva o próprio nome.
    return [
        {**base, **info, "id": f"storage:{relativo}::{info['camada']}", "tipo": "vetor",
         "nome": arquivo.stem if len(camadas) == 1 else info["camada"]}
        for info in camadas
    ]


def _grupo(pasta: Path, relativo: str) -> dict[str, Any]:
    grupos, camadas = [], []
    for item in sorted(pasta.iterdir(), key=lambda p: p.name.lower()):
        if item.name.startswith("."):
            continue
        item_relativo = f"{relativo}/{item.name}"
        if item.is_dir():
            grupos.append(_grupo(item, item_relativo))
        elif item.suffix.lower() in EXTENSOES_VETOR | EXTENSOES_RASTER:
            camadas.extend(_itens_do_arquivo(item, item_relativo))
    return {"nome": pasta.name, "caminho": relativo, "grupos": grupos, "camadas": camadas}


def arvore(raiz: str) -> dict[str, Any]:
    """Pastas (grupos) e camadas de uma raiz publicada do storage."""
    if raiz not in RAIZES:
        raise ValueError("Pasta do storage não publicada")
    pasta = diretorio_storage() / raiz
    if not pasta.is_dir():
        return {"nome": raiz, "caminho": raiz, "grupos": [], "camadas": [], "disponivel": False}
    return {**_grupo(pasta, raiz), "disponivel": True}


def _abrir_camada(caminho: str, camada: str | None) -> tuple[gdal.Dataset, ogr.Layer]:
    arquivo = resolver(caminho)
    if arquivo.suffix.lower() not in EXTENSOES_VETOR:
        raise ValueError("A camada não é vetorial")
    ds = gdal.OpenEx(str(arquivo), gdal.OF_VECTOR)
    lyr = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
    if lyr is None:
        raise FileNotFoundError("Camada não encontrada no arquivo")
    return ds, lyr


def bounds(caminho: str, camada: str | None) -> list[float] | None:
    """Extensão da camada em lon/lat (EPSG:4326)."""
    _ds, lyr = _abrir_camada(caminho, camada)
    if lyr.GetFeatureCount() == 0:
        return None
    minx, maxx, miny, maxy = lyr.GetExtent()
    origem = _srs(lyr)
    if origem is None:
        return [minx, miny, maxx, maxy]
    transformacao = osr.CoordinateTransformation(origem, _srs(epsg=4326))
    return list(transformacao.TransformBounds(minx, miny, maxx, maxy, 21))


def tile(caminho: str, camada: str | None, z: int, x: int, y: int) -> bytes:
    arquivo = resolver(caminho)
    estado = arquivo.stat()
    return _tile(str(arquivo), camada, (estado.st_mtime_ns, estado.st_size), z, x, y)


@lru_cache(maxsize=256)
def _tile(arquivo: str, camada: str | None, _versao: tuple[int, int], z: int, x: int, y: int) -> bytes:
    """Um tile MVT (camada interna "camada", sem compressão) gerado do arquivo.

    O driver MVT do GDAL grava uma pirâmide; limitando o zoom a `z` e o filtro
    espacial ao tile com margem, só o tile pedido e vizinhos imediatos saem.
    """
    limites = mercantile.xy_bounds(x, y, z)
    margem = (limites.right - limites.left) * _MARGEM_TILE / _EXTENSAO_TILE
    ds = gdal.OpenEx(arquivo, gdal.OF_VECTOR)
    lyr = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
    if lyr is None:
        raise FileNotFoundError("Camada não encontrada no arquivo")
    filtro = [limites.left - margem, limites.bottom - margem, limites.right + margem, limites.top + margem]
    origem = _srs(lyr)
    if origem is not None:
        filtro = list(osr.CoordinateTransformation(_srs(epsg=3857), origem).TransformBounds(*filtro, 21))
    destino = f"/vsimem/sicard_storage_mvt_{uuid.uuid4().hex}"
    try:
        gdal.VectorTranslate(
            destino, ds, format="MVT", layers=[lyr.GetName()], layerName="camada", spatFilter=filtro,
            datasetCreationOptions=[f"MINZOOM={z}", f"MAXZOOM={z}", "COMPRESS=NO", "FORMAT=DIRECTORY"],
        )
        alvo = f"{destino}/{z}/{x}/{y}.pbf"
        if gdal.VSIStatL(alvo) is None:
            return b""
        manipulador = gdal.VSIFOpenL(alvo, "rb")
        try:
            return bytes(gdal.VSIFReadL(1, gdal.VSIStatL(alvo).size, manipulador))
        finally:
            gdal.VSIFCloseL(manipulador)
    finally:
        gdal.RmdirRecursive(destino)

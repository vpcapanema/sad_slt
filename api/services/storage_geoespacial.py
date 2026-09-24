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

import json
import os
import uuid
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Any

from api.services import storage_pacotes

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
            "feicoes": (n if (n := camada.GetFeatureCount(0)) >= 0 else None),
        })
    return tuple(camadas)


@lru_cache(maxsize=64)
def _inventario_pacote(arquivo: str, relativo: str, versao: tuple[int, int]):
    return tuple(storage_pacotes.inventario(Path(arquivo), relativo))


def _itens_do_arquivo(arquivo: Path, relativo: str) -> list[dict[str, Any]]:
    if arquivo.suffix.lower() in storage_pacotes.COMPACTADOS:
        estado=arquivo.stat()
        return [dict(item) for item in _inventario_pacote(str(arquivo), relativo, (estado.st_mtime_ns, estado.st_size))]
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


PREFIXO_ID = "storage:"


def separar_id(ident: str) -> tuple[str, str | None]:
    """`storage:<caminho>::<camada>` -> (caminho, camada)."""
    texto = str(ident or "")
    if not texto.startswith(PREFIXO_ID):
        raise ValueError("Identificador de camada do storage inválido")
    caminho, _, camada = texto[len(PREFIXO_ID):].partition("::")
    return caminho, camada or None


def impressao_digital(ident: str) -> dict[str, Any]:
    """O arquivo do storage como estava na execução: tamanho, data e SHA-256."""
    from datetime import datetime, timezone
    from hashlib import sha256

    caminho, camada = separar_id(ident)
    arquivo = resolver(caminho)
    estado = arquivo.stat()
    resumo = sha256()
    with arquivo.open("rb") as stream:
        for bloco in iter(lambda: stream.read(1024 * 1024), b""):
            resumo.update(bloco)
    return {"arquivo": caminho, "camada": camada, "tamanho_bytes": estado.st_size,
            "modificado_em": datetime.fromtimestamp(estado.st_mtime, timezone.utc).isoformat(timespec="seconds"),
            "sha256": resumo.hexdigest()}


def camadas_vetoriais(raiz: str = "base-geoespacial") -> list[dict[str, Any]]:
    """Camadas vetoriais legíveis de uma raiz, em qualquer nível de pasta."""
    def coletar(grupo: dict[str, Any]) -> list[dict[str, Any]]:
        return [*grupo["camadas"], *(c for filho in grupo["grupos"] for c in coletar(filho))]
    itens = coletar(arvore(raiz))
    # A extração lê pacotes em RAM; a árvore de tiles permanece restrita aos
    # arquivos que o GDAL abre diretamente. Nada é extraído no storage.
    for arquivo in (diretorio_storage() / raiz).rglob('*'):
        if arquivo.is_file() and arquivo.suffix.lower() in storage_pacotes.COMPACTADOS:
            try:
                itens.extend(_itens_do_arquivo(arquivo, arquivo.relative_to(diretorio_storage()).as_posix()))
            except (ValueError, OSError, RuntimeError):
                continue
    return [c for c in itens if c["tipo"] == "vetor" and not c.get("erro")]


def navegar(caminho: str = "", detalhar: bool = True) -> dict[str, Any]:
    """Uma pasta do storage: subpastas e camadas vetoriais, para o explorador."""
    relativo = str(caminho or "").strip().replace("\\", "/").strip("/") or RAIZES[0]
    partes = PurePosixPath(relativo).parts
    if ".." in partes or partes[0] not in RAIZES:
        raise ValueError("Pasta do storage inválida")
    pasta = diretorio_storage().joinpath(*partes)
    if not pasta.is_dir():
        raise FileNotFoundError("Pasta não encontrada no storage")
    pastas, arquivos = [], []
    for item in sorted(pasta.iterdir(), key=lambda p: p.name.lower()):
        if item.name.startswith("."):
            continue
        item_relativo = f"{relativo}/{item.name}"
        if item.is_dir():
            pastas.append({"nome": item.name, "caminho": item_relativo})
        elif not detalhar and item.suffix.lower() in EXTENSOES_VETOR | storage_pacotes.COMPACTADOS:
            arquivos.append({'id': f'storage:{item_relativo}', 'nome': item.stem,
                             'arquivo': item_relativo, 'formato': item.suffix.lstrip('.').upper(),
                             'inventariar': True})
        elif item.suffix.lower() in storage_pacotes.COMPACTADOS:
            try:
                arquivos.extend(c for c in _itens_do_arquivo(item, item_relativo) if c.get("tipo")=="vetor" and not c.get("erro"))
            except (ValueError, OSError, RuntimeError):
                continue
        elif item.suffix.lower() in EXTENSOES_VETOR:
            arquivos.extend({**c, "formato": item.suffix.lstrip(".").upper()}
                            for c in _itens_do_arquivo(item, item_relativo) if not c.get("erro"))
    pai = PurePosixPath(relativo).parent.as_posix() if len(partes) > 1 else None
    return {"caminho": relativo, "pai": pai, "pastas": pastas, "arquivos": arquivos}


def inventariar_arquivo(caminho: str) -> dict[str, Any]:
    """Abre somente o arquivo escolhido; navegar não precisa ler geometrias."""
    arquivo = resolver(caminho)
    if arquivo.suffix.lower() not in EXTENSOES_VETOR | storage_pacotes.COMPACTADOS:
        raise ValueError('Selecione um arquivo vetorial ou pacote compatível.')
    itens = _itens_do_arquivo(arquivo, caminho)
    camadas = [item for item in itens if item.get('tipo') == 'vetor' and not item.get('erro')]
    if not camadas:
        raise ValueError('O arquivo não contém camadas vetoriais legíveis.')
    return {'arquivo': caminho, 'camadas': camadas}


def carregar_gdf(ident: str):
    """Camada do storage como GeoDataFrame, no CRS e na dimensão das camadas do banco."""
    import geopandas as gpd
    import shapely

    caminho, camada = separar_id(ident)
    arquivo = resolver(caminho)
    if arquivo.suffix.lower() in storage_pacotes.COMPACTADOS:
        frame,_ = storage_pacotes.carregar(arquivo, camada)
        frame=frame.to_crs("EPSG:4674")
        frame.geometry=shapely.force_2d(frame.geometry.values)
        return frame
    if arquivo.suffix.lower() not in EXTENSOES_VETOR:
        raise ValueError("A camada não é vetorial")
    frame = gpd.read_file(arquivo, layer=camada, engine="pyogrio")
    if frame.crs is None:
        raise ValueError(f"A camada {arquivo.name} não informa seu CRS")
    if frame.crs.to_epsg() != 4674:
        frame = frame.to_crs("EPSG:4674")
    frame.geometry = shapely.force_2d(frame.geometry.values)
    return frame


def ler_para_mapa(ident: str) -> dict[str, Any]:
    """Camada do storage no formato que a bancada da extração usa para o mapa."""
    caminho, camada = separar_id(ident)
    arquivo = resolver(caminho)
    if arquivo.suffix.lower() in storage_pacotes.COMPACTADOS:
        return storage_pacotes.previa(arquivo, camada, ident, caminho)
    if arquivo.suffix.lower() not in EXTENSOES_VETOR:
        raise ValueError("A camada não é vetorial")
    estado = arquivo.stat()
    ds = gdal.OpenEx(str(arquivo), gdal.OF_VECTOR | gdal.OF_READONLY)
    lyr = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
    if lyr is None:
        raise FileNotFoundError("Camada não encontrada no arquivo")
    srs = lyr.GetSpatialRef()
    if srs is None:
        raise ValueError("O arquivo não informa seu CRS. Defina o CRS antes de visualizar.")
    memoria = f"/vsimem/sicard_storage_mapa_{uuid.uuid4().hex}.geojson"
    try:
        saida = gdal.VectorTranslate(
            memoria, ds, format="GeoJSON", layers=[lyr.GetName()], dstSRS="EPSG:4326", preserveFID=True,
            layerCreationOptions=["RFC7946=YES", "COORDINATE_PRECISION=7"],
        )
        saida = None
        features = json.loads(bytes(gdal.VSIGetMemFileBuffer_unsafe(memoria)))["features"]
    finally:
        gdal.Unlink(memoria)
    features = [feature for feature in features if feature.get("geometry")]
    for feature in features:
        feature["id"] = str(feature.get("id"))
    if not features:
        raise ValueError("A camada não contém geometrias disponíveis para visualização.")
    definicao = lyr.GetLayerDefn()
    return {
        "id": ident, "nome": arquivo.stem if ds.GetLayerCount() == 1 else lyr.GetName(),
        "vinculos": 1, "codificacao": "declarada pelo arquivo", "arquivo": caminho,
        "origem_geometria": "storage", "revisao": f"{estado.st_mtime_ns}-{estado.st_size}",
        "crs_arquivo": srs.ExportToWkt(),
        "campos": [{"nome": definicao.GetFieldDefn(i).GetName(), "tipo": definicao.GetFieldDefn(i).GetTypeName()}
                   for i in range(definicao.GetFieldCount())],
        "geojson": {"type": "FeatureCollection", "features": features},
    }


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

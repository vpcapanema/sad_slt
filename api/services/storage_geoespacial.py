"""Leitura das camadas do storage do SICARD (SFTPGo, contêiner sicard_storage).

O storage guarda arquivos brutos, editáveis no QGIS; nada aqui grava neles nem
os copia para o banco. As pastas viram grupos de camadas e cada camada de um
arquivo vetorial é servida em tiles MVT gerados pelo GDAL na hora, a partir do
próprio arquivo.

Na VM a pasta de dados do storage é montada somente leitura dentro do projeto
(docker-compose.vm.yml). O caminho é configurável por SICARD_STORAGE_DIR,
sempre relativo à raiz do projeto.

O storage é um só: o do SFTPGo da VM. Onde há montagem (VM, Codespace) ele é
lido como pasta; num servidor local sem montagem (Windows, sem FUSE) o mesmo
storage é lido pela API desse SFTPGo, e nunca pelos dois caminhos ao mesmo
tempo. Nesse modo não existe pasta de trabalho local: o GDAL abre o arquivo
onde ele está, por /vsicurl, buscando só os trechos de que precisa.
"""
from __future__ import annotations
from api.services.extracao_ogr import reproject as _gdal_reproject

import json
import os
import uuid
from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Any

from api.services import storage_pacotes, storage_remoto

import mercantile
from osgeo import gdal, ogr, osr

from api.path_policy import project_path

gdal.UseExceptions()

# Pastas do storage que o sistema publica para escrita (upload, criação de
# pastas). base-geodatabase guarda fontes brutas e só é lida pelo visualizador.
RAIZES: tuple[str, ...] = ("base-geoespacial", "superficies-indices")
RAIZES_LEITURA: tuple[str, ...] = ("base-geodatabase", *RAIZES, "saidas-geoespaciais")

EXTENSOES_VETOR = {".gpkg", ".geojson", ".json", ".fgb", ".shp", ".kml"}
EXTENSOES_RASTER = {".tif", ".tiff", ".img"}

# Margem do tile em unidades de extensão MVT (4096), a mesma do ST_AsMVTGeom
# das camadas do banco: evita cortes visíveis na borda entre tiles vizinhos.
_MARGEM_TILE = 64
_EXTENSAO_TILE = 4096
CAMPO_FID_TILE = "slt_fid"


def campo_fid_tile(camada: ogr.Layer) -> str:
    existentes = {
        camada.GetLayerDefn().GetFieldDefn(index).GetName().casefold()
        for index in range(camada.GetLayerDefn().GetFieldCount())
    }
    campo = CAMPO_FID_TILE
    while campo.casefold() in existentes:
        campo += "_"
    return campo


def diretorio_storage() -> Path:
    return project_path(os.getenv("SICARD_STORAGE_DIR", "data/storage"), label="storage")


def montado() -> bool:
    """O storage está acessível como pasta (montagem da VM ou FUSE do Codespace)?"""
    return any((diretorio_storage() / raiz).is_dir() for raiz in RAIZES)


def _via_api() -> bool:
    """Sem montagem, o storage é lido pela API do SFTPGo da VM."""
    return not montado() and storage_remoto.configurado()


def _listar(relativo: str) -> list[dict[str, Any]]:
    """Conteúdo de uma pasta do storage, venha ela da montagem ou da API."""
    if _via_api():
        try:
            itens = storage_remoto.listar(relativo, estrito=True)
        except storage_remoto.StorageIndisponivel as exc:
            raise FileNotFoundError("Pasta não encontrada no storage") from exc
        except FileNotFoundError as exc:
            raise FileNotFoundError("Pasta não encontrada no storage") from exc
    else:
        pasta = diretorio_storage().joinpath(*PurePosixPath(relativo).parts)
        if not pasta.is_dir():
            raise FileNotFoundError("Pasta não encontrada no storage")
        itens = [{"nome": i.name, "pasta": i.is_dir(), "tamanho": i.stat().st_size, "modificado": i.stat().st_mtime} for i in pasta.iterdir()]
    return sorted((i for i in itens if not str(i.get("nome") or "").startswith(".")),
                  key=lambda i: str(i.get("nome") or "").lower())


def _existe_pasta(relativo: str) -> bool:
    try:
        _listar(relativo)
    except (FileNotFoundError, OSError):
        return False
    return True


def _meta_remoto(relativo: str) -> dict[str, Any] | None:
    caminho = PurePosixPath(relativo)
    for item in storage_remoto.listar(caminho.parent.as_posix()):
        if item.get("nome") == caminho.name and not item.get("pasta"):
            return item
    return None


class ArquivoStorage(os.PathLike):
    """Arquivo lido onde ele está, no storage, sem cópia em disco.

    Expõe o mesmo punhado de atributos de Path que o restante do módulo usa,
    e como os.PathLike entrega ao GDAL e ao pyogrio o endereço /vsicurl.
    """

    __slots__ = ("relativo", "name", "stem", "suffix", "_tamanho", "_modificado")

    def __init__(self, relativo: str, tamanho: int, modificado: float) -> None:
        nome = PurePosixPath(relativo)
        self.relativo = relativo
        self.name, self.stem, self.suffix = nome.name, nome.stem, nome.suffix
        self._tamanho, self._modificado = int(tamanho), float(modificado)

    def __fspath__(self) -> str:
        # Renova a credencial a cada uso: o token do SFTPGo dura 20 minutos.
        storage_remoto.preparar_gdal()
        return storage_remoto.endereco_vsi(self.relativo)

    def __str__(self) -> str:
        return self.__fspath__()

    def __repr__(self) -> str:
        return f"ArquivoStorage({self.relativo!r})"

    def stat(self) -> os.stat_result:
        """Tamanho e data que o storage informa, no formato que Path.stat devolve."""
        nanos = int(self._modificado * 1_000_000_000)
        campos = [0] * 10
        campos[6] = self._tamanho
        campos[7] = campos[8] = campos[9] = int(self._modificado)
        return os.stat_result(
            tuple(campos),
            {"st_atime_ns": nanos, "st_mtime_ns": nanos, "st_ctime_ns": nanos},
        )

    def read_bytes(self) -> bytes:
        return storage_remoto.baixar(self.relativo)

    def with_suffix(self, suffix: str) -> "ArquivoStorage":
        return ArquivoStorage(str(PurePosixPath(self.relativo).with_suffix(suffix)), 0, 0.0)

    def exists(self) -> bool:
        try:
            return _meta_remoto(self.relativo) is not None
        except storage_remoto.StorageIndisponivel:
            return False

    def is_file(self) -> bool:
        return self.exists()

    def open(self, mode: str = "rb"):
        import io

        if mode != "rb":
            raise ValueError("O storage é lido somente em modo binário")
        return io.BytesIO(self.read_bytes())


def resolver(caminho: str) -> Path | ArquivoStorage:
    """Caminho relativo ao storage -> arquivo, recusando fuga e raízes não publicadas."""
    bruto = str(caminho or "").strip().replace("\\", "/")
    partes = PurePosixPath(bruto).parts
    if not partes or bruto.startswith("/") or ".." in partes or partes[0] not in RAIZES_LEITURA:
        raise ValueError("Caminho de camada inválido")
    if _via_api():
        relativo = "/".join(partes)
        try:
            meta = _meta_remoto(relativo)
        except storage_remoto.StorageIndisponivel as exc:
            raise FileNotFoundError("Camada não encontrada no storage") from exc
        if meta is None:
            raise FileNotFoundError("Camada não encontrada no storage")
        return ArquivoStorage(relativo, meta["tamanho"], meta["modificado"])
    alvo = diretorio_storage().joinpath(*partes)
    if not alvo.is_file():
        raise FileNotFoundError("Camada não encontrada no storage")
    return alvo


def _resolver_listado(relativo: str, item: dict[str, Any]) -> Path | ArquivoStorage:
    """Reutiliza os metadados da listagem, sem pedir a mesma pasta por arquivo.

    Chamado somente com entradas de _listar e caminhos já validados pela
    navegação/árvore; não mantém cache de diretórios que possa ocultar alterações.
    """
    if _via_api() and "tamanho" in item and "modificado" in item:
        return ArquivoStorage(relativo, item["tamanho"], item["modificado"])
    return resolver(relativo)


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
    # `arquivo` entra só como chave do cache; o pacote é reaberto na origem.
    return tuple(storage_pacotes.inventario(resolver(relativo), relativo))


def _itens_do_arquivo(arquivo: Path | ArquivoStorage, relativo: str) -> list[dict[str, Any]]:
    if arquivo.suffix.lower() in storage_pacotes.COMPACTADOS:
        estado=arquivo.stat()
        return [dict(item) for item in _inventario_pacote(str(relativo), relativo, (estado.st_mtime_ns, estado.st_size))]
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


def _grupo(relativo: str) -> dict[str, Any]:
    grupos, camadas = [], []
    for item in _listar(relativo):
        item_relativo = f"{relativo}/{item['nome']}"
        if item["pasta"]:
            grupos.append(_grupo(item_relativo))
        elif PurePosixPath(item["nome"]).suffix.lower() in EXTENSOES_VETOR | EXTENSOES_RASTER:
            camadas.extend(_itens_do_arquivo(_resolver_listado(item_relativo, item), item_relativo))
    return {"nome": PurePosixPath(relativo).name, "caminho": relativo,
            "grupos": grupos, "camadas": camadas}


def arvore(raiz: str) -> dict[str, Any]:
    """Pastas (grupos) e camadas de uma raiz publicada do storage."""
    if raiz not in RAIZES_LEITURA:
        raise ValueError("Pasta do storage não publicada")
    if not _existe_pasta(raiz):
        return {"nome": raiz, "caminho": raiz, "grupos": [], "camadas": [], "disponivel": False}
    return {**_grupo(raiz), "disponivel": True}


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
    for relativo in _percorrer(raiz):
        if PurePosixPath(relativo).suffix.lower() in storage_pacotes.COMPACTADOS:
            try:
                itens.extend(_itens_do_arquivo(resolver(relativo), relativo))
            except (ValueError, OSError, RuntimeError):
                continue
    return [c for c in itens if c["tipo"] == "vetor" and not c.get("erro")]


def _percorrer(relativo: str) -> Iterator[str]:
    """Caminhos relativos de todos os arquivos sob uma pasta do storage."""
    try:
        itens = _listar(relativo)
    except (FileNotFoundError, OSError):
        return
    for item in itens:
        filho = f"{relativo}/{item['nome']}"
        if item["pasta"]:
            yield from _percorrer(filho)
        else:
            yield filho


def navegar(caminho: str = "", detalhar: bool = True) -> dict[str, Any]:
    """Uma pasta do storage: subpastas e camadas vetoriais, para o explorador."""
    relativo = str(caminho or "").strip().replace("\\", "/").strip("/") or RAIZES[0]
    partes = PurePosixPath(relativo).parts
    if ".." in partes or partes[0] not in RAIZES_LEITURA:
        raise ValueError("Pasta do storage inválida")
    pastas, arquivos = [], []
    for item in _listar(relativo):
        nome = item["nome"]
        item_relativo = f"{relativo}/{nome}"
        sufixo = PurePosixPath(nome).suffix.lower()
        if item["pasta"]:
            pastas.append({"nome": nome, "caminho": item_relativo})
        elif not detalhar and sufixo in EXTENSOES_VETOR | storage_pacotes.COMPACTADOS:
            arquivos.append({'id': f'storage:{item_relativo}', 'nome': PurePosixPath(nome).stem,
                             'arquivo': item_relativo, 'formato': sufixo.lstrip('.').upper(),
                             'inventariar': True, 'tamanho_bytes': item.get('tamanho'), 'modificado_em': item.get('modificado')})
        elif sufixo in storage_pacotes.COMPACTADOS:
            try:
                arquivos.extend(c for c in _itens_do_arquivo(_resolver_listado(item_relativo, item), item_relativo)
                                if c.get("tipo") == "vetor" and not c.get("erro"))
            except (ValueError, OSError, RuntimeError):
                continue
        elif sufixo in EXTENSOES_VETOR:
            arquivos.extend({**c, "formato": sufixo.lstrip(".").upper()}
                            for c in _itens_do_arquivo(_resolver_listado(item_relativo, item), item_relativo)
                            if not c.get("erro"))
    pai = PurePosixPath(relativo).parent.as_posix() if len(partes) > 1 else None
    return {"caminho": relativo, "pai": pai, "pastas": pastas, "arquivos": arquivos}


def contagens(raiz: str) -> dict[str, int]:
    """Total de camadas vetoriais de cada pasta, incluindo suas subpastas.

    Usa o mesmo inventário da navegação, sem carregar feições no mapa.
    As camadas de um GeoPackage ou pacote contam individualmente.
    """
    if raiz not in RAIZES_LEITURA:
        raise ValueError("Pasta do storage não publicada")
    resultado: dict[str, int] = {}

    def contar(caminho: str) -> int:
        dados = navegar(caminho)
        total = len(dados["arquivos"]) + sum(contar(pasta["caminho"]) for pasta in dados["pastas"])
        resultado[caminho] = total
        return total

    contar(raiz)
    return resultado


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
        frame=_gdal_reproject(frame, "EPSG:4674")
        frame.geometry=shapely.force_2d(frame.geometry.values)
        return frame
    if arquivo.suffix.lower() not in EXTENSOES_VETOR:
        raise ValueError("A camada não é vetorial")
    frame = gpd.read_file(arquivo, layer=camada, engine="pyogrio", fid_as_index=True)
    campo_fid = 'slt_fid_origem'
    while campo_fid in frame.columns: campo_fid += '_'
    frame[campo_fid] = frame.index
    frame = frame.reset_index(drop=True)
    if frame.crs is None:
        raise ValueError(f"A camada {arquivo.name} não informa seu CRS")
    if frame.crs.to_epsg() != 4674:
        frame = _gdal_reproject(frame, "EPSG:4674")
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
    result = {
        "id": ident, "nome": arquivo.stem if ds.GetLayerCount() == 1 else lyr.GetName(),
        "vinculos": 1, "codificacao": "declarada pelo arquivo", "arquivo": caminho,
        "origem_geometria": "storage", "revisao": f"{estado.st_mtime_ns}-{estado.st_size}",
        "crs_arquivo": srs.ExportToWkt(),
        "campos": [{"nome": definicao.GetFieldDefn(i).GetName(), "tipo": definicao.GetFieldDefn(i).GetTypeName(),
                    "subtipo": ogr.GetFieldSubTypeName(definicao.GetFieldDefn(i).GetSubType())}
                   for i in range(definicao.GetFieldCount())],
        "geojson": {"type": "FeatureCollection", "features": features},
    }


    from api.services.metadados_previa import descrever_geojson
    result["metadados_local"] = descrever_geojson(result, arquivo=arquivo, formato=ds.GetDriver().ShortName, componente=lyr.GetName(), camada_ogr=lyr)
    return result

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
        campo_fid = campo_fid_tile(lyr)
        nome_sql = lyr.GetName().replace('"', '""')
        consulta = f'SELECT FID AS "{campo_fid}", * FROM "{nome_sql}"'
        gdal.VectorTranslate(
            destino, ds, format="MVT", SQLStatement=consulta, SQLDialect="OGRSQL",
            layerName="camada", spatFilter=filtro,
            datasetCreationOptions=[
                f"MINZOOM={z}", f"MAXZOOM={z}", "COMPRESS=NO", "FORMAT=DIRECTORY",
            ],
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

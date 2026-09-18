"""Upload de arquivo local para o storage do SICARD, na pasta escolhida no envio.

O arquivo é lido e validado antes, na inspeção (importar_camadas_service), que o
guarda em staging e devolve um token. Este módulo consome o token e grava no
storage da VM pela API do SFTPGo (storage_remoto): o storage é o único destino
dos arquivos enviados pela página de bases geoespaciais e pela bancada. Nada vai
para o banco nem para data/geoespacial/uploads.

Sem reprojeção nem recorte, sobem os arquivos como vieram (um pacote compactado
sobe já extraído). Com reprojeção ou recorte, sobe o resultado: GeoPackage para
vetor, GeoTIFF para raster. Arquivo que já existe na pasta não é sobrescrito.
"""
from __future__ import annotations

import os
import re
import shutil
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Callable

import fiona
import geopandas as gpd

from api.services import storage_remoto
from api.services.geospatial_upload_storage import discard_prepared
from api.services.importar_camadas_service import (
    _consume_inspection_ticket, _vector_layers, validate_raster,
)
from api.services.storage_geoespacial import (
    EXTENSOES_RASTER, EXTENSOES_VETOR, RAIZES, carregar_gdf, diretorio_storage,
)

_RESERVADOS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def pasta_destino(raiz: str | None) -> str:
    """Uma das pastas publicadas do storage; nada fora delas."""
    valor = str(raiz or "").strip().strip("/")
    if valor not in RAIZES:
        raise ValueError(f"Escolha a pasta de destino no storage: {' ou '.join(RAIZES)}.")
    return valor


def _nome_seguro(nome: str) -> str:
    base = PurePosixPath(str(nome or "").replace("\\", "/")).name.strip()
    if not base or base.startswith(".") or _RESERVADOS.search(base):
        raise ValueError(f"Nome de arquivo inválido para o storage: {nome!r}")
    return base


def _mascara(clip_layer_id: str | None) -> gpd.GeoDataFrame | None:
    if not clip_layer_id:
        return None
    if clip_layer_id.startswith("storage:"):
        return carregar_gdf(clip_layer_id)
    from api.services.geoespacial_service import geoespacial_service
    return geoespacial_service.obter_camada_dados(clip_layer_id)


def _arquivos_originais(ticket) -> list[tuple[str, Path]]:
    prepared = ticket.prepared
    if prepared.archive and prepared.extracted_path is not None:
        raiz = prepared.extracted_path
        arquivos = sorted(p for p in raiz.rglob("*") if p.is_file())
        if not arquivos:
            raise ValueError("O pacote não tem arquivos para enviar")
        return [(p.relative_to(raiz).as_posix(), p) for p in arquivos]
    return [(_nome_seguro(ticket.filename), prepared.original_path)]


def _arquivo_transformado(ticket, pasta_tmp: Path, target_crs: str | None,
                          mascara: gpd.GeoDataFrame | None) -> list[tuple[str, Path]]:
    prepared = ticket.prepared
    stem = Path(_nome_seguro(ticket.filename)).stem
    for sufixo in (".tar", ".zip"):
        stem = stem.removesuffix(sufixo)
    if prepared.category == "raster":
        import numpy as np
        import rasterio
        data, profile, _ = validate_raster(prepared.import_path, target_crs=target_crs, clip_frame=mascara)
        destino = pasta_tmp / f"{stem}.tif"
        with rasterio.open(destino, "w", driver="GTiff", height=data.shape[0], width=data.shape[1],
                           count=1, dtype="float32", crs=profile["crs"], transform=profile["transform"],
                           nodata=np.nan, compress="deflate") as saida:
            saida.write(data.astype("float32"), 1)
        return [(destino.name, destino)]
    destino = pasta_tmp / f"{stem}.gpkg"
    fonte = None if prepared.archive else stem
    for nome, frame in _vector_layers(prepared.import_path, prepared.category, fonte):
        if frame.crs is None:
            raise ValueError(f"A camada {nome} não informa seu CRS")
        if target_crs:
            frame = frame.to_crs(target_crs)
        if mascara is not None:
            frame = gpd.clip(frame, mascara.to_crs(frame.crs))
            if frame.empty:
                raise ValueError(f"O recorte não deixou nenhuma feição em {nome}")
        frame.to_file(destino, layer=str(nome), driver="GPKG", engine="pyogrio")
    return [(destino.name, destino)]


def _camadas(raiz: str, arquivos: list[tuple[str, Path]]) -> list[dict[str, Any]]:
    """Ids no formato do storage (storage:<caminho>::<camada>), como o explorador lista."""
    camadas: list[dict[str, Any]] = []
    for relativo, origem in arquivos:
        extensao = PurePosixPath(relativo).suffix.lower()
        caminho = f"{raiz}/{relativo}"
        nome_arquivo = PurePosixPath(relativo).stem
        if extensao in EXTENSOES_RASTER:
            camadas.append({"id": f"storage:{caminho}", "nome": nome_arquivo, "tipo": "raster", "arquivo": caminho})
        elif extensao in EXTENSOES_VETOR:
            try:
                nomes = fiona.listlayers(origem)
            except Exception:
                continue
            for nome in nomes:
                camadas.append({"id": f"storage:{caminho}::{nome}", "tipo": "vetor", "arquivo": caminho,
                                "nome": nome_arquivo if len(nomes) == 1 else nome})
    return camadas


def _espelhar_local(raiz: str, arquivos: list[tuple[str, Path]]) -> None:
    """Servidor local: a cópia do storage em data/storage recebe o mesmo arquivo.

    Na VM a pasta é o próprio storage, montado somente leitura; lá nada é copiado
    e o arquivo aparece pelo SFTPGo. Localmente, sem isto, o arquivo enviado não
    apareceria no explorador até a cópia ser sincronizada.
    """
    base = diretorio_storage()
    if not base.is_dir() or not os.access(base, os.W_OK):
        return
    for relativo, origem in arquivos:
        alvo = base / raiz / relativo
        if not alvo.exists():
            alvo.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem, alvo)


def enviar_ao_storage(token: str, raiz: str | None, *, target_crs: str | None = None,
                      clip_layer_id: str | None = None,
                      progress: Callable[[str], None] | None = None) -> dict[str, Any]:
    avisar = progress or (lambda _texto: None)
    destino = pasta_destino(raiz)
    if not storage_remoto.configurado():
        raise storage_remoto.StorageIndisponivel(
            "Envio ao storage não configurado: defina SICARD_STORAGE_API_USER e "
            "SICARD_STORAGE_API_PASSWORD no .env.")
    existentes = {item["nome"] for item in storage_remoto.listar(destino)}
    avisar(f"Pasta de destino conferida no storage: {destino}")
    ticket = _consume_inspection_ticket(token)
    try:
        mascara = _mascara(clip_layer_id)
        with tempfile.TemporaryDirectory(prefix="sicard_upload_") as tmp:
            if target_crs or mascara is not None:
                arquivos = _arquivo_transformado(ticket, Path(tmp), target_crs, mascara)
                avisar("Reprojeção e recorte aplicados ao arquivo de saída")
            else:
                arquivos = _arquivos_originais(ticket)
            repetidos = sorted({PurePosixPath(rel).parts[0] for rel, _ in arquivos} & existentes)
            if repetidos:
                raise FileExistsError(
                    f"Já existe em {destino}: {', '.join(repetidos)}. "
                    "Renomeie o arquivo ou escolha a outra pasta; o storage não é sobrescrito.")
            for indice, (relativo, origem) in enumerate(arquivos, 1):
                storage_remoto.enviar(f"{destino}/{relativo}", origem)
                avisar(f"Enviado ao storage ({indice}/{len(arquivos)}): {destino}/{relativo}")
            camadas = _camadas(destino, arquivos)
            _espelhar_local(destino, arquivos)
        avisar("Upload concluído no storage do SICARD")
        return {
            "status": "enviado",
            "pasta": destino,
            "arquivos": [f"{destino}/{rel}" for rel, _ in arquivos],
            "camadas": camadas,
            "quantidade": len(camadas),
        }
    finally:
        discard_prepared(ticket.prepared)

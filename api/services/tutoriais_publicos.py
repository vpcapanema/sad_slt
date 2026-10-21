"""Catalogo e leitura publica apenas das midias aprovadas no manifesto local."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
import re
from typing import Any

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse

from api.path_policy import project_path
from api.services.storage_remoto import StorageIndisponivel
from api.services.storage_httpfs import BLOCK, StorageHTTP
from api.storage_policy import montagem

logger = logging.getLogger(__name__)
BASE_URL = "/public/documentacao/tutoriais/midias/"
TIPOS = {
    "video": "video/mp4",
    "capa": "image/jpeg",
    "srt": "application/x-subrip",
    "vtt": "text/vtt",
}


def manifesto() -> dict[str, Any]:
    dados = json.loads(project_path("config/tutoriais-sicard.json").read_text(encoding="utf-8"))
    if dados.get("conteudo_publico") is not True or not re.fullmatch(
        r"aplicacao/documentacao/tutoriais/\d{8}-[a-f0-9]{16}",
        dados.get("diretorio_storage", ""),
    ):
        raise RuntimeError("Manifesto de tutoriais sem publicacao publica aprovada.")
    return dados


def catalogo() -> dict[str, Any]:
    dados = manifesto()
    return {"tutoriais": dados["tutoriais"], "ressalvas": dados["ressalvas"]}


def raiz_montada() -> Path | None:
    raiz = project_path(os.getenv("SICARD_STORAGE_DIR", "data/storage"), label="storage")
    return raiz.resolve() if montagem(raiz) else None


def _intervalo(valor: str, tamanho: int) -> tuple[int, int]:
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", valor)
    if match and any(match.groups()) and all(len(part) <= 20 for part in match.groups()):
        primeiro, ultimo = match.groups()
        if primeiro:
            inicio = int(primeiro)
            fim = min(int(ultimo), tamanho - 1) if ultimo else tamanho - 1
        else:
            inicio, fim = max(0, tamanho - int(ultimo)), tamanho - 1
        if 0 <= inicio <= fim < tamanho:
            return inicio, fim
    raise HTTPException(
        status_code=416,
        detail="Intervalo de midia invalido.",
        headers={"Content-Range": f"bytes */{tamanho}", "Accept-Ranges": "bytes"},
    )


def midia(request: Request, nome: str) -> Response:
    dados = manifesto()
    permitidos = {
        tutorial[campo]: tipo
        for tutorial in dados["tutoriais"]
        for campo, tipo in TIPOS.items()
    }
    if nome not in permitidos or "/" in nome or "\\" in nome or nome in {".", ".."}:
        raise HTTPException(status_code=404, detail="Midia de tutorial nao encontrada.")
    meta = dados["arquivos"][nome]
    tamanho = meta["bytes"]
    relativo = f'{dados["diretorio_storage"]}/{nome}'
    headers = {
        "Accept-Ranges": "bytes",
        "ETag": f'"{meta["sha256"]}"',
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        # A compressao alteraria os offsets dos trechos pedidos pelo player.
        "Content-Encoding": "identity",
    }
    inicio, fim = 0, tamanho - 1
    parcial = request.method != "HEAD" and "range" in request.headers
    if parcial and request.headers.get("if-range", headers["ETag"]) != headers["ETag"]:
        parcial = False
    if parcial:
        inicio, fim = _intervalo(request.headers["range"], tamanho)
        headers["Content-Range"] = f"bytes {inicio}-{fim}/{tamanho}"
    headers["Content-Length"] = str(fim - inicio + 1)
    raiz = raiz_montada()
    if raiz is not None:
        alvo = (raiz / relativo).resolve()
        if not alvo.is_relative_to(raiz):
            raise HTTPException(status_code=404, detail="Midia de tutorial nao encontrada.")
        try:
            stat = alvo.stat()
        except OSError as exc:
            logger.exception("Falha ao acessar midia montada: %s", nome)
            raise HTTPException(status_code=503, detail="Midia publicada inacessivel no Storage.") from exc
        if not alvo.is_file() or stat.st_size != tamanho:
            raise HTTPException(status_code=503, detail="Midia diverge do manifesto publicado.")
        if request.method == "HEAD":
            return Response(headers=headers, media_type=permitidos[nome])
        return FileResponse(alvo, media_type=permitidos[nome], headers=headers, stat_result=stat)

    remoto = StorageHTTP()
    try:
        info = remoto.info(relativo)
        if info["size"] != tamanho or info["mode"] & (1 << 31):
            raise HTTPException(status_code=503, detail="Midia diverge do manifesto publicado.")
        if request.method == "HEAD":
            remoto.client.close()
            return Response(headers=headers, media_type=permitidos[nome])
        primeiro = remoto.read(relativo, inicio, min(BLOCK, fim - inicio + 1))
        if not primeiro:
            raise OSError("Storage nao devolveu os bytes solicitados.")
    except (OSError, httpx.HTTPError, StorageIndisponivel) as exc:
        remoto.client.close()
        logger.exception("Falha ao abrir midia de tutorial no Storage: %s", nome)
        raise HTTPException(status_code=503, detail="Nao foi possivel ler a midia no Storage.") from exc
    except HTTPException:
        remoto.client.close()
        raise

    def blocos():
        try:
            yield primeiro
            offset = inicio + len(primeiro)
            while offset <= fim:
                bloco = remoto.read(relativo, offset, min(BLOCK, fim - offset + 1))
                if not bloco:
                    raise OSError("Storage interrompeu a leitura da midia.")
                yield bloco
                offset += len(bloco)
        except (OSError, httpx.HTTPError, StorageIndisponivel):
            logger.exception("Falha durante leitura de midia de tutorial: %s", nome)
            raise
        finally:
            remoto.client.close()

    return StreamingResponse(
        blocos(), status_code=206 if parcial else 200,
        headers=headers, media_type=permitidos[nome],
    )

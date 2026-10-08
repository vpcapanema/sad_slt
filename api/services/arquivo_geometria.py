"""Recepção do arquivo vetorial original enviado junto com uma geometria.

Compartilhado pelos cadastros de projeto, plano e programa: lê o arquivo,
confere que a geometria que ele contém é a mesma do payload e devolve os
metadados que o histórico de geometrias guarda.
"""
from __future__ import annotations

import hashlib
from pathlib import PurePosixPath
from typing import Any

from fastapi import HTTPException, UploadFile
from shapely import normalize
from shapely.geometry import shape

from api.geometria_parser import MAX_GEOMETRIA_UPLOAD_BYTES, parse_upload


async def receber_arquivo_geometria(
    upload: UploadFile, geometria: Any | None
) -> dict[str, Any]:
    """Valida o arquivo contra ``geometria`` (schema com ``tipo``/``coordinates``)."""
    if geometria is None:
        raise HTTPException(status_code=422, detail="O arquivo exige uma geometria no cadastro.")

    conteudo = await upload.read(MAX_GEOMETRIA_UPLOAD_BYTES + 1)
    if len(conteudo) > MAX_GEOMETRIA_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo maior que 50 MB.")

    nome_arquivo = PurePosixPath((upload.filename or "").replace("\\", "/")).name
    extensao = PurePosixPath(nome_arquivo).suffix.lower().lstrip(".")
    try:
        parsed = parse_upload(nome_arquivo, conteudo)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {exc}") from exc

    enviada = {"type": geometria.tipo, "coordinates": geometria.coordinates}
    do_arquivo = parsed["geojson"]["geometry"]
    if not normalize(shape(enviada)).equals_exact(normalize(shape(do_arquivo)), tolerance=1e-8):
        raise HTTPException(
            status_code=422,
            detail="A geometria do cadastro não corresponde ao arquivo vetorial enviado.",
        )

    return {
        "nome_arquivo": nome_arquivo,
        "extensao": extensao,
        "tipo_mime": upload.content_type or "application/octet-stream",
        "geometria_tipo": parsed["tipo"],
        "tamanho_bytes": len(conteudo),
        "sha256": hashlib.sha256(conteudo).hexdigest(),
        "conteudo_binario": conteudo,
    }

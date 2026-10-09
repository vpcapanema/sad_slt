"""Rotas HTTP — parse de geometria (upload)."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.geometria_parser import MAX_GEOMETRIA_UPLOAD_BYTES, parse_upload

router = APIRouter(tags=["geometria"])


@router.post("/geometria/parse")
def api_geometria_parse(file: UploadFile = File(...)):
    content = file.file.read()
    if len(content) > MAX_GEOMETRIA_UPLOAD_BYTES:
        raise HTTPException(413, "Arquivo maior que 50 MB.")
    try:
        parsed = parse_upload(file.filename or "", content)
        from api.services.normalizacao_demanda import normalizar
        geom = normalizar(parsed['geojson']['geometry'], crs_saida=4326)
        return {**parsed, 'tipo_original': parsed['tipo'], 'tipo': geom['type'],
                'coordinates': geom['coordinates'], 'geojson': {**parsed['geojson'], 'geometry': geom},
                'crs_armazenamento': 'EPSG:4674', 'buffer_ponto_m': 50, 'buffer_linha_m': 25}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Erro ao processar arquivo: {exc}") from exc

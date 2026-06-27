"""Rotas HTTP — catálogo geo (unidades espaciais de atuação)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from api.exceptions import DatabaseUnavailableError
from api.repositories import geo_repository

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/tipos")
async def listar_tipos() -> list[dict[str, Any]]:
    """Lista os tipos de regionalização (município, RA, RG, RM, UGRHI, zona ZEE...)."""
    try:
        return geo_repository.list_tipos()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/unidades/geojson")
async def unidades_geojson(ids: str = "") -> dict[str, Any]:
    """FeatureCollection das unidades informadas (ids separados por vírgula)."""
    id_list = [s.strip() for s in ids.split(",") if s.strip()]
    try:
        rows = geo_repository.geojson_by_ids(id_list)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": r["geojson"],
                "properties": {
                    "id": str(r["id"]),
                    "tipo_regionalizacao": r["tipo_regionalizacao"],
                    "codigo": r["codigo"],
                    "nome": r["nome"],
                },
            }
            for r in rows
        ],
    }


@router.get("/unidades")
async def listar_unidades(tipo: str | None = None) -> list[dict[str, Any]]:
    """Lista unidades espaciais (sem geometria), opcionalmente filtradas por tipo."""
    try:
        rows = geo_repository.list_unidades(tipo)
        return [
            {
                "id": str(r["id"]),
                "tipo_regionalizacao": r["tipo_regionalizacao"],
                "codigo": r["codigo"],
                "nome": r["nome"],
                "municipio_cod_ibge": r.get("municipio_cod_ibge"),
            }
            for r in rows
        ]
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

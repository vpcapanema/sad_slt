"""Rotas HTTP — catálogo geo (unidades espaciais de atuação)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from api.exceptions import DatabaseUnavailableError
from api.repositories import geo_repository
from api.schemas.geo_analyze import (
    ContainmentAnalyzeSchema,
    ContainmentResultSchema,
    LocateAnalyzeSchema,
    LocateResultSchema,
    ProgramaRegionalidadesSchema,
)

router = APIRouter(prefix="/geo", tags=["geo"])


def _containment_message(result: dict[str, Any], *, child: str, ref_kind: str) -> str:
    pct_in = result["pct_inside"]
    pct_out = result["pct_outside"]
    ref_label = {"plano": "plano vinculado", "programa": "programa vinculado"}.get(ref_kind, "vínculo")
    child_label = "programa" if child == "programa" else "projeto"
    area_label = "abrangência" if child == "programa" else "localização"

    if result["status"] == "inside":
        return ""

    if result["status"] == "outside":
        return (
            f"A {area_label} informada para o {child_label} está completamente fora da "
            f"área de abrangência do {ref_label} (0% dentro, 100% fora). "
            f"Confirme se não houve engano antes de continuar."
        )

    return (
        f"A {area_label} informada para o {child_label} sobrepõe parcialmente o {ref_label}: "
        f"{pct_in:.1f}% dentro e {pct_out:.1f}% fora. "
        f"Confirme se não houve engano antes de continuar."
    )


@router.post("/analyze/containment", response_model=ContainmentResultSchema)
async def analisar_containment(body: ContainmentAnalyzeSchema) -> ContainmentResultSchema:
    """Percentual dentro/fora da abrangência do vínculo institucional."""
    if not body.parent_unidade_ids:
        return ContainmentResultSchema(status="inside", pct_inside=100, pct_outside=0, message="")
    try:
        result = geo_repository.analyze_containment(
            parent_ids=body.parent_unidade_ids,
            geometry=body.geometry.model_dump() if body.geometry else None,
            unidade_ids=body.unidade_ids or None,
        )
        result["message"] = _containment_message(
            result, child=body.child_kind, ref_kind=body.ref_kind
        )
        return ContainmentResultSchema(**result)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/analyze/containment-programa", response_model=ContainmentResultSchema)
async def analisar_containment_programa(body: ContainmentAnalyzeSchema) -> ContainmentResultSchema:
    """Percentual da abrangência do programa dentro do plano vinculado."""
    body.child_kind = "programa"
    body.ref_kind = "plano"
    return await analisar_containment(body)


@router.post("/analyze/locate", response_model=LocateResultSchema)
async def analisar_localizacao(body: LocateAnalyzeSchema) -> LocateResultSchema:
    """Regionalidades oficiais onde a geometria do projeto se insere."""
    try:
        data = geo_repository.locate_geometry(body.geometry.model_dump())
        return LocateResultSchema(**data)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/analyze/programa-regionalidades")
async def analisar_programa_regionalidades(body: ProgramaRegionalidadesSchema) -> dict[str, Any]:
    """Regionalidades hierarquicamente maiores sobrepostas à abrangência do programa."""
    try:
        return geo_repository.programa_regionalidades_sobrepostas(body.unidade_ids)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


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

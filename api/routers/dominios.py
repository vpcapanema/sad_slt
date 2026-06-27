"""Rotas HTTP — domínios de referência."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError
from api.repositories import dominio_repository
from api.schemas.dominio import StatusDominioSchema, TipoDemandaSchema
from api.services.session_service import SessionUser

router = APIRouter(prefix="/dominios", tags=["dominios"])


def _map_status(rows: list[dict]) -> list[StatusDominioSchema]:
    return [
        StatusDominioSchema(
            codigo=row["codigo"],
            nome=row["nome"],
            descricao=row.get("descricao"),
            ordem=int(row["ordem"]),
        )
        for row in rows
    ]


@router.get("/status-demanda", response_model=list[StatusDominioSchema])
async def listar_status_demanda(
    _user: SessionUser = Depends(require_gestor),
) -> list[StatusDominioSchema]:
    try:
        return _map_status(dominio_repository.list_status_demanda())
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/status-objeto-ahp", response_model=list[StatusDominioSchema])
async def listar_status_objeto_ahp(
    _user: SessionUser = Depends(require_gestor),
) -> list[StatusDominioSchema]:
    try:
        return _map_status(dominio_repository.list_status_objeto_ahp())
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/tipo-demanda", response_model=list[TipoDemandaSchema])
async def listar_tipo_demanda(
    _user: SessionUser = Depends(require_gestor),
) -> list[TipoDemandaSchema]:
    try:
        return [
            TipoDemandaSchema(
                id=int(row["id"]),
                codigo=row["codigo"],
                nome=row["nome"],
                descricao=row.get("descricao"),
                ordem=int(row["ordem"]),
            )
            for row in dominio_repository.list_tipo_demanda()
        ]
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

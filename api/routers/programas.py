"""Rotas HTTP — programas (nível 2)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_gestor
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.objeto_ahp import AprovarDemandaSchema
from api.schemas.programa import ProgramaCreateSchema, ProgramaResponseSchema, ProgramaUpdateSchema
from api.services import programa_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/programas", tags=["programas"])


@router.post("", response_model=ProgramaResponseSchema, status_code=201)
async def criar_programa(body: ProgramaCreateSchema) -> ProgramaResponseSchema:
    """Cadastra um novo programa (nível 2)."""
    try:
        return programa_service.criar_programa(body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[ProgramaResponseSchema])
async def listar_programas() -> list[ProgramaResponseSchema]:
    """Lista os programas cadastrados."""
    try:
        return programa_service.listar_programas()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{codigo}", response_model=ProgramaResponseSchema)
async def obter_programa(codigo: str) -> ProgramaResponseSchema:
    """Obtém os detalhes de um programa pelo código."""
    try:
        return programa_service.obter_programa(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/aprovar", response_model=ProgramaResponseSchema)
async def aprovar_programa(
    codigo: str,
    body: AprovarDemandaSchema | None = None,
    user: SessionUser = Depends(require_gestor),
) -> ProgramaResponseSchema:
    """Promove o programa ao universo AHP (transição de status in-place)."""
    motivo = body.motivo if body else None
    aprovado_por = (body.aprovado_por if body else None) or user.id
    try:
        return programa_service.aprovar_programa(codigo, motivo=motivo, aprovado_por=aprovado_por)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=ProgramaResponseSchema)
async def atualizar_programa(
    codigo: str,
    body: ProgramaUpdateSchema,
    _user: SessionUser = Depends(require_gestor),
) -> ProgramaResponseSchema:
    """Atualiza um programa existente."""
    try:
        return programa_service.atualizar_programa(codigo, body)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/{codigo}", status_code=204)
async def excluir_programa(
    codigo: str,
    _user: SessionUser = Depends(require_gestor),
) -> None:
    """Exclui um programa (somente o registro do programa)."""
    try:
        programa_service.excluir_programa(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

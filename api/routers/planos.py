"""Rotas HTTP — planos (nível 1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.deps.auth import require_analyst, require_authenticated, require_gestor, require_operator
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.objeto_ahp import AprovarDemandaSchema, ReprovarDemandaSchema
from api.schemas.plano import PlanoCreateSchema, PlanoResponseSchema, PlanoUpdateSchema
from api.services import plano_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/planos", tags=["planos"])


@router.post("", response_model=PlanoResponseSchema, status_code=201)
async def criar_plano(body: PlanoCreateSchema) -> PlanoResponseSchema:
    """Cadastra um novo plano (nível 1)."""
    try:
        return plano_service.criar_plano(body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[PlanoResponseSchema])
async def listar_planos() -> list[PlanoResponseSchema]:
    """Lista os planos cadastrados."""
    try:
        return [item for item in plano_service.listar_planos() if item.status == "hierarq_ranqueada"]
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/vinculaveis", response_model=list[PlanoResponseSchema])
async def listar_planos_vinculaveis() -> list[PlanoResponseSchema]:
    """Lista os planos que podem ser selecionados como pai no cadastro."""
    try:
        return plano_service.listar_planos()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/internas", response_model=list[PlanoResponseSchema])
async def listar_planos_internos(
    _user: SessionUser = Depends(require_authenticated),
) -> list[PlanoResponseSchema]:
    return plano_service.listar_planos()


@router.get("/internas/{codigo}", response_model=PlanoResponseSchema)
async def obter_plano_interno(
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> PlanoResponseSchema:
    return plano_service.obter_plano(codigo)


@router.get("/{codigo}", response_model=PlanoResponseSchema)
async def obter_plano(codigo: str) -> PlanoResponseSchema:
    """Obtém os detalhes de um plano pelo código."""
    try:
        item = plano_service.obter_plano(codigo)
        if item.status != "hierarq_ranqueada":
            raise DemandaNotFoundError(codigo)
        return item
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/aprovar", response_model=PlanoResponseSchema)
async def aprovar_plano(
    codigo: str,
    body: AprovarDemandaSchema | None = None,
    user: SessionUser = Depends(require_analyst),
) -> PlanoResponseSchema:
    """Promove o plano ao universo AHP (transição de status in-place)."""
    motivo = body.motivo if body else None
    aprovado_por = (body.aprovado_por if body else None) or user.id
    try:
        return plano_service.aprovar_plano(codigo, motivo=motivo, aprovado_por=aprovado_por)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/reprovar", response_model=PlanoResponseSchema)
async def reprovar_plano(
    codigo: str,
    body: ReprovarDemandaSchema,
    user: SessionUser = Depends(require_analyst),
) -> PlanoResponseSchema:
    """Reprova um plano em análise mediante justificativa obrigatória."""
    try:
        return plano_service.reprovar_plano(
            codigo,
            justificativa=body.justificativa,
            reprovado_por=body.reprovado_por or user.id,
        )
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=PlanoResponseSchema)
async def atualizar_plano(
    codigo: str,
    body: PlanoUpdateSchema,
    _user: SessionUser = Depends(require_operator),
) -> PlanoResponseSchema:
    """Atualiza um plano existente."""
    try:
        return plano_service.atualizar_plano(codigo, body)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/{codigo}", status_code=204)
async def excluir_plano(
    codigo: str,
    _user: SessionUser = Depends(require_gestor),
) -> None:
    """Exclui um plano (somente o registro do plano)."""
    try:
        plano_service.excluir_plano(codigo)
    except DemandaNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

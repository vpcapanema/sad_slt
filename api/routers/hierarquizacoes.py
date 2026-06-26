"""Rotas HTTP — Hierarquização de Projetos (portfólio).

CRUD e cálculo usam sessão opcional (registra o autor se logado); a homologação
exige gestor autenticado.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import get_optional_session, require_gestor
from api.exceptions import (
    ConfigMulticriterioNotFoundError,
    DatabaseUnavailableError,
    DemandaValidationError,
    HierarquizacaoNotFoundError,
)
from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoResponseSchema,
    HierarquizacaoUpdateSchema,
)
from api.services import hierarquizacao_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/hierarquizacoes", tags=["ahp-hierarquizacoes"])


@router.post("", response_model=HierarquizacaoResponseSchema, status_code=201)
async def criar_hierarquizacao(
    body: HierarquizacaoCreateSchema,
    user: SessionUser | None = Depends(get_optional_session),
) -> HierarquizacaoResponseSchema:
    try:
        return service.criar_hierarquizacao(body, criado_por=user.id if user else None)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[HierarquizacaoResponseSchema])
async def listar_hierarquizacoes(
    status: str | None = Query(None),
    grupo: str | None = Query(None),
    _user: SessionUser | None = Depends(get_optional_session),
) -> list[HierarquizacaoResponseSchema]:
    try:
        return service.listar_hierarquizacoes(status=status, grupo=grupo)
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{codigo}", response_model=HierarquizacaoResponseSchema)
async def obter_hierarquizacao(
    codigo: str,
    _user: SessionUser | None = Depends(get_optional_session),
) -> HierarquizacaoResponseSchema:
    try:
        return service.obter_hierarquizacao(codigo)
    except HierarquizacaoNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{codigo}", response_model=HierarquizacaoResponseSchema)
async def atualizar_hierarquizacao(
    codigo: str,
    body: HierarquizacaoUpdateSchema,
    _user: SessionUser | None = Depends(get_optional_session),
) -> HierarquizacaoResponseSchema:
    try:
        return service.atualizar_hierarquizacao(codigo, body)
    except HierarquizacaoNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/calcular", response_model=HierarquizacaoResponseSchema)
async def calcular_hierarquizacao(
    codigo: str,
    _user: SessionUser | None = Depends(get_optional_session),
) -> HierarquizacaoResponseSchema:
    try:
        return service.calcular_hierarquizacao(codigo)
    except (HierarquizacaoNotFoundError, ConfigMulticriterioNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{codigo}/homologar", response_model=HierarquizacaoResponseSchema)
async def homologar_hierarquizacao(
    codigo: str,
    user: SessionUser = Depends(require_gestor),
) -> HierarquizacaoResponseSchema:
    try:
        return service.homologar_hierarquizacao(codigo, homologado_por=user.id)
    except HierarquizacaoNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

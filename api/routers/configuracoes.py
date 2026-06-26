"""Rotas HTTP — Configuração da Análise Multicritério (avulsa e portfólio).

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
)
from api.schemas.config_multicriterio import (
    ConfigCreateSchema,
    ConfigResponseSchema,
    ConfigUpdateSchema,
)
from api.services import config_multicriterio_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/configuracoes", tags=["ahp-configuracoes"])


@router.post("", response_model=ConfigResponseSchema, status_code=201)
async def criar_config(
    body: ConfigCreateSchema,
    user: SessionUser | None = Depends(get_optional_session),
) -> ConfigResponseSchema:
    try:
        return service.criar_config(body, criado_por=user.id if user else None)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[ConfigResponseSchema])
async def listar_configs(
    tipo: str = Query(..., description="avulsa | portfolio"),
    status: str | None = Query(None),
    grupo: str | None = Query(None),
    _user: SessionUser | None = Depends(get_optional_session),
) -> list[ConfigResponseSchema]:
    try:
        return service.listar_configs(tipo, status=status, grupo=grupo)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{tipo}/{codigo}", response_model=ConfigResponseSchema)
async def obter_config(
    tipo: str,
    codigo: str,
    _user: SessionUser | None = Depends(get_optional_session),
) -> ConfigResponseSchema:
    try:
        return service.obter_config(tipo, codigo)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{tipo}/{codigo}", response_model=ConfigResponseSchema)
async def atualizar_config(
    tipo: str,
    codigo: str,
    body: ConfigUpdateSchema,
    _user: SessionUser | None = Depends(get_optional_session),
) -> ConfigResponseSchema:
    try:
        return service.atualizar_config(tipo, codigo, body)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{tipo}/{codigo}/calcular", response_model=ConfigResponseSchema)
async def calcular_config(
    tipo: str,
    codigo: str,
    _user: SessionUser | None = Depends(get_optional_session),
) -> ConfigResponseSchema:
    try:
        return service.calcular_config(tipo, codigo)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{tipo}/{codigo}/homologar", response_model=ConfigResponseSchema)
async def homologar_config(
    tipo: str,
    codigo: str,
    user: SessionUser = Depends(require_gestor),
) -> ConfigResponseSchema:
    try:
        return service.homologar_config(tipo, codigo, homologado_por=user.id)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

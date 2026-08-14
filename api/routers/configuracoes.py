"""Rotas HTTP — Configuração da Análise Multicritério (avulsa e portfólio).

CRUD e cálculo usam sessão opcional (registra o autor se logado); a homologação
exige gestor autenticado.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.deps.auth import require_analyst, require_authenticated, require_gestor
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
from api.repositories import config_multicriterio_repository as repository
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/configuracoes", tags=["ahp-configuracoes"])


@router.post("", response_model=ConfigResponseSchema, status_code=201)
async def criar_config(
    body: ConfigCreateSchema,
    user: SessionUser = Depends(require_analyst),
) -> ConfigResponseSchema:
    try:
        return service.criar_config(body, criado_por=user.id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("", response_model=list[ConfigResponseSchema])
async def listar_configs(
    tipo: str = Query(..., description="avulsa | portfolio"),
    status: str | None = Query(None),
    tipo_demanda: str | None = Query(None, description="plano | programa | projeto"),
    _user: SessionUser = Depends(require_authenticated),
) -> list[ConfigResponseSchema]:
    try:
        return service.listar_configs(tipo, status=status, tipo_demanda=tipo_demanda)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{tipo}/{codigo}", response_model=ConfigResponseSchema)
async def obter_config(
    tipo: str,
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> ConfigResponseSchema:
    try:
        return service.obter_config(tipo, codigo)
    except ConfigMulticriterioNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{tipo}/{codigo}/matriz-excel", response_class=Response)
async def baixar_matriz_excel(
    tipo: str,
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> Response:
    try:
        arquivo = repository.get_excel_matriz(tipo, codigo)
        if not arquivo:
            return Response(status_code=204)
        conteudo, nome = arquivo
        return Response(
            content=conteudo,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'inline; filename="{nome}"'},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/{tipo}/{codigo}", response_model=ConfigResponseSchema)
async def atualizar_config(
    tipo: str,
    codigo: str,
    body: ConfigUpdateSchema,
    _user: SessionUser = Depends(require_analyst),
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
    _user: SessionUser = Depends(require_analyst),
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

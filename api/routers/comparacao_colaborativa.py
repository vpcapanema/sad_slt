"""Rotas HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.deps.auth import require_analyst, require_authenticated
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbienteColaborativoUpdateSchema,
    AmbientePublicoSchema,
    AnaliseColaborativaCreateSchema,
    AnaliseColaborativaResponseSchema,
    RespostaColaborativaCreateSchema,
    RespostaColaborativaInicioSchema,
    RespostaColaborativaProgressoSchema,
    RespostaColaborativaResponseSchema,
    RespostaColaborativaUpdateSchema,
    RespostaCentralResponseSchema,
)
from api.services import comparacao_colaborativa_service as service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/comparacao-colaborativa", tags=["ahp-comparacao-colaborativa"])


@router.get("/configuracoes")
async def listar_configuracoes_origem(
    _user: SessionUser = Depends(require_authenticated),
) -> list[dict]:
    try:
        return service.listar_configuracoes_origem()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/respostas", response_model=list[RespostaCentralResponseSchema])
async def listar_respostas_central(
    _user: SessionUser = Depends(require_authenticated),
) -> list[RespostaCentralResponseSchema]:
    """Lista global da Central de respostas colaborativas."""
    try:
        return service.listar_respostas_central()
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.get("/ambientes", response_model=list[AmbienteColaborativoResponseSchema])
async def listar_ambientes(
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> list[AmbienteColaborativoResponseSchema]:
    try:
        return service.listar_ambientes(base_url=_base_url(request))
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/ambientes", response_model=AmbienteColaborativoResponseSchema, status_code=201)
async def criar_ambiente(
    body: AmbienteColaborativoCreateSchema,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    """Cria ambiente colaborativo com convites e prazo."""
    try:
        return service.criar_ambiente(body, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/ambientes/{ambiente_id}", response_model=AmbienteColaborativoResponseSchema)
async def atualizar_ambiente(
    ambiente_id: str,
    body: AmbienteColaborativoUpdateSchema,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    try:
        return service.atualizar_ambiente(ambiente_id, body, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/ambientes/{ambiente_id}", status_code=204)
async def excluir_ambiente(
    ambiente_id: str,
    _user: SessionUser = Depends(require_analyst),
) -> None:
    try:
        service.excluir_ambiente(ambiente_id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/respostas/{resposta_id}", response_model=RespostaColaborativaResponseSchema)
async def atualizar_resposta(
    resposta_id: str,
    body: RespostaColaborativaUpdateSchema,
    _user: SessionUser = Depends(require_analyst),
) -> RespostaColaborativaResponseSchema:
    try:
        return service.atualizar_resposta(resposta_id, body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/respostas/{resposta_id}", status_code=204)
async def excluir_resposta(
    resposta_id: str,
    _user: SessionUser = Depends(require_analyst),
) -> None:
    try:
        service.excluir_resposta(resposta_id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# Rotas com sufixo fixo registradas antes de "/ambientes/{tipo}/{codigo}"
# para não serem capturadas pela rota genérica de dois segmentos.
@router.get(
    "/hierarquizacoes/{hierarquizacao_id}/ambientes",
    response_model=list[AmbienteColaborativoResponseSchema],
)
async def listar_ambientes_hierarquizacao(
    hierarquizacao_id: UUID,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> list[AmbienteColaborativoResponseSchema]:
    """Lista todos os julgamentos colaborativos de uma hierarquização."""
    try:
        return service.listar_ambientes_hierarquizacao(hierarquizacao_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/respostas", response_model=list[RespostaColaborativaResponseSchema])
async def listar_respostas(
    ambiente_id: str,
    _user: SessionUser = Depends(require_authenticated),
) -> list[RespostaColaborativaResponseSchema]:
    """Lista respostas recebidas (gestor da análise)."""
    try:
        return service.listar_respostas(ambiente_id)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/espaco-analitico")
async def obter_espaco_analitico(ambiente_id: str, request: Request, _user: SessionUser = Depends(require_authenticated)) -> dict:
    try:
        return service.obter_espaco_analitico(ambiente_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/analises", response_model=list[AnaliseColaborativaResponseSchema])
async def listar_analises(ambiente_id: str, _user: SessionUser = Depends(require_authenticated)) -> list[AnaliseColaborativaResponseSchema]:
    return service.listar_analises(ambiente_id)


@router.post("/ambientes/{ambiente_id}/analises", response_model=AnaliseColaborativaResponseSchema, status_code=201)
async def criar_analise(ambiente_id: str, body: AnaliseColaborativaCreateSchema, user: SessionUser = Depends(require_analyst)) -> AnaliseColaborativaResponseSchema:
    try:
        return service.criar_analise(ambiente_id, body, str(user.id))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/analises/{analise_id}/homologar", response_model=AnaliseColaborativaResponseSchema)
async def homologar_analise(analise_id: str, user: SessionUser = Depends(require_analyst)) -> AnaliseColaborativaResponseSchema:
    try:
        return service.homologar_analise(analise_id, str(user.id))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}", response_model=AmbienteColaborativoResponseSchema)
async def obter_ambiente_id(
    ambiente_id: str,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> AmbienteColaborativoResponseSchema:
    """Obtém todas as informações persistidas do ambiente colaborativo."""
    try:
        return service.obter_ambiente_id(ambiente_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/ambientes/{ambiente_id}/consolidar", response_model=AmbienteColaborativoResponseSchema)
async def consolidar_ambiente(
    ambiente_id: str,
    request: Request,
    _user: SessionUser = Depends(require_analyst),
) -> AmbienteColaborativoResponseSchema:
    """Consolida as respostas consistentes por média geométrica (AIJ)."""
    try:
        return service.consolidar_ambiente(ambiente_id, base_url=_base_url(request))
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/hierarquizacoes/{hierarquizacao_id}/ambiente", response_model=AmbienteColaborativoResponseSchema)
async def obter_ambiente_hierarquizacao(
    hierarquizacao_id: UUID,
    request: Request,
    _user: SessionUser = Depends(require_authenticated),
) -> AmbienteColaborativoResponseSchema:
    """Obtém o ambiente colaborativo mais recente de uma configuração."""
    try:
        amb = service.obter_ambiente_hierarquizacao(hierarquizacao_id, base_url=_base_url(request))
        if not amb:
            raise HTTPException(status_code=404, detail="Ambiente colaborativo não encontrado.")
        return amb
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/publico/{token}", response_model=AmbientePublicoSchema)
async def obter_ambiente_publico(
    token: str,
    email: str | None = Query(None),
) -> AmbientePublicoSchema:
    """Metadados públicos do ambiente (participante)."""
    try:
        return service.obter_ambiente_publico(token, email=email)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/publico/{token}/respostas", response_model=RespostaColaborativaResponseSchema, status_code=201)
async def enviar_resposta(
    token: str,
    body: RespostaColaborativaCreateSchema,
) -> RespostaColaborativaResponseSchema:
    """Envia resposta colaborativa (RC < 0,10 obrigatório)."""
    try:
        return service.registrar_resposta(token, body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/publico/{token}/respostas/iniciar", response_model=RespostaColaborativaResponseSchema)
async def iniciar_resposta_publica(
    token: str, body: RespostaColaborativaInicioSchema
) -> RespostaColaborativaResponseSchema:
    try:
        return service.iniciar_resposta(token, body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/publico/{token}/respostas/progresso", response_model=RespostaColaborativaResponseSchema)
async def salvar_progresso_resposta_publica(
    token: str, body: RespostaColaborativaProgressoSchema
) -> RespostaColaborativaResponseSchema:
    try:
        return service.salvar_progresso_resposta(token, body)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

"""Rotas HTTP — análise de admissibilidade da demanda (seção «Análise»)."""
from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response

from api.deps.auth import require_analyst, require_authenticated
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.analise_demanda import (
    AnaliseDemandaResponseSchema,
    ComplementoParecerSchema,
    CriteriosAnaliseSchema,
    DecisaoAnaliseResponseSchema,
    DecisaoAnaliseSchema,
)
from api.services import analise_demanda_service
from api.services.session_service import SessionUser

router = APIRouter(prefix="/analise", tags=["analise-demanda"])


def _erro_http(exc: Exception) -> HTTPException:
    if isinstance(exc, DemandaNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, DemandaValidationError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=503, detail=str(exc))


@router.get("/{codigo}", response_model=AnaliseDemandaResponseSchema)
async def obter_analise(
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> AnaliseDemandaResponseSchema:
    """Análise atual da demanda — critérios em branco quando ainda não avaliada."""
    try:
        return analise_demanda_service.obter_analise(codigo)
    except (DemandaNotFoundError, DemandaValidationError, DatabaseUnavailableError) as exc:
        raise _erro_http(exc) from exc


@router.put("/{codigo}/criterios", response_model=AnaliseDemandaResponseSchema)
async def salvar_criterios(
    codigo: str,
    body: CriteriosAnaliseSchema,
    user: SessionUser = Depends(require_analyst),
) -> AnaliseDemandaResponseSchema:
    """Grava as cinco respostas, recalcula o resultado e regenera o parecer."""
    try:
        return analise_demanda_service.salvar_criterios(codigo, body, user=user)
    except (DemandaNotFoundError, DemandaValidationError, DatabaseUnavailableError) as exc:
        raise _erro_http(exc) from exc


@router.put("/{codigo}/complemento", response_model=AnaliseDemandaResponseSchema)
async def salvar_complemento(
    codigo: str,
    body: ComplementoParecerSchema,
    user: SessionUser = Depends(require_analyst),
) -> AnaliseDemandaResponseSchema:
    """Grava a complementação do parecer (adicional ao texto gerado)."""
    try:
        return analise_demanda_service.salvar_complemento(codigo, body.complemento, user=user)
    except (DemandaNotFoundError, DemandaValidationError, DatabaseUnavailableError) as exc:
        raise _erro_http(exc) from exc


@router.post("/{codigo}/decidir", response_model=DecisaoAnaliseResponseSchema)
async def decidir(
    codigo: str,
    body: DecisaoAnaliseSchema,
    user: SessionUser = Depends(require_analyst),
) -> DecisaoAnaliseResponseSchema:
    """Aplica a transição de status, gera o parecer em PDF e o persiste."""
    try:
        analise, status_anterior, status_atual = analise_demanda_service.decidir(
            codigo, body.decisao, user=user
        )
    except (DemandaNotFoundError, DemandaValidationError, DatabaseUnavailableError) as exc:
        raise _erro_http(exc) from exc
    return DecisaoAnaliseResponseSchema(
        analise=analise,
        status_anterior=status_anterior,
        status_atual=status_atual,
        pdf_url=f"/api/analise/{quote(analise.demanda_codigo, safe='')}/parecer.pdf",
    )


@router.get("/{codigo}/parecer.pdf")
async def baixar_parecer_pdf(
    codigo: str,
    _user: SessionUser = Depends(require_authenticated),
) -> Response:
    """Devolve o PDF do parecer já persistido para a demanda."""
    try:
        codigo_demanda, pdf = analise_demanda_service.obter_pdf(codigo)
    except (DemandaNotFoundError, DemandaValidationError, DatabaseUnavailableError) as exc:
        raise _erro_http(exc) from exc
    nome_arquivo = f"parecer-analise-{codigo_demanda}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )

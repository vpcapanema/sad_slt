"""Recebimento da pesquisa publica de experiencia do SICARD."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status

from api.exceptions import DemandaValidationError
from api.repositories import convite_individual_repository, pesquisa_experiencia_repository
from api.schemas.pesquisa_experiencia import (
    PesquisaExperienciaAHPAcesso,
    PesquisaExperienciaAHPAcessoPublico,
    PesquisaExperienciaAHPEntrada,
    PesquisaExperienciaAvaliacao,
    PesquisaExperienciaEntrada,
    PesquisaExperienciaResultado,
)
from api.services.comparacao_colaborativa_service import _validar_email_token, inscricao_publica_enviada, nome_cookie_inscricao

router = APIRouter(prefix="/pesquisa-experiencia", tags=["pesquisa-experiencia"])


def calcular_indice(dados: PesquisaExperienciaAvaliacao) -> float:
    notas = dados.notas()
    return round((sum(notas) - len(notas)) * 100 / (len(notas) * (dados.escala_maxima - 1)), 2)


def _registrar(dados: PesquisaExperienciaAvaliacao, response: Response, escopo: str) -> PesquisaExperienciaResultado:
    response.headers["Cache-Control"] = "no-store"
    indice = calcular_indice(dados)
    try:
        pesquisa_experiencia_repository.criar(
            {**dados.model_dump(exclude={"website"}), "escopo": escopo}, indice,
        )
    except DemandaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc), headers={"Cache-Control": "no-store"}) from exc
    return PesquisaExperienciaResultado(indice_experiencia=indice)


@router.post("/respostas", response_model=PesquisaExperienciaResultado, status_code=status.HTTP_201_CREATED)
def registrar_resposta(dados: PesquisaExperienciaEntrada, response: Response) -> PesquisaExperienciaResultado:
    return _registrar(dados, response, "sicard")


def _validar_acesso_ahp(
    acesso: PesquisaExperienciaAHPAcesso | PesquisaExperienciaAHPAcessoPublico, request: Request,
) -> None:
    if isinstance(acesso, PesquisaExperienciaAHPAcessoPublico):
        segredo = request.cookies.get(nome_cookie_inscricao(acesso.julgamento))
        if acesso.email and acesso.token_acesso:
            segredo = acesso.token_acesso.get_secret_value()
        if inscricao_publica_enviada(acesso.julgamento, segredo, email=acesso.email):
            return
        raise HTTPException(
            status_code=422,
            detail={"codigo": "inscricao_invalida",
                    "mensagem": "Abra a pesquisa no navegador usado para enviar o julgamento ou confira o e-mail e o código de retomada."},
            headers={"Cache-Control": "no-store"},
        )
    email = acesso.email.strip().lower()
    chave = acesso.token_acesso.get_secret_value()
    try:
        ambiente = convite_individual_repository.localizar_julgamento(email, chave)
        if ambiente is None:
            raise DemandaValidationError("Confira o e-mail e a chave individual do convite.", field="token_acesso")
        _validar_email_token(ambiente, email, chave)
    except DemandaValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"codigo": "convite_invalido", "mensagem": str(exc)},
            headers={"Cache-Control": "no-store"},
        ) from exc


@router.post("/ahp/acesso", status_code=status.HTTP_204_NO_CONTENT)
def validar_acesso_ahp(
    acesso: PesquisaExperienciaAHPAcessoPublico | PesquisaExperienciaAHPAcesso, request: Request, response: Response,
) -> None:
    response.headers["Cache-Control"] = "no-store"
    _validar_acesso_ahp(acesso, request)


@router.post("/ahp/respostas", response_model=PesquisaExperienciaResultado, status_code=status.HTTP_201_CREATED)
def registrar_resposta_ahp(
    dados: PesquisaExperienciaAHPEntrada, request: Request, response: Response,
) -> PesquisaExperienciaResultado:
    _validar_acesso_ahp(dados.acesso, request)
    return _registrar(dados, response, "ahp_interativa")

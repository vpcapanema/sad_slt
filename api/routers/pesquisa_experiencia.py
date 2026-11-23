"""Recebimento da pesquisa publica de experiencia do SICARD."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from api.exceptions import DemandaValidationError
from api.repositories import convite_individual_repository, pesquisa_experiencia_repository
from api.schemas.pesquisa_experiencia import (
    PesquisaExperienciaAHPAcesso,
    PesquisaExperienciaAHPEntrada,
    PesquisaExperienciaEntrada,
    PesquisaExperienciaResultado,
)
from api.services.comparacao_colaborativa_service import _validar_email_token

router = APIRouter(prefix="/pesquisa-experiencia", tags=["pesquisa-experiencia"])


def calcular_indice(dados: PesquisaExperienciaEntrada) -> float:
    notas = dados.notas()
    return round((sum(notas) - len(notas)) * 100 / (len(notas) * (dados.escala_maxima - 1)), 2)


def _registrar(dados: PesquisaExperienciaEntrada, response: Response, escopo: str) -> PesquisaExperienciaResultado:
    response.headers["Cache-Control"] = "no-store"
    indice = calcular_indice(dados)
    pesquisa_experiencia_repository.criar(
        {**dados.model_dump(exclude={"website"}), "escopo": escopo}, indice,
    )
    return PesquisaExperienciaResultado(indice_experiencia=indice)


@router.post("/respostas", response_model=PesquisaExperienciaResultado, status_code=status.HTTP_201_CREATED)
def registrar_resposta(dados: PesquisaExperienciaEntrada, response: Response) -> PesquisaExperienciaResultado:
    return _registrar(dados, response, "sicard")


def _validar_acesso_ahp(acesso: PesquisaExperienciaAHPAcesso) -> None:
    email = acesso.email.strip().lower()
    chave = acesso.token_acesso.get_secret_value()
    try:
        ambiente = convite_individual_repository.localizar_julgamento(email, chave)
        if ambiente is None:
            raise DemandaValidationError("Confira o e-mail e a chave individual do convite.", field="token_acesso")
        _validar_email_token(ambiente, email, chave)
    except DemandaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc),
                            headers={"Cache-Control": "no-store"}) from exc


@router.post("/ahp/acesso", status_code=status.HTTP_204_NO_CONTENT)
def validar_acesso_ahp(acesso: PesquisaExperienciaAHPAcesso, response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    _validar_acesso_ahp(acesso)


@router.post("/ahp/respostas", response_model=PesquisaExperienciaResultado, status_code=status.HTTP_201_CREATED)
def registrar_resposta_ahp(dados: PesquisaExperienciaAHPEntrada, response: Response) -> PesquisaExperienciaResultado:
    _validar_acesso_ahp(dados.acesso)
    return _registrar(dados, response, "ahp_interativa")

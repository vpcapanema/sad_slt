"""Recebimento da pesquisa publica de experiencia do SICARD."""
from __future__ import annotations

from fastapi import APIRouter, Response, status

from api.repositories import pesquisa_experiencia_repository
from api.schemas.pesquisa_experiencia import PesquisaExperienciaEntrada, PesquisaExperienciaResultado

router = APIRouter(prefix="/pesquisa-experiencia", tags=["pesquisa-experiencia"])


def calcular_indice(dados: PesquisaExperienciaEntrada) -> float:
    notas = dados.notas()
    return round((sum(notas) - len(notas)) * 100 / (len(notas) * (dados.escala_maxima - 1)), 2)


@router.post("/respostas", response_model=PesquisaExperienciaResultado, status_code=status.HTTP_201_CREATED)
def registrar_resposta(dados: PesquisaExperienciaEntrada, response: Response) -> PesquisaExperienciaResultado:
    response.headers["Cache-Control"] = "no-store"
    indice = calcular_indice(dados)
    pesquisa_experiencia_repository.criar(
        dados.model_dump(exclude={"website"}), indice,
    )
    return PesquisaExperienciaResultado(indice_experiencia=indice)

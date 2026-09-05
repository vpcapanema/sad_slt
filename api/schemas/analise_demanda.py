"""Schemas Pydantic — análise de admissibilidade da demanda (seção «Análise»)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DecisaoAnalise = Literal["aprovada", "ressalvas", "reprovada"]
ResultadoAnalise = Literal["aprovado", "reprovado"]


class CriteriosAnaliseSchema(BaseModel):
    """As cinco respostas binárias do portão de entrada.

    `None` significa «ainda não respondido» — a decisão só é aceita com os cinco
    critérios preenchidos.
    """

    criterio_competencia: bool | None = None
    criterio_clareza: bool | None = None
    criterio_finalidade_publica: bool | None = None
    criterio_relevancia_setorial: bool | None = None
    criterio_nao_duplicidade: bool | None = None


class ComplementoParecerSchema(BaseModel):
    complemento: str | None = Field(None, max_length=5000)


class DecisaoAnaliseSchema(BaseModel):
    decisao: DecisaoAnalise


class CriterioAvaliadoSchema(BaseModel):
    campo: str
    rotulo: str
    pergunta: str
    resposta: bool | None = None


class AnaliseDemandaResponseSchema(BaseModel):
    demanda_codigo: str
    demanda_tipo: str
    demanda_nome: str | None = None
    demanda_status: str | None = None
    criterios: list[CriterioAvaliadoSchema] = Field(default_factory=list)
    respondidos: int = 0
    total_criterios: int = 0
    sim: int = 0
    nao: int = 0
    completo: bool = False
    resultado: ResultadoAnalise | None = None
    parecer_texto: str | None = None
    parecer_complemento: str | None = None
    decisao: DecisaoAnalise | None = None
    avaliador_nome: str | None = None
    tem_parecer_pdf: bool = False
    parecer_pdf_gerado_em: str | None = None
    atualizado_em: str | None = None


class DecisaoAnaliseResponseSchema(BaseModel):
    analise: AnaliseDemandaResponseSchema
    status_anterior: str
    status_atual: str
    pdf_url: str

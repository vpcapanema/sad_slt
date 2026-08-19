"""Contrato HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ConviteColaborativoSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)


class AmbienteColaborativoCreateSchema(BaseModel):
    hierarquizacao_id: UUID
    convites: list[ConviteColaborativoSchema] = Field(..., min_length=1)
    valido_ate: datetime


class AmbienteColaborativoUpdateSchema(BaseModel):
    convites: list[ConviteColaborativoSchema] | None = Field(None, min_length=1)
    valido_ate: datetime | None = None


class ConsolidacaoColaborativaSchema(BaseModel):
    matriz_consolidada: list[list[float]]
    pesos_consolidados: list[float]
    lambda_max: float
    indice_consistencia: float
    indice_aleatorio: float
    razao_consistencia: float
    consistente: bool
    respostas_consolidadas: int
    consolidadoEm: str


class AmbienteColaborativoResponseSchema(BaseModel):
    id: str
    hierarquizacao_id: str
    hierarquizacao_codigo: str
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    n_criterios: int = 0
    token: str
    convites: list[dict[str, Any]]
    valido_ate: str
    status: str
    url_publica: str
    criadoEm: str
    atualizadoEm: str
    total_respostas: int = 0
    consolidacao: ConsolidacaoColaborativaSchema | None = None


class AmbientePublicoSchema(BaseModel):
    token: str
    escopo: str | None = None
    objetivo: str | None = None
    criterios: list[str]
    valido_ate: str
    status: str
    email_autorizado: bool = False


class IdentificacaoColaboradorSchema(BaseModel):
    nome_completo: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., min_length=3, max_length=320)
    instituicao: str = Field(..., min_length=2, max_length=300)


class RespostaColaborativaCreateSchema(BaseModel):
    identificacao: IdentificacaoColaboradorSchema
    matriz_comparacao: list[list[float]]
    estatisticas: dict[str, Any] | None = None


class RespostaColaborativaResponseSchema(BaseModel):
    id: str
    ambiente_id: str
    nome_completo: str
    email: str
    instituicao: str
    matriz_comparacao: list[list[Any]]
    lambda_max: float | None = None
    indice_consistencia: float | None = None
    indice_aleatorio: float | None = None
    razao_consistencia: float | None = None
    consistente: bool
    estatisticas: dict[str, Any] = Field(default_factory=dict)
    enviadoEm: str

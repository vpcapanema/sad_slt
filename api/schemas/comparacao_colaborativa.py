"""Contrato HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

TipoConfig = Literal["avulsa", "portfolio"]


class ConviteColaborativoSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)


class AmbienteColaborativoCreateSchema(BaseModel):
    tipo: TipoConfig
    codigo: str = Field(..., min_length=1, max_length=64)
    convites: list[ConviteColaborativoSchema] = Field(..., min_length=1)
    valido_ate: datetime


class AmbienteColaborativoResponseSchema(BaseModel):
    id: str
    config_tipo: TipoConfig
    config_codigo: str
    token: str
    convites: list[dict[str, Any]]
    valido_ate: str
    status: str
    url_publica: str
    criadoEm: str
    atualizadoEm: str
    total_respostas: int = 0


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
    estatisticas: dict[str, Any] = {}
    enviadoEm: str

"""Contrato HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ConviteColaborativoSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    # Nome informado no convite; sem cadastro de usuarios, e a unica origem do
    # nome enquanto a pessoa nao envia a resposta.
    nome: str | None = Field(None, max_length=200)


class AmbienteColaborativoCreateSchema(BaseModel):
    config_tipo: str | None = None
    config_id: UUID | None = None
    hierarquizacao_id: UUID | None = None
    matriz_premissas_criterios: dict[str, Any] | list[dict[str, Any]] | None = None
    arquivo_matriz_base64: str | None = None
    arquivo_matriz_nome: str | None = Field(None, max_length=255)
    convites: list[ConviteColaborativoSchema] = Field(..., min_length=1)
    valido_ate: datetime


class AmbienteColaborativoUpdateSchema(BaseModel):
    hierarquizacao_id: UUID | None = None
    config_tipo: str | None = None
    config_id: UUID | None = None
    matriz_premissas_criterios: dict[str, Any] | list[dict[str, Any]] | None = None
    arquivo_matriz_base64: str | None = None
    arquivo_matriz_nome: str | None = Field(None, max_length=255)
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
    hierarquizacao_id: str | None = None
    hierarquizacao_codigo: str
    hierarquizacao_nome: str | None = None
    config_tipo: str | None = None
    config_id: str | None = None
    config_codigo: str | None = None
    config_nome: str | None = None
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    n_criterios: int = 0
    arquivo_matriz_nome: str | None = None
    token: str
    convites: list[dict[str, Any]]
    valido_ate: str
    status: str
    url_publica: str
    criadoEm: str
    atualizadoEm: str
    total_respostas: int = 0
    respostas_em_preenchimento: int = 0
    respostas_consistentes: int = 0
    total_analises: int = 0
    analise_homologada_id: str | None = None
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


class RespostaColaborativaInicioSchema(BaseModel):
    identificacao: IdentificacaoColaboradorSchema


class RespostaColaborativaProgressoSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    matriz_comparacao: list[list[float]]
    estatisticas: dict[str, Any] | None = None


class RespostaColaborativaUpdateSchema(BaseModel):
    nome_completo: str | None = Field(None, min_length=2, max_length=200)
    email: str | None = Field(None, min_length=3, max_length=320)
    instituicao: str | None = Field(None, min_length=2, max_length=300)


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
    status: str = "enviada"
    estatisticas: dict[str, Any] = Field(default_factory=dict)
    iniciadoEm: str | None = None
    atualizadoEm: str | None = None
    enviadoEm: str | None = None


class RespostaCentralResponseSchema(RespostaColaborativaResponseSchema):
    hierarquizacao_id: str | None = None
    hierarquizacao_codigo: str
    hierarquizacao_nome: str | None = None
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    token: str
    config_tipo: str | None = None
    config_id: str | None = None
    config_codigo: str | None = None
    config_nome: str | None = None


class AnaliseColaborativaCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    resposta_ids: list[UUID] | None = None
    rc_maximo: float = Field(0.10, gt=0, le=1)
    excluir_inconsistentes: bool = True


class AnaliseColaborativaResponseSchema(BaseModel):
    id: str
    ambiente_id: str
    codigo: str
    nome: str
    descricao: str | None = None
    metodo_agregacao: str
    rc_maximo: float
    excluir_inconsistentes: bool
    matriz_consolidada: list[list[float]]
    pesos_consolidados: list[float]
    lambda_max: float
    indice_consistencia: float
    indice_aleatorio: float
    razao_consistencia: float
    consistente: bool
    estatisticas_analise: dict[str, Any] = Field(default_factory=dict)
    status: str
    respostas_incluidas: int = 0
    resposta_ids: list[str] = Field(default_factory=list)
    criadoEm: str
    atualizadoEm: str
    homologadoEm: str | None = None

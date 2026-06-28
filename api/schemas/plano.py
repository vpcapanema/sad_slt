"""Schemas Pydantic — contrato HTTP de planos (nível 1)."""
from __future__ import annotations

from pydantic import BaseModel, Field

from api.schemas.demanda import RepresentanteSchema


class InstituicaoFormSchema(BaseModel):
    """Instituição interessada (origem SIGMA)."""

    instituicao_id: str
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    instituicao_razao_social: str | None = None
    instituicao_nome_fantasia: str | None = None


class PlanoCreateSchema(BaseModel):
    """Payload de cadastro de um plano (nível 1 — interno)."""

    codigo: str | None = Field(None, max_length=64)
    diretoria_id: str
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1)
    objetivo_estrategico: str | None = None
    responsavel: str | None = None
    instituicao_id: str
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    instituicao_razao_social: str | None = None
    instituicao_nome_fantasia: str | None = None
    pessoa_id: str | None = None
    representante: RepresentanteSchema
    vigencia_inicio: str | None = None
    vigencia_fim: str | None = None
    valor_global: float | None = None
    unidades_espaciais: list[str] = Field(default_factory=list)


class PlanoResponseSchema(BaseModel):
    """Resposta no formato consumido pela área administrativa."""

    id: str
    status: str
    criadoEm: str
    diretoria_id: str
    nome: str
    descricao: str | None = None
    objetivo_estrategico: str | None = None
    responsavel: str | None = None
    instituicao_id: str | None = None
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    instituicao_razao_social: str | None = None
    instituicao_nome_fantasia: str | None = None
    pessoa_id: str | None = None
    representante: RepresentanteSchema | None = None
    vigencia_inicio: str | None = None
    vigencia_fim: str | None = None
    valor_global: float | None = None
    unidades_espaciais: list[str] = Field(default_factory=list)


class PlanoUpdateSchema(BaseModel):
    """Campos editáveis pelo administrador."""

    status: str | None = None
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    diretoria_id: str | None = None
    objetivo_estrategico: str | None = None
    responsavel: str | None = None
    vigencia_inicio: str | None = None
    vigencia_fim: str | None = None
    valor_global: float | None = None

"""Schemas Pydantic — contrato HTTP de programas (nível 2)."""
from __future__ import annotations

from pydantic import BaseModel, Field

from api.schemas.demanda import RepresentanteSchema, RepresentanteUpdateSchema


class ProgramaCreateSchema(BaseModel):
    """Payload de cadastro de um programa (nível 2 — filho de um plano)."""

    codigo: str | None = Field(
        None,
        max_length=64,
        description="Ignorado na criação — o servidor gera PRO-XXXXXXXX",
    )
    plano_codigo: str | None = Field(None, description="Código legível do plano pai (opcional sem vínculo institucional)")
    vinculo_institucional: bool = False
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1)
    objetivo: str | None = None
    publico_alvo: str | None = None
    orgao_responsavel: str | None = None
    justificativa: str | None = None
    valor_global: float | None = None
    instituicao_id: str
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    instituicao_razao_social: str | None = None
    instituicao_nome_fantasia: str | None = None
    pessoa_id: str | None = None
    representante: RepresentanteSchema
    unidades_espaciais: list[str] = Field(default_factory=list)


class ProgramaResponseSchema(BaseModel):
    """Resposta no formato consumido pela área administrativa."""

    id: str
    status: str
    criadoEm: str
    plano_id: str | None = None
    plano_codigo: str | None = None
    plano_nome: str | None = None
    diretoria_id: str | None = None
    nome: str
    descricao: str | None = None
    objetivo: str | None = None
    publico_alvo: str | None = None
    orgao_responsavel: str | None = None
    justificativa: str | None = None
    valor_global: float | None = None
    vinculo_institucional: bool = False
    instituicao_id: str | None = None
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    instituicao_razao_social: str | None = None
    instituicao_nome_fantasia: str | None = None
    pessoa_id: str | None = None
    representante: RepresentanteSchema | None = None
    unidades_espaciais: list[str] = Field(default_factory=list)


class ProgramaUpdateSchema(BaseModel):
    """Campos editáveis pelo administrador."""

    status: str | None = None
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    objetivo: str | None = None
    publico_alvo: str | None = None
    orgao_responsavel: str | None = None
    justificativa: str | None = None
    valor_global: float | None = None
    plano_codigo: str | None = None
    instituicao_id: str | None = None
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    pessoa_id: str | None = None
    representante: RepresentanteUpdateSchema | None = None

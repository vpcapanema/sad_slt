"""Schemas Pydantic — contrato HTTP de programas (nível 2)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ProgramaCreateSchema(BaseModel):
    """Payload de cadastro de um programa (nível 2 — filho de um plano)."""

    codigo: str | None = Field(None, max_length=64)
    plano_codigo: str = Field(..., description="Código legível do plano pai")
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1)
    objetivo: str | None = None
    publico_alvo: str | None = None
    orgao_responsavel: str | None = None
    justificativa: str | None = None
    valor_global: float | None = None
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

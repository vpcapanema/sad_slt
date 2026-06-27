"""Schemas Pydantic — contrato HTTP de planos (nível 1)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class PlanoCreateSchema(BaseModel):
    """Payload de cadastro de um plano (nível 1 — interno)."""

    codigo: str | None = Field(None, max_length=64)
    diretoria_id: str
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1)
    objetivo_estrategico: str | None = None
    responsavel: str | None = None
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
    vigencia_inicio: str | None = None
    vigencia_fim: str | None = None
    valor_global: float | None = None


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

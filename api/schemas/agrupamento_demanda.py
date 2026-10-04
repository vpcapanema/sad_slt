"""Contratos HTTP para agrupamentos reutilizáveis de demandas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AgrupamentoDemandaCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    tipo_demanda: Literal["plano", "programa", "projeto"]
    demanda_ids: list[str] = Field(..., min_length=1)


class AgrupamentoDemandaSummarySchema(BaseModel):
    id: UUID
    codigo: str
    nome: str
    descricao: str | None = None
    tipo_demanda: Literal["plano", "programa", "projeto"]
    quantidade_demandas: int
    criado_em: datetime
    atualizado_em: datetime


class AgrupamentoDemandaSchema(AgrupamentoDemandaSummarySchema):
    objetos: list[dict[str, Any]]
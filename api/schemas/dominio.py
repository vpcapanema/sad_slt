"""Schemas — domínios de referência."""
from __future__ import annotations

from pydantic import BaseModel


class StatusDominioSchema(BaseModel):
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int


class TipoDemandaSchema(BaseModel):
    id: int
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int

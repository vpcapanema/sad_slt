"""Schemas — domínios de referência."""
from __future__ import annotations

from pydantic import BaseModel


class StatusDominioSchema(BaseModel):
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int
    camada: str | None = None
    rotulos_por_tipo: dict[str, str] | None = None


class TipoDemandaSchema(BaseModel):
    id: int
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int


class StatusTransicaoSchema(BaseModel):
    origem: str
    destino: str
    via_aprovar: bool = False


class MatrizTransicaoStatusSchema(BaseModel):
    """Mapa origem → lista de destinos permitidos (PATCH/admin)."""

    transicoes: dict[str, list[str]]

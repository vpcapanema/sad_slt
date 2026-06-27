"""Contrato HTTP — universo de demandas elegíveis ao AHP."""
from __future__ import annotations

from pydantic import BaseModel


class UniversoItemSchema(BaseModel):
    id: str
    codigo: str
    nome: str
    status: str
    tipo_demanda: str
    grupo_id: str | None = None

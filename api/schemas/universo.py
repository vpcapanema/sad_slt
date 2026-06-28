"""Contrato HTTP — universo de demandas elegíveis ao AHP."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UniversoItemSchema(BaseModel):
    # Aceita colunas ricas adicionais (introspectadas) além das fixas.
    model_config = ConfigDict(extra="allow")

    id: str
    codigo: str
    nome: str
    status: str
    tipo_demanda: str
    grupo_id: str | None = None


class CampoUniversoSchema(BaseModel):
    campo: str
    rotulo: str
    tipo: str  # "data" | "texto"

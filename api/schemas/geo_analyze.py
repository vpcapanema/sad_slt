"""Schemas — análise espacial (containment, localização, sobreposição)."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GeoJsonGeometrySchema(BaseModel):
    type: str
    coordinates: Any


class ContainmentAnalyzeSchema(BaseModel):
    geometry: GeoJsonGeometrySchema | None = None
    unidade_ids: list[str] = Field(default_factory=list)
    parent_unidade_ids: list[str] = Field(default_factory=list)
    child_kind: str = "projeto"
    ref_kind: str = "plano"


class LocateAnalyzeSchema(BaseModel):
    geometry: GeoJsonGeometrySchema


class ProgramaRegionalidadesSchema(BaseModel):
    unidade_ids: list[str] = Field(default_factory=list)


class RegionalidadeItemSchema(BaseModel):
    tipo: str
    tipo_nome: str
    nomes: list[str]


class ContainmentResultSchema(BaseModel):
    status: str
    pct_inside: float
    pct_outside: float
    message: str


class LocateResultSchema(BaseModel):
    regionalidades: dict[str, list[str]]
    itens: list[RegionalidadeItemSchema]

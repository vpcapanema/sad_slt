"""Schemas Pydantic — contrato HTTP de demandas."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RepresentanteSchema(BaseModel):
    pessoa_id: str | None = None
    nome: str = ""
    email: str | None = None
    telefone: str | None = None


class GeometriaSchema(BaseModel):
    tipo: str = Field(..., description="Point, LineString ou Polygon")
    coordinates: Any


class DemandaCreateSchema(BaseModel):
    """Payload enviado pelo formulário (espelho de buildDemanda)."""

    id: str = Field(..., min_length=3, max_length=64, description="Código legível DEM-...")
    status: str = "fila_hierarquizacao"
    criadoEm: str | None = None
    instituicao_id: str
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    pessoa_id: str | None = None
    lat: float
    lng: float
    representante: RepresentanteSchema
    diretoria_id: str
    plano_id: str
    programa_codigo: str | None = Field(None, description="Código legível do programa (opcional sem vínculo institucional)")
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    geometria: GeometriaSchema | None = None
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None


class DemandaResponseSchema(BaseModel):
    """Resposta no formato consumido pelo painel e cadastro."""

    id: str
    status: str
    criadoEm: str
    instituicao_id: str
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    pessoa_id: str | None = None
    lat: float
    lng: float
    representante: RepresentanteSchema
    diretoria_id: str
    plano_id: str
    programa_id: str | None = None
    nome: str
    descricao: str | None = None
    geometria: GeometriaSchema | None = None
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None


class RepresentanteUpdateSchema(BaseModel):
    nome: str | None = Field(None, max_length=200)
    email: str | None = Field(None, max_length=200)
    telefone: str | None = Field(None, max_length=50)


class DemandaUpdateSchema(BaseModel):
    """Campos editáveis pelo administrador."""

    status: str | None = None
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    diretoria_id: str | None = None
    plano_id: str | None = None
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    lat: float | None = None
    lng: float | None = None
    representante: RepresentanteUpdateSchema | None = None

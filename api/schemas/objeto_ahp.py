"""Contrato HTTP — objetos AHP."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GeometriaSchema(BaseModel):
    tipo: str
    coordinates: Any


class ObjetoAhpResponseSchema(BaseModel):
    id: str
    codigo: str
    demanda_id: str
    demanda_codigo: str
    status: str
    statusAtualizadoEm: str
    grupo_comparacao: str
    nome: str
    descricao: str | None = None
    diretoria_id: str
    plano_id: str
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None
    instituicao_nome: str | None = None
    instituicao_cnpj: str | None = None
    lat: float
    lng: float
    geometria: GeometriaSchema | None = None
    aprovadoEm: str
    motivo_aprovacao: str | None = None


class AprovarDemandaSchema(BaseModel):
    motivo: str | None = Field(None, max_length=2000)
    aprovado_por: str | None = Field(None, description="UUID do usuário administrador (SIGMA)")


class ObjetoAhpUpdateSchema(BaseModel):
    status: str | None = None
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    grupo_comparacao: str | None = Field(None, max_length=120)
    programa_id: str | None = None
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None
    instituicao_nome: str | None = None
    instituicao_cnpj: str | None = None
    motivo_aprovacao: str | None = Field(None, max_length=2000)

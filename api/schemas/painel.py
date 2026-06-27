"""Schemas Pydantic — painéis de acompanhamento (público e restrito)."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from api.schemas.demanda import GeometriaSchema, RepresentanteSchema


class PainelDemandaSchema(BaseModel):
    """Item unificado exibido no mapa e na sidebar dos painéis."""

    id: str
    tipo: str = Field(..., description="plano | programa | projeto")
    status: str
    criadoEm: str
    nome: str
    descricao: str | None = None
    geometria: GeometriaSchema | None = None
    lat: float | None = None
    lng: float | None = None
    diretoria_id: str | None = None
    plano_id: str | None = None
    plano_codigo: str | None = None
    plano_nome: str | None = None
    programa_id: str | None = None
    programa_nome: str | None = None
    abrangencia: list[str] = Field(default_factory=list)
    instituicao_id: str | None = None
    instituicao_label: str | None = None
    instituicao_cnpj: str | None = None
    representante: RepresentanteSchema | None = None
    classificacao: dict[str, Any] | None = None
    complementos: dict[str, Any] | None = None
    objetivo_estrategico: str | None = None
    responsavel: str | None = None
    vigencia_inicio: str | None = None
    vigencia_fim: str | None = None
    valor_global: float | None = None
    objetivo: str | None = None
    publico_alvo: str | None = None
    orgao_responsavel: str | None = None
    justificativa: str | None = None

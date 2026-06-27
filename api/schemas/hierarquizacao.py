"""Contrato HTTP — Hierarquização de Projetos (portfólio).

Mapeia ``hierarquizacao_demandas.hierarquizacao_portfolio``: consome uma
configuração multicritério de portfólio (``config_id``) e rankeia os projetos
aprovados (``demandas_aprovadas.projetos``).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HierarquizacaoCreateSchema(BaseModel):
    config_codigo: str = Field(..., description="Código da config_multicriterio_portfolio homologada/calculada")
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    grupo_id: str | None = Field(
        None, max_length=64, description="Conjunto comparável (pai): diretoria/plano/programa"
    )
    objetos: list[dict[str, Any]] | None = None


class HierarquizacaoUpdateSchema(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    status: str | None = None
    objetos: list[dict[str, Any]] | None = None
    julgamento_projetos: list[dict[str, Any]] | None = None


class HierarquizacaoResponseSchema(BaseModel):
    id: str
    codigo: str
    config_id: str
    config_codigo: str | None = None
    nome: str
    descricao: str | None = None
    tipo_demanda: str | None = None
    grupo_id: str | None = None
    status: str
    objetos: list[dict[str, Any]] = []
    julgamento_projetos: list[dict[str, Any]] | None = None
    pesos_projetos: dict[str, Any] | None = None
    ranking: list[dict[str, Any]] | None = None
    criadoEm: str
    atualizadoEm: str
    homologadoEm: str | None = None

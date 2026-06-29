"""Contrato HTTP — Configuração da Análise Multicritério (avulsa e portfólio).

Mapeia diretamente as tabelas ``ahp.config_multicriterio_avulsa`` e
``ahp.config_multicriterio_portfolio`` (critérios, matriz pareada, pesos e
métricas de consistência). O ranking de projetos NÃO vive aqui — ele pertence
à Hierarquização (``hierarquizacao_demandas.hierarquizacao_portfolio``).
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

TipoConfig = Literal["avulsa", "portfolio"]


class ConfigCreateSchema(BaseModel):
    tipo: TipoConfig
    nome: str = Field(..., min_length=1, max_length=200)
    area_conhecimento: str | None = None
    tema: str | None = None
    fenomeno: str | None = None
    objetivo: str | None = None
    descricao: str | None = None
    tipo_demanda: str | None = Field(
        None, description="plano | programa | projeto (obrigatório para portfólio)"
    )
    # Recorte do universo (portfólio) gravado como JSON único: filtros campo/valor.
    subconjunto: dict[str, Any] | None = None
    # Snapshot do conjunto confirmado de objetos: [{id, codigo, nome, tipo_demanda}].
    universo_objetos: list[dict[str, Any]] | None = None
    configuracao_completa: dict[str, Any] | None = None


class ConfigUpdateSchema(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=200)
    area_conhecimento: str | None = None
    tema: str | None = None
    fenomeno: str | None = None
    objetivo: str | None = None
    descricao: str | None = None
    status: str | None = None
    subconjunto: dict[str, Any] | None = None
    universo_objetos: list[dict[str, Any]] | None = None
    metodo_entrada: str | None = None
    metodo_comparacao: str | None = None
    n_criterios: int | None = Field(None, ge=0)
    criterios: list[dict[str, Any]] | None = None
    matriz_comparacao: list[Any] | None = None
    arquivo_nome: str | None = None
    arquivo_tipo: str | None = None
    arquivo_hash: str | None = None
    configuracao_completa: dict[str, Any] | None = None


class ConfigResponseSchema(BaseModel):
    id: str
    codigo: str
    tipo: TipoConfig
    nome: str
    area_conhecimento: str | None = None
    tema: str | None = None
    fenomeno: str | None = None
    objetivo: str | None = None
    descricao: str | None = None
    tipo_demanda: str | None = None
    tipo_demanda_nome: str | None = None
    subconjunto: dict[str, Any] | None = None
    universo_objetos: list[dict[str, Any]] = []
    status: str
    metodo_entrada: str
    metodo_comparacao: str | None = None
    n_criterios: int = 0
    criterios: list[dict[str, Any]] = []
    matriz_comparacao: list[Any] = []
    pesos: dict[str, Any] | None = None
    lambda_max: float | None = None
    indice_consistencia: float | None = None
    indice_aleatorio: float | None = None
    razao_consistencia: float | None = None
    consistente: bool | None = None
    arquivo_nome: str | None = None
    arquivo_tipo: str | None = None
    arquivo_hash: str | None = None
    configuracao_completa: dict[str, Any] | None = None
    criadoEm: str
    atualizadoEm: str
    homologadoEm: str | None = None

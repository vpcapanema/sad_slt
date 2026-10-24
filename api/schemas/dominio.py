"""Schemas — domínios de referência."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Annotated, Any


class StatusDominioSchema(BaseModel):
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int
    fase: str | None = None
    rotulos_por_tipo: dict[str, str] | None = None


class TipoDemandaSchema(BaseModel):
    id: int
    codigo: str
    nome: str
    descricao: str | None = None
    ordem: int


class AtributoObjetoDominioSchema(BaseModel):
    codigo: str
    nome: str
    descricao: str
    tipo_dado: str
    unidade: str | None = None
    origem_valor: str
    tipos_objeto: list[str]
    dominio_valores: list[dict[str, Any]] | None = None
    configuracao_por_tipo: dict[str, Any]
    regras_validacao: dict[str, Any]
    exige_evidencia: bool
    permite_nao_informado: bool
    versao: int


class TipoAdversidadeSchema(BaseModel):
    codigo: str
    nome: str
    conceito: str
    ordem: int


class FamiliaAdversidadeSchema(BaseModel):
    codigo: str
    nome: str
    conceito: str
    ordem: int
    tipos: list[TipoAdversidadeSchema]


class ResolverAdversidadesSchema(BaseModel):
    camadas: list[Annotated[str, Field(min_length=1, max_length=2048)]] = Field(min_length=1, max_length=500)


class AdversidadeCamadaSchema(BaseModel):
    camada_codigo: str
    tipo_codigo: str
    tipo_nome: str
    familia_codigo: str
    familia_nome: str


class CamadaAdversidadeResolvidaSchema(BaseModel):
    id: str
    adversidade: AdversidadeCamadaSchema | None


class StatusTransicaoSchema(BaseModel):
    origem: str
    destino: str
    via_aprovar: bool = False


class MatrizTransicaoStatusSchema(BaseModel):
    """Mapa origem → lista de destinos permitidos (PATCH/admin)."""

    transicoes: dict[str, list[str]]

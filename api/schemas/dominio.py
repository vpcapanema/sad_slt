"""Schemas — domínios de referência."""
from __future__ import annotations

from pydantic import BaseModel
from typing import Any


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


class StatusTransicaoSchema(BaseModel):
    origem: str
    destino: str
    via_aprovar: bool = False


class MatrizTransicaoStatusSchema(BaseModel):
    """Mapa origem → lista de destinos permitidos (PATCH/admin)."""

    transicoes: dict[str, list[str]]

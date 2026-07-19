"""Contrato HTTP — Hierarquização de Projetos (portfólio).

Mapeia ``hierarquizacao_demandas.hierarquizacao_portfolio``: consome uma
configuração multicritério de portfólio (``config_id``) e rankeia os projetos
aprovados (``demandas_aprovadas.projetos``).
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class HierarquizacaoCreateSchema(BaseModel):
    config_codigo: str | None = Field(None, description="Configuração AHP; pode ser vinculada depois")
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    tipo_demanda: str | None = Field(None, description="plano | programa | projeto")
    grupo_id: str | None = Field(
        None, max_length=64, description="Conjunto comparável (pai): diretoria/plano/programa"
    )
    objetos: list[dict[str, Any]] | None = None
    matriz_premissas_criterios: dict[str, Any] | list[Any] | None = None
    fases_a_executar: list[int] = Field(default_factory=lambda: [1, 2, 3])

    @field_validator("fases_a_executar")
    @classmethod
    def validar_fases(cls, value: list[int]) -> list[int]:
        fases = sorted(set(value))
        if not fases or any(fase not in {1, 2, 3} for fase in fases):
            raise ValueError("Informe uma ou mais fases entre 1, 2 e 3.")
        return fases


class HierarquizacaoUpdateSchema(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=200)
    descricao: str | None = None
    status: str | None = None
    objetos: list[dict[str, Any]] | None = None
    julgamento_projetos: list[dict[str, Any]] | None = None
    dados_hierarquizacao: dict[str, Any] | None = None
    config_codigo: str | None = None


class HierarquizacaoFase1UpdateSchema(BaseModel):
    camada_restricao: dict[str, Any] | None = None
    camada_risco: dict[str, Any] | None = None
    resultados_objetos: list[dict[str, Any]] = []


class HierarquizacaoFase1ExecutarSchema(BaseModel):
    par_id: str = Field(..., description="produto_id compartilhado pelas camadas de restrição e risco")
    camada_restricao_id: str
    camada_risco_id: str
    configuracao_fatiamento_id: str


class ConfiguracaoFatiamentoFase1Schema(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=120)
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    parametros: dict[str, Any]


class HierarquizacaoFase2ExecutarSchema(BaseModel):
    pacote_id: str
    metodo_extracao: Literal["ponto"] = "ponto"


class HierarquizacaoFase3ExecutarSchema(BaseModel):
    criterios: list[dict[str, Any]]
    modo_pesos: Literal["normalizados", "livres"] = "normalizados"
    completude_minima: float = Field(0.6, ge=0, le=1)
    regra_ausentes: Literal[
        "renormalizar", "bloquear", "imputar_neutro", "imputar_pior", "imputar_medio"
    ] = "renormalizar"


class HierarquizacaoSinteseSchema(BaseModel):
    peso_fase2: float = Field(0.7, ge=0, le=1)
    peso_fase3: float = Field(0.3, ge=0, le=1)
    incluir_restritos: bool = False


class HierarquizacaoResponseSchema(BaseModel):
    id: str
    codigo: str
    config_id: str | None = None
    config_codigo: str | None = None
    nome: str
    descricao: str | None = None
    tipo_demanda: str | None = None
    tipo_demanda_id: int | None = None
    grupo_id: str | None = None
    status: str
    objetos: list[dict[str, Any]] = []
    julgamento_projetos: list[dict[str, Any]] | None = None
    pesos_projetos: dict[str, Any] | None = None
    ranking: list[dict[str, Any]] | None = None
    dados_hierarquizacao: dict[str, Any] = {}
    relatorio_fase1: dict[str, Any] = {}
    criadoEm: str
    atualizadoEm: str
    homologadoEm: str | None = None
    homologadoPor: str | None = None
    criadoPor: str | None = None

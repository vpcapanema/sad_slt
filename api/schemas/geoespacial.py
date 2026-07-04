"""Schemas — Módulo Geoespacial."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ==================== FASE 1: Restrição e Risco ====================

class FonteSchema(BaseModel):
    fonte_id: str
    nome_fonte: str
    tipo_fonte: str  # WFS, Shapefile, GeoPackage, GeoJSON
    url_origem: str | None = None
    arquivo_origem: str | None = None
    orgao_responsavel: str | None = None
    data_importacao: datetime
    data_referencia_dado: datetime | None = None
    tipo_tratamento: str  # restricao, risco, insumo_para_risco_derivado
    criterio_associado: str | None = None
    base_legal_ou_tecnica: str | None = None
    severidade_padrao: str | None = None
    observacao_metodologica: str | None = None


class FonteInputSchema(BaseModel):
    nome_fonte: str
    tipo_fonte: str
    url_origem: str | None = None
    arquivo_origem: str | None = None
    orgao_responsavel: str | None = None
    data_referencia_dado: datetime | None = None
    tipo_tratamento: str
    criterio_associado: str | None = None
    base_legal_ou_tecnica: str | None = None
    severidade_padrao: str | None = None
    observacao_metodologica: str | None = None


class PacoteFase1Schema(BaseModel):
    pacote_id: str
    versao: str
    data_criacao: datetime
    data_homologacao: datetime | None = None
    responsavel_tecnico: str | None = None
    status: str  # rascunho, validado, homologado, arquivado
    crs: str
    camada_restricao_id: str | None = None
    camada_risco_id: str | None = None
    metadados_fontes: list[FonteSchema] = Field(default_factory=list)
    relatorio_processamento: dict[str, Any] = Field(default_factory=dict)
    relatorio_validacao: dict[str, Any] = Field(default_factory=dict)
    regras_riscos_derivados: list[dict[str, Any]] = Field(default_factory=list)
    observacoes: str | None = None


# ==================== FASE 2: Favorabilidade Territorial ====================

class CriterioFase2Schema(BaseModel):
    criterio_id: str
    criterio_nome: str
    dimensao: str | None = None
    fonte_id: str | None = None
    tipo_dado_entrada: str  # ponto, linha, poligono, tabela, raster
    operador_espacial: str
    relacao: str  # positiva, negativa
    peso_ahp: float
    unidade_original: str | None = None
    regra_normalizacao: str
    resolucao_saida: float | None = None
    crs_saida: str | None = None
    extensao_processamento: str | None = None
    observacao_metodologica: str | None = None


class CriterioFase2InputSchema(BaseModel):
    criterio_nome: str
    dimensao: str | None = None
    fonte_id: str | None = None
    tipo_dado_entrada: str
    operador_espacial: str
    relacao: str
    peso_ahp: float
    unidade_original: str | None = None
    regra_normalizacao: str
    resolucao_saida: float | None = None
    crs_saida: str | None = None
    extensao_processamento: str | None = None
    observacao_metodologica: str | None = None


class PacoteFase2Schema(BaseModel):
    pacote_id: str
    versao: str
    data_criacao: datetime
    data_homologacao: datetime | None = None
    responsavel_tecnico: str | None = None
    status: str  # rascunho, validado, homologado, arquivado
    crs: str
    resolucao: float | None = None
    unidade_resolucao: str = "m"
    raster_final_id: str | None = None
    criterios: list[CriterioFase2Schema] = Field(default_factory=list)
    rasters_intermediarios: list[str] = Field(default_factory=list)
    pesos_ahp_id: str | None = None
    relatorio_processamento: dict[str, Any] = Field(default_factory=dict)
    relatorio_validacao: dict[str, Any] = Field(default_factory=dict)
    regras_transformacao: list[dict[str, Any]] = Field(default_factory=list)
    observacoes: str | None = None


# ==================== FASE 3: Atributos de Projeto ====================

class AtributoFase3Schema(BaseModel):
    atributo_id: str
    nome_coluna: str
    rotulo: str
    tipo_dado: str  # numerico, ordinal, booleano, categorico, data
    criterio_fase3: bool
    direcao: str  # maior_melhor, menor_melhor
    regra_normalizacao: str
    valores_validos: list[str] | None = None
    valor_padrao: Any = None
    obrigatorio: bool
    peso_inicial: float
    peso_minimo: float
    peso_maximo: float
    observacao_metodologica: str | None = None


class AtributoFase3InputSchema(BaseModel):
    nome_coluna: str
    rotulo: str
    tipo_dado: str
    criterio_fase3: bool
    direcao: str
    regra_normalizacao: str
    valores_validos: list[str] | None = None
    valor_padrao: Any = None
    obrigatorio: bool
    peso_inicial: float
    peso_minimo: float
    peso_maximo: float
    observacao_metodologica: str | None = None


class RodadaFase3Schema(BaseModel):
    rodada_id: str
    versao: str
    arquivo_origem: str
    data_importacao: datetime
    data_homologacao: datetime | None = None
    responsavel: str | None = None
    status: str  # rascunho, validado, homologado, arquivado
    atributos_ativos: list[AtributoFase3Schema] = Field(default_factory=list)
    pesos_ativos: dict[str, float] = Field(default_factory=dict)
    numero_projetos: int
    projetos_sem_score: list[str] = Field(default_factory=list)
    ranking_resultante: list[dict[str, Any]] = Field(default_factory=list)
    diagnostico_completude: dict[str, Any] = Field(default_factory=dict)
    diagnostico_inconsistencias: list[dict[str, Any]] = Field(default_factory=list)
    observacoes: str | None = None


# ==================== Camadas e Operações ====================

class CamadaSchema(BaseModel):
    id: str
    nome: str
    tipo: str
    crs: str | None = None
    origem: str
    data_importacao: str
    caminho_arquivo: str | None = None
    url_origem: str | None = None
    metadados: dict[str, Any] = Field(default_factory=dict)


class CamadaInputSchema(BaseModel):
    nome: str
    tipo: str
    crs: str | None = None
    origem: str
    caminho_arquivo: str | None = None
    url_origem: str | None = None
    metadados: dict[str, Any] = Field(default_factory=dict)


class FuncaoSchema(BaseModel):
    id: str
    nome: str
    descricao: str
    operacoes: list[str]
    variaveis: list[str]


class FluxoSchema(BaseModel):
    id: str
    nome: str
    descricao: str
    funcoes: list[str]
    ordem_execucao: list[str]


class ProcessamentoSchema(BaseModel):
    fluxo_id: str
    camadas_entrada: list[str]
    variaveis: dict[str, Any]
    callback_url: str | None = None


class ProcessamentoResultSchema(BaseModel):
    status: str
    progresso: float
    logs: list[str]
    camadas_saida: list[str] = Field(default_factory=list)
    erros: list[str] = Field(default_factory=list)

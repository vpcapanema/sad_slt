"""Schemas Pydantic — análise de admissibilidade da demanda (seção «Análise»)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DecisaoAnalise = Literal["aprovada", "ressalvas", "reprovada"]
ResultadoAnalise = Literal["aprovado", "reprovado"]
RespostaGeometria = Literal["atende", "ajuste"]


class CriteriosAnaliseSchema(BaseModel):
    """As cinco respostas binárias do portão de entrada.

    `None` significa «ainda não respondido» — a decisão só é aceita com os cinco
    critérios preenchidos.
    """

    demanda_duplicada_codigo: str | None = Field(None, max_length=64)
    criterio_competencia: bool | None = None
    criterio_clareza: bool | None = None
    criterio_finalidade_publica: bool | None = None
    criterio_relevancia_setorial: bool | None = None
    criterio_nao_duplicidade: bool | None = None


class ComplementoParecerSchema(BaseModel):
    complemento: str | None = Field(None, max_length=5000)


class AvaliacaoGeometriaSchema(BaseModel):
    """Avaliação informativa da geometria, separada da decisão de admissibilidade."""

    adequada: bool | None = None
    confirmada: bool = False
    encaminhamento: Literal["complementacao", "substituicao"] | None = None
    delimitacao_intervencao: RespostaGeometria | None = None
    correspondencia_local_dimensoes: RespostaGeometria | None = None
    area_influencia_direta: RespostaGeometria | Literal["nao_se_aplica"] | None = None
    precisao_localizacao: RespostaGeometria | None = None
    observacao: str | None = Field(None, max_length=3000)


class AvaliacaoGeometriaResponseSchema(AvaliacaoGeometriaSchema):
    tipo_complementacao: Literal["ajuste_geometria"] | None = None
    substituicoes: list[dict] = Field(default_factory=list)
    avaliada_por: str | None = None
    avaliada_em: str | None = None


class GeometriaHistoricoItemSchema(BaseModel):
    id: str
    origem: str
    geometria_tipo: str | None = None
    nome_arquivo: str | None = None
    criado_em: str
    autor_id: str | None = None
    substituido_em: str | None = None
    substituido_por_id: str | None = None
    motivo_substituicao: str | None = None
    vigente: bool = False
    substituicao_nao_registrada: bool = False


class GeometriaHistoricoResponseSchema(BaseModel):
    itens: list[GeometriaHistoricoItemSchema] = Field(default_factory=list)
    tem_historico: bool = False
    aviso_historico_incompleto: bool = False


class DecisaoAnaliseSchema(BaseModel):
    decisao: DecisaoAnalise


SituacaoAnalise = Literal["suspender", "complementar", "retomar"]


class SituacaoAnaliseSchema(BaseModel):
    acao: SituacaoAnalise
    categorias: list[Literal["dados_cadastrais", "geometria", "atributos_objeto"]] = Field(default_factory=list, max_length=3)
    descricao: str | None = Field(None, max_length=5000)
    hierarquizacao_codigo: str | None = Field(None, max_length=100)


class SituacaoAnaliseResponseSchema(BaseModel):
    status_anterior: str
    status_atual: str
    rotulo_status: str


class CriterioAvaliadoSchema(BaseModel):
    campo: str
    rotulo: str
    pergunta: str
    classe: str = "classificatorio"
    peso: int = 0
    resposta: bool | None = None


class AnaliseDemandaResponseSchema(BaseModel):
    demanda_codigo: str
    demanda_tipo: str
    demanda_nome: str | None = None
    demanda_status: str | None = None
    criterios: list[CriterioAvaliadoSchema] = Field(default_factory=list)
    demanda_duplicada_codigo: str | None = None
    pontuacao: int = 0
    respondidos: int = 0
    total_criterios: int = 0
    sim: int = 0
    nao: int = 0
    completo: bool = False
    resultado: ResultadoAnalise | None = None
    parecer_texto: str | None = None
    parecer_complemento: str | None = None
    decisao: DecisaoAnalise | None = None
    avaliador_nome: str | None = None
    avaliacao_geometria: AvaliacaoGeometriaResponseSchema | None = None
    tem_parecer_pdf: bool = False
    parecer_pdf_gerado_em: str | None = None
    atualizado_em: str | None = None


class DecisaoAnaliseResponseSchema(BaseModel):
    analise: AnaliseDemandaResponseSchema
    status_anterior: str
    status_atual: str
    pdf_url: str

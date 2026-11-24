"""Contrato HTTP — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, EmailStr, Field, FiniteFloat, field_validator


EMAIL_REMETENTE_ALIAS_PADRAO = "SICARD-PLI"
EMAIL_ASSUNTO_PADRAO = "Convite para preenchimento colaborativo AHP - PLI - SICARD"
ModoComparacao = Literal["todos", "por_grupo", "dimensoes", "duas_etapas"]


def _validar_cabecalho_email(valor: object) -> object:
    if isinstance(valor, str) and any(ord(char) < 32 or ord(char) == 127 for char in valor):
        raise ValueError("O campo não pode conter caracteres de controle.")
    return valor


class ConviteColaborativoSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    # Nome informado no convite; sem cadastro de usuarios, e a unica origem do
    # nome enquanto a pessoa nao envia a resposta.
    nome: str | None = Field(None, max_length=200)
    dimensoes: list[str] | None = Field(None, min_length=1)


class AmbienteColaborativoCreateSchema(BaseModel):
    modo_comparacao: ModoComparacao = "todos"
    modo_participacao: Literal["convite", "publico"] = "convite"
    matriz_id: UUID | None = None
    nome: str | None = Field(None, min_length=1, max_length=200)
    config_tipo: str | None = None
    config_id: UUID | None = None
    hierarquizacao_id: UUID | None = None
    superficie_id: UUID | None = None
    matriz_premissas_criterios: dict[str, Any] | list[dict[str, Any]] | None = None
    arquivo_matriz_base64: str | None = None
    arquivo_matriz_nome: str | None = Field(None, max_length=255)
    convites: list[ConviteColaborativoSchema] = Field(default_factory=list)
    valido_ate: datetime


class AmbienteColaborativoUpdateSchema(BaseModel):
    modo_comparacao: ModoComparacao | None = None
    matriz_id: UUID | None = None
    reabrir: bool = False
    nome: str | None = Field(None, min_length=1, max_length=200)
    hierarquizacao_id: UUID | None = None
    config_tipo: str | None = None
    config_id: UUID | None = None
    matriz_premissas_criterios: dict[str, Any] | list[dict[str, Any]] | None = None
    arquivo_matriz_base64: str | None = None
    arquivo_matriz_nome: str | None = Field(None, max_length=255)
    convites: list[ConviteColaborativoSchema] | None = Field(None, min_length=1)
    versao_lista_colaboradores: AwareDatetime | None = None
    valido_ate: datetime | None = None
    email_remetente_alias: str | None = Field(None, min_length=1, max_length=200)
    email_assunto: str | None = Field(None, min_length=1, max_length=200)
    email_mensagem: str | None = Field(None, min_length=1, max_length=50000)

    @field_validator("email_remetente_alias", "email_assunto", mode="before")
    @classmethod
    def validar_cabecalhos_email(cls, valor: object) -> object:
        return _validar_cabecalho_email(valor)


class ConsolidacaoColaborativaSchema(BaseModel):
    matriz_consolidada: list[list[float]]
    pesos_consolidados: list[float]
    lambda_max: float | None
    indice_consistencia: float | None
    indice_aleatorio: float | None
    razao_consistencia: float | None
    consistente: bool
    respostas_consolidadas: int
    consolidadoEm: str


class AnaliseExibidaSchema(BaseModel):
    id: UUID
    codigo: str
    nome: str
    status: Literal["calculada", "homologada"]
    metodo_agregacao: str
    matriz_consolidada: list[list[float]]
    pesos_consolidados: list[float]
    lambda_max: float | None
    indice_consistencia: float | None
    indice_aleatorio: float | None
    razao_consistencia: float | None
    criterios: list[dict[str, Any]]
    recorte_parcial: bool


class AmbienteColaborativoResponseSchema(BaseModel):
    modo_comparacao: ModoComparacao = "todos"
    modo_participacao: Literal["convite", "publico"] = "convite"
    matriz_id: str | None = None
    matriz_nome: str | None = None
    id: str
    nome: str | None = None
    hierarquizacao_id: str | None = None
    superficie_id: str | None = None
    hierarquizacao_codigo: str
    hierarquizacao_nome: str | None = None
    config_tipo: str | None = None
    config_id: str | None = None
    config_codigo: str | None = None
    config_nome: str | None = None
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    n_criterios: int = 0
    arquivo_matriz_nome: str | None = None
    token: str
    token_acesso: str | None = None
    convites: list[dict[str, Any]]
    lista_colaboradores: list[dict[str, Any]] = Field(default_factory=list)
    total_convites: int = 0
    total_inscritos: int = 0
    valido_ate: str
    status: str
    url_publica: str
    criadoEm: str
    atualizadoEm: str
    total_respostas: int = 0
    respostas_em_preenchimento: int = 0
    respostas_consistentes: int = 0
    total_analises: int = 0
    analise_homologada_id: str | None = None
    consolidacao: ConsolidacaoColaborativaSchema | None = None
    analise_exibida: AnaliseExibidaSchema | None = None
    email_remetente_alias: str = EMAIL_REMETENTE_ALIAS_PADRAO
    email_assunto: str = EMAIL_ASSUNTO_PADRAO
    email_mensagem: str
    email_config_persistida: bool = False
    email_texto_padrao: bool = False
    revisao_convites: str | None = None


class ContextualizacaoJulgamentoSchema(BaseModel):
    introducao: str
    metodo: str
    orientacao: str = ""
    exemplos: list[str] = Field(default_factory=list)


class AmbientePublicoSchema(BaseModel):
    token: str
    escopo: str | None = None
    objetivo: str | None = None
    criterios: list[str]
    modo_comparacao: ModoComparacao = "todos"
    grupos_comparacao: dict[str, list[int]] = Field(default_factory=dict)
    dimensoes_comparacao: list[str] = Field(default_factory=list)
    valido_ate: str
    status: str
    email_autorizado: bool = False
    contextualizacao: ContextualizacaoJulgamentoSchema | None = None


class IdentificacaoColaboradorSchema(BaseModel):
    nome_completo: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., min_length=3, max_length=320)
    instituicao: str = Field(..., min_length=2, max_length=300)


class InscricaoPublicaSchema(BaseModel):
    nome_completo: str | None = Field(None, min_length=2, max_length=200)
    email: EmailStr
    instituicao: str | None = Field(None, min_length=2, max_length=300)
    codigo_retomada: str | None = Field(None, pattern=r"^[A-Za-z0-9_-]{43}$")

    @field_validator("nome_completo", "instituicao", mode="before")
    @classmethod
    def remover_espacos(cls, valor):
        return valor.strip() if isinstance(valor, str) else valor


class TokenAcessoColaborativoSchema(BaseModel):
    token_acesso: str | None = Field(None, pattern=r"^[A-Za-z0-9_-]{43}$")


class AcessoColaborativoSchema(TokenAcessoColaborativoSchema):
    email: str = Field(..., min_length=3, max_length=320)


class RespostaColaborativaCreateSchema(TokenAcessoColaborativoSchema):
    identificacao: IdentificacaoColaboradorSchema
    matriz_comparacao: list[list[float | None]]
    estatisticas: dict[str, Any] | None = None
    versao: AwareDatetime | None = None


class RespostaColaborativaInicioSchema(TokenAcessoColaborativoSchema):
    identificacao: IdentificacaoColaboradorSchema


class RespostaColaborativaProgressoSchema(AcessoColaborativoSchema):
    matriz_comparacao: list[list[float | None]]
    estatisticas: dict[str, Any] | None = None
    etapa: Literal["dimensoes", "criterios"] = "criterios"
    concluir_etapa: bool = False
    versao: AwareDatetime | None = None


class RespostaColaborativaUpdateSchema(BaseModel):
    nome_completo: str | None = Field(None, min_length=2, max_length=200)
    email: str | None = Field(None, min_length=3, max_length=320)
    instituicao: str | None = Field(None, min_length=2, max_length=300)


class RespostaColaborativaResponseSchema(BaseModel):
    id: str
    ambiente_id: str
    inscricao_id: str | None = None
    nome_completo: str
    email: str
    instituicao: str
    matriz_comparacao: list[list[Any]]
    lambda_max: float | None = None
    indice_consistencia: float | None = None
    indice_aleatorio: float | None = None
    razao_consistencia: float | None = None
    consistente: bool
    status: str = "enviada"
    estatisticas: dict[str, Any] = Field(default_factory=dict)
    iniciadoEm: str | None = None
    atualizadoEm: str | None = None
    enviadoEm: str | None = None


class RespostaCentralResponseSchema(RespostaColaborativaResponseSchema):
    matriz_id: str | None = None
    matriz_nome: str | None = None
    hierarquizacao_id: str | None = None
    hierarquizacao_codigo: str
    hierarquizacao_nome: str | None = None
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    token: str
    config_tipo: str | None = None
    config_id: str | None = None
    config_codigo: str | None = None
    config_nome: str | None = None


class AnaliseColaborativaCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: str | None = None
    resposta_ids: list[UUID] | None = None
    dimensao: str | None = None
    rc_maximo: float = Field(0.10, gt=0, le=1)
    excluir_inconsistentes: bool = True
    metodo_agregacao: Literal["geometrica", "aritmetica", "mediana", "moda"] = "geometrica"


class PesosGlobaisCreateSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    analises_locais: dict[str, UUID]
    percentuais_dimensoes: dict[str, FiniteFloat] | None = None
    analise_dimensoes_id: UUID | None = None


class AnaliseColaborativaResponseSchema(BaseModel):
    id: str
    ambiente_id: str
    codigo: str
    nome: str
    descricao: str | None = None
    metodo_agregacao: str
    rc_maximo: float
    excluir_inconsistentes: bool
    matriz_consolidada: list[list[float]]
    pesos_consolidados: list[float]
    lambda_max: float | None
    indice_consistencia: float | None
    indice_aleatorio: float | None
    razao_consistencia: float | None
    consistente: bool
    estatisticas_analise: dict[str, Any] = Field(default_factory=dict)
    status: str
    respostas_incluidas: int = 0
    resposta_ids: list[str] = Field(default_factory=list)
    criadoEm: str
    atualizadoEm: str
    homologadoEm: str | None = None

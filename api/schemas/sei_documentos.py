"""Schemas Pydantic — contrato HTTP do repositório de PDFs recebidos do SEI."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SeiDocumentoSchema(BaseModel):
    """Um PDF armazenado, com o que as regras conseguiram ler dele."""

    id: UUID
    usuario_id: UUID
    usuario_nome: str = ""
    nome_arquivo: str
    sha256: str
    tamanho_bytes: int
    paginas: int | None = None
    status: Literal["recebido", "sem_texto", "analisado", "demanda_criada"]
    numero_processo: str | None = None
    campos_sugeridos: dict[str, Any] = Field(default_factory=dict)
    evidencias: dict[str, Any] = Field(
        default_factory=dict,
        description="Trecho do PDF que originou cada campo sugerido",
    )
    aviso: str | None = None
    demanda_id: str | None = None
    criado_em: datetime
    atualizado_em: datetime
    ausentes: list[str] = Field(
        default_factory=list,
        description="Campos que nenhuma regra preencheu; ficam em branco para o analista",
    )


class SeiDocumentoDetalheSchema(SeiDocumentoSchema):
    texto: str = ""


class SeiUploadErroSchema(BaseModel):
    arquivo: str
    mensagem: str


class SeiUploadResponseSchema(BaseModel):
    """Envio em lote: cada arquivo é aceito ou recusado isoladamente."""

    recebidos: list[SeiDocumentoSchema] = Field(default_factory=list)
    erros: list[SeiUploadErroSchema] = Field(default_factory=list)


class SeiAnaliseLoteResponseSchema(BaseModel):
    analisados: list[SeiDocumentoSchema] = Field(default_factory=list)
    ignorados: list[UUID] = Field(
        default_factory=list,
        description="Documentos sem texto extraível ou já analisados",
    )


class SeiCriarDemandaSchema(BaseModel):
    """Payload revisado pelo analista a partir das sugestões do PDF.

    `campos` é validado pelo schema do tipo correspondente
    (DemandaCreateSchema / PlanoCreateSchema / ProgramaCreateSchema) e segue
    para o mesmo fluxo de criação usado pelo cadastro público. O marcador de
    origem SEI é aplicado na geração do código, não pelo payload.
    """

    tipo_demanda: Literal["plano", "programa", "projeto"] = "projeto"
    campos: dict[str, Any] = Field(default_factory=dict)

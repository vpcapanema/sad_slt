"""Contratos de envio administrativo de email pelo SICARD."""
from __future__ import annotations

from typing import Annotated, Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator, model_validator


class EmailTesteSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    destinatario: EmailStr = Field(max_length=254)

    @field_validator("destinatario", mode="before")
    @classmethod
    def validar_cabecalho(cls, valor: object) -> object:
        if isinstance(valor, str) and any(ord(char) < 32 or ord(char) == 127 for char in valor):
            raise ValueError("O endereço não pode conter caracteres de controle.")
        return valor


class EmailEnvioSchema(EmailTesteSchema):
    alias_remetente: str = Field(default="PLI-SICARD", min_length=1, max_length=200)
    assunto: str = Field(min_length=1, max_length=200)
    texto: str = Field(min_length=1, max_length=50000)
    html: str | None = Field(default=None, min_length=1, max_length=100000)

    @field_validator("alias_remetente", "assunto", mode="before")
    @classmethod
    def validar_assunto(cls, valor: object) -> object:
        if isinstance(valor, str) and any(ord(char) < 32 or ord(char) == 127 for char in valor):
            raise ValueError("O assunto não pode conter caracteres de controle.")
        return valor


class EmailEnvioResultado(BaseModel):
    status: Literal["aceito_smtp"] = "aceito_smtp"
    id_mensagem: str
    destinatario: str
    confirmacao_entrega_solicitada: bool = False
    confirmacao_leitura_solicitada: bool = False
    mensagem: str = (
        "Mensagem aceita pelo servidor SMTP. A entrega na caixa do destinatário ainda não foi confirmada."
    )


class EmailDiagnostico(BaseModel):
    habilitado: bool
    configurado: bool
    campos_ausentes: list[str]
    seguranca: str
    remetente: str | None
    conexao_testada: Literal[False] = False


class EmailConexaoResultado(BaseModel):
    status: Literal["conectado"] = "conectado"
    mensagem: str = "Conexão segura e autenticação SMTP verificadas. Nenhum email foi enviado."


class ConviteEmailEnvioSchema(EmailTesteSchema):
    versao: datetime
    revisao_convites: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    reenvio_id: UUID | None = None
    somente_nao_enviado: bool = False
    usar_modelo_atual: bool = False
    rascunho_id: UUID | None = None

    @model_validator(mode="after")
    def validar_operacao(self):
        if self.rascunho_id and (not self.usar_modelo_atual or self.reenvio_id is None):
            raise ValueError("Informe a operação a que pertence a edição da mensagem.")
        return self


class RespostaEmailEnvioSchema(EmailTesteSchema):
    reenvio_id: UUID | None = None


class DestinatarioDivulgacaoSchema(EmailTesteSchema):
    nome: str = Field(min_length=1, max_length=200)
    instituicao: str | None = Field(None, max_length=300)


class ListaDivulgacaoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destinatarios: list[DestinatarioDivulgacaoSchema] = Field(min_length=1, max_length=1000)


class ExclusaoDestinatariosDivulgacaoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destinatarios: list[Annotated[EmailStr, Field(max_length=254)]] = Field(min_length=1)


class SalvamentoListaDivulgacaoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    alterados: list[DestinatarioDivulgacaoSchema] = Field(max_length=1000)
    removidos: list[Annotated[EmailStr, Field(max_length=254)]] = Field(max_length=1000)
    nova_lista: str | None = Field(default=None, min_length=1, max_length=120)
    lista_id: UUID | None = None

    @model_validator(mode="after")
    def validar_lista(self):
        if self.nova_lista and self.lista_id:
            raise ValueError("Escolha entre criar uma lista ou atualizar uma lista existente.")
        return self


class MensagemDivulgacaoSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assunto: Annotated[str, StringConstraints(strip_whitespace=False, min_length=1, max_length=200)]
    texto: Annotated[str, StringConstraints(strip_whitespace=False, min_length=1, max_length=49000)]

    @field_validator("assunto", "texto")
    @classmethod
    def exigir_conteudo(cls, valor: str) -> str:
        if not valor.strip():
            raise ValueError("Informe um conteúdo com texto.")
        return valor

    @field_validator("assunto")
    @classmethod
    def validar_assunto(cls, valor: str) -> str:
        return EmailEnvioSchema.validar_assunto(valor)


class RascunhoEmailAhpSchema(MensagemDivulgacaoSchema):
    alias_remetente: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)] = "SICARD-PLI"

    @field_validator("alias_remetente", mode="before")
    @classmethod
    def validar_alias(cls, valor: str) -> str:
        return EmailEnvioSchema.validar_assunto(valor)


class DivulgacaoEmailEnvioSchema(EmailTesteSchema):
    operacao_id: UUID
    reenvio: bool = False
    rascunho_id: UUID | None = None
    assunto: Annotated[str, StringConstraints(strip_whitespace=False)] | None = None
    texto: Annotated[str, StringConstraints(strip_whitespace=False)] | None = None

    @model_validator(mode="after")
    def validar_texto_legado(self):
        if self.assunto is not None or self.texto is not None:
            MensagemDivulgacaoSchema(assunto=self.assunto, texto=self.texto)
            if self.rascunho_id:
                raise ValueError("Use apenas a edição salva para esta operação.")
        return self


class DivulgacaoTransporteSchema(EmailEnvioSchema):
    model_config = ConfigDict(str_strip_whitespace=False)

    html: str = Field(min_length=1, max_length=350000)

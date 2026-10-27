"""Contratos de envio administrativo de email pelo SICARD."""
from __future__ import annotations

from typing import Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
    assunto: str = Field(min_length=1, max_length=200)
    texto: str = Field(min_length=1, max_length=50000)
    html: str | None = Field(default=None, min_length=1, max_length=100000)

    @field_validator("assunto", mode="before")
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
    texto: str = Field(min_length=1, max_length=50000)
    versao: datetime
    reenvio_id: UUID | None = None

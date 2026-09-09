"""Schemas Pydantic — contrato HTTP da integração com o SEI-SP (sei.sp.gov.br)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SeiConectarSchema(BaseModel):
    """Payload enviado pela tela de conexão (login interno OU externo)."""

    tipo_login: Literal["interno", "externo"]
    usuario: str | None = Field(None, description="txtUsuario — obrigatório no login interno")
    orgao: str | None = Field(None, description="selOrgao — obrigatório no login interno")
    email: str | None = Field(None, description="txtEmail — obrigatório no login externo")
    senha: str | None = Field(None, min_length=1)
    captcha: str | None = Field(None, description="Texto digitado pelo usuário, quando o SEI exigir captcha")
    lembrar_credencial: bool = False


class SeiStatusSchema(BaseModel):
    """Status da sessão SEI do usuário SICARD atualmente logado."""

    conectado: bool
    tipo_login: str | None = None
    identificacao: str | None = None
    orgao_selecionado: str | None = None
    lembrada: bool = False
    erro: str | None = None
    aviso: str | None = None
    captcha_pendente: bool = False
    captcha_imagem_base64: str | None = None


class SeiOrgaoOptionSchema(BaseModel):
    value: str
    label: str


class SeiLoginFormSchema(BaseModel):
    """Metadados da tela de login do SEI lidos ao vivo — usados pelo frontend antes de conectar."""

    tipo_login: Literal["interno", "externo"]
    orgaos: list[SeiOrgaoOptionSchema] = Field(default_factory=list)
    captcha_pendente: bool = False
    captcha_imagem_base64: str | None = None


class SeiProcessoSchema(BaseModel):
    """Um processo SEI candidato a virar demanda do SICARD (best-effort)."""

    numero: str
    tipo: str | None = None
    interessado: str | None = None
    data: str | None = None
    tipo_demanda_estimado: str = "projeto"


class SeiListarProcessosResponseSchema(BaseModel):
    processos: list[SeiProcessoSchema] = Field(default_factory=list)
    aviso: str | None = Field(
        None,
        description="Preenchido quando o parsing da listagem do SEI falhou/está incompleto (best-effort).",
    )


class SeiCriarDemandaSchema(BaseModel):
    """Payload revisado/editado pelo usuário para criar a demanda a partir de um processo SEI.

    `campos` é repassado, após validação pelo schema do tipo correspondente
    (DemandaCreateSchema / PlanoCreateSchema / ProgramaCreateSchema), ao mesmo
    fluxo de criação já usado pelo cadastro público — o marcador de origem SEI
    é aplicado na geração do código, não no payload.
    """

    tipo_demanda: Literal["plano", "programa", "projeto"] = "projeto"
    campos: dict[str, Any] = Field(default_factory=dict)

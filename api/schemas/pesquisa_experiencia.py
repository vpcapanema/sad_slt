"""Contratos da pesquisa publica de experiencia do SICARD."""
from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator, model_validator


class PesquisaExperienciaAvaliacao(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    frequencia_uso: Literal["primeiro_acesso", "raramente", "mensalmente", "semanalmente", "diariamente"]
    funcionalidade_mais_utilizada: str | None = Field(default=None, max_length=200)
    escala_maxima: Literal[5, 7] = 5
    facilidade: int = Field(ge=1, le=7)
    autonomia: int = Field(ge=1, le=7)
    clareza_interface: int = Field(ge=1, le=7)
    compreensao_resultados: int = Field(ge=1, le=7)
    desempenho: int = Field(ge=1, le=7)
    satisfacao_geral: int = Field(ge=1, le=7)
    principal_dificuldade: str | None = Field(default=None, max_length=2000)
    melhoria_prioritaria: str | None = Field(default=None, max_length=2000)
    criticas_sugestoes_elogios: str | None = Field(default=None, max_length=3000)
    website: str = Field(default="", max_length=0, exclude=True)

    def notas(self) -> tuple[int, ...]:
        return (self.facilidade, self.autonomia, self.clareza_interface,
                self.compreensao_resultados, self.desempenho, self.satisfacao_geral)

    @model_validator(mode="after")
    def validar_escala(self) -> PesquisaExperienciaAvaliacao:
        if max(self.notas()) > self.escala_maxima:
            raise ValueError("A nota ultrapassa o limite da escala.")
        return self

    @field_validator(
        "funcionalidade_mais_utilizada", "principal_dificuldade",
        "melhoria_prioritaria", "criticas_sugestoes_elogios", mode="after",
    )
    @classmethod
    def vazio_como_nulo(cls, valor: str | None) -> str | None:
        return valor or None


class PesquisaExperienciaEntrada(PesquisaExperienciaAvaliacao):
    hierarquizacao_id: UUID


class PesquisaExperienciaAHPAcesso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    token_acesso: SecretStr


class PesquisaExperienciaAHPAcessoPublico(BaseModel):
    model_config = ConfigDict(extra="forbid")

    julgamento: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    email: str | None = Field(default=None, min_length=3, max_length=320)
    token_acesso: SecretStr | None = None


class PesquisaExperienciaAHPEntrada(PesquisaExperienciaAvaliacao):
    perfil: Literal["tecnico", "gestor", "administrativo", "usuario_eventual", "outro"]
    escala_maxima: Literal[7] = 7
    acesso: PesquisaExperienciaAHPAcessoPublico | PesquisaExperienciaAHPAcesso = Field(exclude=True, repr=False)


class PesquisaExperienciaResultado(BaseModel):
    status: Literal["recebido"] = "recebido"
    indice_experiencia: float
    mensagem: str = "Obrigado. Sua avaliação foi registrada."

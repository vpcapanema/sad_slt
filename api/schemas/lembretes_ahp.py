"""Configuração de lembretes dos julgamentos AHP."""
from math import isclose

from pydantic import BaseModel, ConfigDict, Field, model_validator


class NotificacoesLembretesSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    notificacoes_ativas: bool = Field(strict=True)


class FaixaLembretesSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ate: float = Field(gt=0, le=100, allow_inf_nan=False)
    quantidade: int = Field(ge=0, le=9_007_199_254_740_991, strict=True)


class FrequenciaLembretesSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    faixas: list[FaixaLembretesSchema] = Field(min_length=1)

    @model_validator(mode="after")
    def validar_sequencia(self):
        inicio, quantidade_anterior = 0, -1
        duracao_anterior = 100
        for indice, faixa in enumerate(self.faixas, start=1):
            if faixa.ate <= inicio:
                raise ValueError(f"O fim do intervalo {indice} deve ser maior que {inicio:g}%.")
            duracao = faixa.ate - inicio
            if duracao > duracao_anterior and not isclose(duracao, duracao_anterior, rel_tol=0, abs_tol=1e-9):
                raise ValueError(f"A duração do intervalo {indice} deve ser igual ou menor que a do intervalo anterior.")
            if faixa.quantidade <= quantidade_anterior:
                raise ValueError(f"O intervalo {indice} deve ter pelo menos {quantidade_anterior + 1} lembretes.")
            inicio, quantidade_anterior, duracao_anterior = faixa.ate, faixa.quantidade, duracao
        if inicio != 100:
            raise ValueError("O último intervalo deve terminar em 100%.")
        return self

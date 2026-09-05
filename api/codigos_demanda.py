"""Geração padronizada de códigos legíveis — plano, programa e projeto."""
from __future__ import annotations

import re
import uuid
from collections.abc import Callable
from typing import Any, Final, Literal, TypeAlias

from api.exceptions import DemandaValidationError

PREFIX_PLANO = "PLA"
PREFIX_PROGRAMA = "PRO"
PREFIX_PROJETO = "PRJ"

TipoDemandante: TypeAlias = Literal["institucional", "privada"]
TIPO_DEMANDANTE_INSTITUCIONAL: Final[TipoDemandante] = "institucional"
TIPO_DEMANDANTE_PRIVADA: Final[TipoDemandante] = "privada"

# Aceita os códigos novos e, para leitura dos registros existentes, o formato
# legado sem o qualificador do demandante.
CODIGO_DEMANDA_RE = re.compile(
    r"^(?:(?:I-)?(?:PLA|PRO|PRJ)|P-PRJ)-[0-9A-F]{8}$"
)


def gerar_codigo(
    prefix: str,
    tipo_demandante: str = TIPO_DEMANDANTE_INSTITUCIONAL,
    *,
    origem: str = "",
) -> str:
    """Retorna código qualificado pelo demandante e com 8 hex maiúsculos.

    ``origem`` insere um segmento fixo opcional entre o prefixo e o hex — usado
    para marcar demandas criadas a partir de um fluxo externo (ex.: ``origem="SEI"``
    produz ``I-PRJ-SEI-XXXXXXXX``). Vazio por padrão, sem qualquer efeito nos
    códigos gerados pelos fluxos existentes.
    """
    if tipo_demandante == TIPO_DEMANDANTE_PRIVADA:
        if prefix != PREFIX_PROJETO:
            raise DemandaValidationError(
                "Demandas privadas somente podem ser cadastradas como projeto.",
                field="tipo_demandante",
            )
        qualificador = "P"
    elif tipo_demandante == TIPO_DEMANDANTE_INSTITUCIONAL:
        qualificador = "I"
    else:
        raise DemandaValidationError(
            f"Tipo de demandante inválido: {tipo_demandante}.",
            field="tipo_demandante",
        )
    segmentos = [qualificador, prefix]
    if origem:
        segmentos.append(origem.strip().upper())
    segmentos.append(uuid.uuid4().hex[:8].upper())
    return "-".join(segmentos)


def gerar_codigo_plano(*, origem: str = "") -> str:
    return gerar_codigo(PREFIX_PLANO, TIPO_DEMANDANTE_INSTITUCIONAL, origem=origem)


def gerar_codigo_programa(*, origem: str = "") -> str:
    return gerar_codigo(PREFIX_PROGRAMA, TIPO_DEMANDANTE_INSTITUCIONAL, origem=origem)


def gerar_codigo_projeto(
    tipo_demandante: str = TIPO_DEMANDANTE_INSTITUCIONAL,
    *,
    origem: str = "",
) -> str:
    return gerar_codigo(PREFIX_PROJETO, tipo_demandante, origem=origem)


def tipo_demandante_do_codigo(codigo: str | None) -> TipoDemandante:
    """Infere a classificação; códigos legados são tratados como institucionais."""
    if codigo and codigo.strip().startswith("P-PRJ-"):
        return TIPO_DEMANDANTE_PRIVADA
    return TIPO_DEMANDANTE_INSTITUCIONAL


def codigo_demanda_valido(codigo: str | None) -> bool:
    if not codigo:
        return False
    return bool(CODIGO_DEMANDA_RE.match(codigo.strip()))


def gerar_codigo_unico(
    gerador: Callable[[], str],
    exists: Callable[[str], Any],
    *,
    max_tentativas: int = 8,
) -> str:
    """Gera código único, consultando `exists(codigo)` a cada tentativa."""
    for _ in range(max_tentativas):
        codigo = gerador()
        if not exists(codigo):
            return codigo
    raise DemandaValidationError("Não foi possível gerar um código único para a demanda.")

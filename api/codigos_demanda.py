"""Geração padronizada de códigos legíveis — plano, programa e projeto."""
from __future__ import annotations

import re
import uuid
from collections.abc import Callable
from typing import Any

from api.exceptions import DemandaValidationError

PREFIX_PLANO = "PLA"
PREFIX_PROGRAMA = "PRO"
PREFIX_PROJETO = "PRJ"

CODIGO_DEMANDA_RE = re.compile(r"^(PLA|PRO|PRJ)-[0-9A-F]{8}$")


def gerar_codigo(prefix: str) -> str:
    """Retorna código no formato PREFIX-XXXXXXXX (8 hex maiúsculos)."""
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def gerar_codigo_plano() -> str:
    return gerar_codigo(PREFIX_PLANO)


def gerar_codigo_programa() -> str:
    return gerar_codigo(PREFIX_PROGRAMA)


def gerar_codigo_projeto() -> str:
    return gerar_codigo(PREFIX_PROJETO)


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

"""Resolução de pais sentinela (Outros planos / Outros programas) na hierarquia."""
from __future__ import annotations

from api.constants import CODIGO_PLANO_OUTROS, CODIGO_PROGRAMA_OUTROS
from api.exceptions import DemandaValidationError
from api.repositories import plano_repository, programa_repository
from api.services.vinculacao_policy import exigir_elegivel


def _plano_outros_id() -> str:
    row = plano_repository.get_by_codigo(CODIGO_PLANO_OUTROS)
    if not row:
        raise DemandaValidationError(
            f"Plano sentinela «Outros planos» ({CODIGO_PLANO_OUTROS}) não encontrado. "
            "Execute a migração database/021_seed_outros_hierarquia.sql.",
            field="plano_codigo",
        )
    return str(row["id"])


def _programa_outros_id() -> str:
    row = programa_repository.get_by_codigo(CODIGO_PROGRAMA_OUTROS)
    if not row:
        raise DemandaValidationError(
            f"Programa sentinela «Outros programas» ({CODIGO_PROGRAMA_OUTROS}) não encontrado. "
            "Execute a migração database/021_seed_outros_hierarquia.sql.",
            field="programa_codigo",
        )
    return str(row["id"])


def resolve_plano_pai_id(*, plano_codigo: str | None, vinculo_institucional: bool) -> str:
    """UUID do plano pai; usa PLANO-OUTROS quando não há vínculo institucional."""
    if vinculo_institucional and not (plano_codigo or "").strip():
        raise DemandaValidationError("Selecione um plano elegível.", field="plano_codigo")
    if vinculo_institucional and plano_codigo and plano_codigo.strip():
        if plano_codigo.strip() == CODIGO_PLANO_OUTROS:
            raise DemandaValidationError("Outros planos não representa vínculo institucional.", field="plano_codigo")
        plano = plano_repository.get_by_codigo(plano_codigo.strip())
        if not plano:
            raise DemandaValidationError(
                f"Plano não encontrado: {plano_codigo}.",
                field="plano_codigo",
            )
        exigir_elegivel(plano, "plano_codigo")
        return str(plano["id"])
    return _plano_outros_id()


def resolve_programa_pai_id(
    *,
    programa_codigo: str | None,
    vinculo_institucional: bool,
    vinculo_tipo: str | None,
) -> str:
    """UUID do programa pai; usa PROG-OUTROS salvo vínculo explícito a um programa."""
    if vinculo_institucional and vinculo_tipo == "programa" and not (programa_codigo or "").strip():
        raise DemandaValidationError("Selecione um programa elegível.", field="programa_codigo")
    if (
        vinculo_institucional
        and vinculo_tipo == "programa"
        and programa_codigo
        and programa_codigo.strip()
    ):
        if programa_codigo.strip() == CODIGO_PROGRAMA_OUTROS:
            raise DemandaValidationError("Outros programas não representa vínculo institucional.", field="programa_codigo")
        programa = programa_repository.get_by_codigo(programa_codigo.strip())
        if not programa:
            raise DemandaValidationError(
                f"Programa não encontrado: {programa_codigo}.",
                field="programa_codigo",
            )
        exigir_elegivel(programa, "programa_codigo")
        return str(programa["id"])
    return _programa_outros_id()


def is_plano_outros(codigo: str | None) -> bool:
    return (codigo or "").strip() == CODIGO_PLANO_OUTROS


def is_programa_outros(codigo: str | None) -> bool:
    return (codigo or "").strip() == CODIGO_PROGRAMA_OUTROS

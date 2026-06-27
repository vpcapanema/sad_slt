"""Regras de negócio — universo de demandas elegíveis ao AHP, por tipo."""
from __future__ import annotations

from typing import Any

from api.constants import TIPOS_DEMANDA
from api.exceptions import DemandaValidationError
from api.repositories import universo_repository as repo
from api.schemas.universo import UniversoItemSchema


def _row_to_item(tipo: str, row: dict[str, Any]) -> UniversoItemSchema:
    return UniversoItemSchema(
        id=str(row["id"]),
        codigo=row["codigo"],
        nome=row["nome"],
        status=row["status"],
        tipo_demanda=tipo,
        grupo_id=row.get("grupo_id"),
    )


def listar_universo(
    tipo: str, *, status: str | None = None, grupo: str | None = None
) -> list[UniversoItemSchema]:
    if tipo not in TIPOS_DEMANDA:
        raise DemandaValidationError(f"Tipo de demanda inválido: {tipo}.", field="tipo")
    rows = repo.list_elegiveis(tipo, status=status, grupo=grupo)
    return [_row_to_item(tipo, r) for r in rows]

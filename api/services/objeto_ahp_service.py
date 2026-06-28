"""Regras de negócio — universo AHP de projetos (demandas.projeto).

Após o colapso do modelo dual, aprovar uma demanda é uma transição de status
in-place (não há mais snapshot em outra tabela). O universo do AHP são os
projetos em fase de hierarquização.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from api.constants import STATUS_PRE_APROVACAO
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import demanda_repository, dominio_repository, objeto_ahp_repository
from api.schemas.objeto_ahp import GeometriaSchema, ObjetoAhpResponseSchema, ObjetoAhpUpdateSchema


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _str_or_none(value: Any) -> str | None:
    return str(value) if value is not None else None


def _geometria_from_row(row: dict[str, Any]) -> GeometriaSchema | None:
    geo = row.get("geometria_geojson")
    if not geo:
        return None
    if isinstance(geo, str):
        geo = json.loads(geo)
    tipo = row.get("geometria_tipo") or geo.get("type")
    if not tipo:
        return None
    return GeometriaSchema(tipo=tipo, coordinates=geo.get("coordinates"))


def _row_to_response(row: dict[str, Any]) -> ObjetoAhpResponseSchema:
    return ObjetoAhpResponseSchema(
        id=str(row["id"]),
        codigo=row["codigo"],
        demanda_id=str(row["id"]),
        demanda_codigo=row["codigo"],
        status=row["status"],
        statusAtualizadoEm=_iso(row.get("status_atualizado_em")) or "",
        grupo_comparacao=_str_or_none(row.get("programa_id")),
        programa_id=_str_or_none(row.get("programa_id")),
        nome=row["nome"],
        descricao=row.get("descricao"),
        diretoria_id=_str_or_none(row.get("diretoria_id")),
        plano_id=_str_or_none(row.get("plano_id")),
        classificacao=row.get("classificacao"),
        complementos=row.get("complementos"),
        instituicao_nome=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        lat=float(row["latitude"]),
        lng=float(row["longitude"]),
        geometria=_geometria_from_row(row),
        aprovadoEm=_iso(row.get("aprovado_em")),
        motivo_aprovacao=row.get("motivo_aprovacao"),
    )


def aprovar_demanda(
    codigo: str,
    *,
    motivo: str | None = None,
    aprovado_por: str | None = None,
) -> ObjetoAhpResponseSchema:
    """Aprova a demanda promovendo-a ao universo AHP (transição de status in-place)."""
    demanda = demanda_repository.get_by_codigo(codigo)
    if not demanda:
        raise DemandaNotFoundError(codigo)

    if demanda["status"] not in STATUS_PRE_APROVACAO:
        raise DemandaValidationError(
            f"Demanda em status '{demanda['status']}' não pode ser aprovada.",
            field="status",
        )

    aprovado_uuid = None
    if aprovado_por:
        try:
            aprovado_uuid = str(uuid.UUID(aprovado_por))
        except (ValueError, TypeError) as exc:
            raise DemandaValidationError(
                "aprovado_por inválido (UUID esperado).", field="aprovado_por"
            ) from exc

    updated = objeto_ahp_repository.aprovar(codigo, aprovado_por=aprovado_uuid, motivo=motivo)
    if not updated:
        raise DemandaValidationError(
            f"Demanda {codigo} não pôde ser aprovada (status alterado).", field="status"
        )
    return _row_to_response(updated)


def listar_objetos(*, status: str | None = None, grupo: str | None = None) -> list[ObjetoAhpResponseSchema]:
    rows = objeto_ahp_repository.list_all(status=status, grupo=grupo)
    return [_row_to_response(row) for row in rows]


def obter_objeto(codigo: str) -> ObjetoAhpResponseSchema:
    row = objeto_ahp_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def _status_objeto_validos() -> set[str]:
    return {row["codigo"] for row in dominio_repository.list_status_objeto_ahp()}


def atualizar_objeto(codigo: str, payload: ObjetoAhpUpdateSchema) -> ObjetoAhpResponseSchema:
    row = objeto_ahp_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return _row_to_response(row)

    if "status" in data and data["status"] not in _status_objeto_validos():
        raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")

    updated = objeto_ahp_repository.update(codigo, data)
    if not updated:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(updated)

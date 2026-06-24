"""Regras de negócio — objetos alvo da AHP."""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from psycopg import errors

from api.db.connection import get_connection
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import demanda_repository, dominio_repository, objeto_ahp_repository
from api.schemas.objeto_ahp import GeometriaSchema, ObjetoAhpResponseSchema, ObjetoAhpUpdateSchema

_STATUS_APROVACAO_PERMITIDOS = frozenset({"fila_hierarquizacao", "em_analise"})


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _grupo_comparacao(plano_id: str, classificacao: dict[str, Any] | None) -> str:
    if not classificacao:
        return f"{plano_id}|GERAL"
    tipo = classificacao.get("tipo")
    if tipo == "frente_pli":
        return f"{plano_id}|{classificacao.get('frente_id') or 'GERAL'}"
    if tipo == "eixo_pef":
        eixo = classificacao.get("eixo_id") or "GERAL"
        tic = classificacao.get("corredor_tic_id")
        return f"{plano_id}|{eixo}" + (f"|{tic}" if tic else "")
    return f"{plano_id}|GERAL"


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
        demanda_id=str(row["demanda_id"]),
        demanda_codigo=row["demanda_codigo"],
        status=row["status"],
        statusAtualizadoEm=_iso(row["status_atualizado_em"]),
        grupo_comparacao=row["grupo_comparacao"],
        nome=row["nome"],
        descricao=row.get("descricao"),
        diretoria_id=row["diretoria_id"],
        plano_id=row["plano_id"],
        classificacao=row.get("classificacao"),
        complementos=row.get("complementos"),
        instituicao_nome=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        lat=float(row["latitude"]),
        lng=float(row["longitude"]),
        geometria=_geometria_from_row(row),
        aprovadoEm=_iso(row["aprovado_em"]),
        motivo_aprovacao=row.get("motivo_aprovacao"),
    )


def _build_objeto_row_from_demanda(
    demanda: dict[str, Any],
    *,
    motivo: str | None,
    aprovado_por: str | None,
) -> dict[str, Any]:
    classificacao = demanda.get("classificacao")
    if isinstance(classificacao, str):
        classificacao = json.loads(classificacao)

    geo_json = demanda.get("geometria_geojson")
    if geo_json is not None and not isinstance(geo_json, str):
        geo_json = json.dumps(geo_json)
    if not geo_json:
        geo_json = json.dumps(
            {"type": "Point", "coordinates": [demanda["longitude"], demanda["latitude"]]}
        )

    aprovado_uuid = None
    if aprovado_por:
        try:
            aprovado_uuid = str(uuid.UUID(aprovado_por))
        except (ValueError, TypeError) as exc:
            raise DemandaValidationError("aprovado_por inválido (UUID esperado).", field="aprovado_por") from exc

    return {
            "codigo": demanda["codigo"],
            "demanda_id": demanda["id"],
            "demanda_codigo": demanda["codigo"],
            "status": "elegivel_ahp",
            "grupo_comparacao": _grupo_comparacao(demanda["plano_id"], classificacao),
            "nome": demanda["nome"],
            "descricao": demanda.get("descricao"),
            "diretoria_id": demanda["diretoria_id"],
            "plano_id": demanda["plano_id"],
            "classificacao": classificacao,
            "complementos": demanda.get("complementos"),
            "instituicao_nome": demanda.get("instituicao_nome"),
            "instituicao_cnpj": demanda.get("instituicao_cnpj"),
            "latitude": demanda["latitude"],
            "longitude": demanda["longitude"],
            "geometria_tipo": demanda.get("geometria_tipo"),
            "geometria_geojson": geo_json,
            "aprovado_por": aprovado_uuid,
            "motivo_aprovacao": motivo,
        }


def aprovar_demanda(
    codigo: str,
    *,
    motivo: str | None = None,
    aprovado_por: str | None = None,
) -> ObjetoAhpResponseSchema:
    """Aprova demanda e promove snapshot para ahp.objeto_ahp (transação única)."""
    demanda = demanda_repository.get_by_codigo(codigo)
    if not demanda:
        raise DemandaNotFoundError(codigo)

    if demanda["status"] not in _STATUS_APROVACAO_PERMITIDOS:
        raise DemandaValidationError(
            f"Demanda em status '{demanda['status']}' não pode ser aprovada.",
            field="status",
        )

    if objeto_ahp_repository.get_by_demanda_id(demanda["id"]):
        raise DemandaValidationError(
            f"Demanda {codigo} já possui objeto AHP.",
            field="codigo",
        )

    objeto_row = _build_objeto_row_from_demanda(demanda, motivo=motivo, aprovado_por=aprovado_por)

    with get_connection() as conn:
        try:
            cur = conn.execute(
                """
                UPDATE cadastro.cadastro_demanda
                SET status = 'aprovada'
                WHERE id = %s AND status = ANY(%s)
                """,
                (demanda["id"], list(_STATUS_APROVACAO_PERMITIDOS)),
            )
            objeto_id = objeto_ahp_repository.insert_with_connection(conn, objeto_row)
            conn.commit()
        except errors.UniqueViolation as exc:
            conn.rollback()
            raise DemandaValidationError(f"Demanda {codigo} já possui objeto AHP.", field="codigo") from exc
        except Exception:
            conn.rollback()
            raise

    found = objeto_ahp_repository.get_by_id(objeto_id)
    if not found:
        raise RuntimeError("Objeto AHP criado mas não recuperado.")
    return _row_to_response(found)


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

    plano_id = data.get("plano_id", row["plano_id"])
    classificacao = data.get("classificacao", row.get("classificacao"))
    if isinstance(classificacao, str):
        classificacao = json.loads(classificacao)
    if ("plano_id" in data or "classificacao" in data) and "grupo_comparacao" not in data:
        data["grupo_comparacao"] = _grupo_comparacao(plano_id, classificacao)

    updated = objeto_ahp_repository.update(codigo, data)
    if not updated:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(updated)

"""Regras de negócio — cadastro de demandas."""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from psycopg import errors

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import demanda_repository, dominio_repository, programa_repository
from api.schemas.demanda import DemandaCreateSchema, DemandaResponseSchema, DemandaUpdateSchema, GeometriaSchema, RepresentanteSchema
_ALLOWED_GEOM = frozenset({"Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"})


def _parse_uuid(value: str, field: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError) as exc:
        raise DemandaValidationError(f"{field} inválido (UUID esperado).", field=field) from exc


def _geometria_to_geojson_str(geometria: dict[str, Any] | None) -> tuple[str | None, str | None]:
    if not geometria:
        return None, None
    tipo = geometria.get("tipo") or geometria.get("type")
    coords = geometria.get("coordinates")
    if not tipo or coords is None:
        raise DemandaValidationError("Geometria incompleta.", field="geometria")
    if tipo not in _ALLOWED_GEOM:
        raise DemandaValidationError(f"Tipo de geometria não suportado: {tipo}.", field="geometria")
    return tipo, json.dumps({"type": tipo, "coordinates": coords})


def _row_to_response(row: dict[str, Any]) -> DemandaResponseSchema:
    geometria = None
    raw_geo = row.get("geometria_geojson")
    if raw_geo:
        if isinstance(raw_geo, str):
            raw_geo = json.loads(raw_geo)
        geometria = GeometriaSchema(tipo=raw_geo.get("type"), coordinates=raw_geo.get("coordinates"))

    criado = row["criado_em"]
    if isinstance(criado, datetime):
        criado_em = criado.isoformat()
    else:
        criado_em = str(criado)

    return DemandaResponseSchema(
        id=row["codigo"],
        status=row["status"],
        criadoEm=criado_em,
        instituicao_id=str(row["sigma_instituicao_id"]),
        instituicao_label=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
        lat=float(row["latitude"]),
        lng=float(row["longitude"]),
        representante=RepresentanteSchema(
            pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
            nome=row.get("representante_nome") or "",
            email=row.get("representante_email"),
            telefone=row.get("representante_telefone"),
        ),
        diretoria_id=row["diretoria_id"],
        plano_id=row["plano_id"],
        programa_id=str(row["programa_id"]) if row.get("programa_id") else None,
        nome=row["nome"],
        descricao=row.get("descricao"),
        geometria=geometria,
        classificacao=row.get("classificacao"),
        complementos=row.get("complementos"),
    )


def _validate_payload(payload: DemandaCreateSchema) -> None:
    _parse_uuid(payload.instituicao_id, "instituicao_id")
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    if not pessoa_id:
        raise DemandaValidationError("Representante legal é obrigatório.", field="pessoa_id")
    _parse_uuid(pessoa_id, "pessoa_id")
    if not (-90 <= payload.lat <= 90 and -180 <= payload.lng <= 180):
        raise DemandaValidationError("Coordenadas fora do intervalo válido.", field="lat")


def _build_persist_row(payload: DemandaCreateSchema) -> dict[str, Any]:
    _validate_payload(payload)
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    geom_tipo, geom_json = _geometria_to_geojson_str(
        payload.geometria.model_dump() if payload.geometria else None
    )

    programa_id = None
    if payload.programa_codigo and payload.programa_codigo.strip():
        programa = programa_repository.get_by_codigo(payload.programa_codigo.strip())
        if not programa:
            raise DemandaValidationError(
                f"Programa não encontrado: {payload.programa_codigo}.", field="programa_codigo"
            )
        programa_id = str(programa["id"])

    if not payload.diretoria_id or not str(payload.diretoria_id).strip():
        raise DemandaValidationError("Diretoria é obrigatória.", field="diretoria_id")
    if not payload.plano_id or not str(payload.plano_id).strip():
        raise DemandaValidationError("Plano é obrigatório.", field="plano_id")

    return demanda_repository.prepare_insert_params(
        {
            "codigo": payload.id.strip(),
            "status": payload.status or "fila_hierarquizacao",
            "sigma_instituicao_id": _parse_uuid(payload.instituicao_id, "instituicao_id"),
            "instituicao_nome": payload.instituicao_label,
            "instituicao_cnpj": payload.instituicao_cnpj,
            "sigma_pessoa_id": _parse_uuid(str(pessoa_id), "pessoa_id"),
            "representante_nome": (payload.representante.nome or "").strip() or "—",
            "representante_email": payload.representante.email,
            "representante_telefone": payload.representante.telefone,
            "diretoria_id": payload.diretoria_id.strip(),
            "plano_id": payload.plano_id.strip(),
            "programa_id": programa_id,
            "nome": payload.nome.strip(),
            "descricao": payload.descricao,
            "latitude": payload.lat,
            "longitude": payload.lng,
            "geometria_tipo": geom_tipo,
            "geometria_geojson": geom_json,
            "classificacao": payload.classificacao,
            "complementos": payload.complementos,
        }
    )


def criar_demanda(payload: DemandaCreateSchema) -> DemandaResponseSchema:
    if demanda_repository.get_by_codigo(payload.id.strip()):
        raise DemandaValidationError(f"Código de demanda já existe: {payload.id}.", field="id")
    try:
        row = demanda_repository.insert(_build_persist_row(payload))
    except errors.UniqueViolation as exc:
        raise DemandaValidationError(f"Código de demanda já existe: {payload.id}.", field="id") from exc
    return _row_to_response(row)


def listar_demandas() -> list[DemandaResponseSchema]:
    return [_row_to_response(row) for row in demanda_repository.list_all()]


def obter_demanda(codigo: str) -> DemandaResponseSchema:
    row = demanda_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def _status_demanda_validos() -> set[str]:
    return {row["codigo"] for row in dominio_repository.list_status_demanda()}


def atualizar_demanda(codigo: str, payload: DemandaUpdateSchema) -> DemandaResponseSchema:
    if not demanda_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return obter_demanda(codigo)

    if data.get("status") == "aprovada":
        raise DemandaValidationError(
            "Use POST /api/demandas/{codigo}/aprovar para aprovar e criar objeto AHP.",
            field="status",
        )

    if "status" in data and data["status"] not in _status_demanda_validos():
        raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")

    if "lat" in data:
        data["latitude"] = data.pop("lat")
    if "lng" in data:
        data["longitude"] = data.pop("lng")

    if "instituicao_label" in data:
        data["instituicao_nome"] = data.pop("instituicao_label")

    rep = data.pop("representante", None)
    if rep:
        if rep.get("nome") is not None:
            data["representante_nome"] = rep["nome"]
        if rep.get("email") is not None:
            data["representante_email"] = rep["email"]
        if rep.get("telefone") is not None:
            data["representante_telefone"] = rep["telefone"]

    lat = data.get("latitude")
    lng = data.get("longitude")
    if lat is not None and not (-90 <= lat <= 90):
        raise DemandaValidationError("Latitude fora do intervalo válido.", field="lat")
    if lng is not None and not (-180 <= lng <= 180):
        raise DemandaValidationError("Longitude fora do intervalo válido.", field="lng")

    row = demanda_repository.update(codigo, data)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)

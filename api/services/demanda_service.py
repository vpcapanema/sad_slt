"""Regras de negócio — cadastro de demandas."""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from psycopg import errors

from api.codigos_demanda import gerar_codigo_projeto, gerar_codigo_unico
from api.constants import STATUS_INICIAL_DEMANDA
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import demanda_repository, dominio_repository
from api.services.campos_demanda import normalizar_projeto
from api.services.hierarquia_outros import resolve_programa_pai_id
from api.services.patch_helpers import apply_instituicao, apply_representante
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
        programa_codigo=row.get("programa_codigo"),
        programa_nome=row.get("programa_nome"),
        vinculo_institucional=bool(row.get("vinculo_institucional")),
        vinculo_tipo=row.get("vinculo_tipo"),
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


def _build_persist_row(payload: DemandaCreateSchema, codigo: str) -> dict[str, Any]:
    _validate_payload(payload)
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    geom_tipo, geom_json = _geometria_to_geojson_str(
        payload.geometria.model_dump() if payload.geometria else None
    )

    programa_id = resolve_programa_pai_id(
        programa_codigo=payload.programa_codigo,
        vinculo_institucional=bool(payload.vinculo_institucional),
        vinculo_tipo=payload.vinculo_tipo,
    )

    if (
        payload.vinculo_institucional
        and payload.vinculo_tipo == "programa"
        and not (payload.programa_codigo or "").strip()
    ):
        raise DemandaValidationError(
            "Selecione o programa cadastrado ou indique que não há vínculo institucional.",
            field="programa_codigo",
        )

    if not payload.diretoria_id or not str(payload.diretoria_id).strip():
        raise DemandaValidationError("Diretoria é obrigatória.", field="diretoria_id")
    if not payload.plano_id or not str(payload.plano_id).strip():
        raise DemandaValidationError("Plano é obrigatório.", field="plano_id")
    if payload.vinculo_tipo and payload.vinculo_tipo not in {"programa", "plano"}:
        raise DemandaValidationError("Tipo de vínculo inválido.", field="vinculo_tipo")

    if not (payload.representante.nome or "").strip():
        raise DemandaValidationError("Nome do representante legal é obrigatório.", field="representante.nome")

    row = {
        "codigo": codigo,
        "status": payload.status or STATUS_INICIAL_DEMANDA,
        "sigma_instituicao_id": _parse_uuid(payload.instituicao_id, "instituicao_id"),
        "instituicao_nome": payload.instituicao_label,
        "instituicao_cnpj": payload.instituicao_cnpj,
        "instituicao_razao_social": payload.instituicao_razao_social,
        "instituicao_nome_fantasia": payload.instituicao_nome_fantasia,
        "sigma_pessoa_id": _parse_uuid(str(pessoa_id), "pessoa_id"),
        "representante_nome": (payload.representante.nome or "").strip(),
        "representante_email": payload.representante.email,
        "representante_telefone": payload.representante.telefone,
        "diretoria_id": payload.diretoria_id.strip(),
        "plano_id": payload.plano_id.strip(),
        "programa_id": programa_id,
        "vinculo_institucional": bool(payload.vinculo_institucional),
        "vinculo_tipo": payload.vinculo_tipo,
        "nome": payload.nome.strip(),
        "descricao": payload.descricao,
        "latitude": payload.lat,
        "longitude": payload.lng,
        "geometria_tipo": geom_tipo,
        "geometria_geojson": geom_json,
        "classificacao": payload.classificacao,
        "complementos": payload.complementos,
    }
    normalizar_projeto(row, pessoa_id=str(pessoa_id))
    return demanda_repository.prepare_insert_params(row)


def criar_demanda(payload: DemandaCreateSchema) -> DemandaResponseSchema:
    codigo = gerar_codigo_unico(gerar_codigo_projeto, demanda_repository.get_by_codigo)
    try:
        row = demanda_repository.insert(_build_persist_row(payload, codigo))
    except errors.UniqueViolation as exc:
        raise DemandaValidationError("Não foi possível gerar código único para o projeto.", field="id") from exc
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

    if "status" in data and data["status"] not in _status_demanda_validos():
        raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")

    existing = demanda_repository.get_by_codigo(codigo)
    if not existing:
        raise DemandaNotFoundError(codigo)

    if "status" in data:
        from api.services.status_transicoes import validar_transicao_status

        validar_transicao_status(de=existing["status"], para=data["status"])

    if "programa_codigo" in data:
        programa_id = resolve_programa_pai_id(
            programa_codigo=data.pop("programa_codigo"),
            vinculo_institucional=bool(existing.get("vinculo_institucional")),
            vinculo_tipo=existing.get("vinculo_tipo"),
        )
        data["programa_id"] = programa_id

    apply_instituicao(data, data)
    apply_representante(data, data)

    if "lat" in data:
        data["latitude"] = data.pop("lat")
    if "lng" in data:
        data["longitude"] = data.pop("lng")

    for key in ("instituicao_id", "instituicao_label", "pessoa_id", "representante"):
        data.pop(key, None)

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


def excluir_demanda(codigo: str) -> None:
    if not demanda_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    if not demanda_repository.delete_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)

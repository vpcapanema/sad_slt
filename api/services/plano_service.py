"""Regras de negócio — planos (nível 1)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import plano_repository
from api.schemas.demanda import RepresentanteSchema
from api.schemas.plano import PlanoCreateSchema, PlanoResponseSchema, PlanoUpdateSchema


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _parse_uuid(value: str, field: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError) as exc:
        raise DemandaValidationError(f"{field} inválido (UUID esperado).", field=field) from exc


def _representante_from_row(row: dict[str, Any]) -> RepresentanteSchema | None:
    if not row.get("sigma_pessoa_id") and not row.get("representante_nome"):
        return None
    return RepresentanteSchema(
        pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
        nome=row.get("representante_nome") or "",
        email=row.get("representante_email"),
        telefone=row.get("representante_telefone"),
    )


def _row_to_response(row: dict[str, Any]) -> PlanoResponseSchema:
    valor = row.get("valor_global")
    rep = _representante_from_row(row)
    return PlanoResponseSchema(
        id=row["codigo"],
        status=row["status"],
        criadoEm=_iso(row.get("criado_em")) or "",
        diretoria_id=row["diretoria_id"],
        nome=row["nome"],
        descricao=row.get("descricao"),
        objetivo_estrategico=row.get("objetivo_estrategico"),
        responsavel=row.get("responsavel"),
        pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
        representante=rep,
        vigencia_inicio=_iso(row.get("vigencia_inicio")),
        vigencia_fim=_iso(row.get("vigencia_fim")),
        valor_global=float(valor) if valor is not None else None,
        unidades_espaciais=list(row.get("unidades_espaciais") or []),
    )


def _gerar_codigo() -> str:
    return f"PLA-{uuid.uuid4().hex[:8].upper()}"


def _resolve_pessoa_id(payload: PlanoCreateSchema) -> str:
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    if not pessoa_id:
        raise DemandaValidationError("Representante legal é obrigatório.", field="pessoa_id")
    return _parse_uuid(str(pessoa_id), "pessoa_id")


def criar_plano(payload: PlanoCreateSchema) -> PlanoResponseSchema:
    codigo = (payload.codigo or "").strip() or _gerar_codigo()
    if plano_repository.get_by_codigo(codigo):
        raise DemandaValidationError(f"Código de plano já existe: {codigo}.", field="codigo")
    pessoa_id = _resolve_pessoa_id(payload)
    row = {
        "codigo": codigo,
        "diretoria_id": payload.diretoria_id,
        "nome": payload.nome.strip(),
        "descricao": payload.descricao.strip(),
        "objetivo_estrategico": payload.objetivo_estrategico,
        "responsavel": payload.responsavel,
        "sigma_pessoa_id": pessoa_id,
        "representante_nome": (payload.representante.nome or "").strip() or "—",
        "representante_email": payload.representante.email,
        "representante_telefone": payload.representante.telefone,
        "vigencia_inicio": payload.vigencia_inicio or None,
        "vigencia_fim": payload.vigencia_fim or None,
        "valor_global": payload.valor_global,
        "status": "rascunho",
    }
    inserted = plano_repository.insert(row, payload.unidades_espaciais)
    return _row_to_response(inserted)


def listar_planos() -> list[PlanoResponseSchema]:
    return [_row_to_response(row) for row in plano_repository.list_all()]


def obter_plano(codigo: str) -> PlanoResponseSchema:
    row = plano_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def aprovar_plano(codigo: str, *, motivo: str | None = None,
                  aprovado_por: str | None = None) -> PlanoResponseSchema:
    if not plano_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    row = plano_repository.aprovar(codigo, aprovado_por=aprovado_por, motivo=motivo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def atualizar_plano(codigo: str, payload: PlanoUpdateSchema) -> PlanoResponseSchema:
    if not plano_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    data = payload.model_dump(exclude_unset=True)
    row = plano_repository.update(codigo, data)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)

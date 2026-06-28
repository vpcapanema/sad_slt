"""Regras de negócio — planos (nível 1)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from api.codigos_demanda import gerar_codigo_plano, gerar_codigo_unico
from api.constants import CODIGOS_SENTINELA_HIERARQUIA
from api.constants import STATUS_PRE_APROVACAO
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import dominio_repository, plano_repository, programa_repository
from api.schemas.demanda import RepresentanteSchema
from api.schemas.plano import PlanoCreateSchema, PlanoResponseSchema, PlanoUpdateSchema
from api.services.campos_demanda import normalizar_plano
from api.services.patch_helpers import apply_instituicao, apply_representante
from api.services.status_transicoes import validar_transicao_status


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
        instituicao_id=str(row["sigma_instituicao_id"]) if row.get("sigma_instituicao_id") else None,
        instituicao_label=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        instituicao_razao_social=row.get("instituicao_razao_social"),
        instituicao_nome_fantasia=row.get("instituicao_nome_fantasia"),
        pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
        representante=rep,
        vigencia_inicio=_iso(row.get("vigencia_inicio")),
        vigencia_fim=_iso(row.get("vigencia_fim")),
        valor_global=float(valor) if valor is not None else None,
        unidades_espaciais=list(row.get("unidades_espaciais") or []),
    )


def _resolve_pessoa_id(payload: PlanoCreateSchema) -> str:
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    if not pessoa_id:
        raise DemandaValidationError("Representante legal é obrigatório.", field="pessoa_id")
    return _parse_uuid(str(pessoa_id), "pessoa_id")


def _resolve_instituicao_id(payload: PlanoCreateSchema) -> str:
    if not payload.instituicao_id:
        raise DemandaValidationError("Instituição interessada é obrigatória.", field="instituicao_id")
    return _parse_uuid(str(payload.instituicao_id), "instituicao_id")


def criar_plano(payload: PlanoCreateSchema) -> PlanoResponseSchema:
    codigo = gerar_codigo_unico(gerar_codigo_plano, plano_repository.get_by_codigo)
    pessoa_id = _resolve_pessoa_id(payload)
    instituicao_id = _resolve_instituicao_id(payload)
    if not (payload.representante.nome or "").strip():
        raise DemandaValidationError("Nome do representante legal é obrigatório.", field="representante.nome")
    row = {
        "codigo": codigo,
        "diretoria_id": payload.diretoria_id,
        "nome": payload.nome.strip(),
        "descricao": payload.descricao.strip(),
        "objetivo_estrategico": payload.objetivo_estrategico,
        "responsavel": payload.responsavel,
        "sigma_instituicao_id": instituicao_id,
        "instituicao_nome": payload.instituicao_label,
        "instituicao_razao_social": payload.instituicao_razao_social,
        "instituicao_nome_fantasia": payload.instituicao_nome_fantasia,
        "instituicao_cnpj": payload.instituicao_cnpj,
        "sigma_pessoa_id": pessoa_id,
        "representante_nome": (payload.representante.nome or "").strip(),
        "representante_email": payload.representante.email,
        "representante_telefone": payload.representante.telefone,
        "vigencia_inicio": payload.vigencia_inicio or None,
        "vigencia_fim": payload.vigencia_fim or None,
        "valor_global": payload.valor_global,
        "status": "analise_rascunho",
    }
    normalizar_plano(row, pessoa_id=pessoa_id)
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
    row = plano_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)
    if row["status"] not in STATUS_PRE_APROVACAO:
        raise DemandaValidationError(
            f"Plano em status '{row['status']}' não pode ser aprovado.",
            field="status",
        )
    updated = plano_repository.aprovar(codigo, aprovado_por=aprovado_por, motivo=motivo)
    if not updated:
        raise DemandaValidationError(
            f"Plano {codigo} não pôde ser aprovado (status alterado).", field="status"
        )
    return _row_to_response(updated)


def atualizar_plano(codigo: str, payload: PlanoUpdateSchema) -> PlanoResponseSchema:
    if not plano_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return obter_plano(codigo)

    if "status" in data:
        row = plano_repository.get_by_codigo(codigo)
        if not row:
            raise DemandaNotFoundError(codigo)
        valid = {r["codigo"] for r in dominio_repository.list_status_demanda()}
        if data["status"] not in valid:
            raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")
        validar_transicao_status(de=row["status"], para=data["status"])

    apply_instituicao(data, data)
    apply_representante(data, data)
    for key in ("instituicao_id", "instituicao_label", "pessoa_id", "representante"):
        data.pop(key, None)

    row = plano_repository.update(codigo, data)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def excluir_plano(codigo: str) -> None:
    if codigo in CODIGOS_SENTINELA_HIERARQUIA:
        raise DemandaValidationError(
            f"Não é permitido excluir o registro sentinela «{codigo}».",
            field="codigo",
        )
    row = plano_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)

    if programa_repository.list_by_plano_id(row["id"]):
        raise DemandaValidationError(
            "Não é possível excluir o plano: existem programas vinculados. "
            "Remova ou reassocie os programas antes de excluir o plano.",
            field="codigo",
        )

    if not plano_repository.delete_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)

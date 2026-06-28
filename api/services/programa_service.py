"""Regras de negócio — programas (nível 2)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from api.codigos_demanda import gerar_codigo_programa, gerar_codigo_unico
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import programa_repository
from api.services.campos_demanda import normalizar_programa
from api.services.hierarquia_outros import resolve_plano_pai_id
from api.schemas.demanda import RepresentanteSchema
from api.schemas.programa import ProgramaCreateSchema, ProgramaResponseSchema, ProgramaUpdateSchema


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


def _row_to_response(row: dict[str, Any]) -> ProgramaResponseSchema:
    valor = row.get("valor_global")
    rep = _representante_from_row(row)
    return ProgramaResponseSchema(
        id=row["codigo"],
        status=row["status"],
        criadoEm=_iso(row.get("criado_em")) or "",
        plano_id=str(row["plano_id"]) if row.get("plano_id") else None,
        plano_codigo=row.get("plano_codigo"),
        plano_nome=row.get("plano_nome"),
        diretoria_id=row.get("diretoria_id"),
        nome=row["nome"],
        descricao=row.get("descricao"),
        objetivo=row.get("objetivo"),
        publico_alvo=row.get("publico_alvo"),
        orgao_responsavel=row.get("orgao_responsavel"),
        justificativa=row.get("justificativa"),
        valor_global=float(valor) if valor is not None else None,
        vinculo_institucional=bool(row.get("vinculo_institucional")),
        instituicao_id=str(row["sigma_instituicao_id"]) if row.get("sigma_instituicao_id") else None,
        instituicao_label=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        instituicao_razao_social=row.get("instituicao_razao_social"),
        instituicao_nome_fantasia=row.get("instituicao_nome_fantasia"),
        pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
        representante=rep,
        unidades_espaciais=list(row.get("unidades_espaciais") or []),
    )


def _resolve_pessoa_id(payload: ProgramaCreateSchema) -> str:
    pessoa_id = payload.pessoa_id or payload.representante.pessoa_id
    if not pessoa_id:
        raise DemandaValidationError("Representante legal é obrigatório.", field="pessoa_id")
    return _parse_uuid(str(pessoa_id), "pessoa_id")


def _resolve_instituicao_id(payload: ProgramaCreateSchema) -> str:
    if not payload.instituicao_id:
        raise DemandaValidationError("Instituição interessada é obrigatória.", field="instituicao_id")
    return _parse_uuid(str(payload.instituicao_id), "instituicao_id")


def criar_programa(payload: ProgramaCreateSchema) -> ProgramaResponseSchema:
    if payload.vinculo_institucional and not (payload.plano_codigo or "").strip():
        raise DemandaValidationError(
            "Selecione o plano cadastrado ou indique que não há vínculo institucional.",
            field="plano_codigo",
        )
    plano_id = resolve_plano_pai_id(
        plano_codigo=payload.plano_codigo,
        vinculo_institucional=bool(payload.vinculo_institucional),
    )
    codigo = gerar_codigo_unico(gerar_codigo_programa, programa_repository.get_by_codigo)
    pessoa_id = _resolve_pessoa_id(payload)
    instituicao_id = _resolve_instituicao_id(payload)
    if not (payload.representante.nome or "").strip():
        raise DemandaValidationError("Nome do representante legal é obrigatório.", field="representante.nome")
    row = {
        "codigo": codigo,
        "plano_id": plano_id,
        "nome": payload.nome.strip(),
        "descricao": payload.descricao.strip(),
        "objetivo": payload.objetivo,
        "publico_alvo": payload.publico_alvo,
        "orgao_responsavel": payload.orgao_responsavel,
        "justificativa": payload.justificativa,
        "valor_global": payload.valor_global,
        "vinculo_institucional": bool(payload.vinculo_institucional),
        "sigma_instituicao_id": instituicao_id,
        "instituicao_nome": payload.instituicao_label,
        "instituicao_razao_social": payload.instituicao_razao_social,
        "instituicao_nome_fantasia": payload.instituicao_nome_fantasia,
        "instituicao_cnpj": payload.instituicao_cnpj,
        "sigma_pessoa_id": pessoa_id,
        "representante_nome": (payload.representante.nome or "").strip(),
        "representante_email": payload.representante.email,
        "representante_telefone": payload.representante.telefone,
        "status": "rascunho",
    }
    normalizar_programa(row, pessoa_id=pessoa_id)
    inserted = programa_repository.insert(row, payload.unidades_espaciais)
    return _row_to_response(inserted)


def listar_programas() -> list[ProgramaResponseSchema]:
    return [_row_to_response(row) for row in programa_repository.list_all()]


def obter_programa(codigo: str) -> ProgramaResponseSchema:
    row = programa_repository.get_by_codigo(codigo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def aprovar_programa(codigo: str, *, motivo: str | None = None,
                     aprovado_por: str | None = None) -> ProgramaResponseSchema:
    if not programa_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    row = programa_repository.aprovar(codigo, aprovado_por=aprovado_por, motivo=motivo)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)


def atualizar_programa(codigo: str, payload: ProgramaUpdateSchema) -> ProgramaResponseSchema:
    if not programa_repository.get_by_codigo(codigo):
        raise DemandaNotFoundError(codigo)
    data = payload.model_dump(exclude_unset=True)
    row = programa_repository.update(codigo, data)
    if not row:
        raise DemandaNotFoundError(codigo)
    return _row_to_response(row)

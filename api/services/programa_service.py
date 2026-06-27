"""Regras de negócio — programas (nível 2)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import plano_repository, programa_repository
from api.schemas.programa import ProgramaCreateSchema, ProgramaResponseSchema, ProgramaUpdateSchema


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _row_to_response(row: dict[str, Any]) -> ProgramaResponseSchema:
    valor = row.get("valor_global")
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
    )


def _gerar_codigo() -> str:
    return f"PRO-{uuid.uuid4().hex[:8].upper()}"


def criar_programa(payload: ProgramaCreateSchema) -> ProgramaResponseSchema:
    plano = plano_repository.get_by_codigo(payload.plano_codigo.strip())
    if not plano:
        raise DemandaValidationError(
            f"Plano não encontrado: {payload.plano_codigo}.", field="plano_codigo"
        )
    codigo = (payload.codigo or "").strip() or _gerar_codigo()
    if programa_repository.get_by_codigo(codigo):
        raise DemandaValidationError(f"Código de programa já existe: {codigo}.", field="codigo")
    row = {
        "codigo": codigo,
        "plano_id": str(plano["id"]),
        "nome": payload.nome.strip(),
        "descricao": payload.descricao.strip(),
        "objetivo": payload.objetivo,
        "publico_alvo": payload.publico_alvo,
        "orgao_responsavel": payload.orgao_responsavel,
        "justificativa": payload.justificativa,
        "valor_global": payload.valor_global,
        "status": "rascunho",
    }
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

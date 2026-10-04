"""Regras de negócio para agrupamentos reutilizáveis de demandas."""
from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_POS_APROVACAO, TIPO_DEMANDA_COD_TO_ID, TIPO_DEMANDA_ID_TO_COD
from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import agrupamento_demanda_repository as repo
from api.services import universo_service
from api.services.session_service import SessionUser

_TIPOS_VALIDOS = {"plano", "programa", "projeto"}


def _serializar(row: dict[str, Any], *, resumo: bool) -> dict[str, Any]:
    data = dict(row)
    data["id"] = str(data["id"])
    tipo_id = data.pop("tipo_demanda_id", None)
    data["tipo_demanda"] = TIPO_DEMANDA_ID_TO_COD.get(tipo_id)
    if resumo:
        data.pop("objetos", None)
    return data


def listar() -> list[dict[str, Any]]:
    return [_serializar(row, resumo=True) for row in repo.list_all()]


def obter(grupo_demanda_id: UUID) -> dict[str, Any]:
    row = repo.get_by_id(grupo_demanda_id)
    if not row:
        raise DemandaNotFoundError(str(grupo_demanda_id))
    return _serializar(row, resumo=False)


def criar(payload: Any, *, user: SessionUser) -> dict[str, Any]:
    if payload.tipo_demanda not in _TIPOS_VALIDOS:
        raise DemandaValidationError("Tipo de demanda inválido.", field="tipo_demanda")
    ids = [str(value) for value in payload.demanda_ids]
    if len(ids) != len(set(ids)):
        raise DemandaValidationError("A seleção contém demandas repetidas.", field="demanda_ids")

    elegiveis = universo_service.listar_universo(payload.tipo_demanda)
    status_elegiveis = {STATUS_POS_APROVACAO, STATUS_EM_HIERARQUIZACAO}
    por_id = {
        item.id: item.model_dump(mode="json")
        for item in elegiveis
        if item.status in status_elegiveis
    }
    ausentes = [codigo for codigo in ids if codigo not in por_id]
    if ausentes:
        raise DemandaValidationError(
            "Uma ou mais demandas não estão mais elegíveis: " + ", ".join(ausentes),
            field="demanda_ids",
        )

    objetos = [por_id[codigo] for codigo in ids]
    data = repo.insert({
        "codigo": f"AGR-{uuid4().hex[:16].upper()}",
        "nome": payload.nome.strip(),
        "descricao": payload.descricao.strip() or None if payload.descricao else None,
        "tipo_demanda_id": TIPO_DEMANDA_COD_TO_ID[payload.tipo_demanda],
        "objetos": objetos,
        "criado_por": user.id,
    })
    return _serializar(data, resumo=False)
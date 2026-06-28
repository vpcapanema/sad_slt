"""Regras de negócio — Hierarquização de Projetos (portfólio).

Consome os pesos de critérios de uma ``config_multicriterio_portfolio`` e os
julgamentos pareados dos projetos para produzir o ranking final. O cálculo é a
fonte da verdade no servidor.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from api.constants import TIPO_DEMANDA_ID_TO_COD
from api.exceptions import (
    ConfigMulticriterioNotFoundError,
    DemandaValidationError,
    HierarquizacaoNotFoundError,
)
from api.repositories import config_multicriterio_repository as config_repo
from api.repositories import hierarquizacao_repository as repo
from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoResponseSchema,
    HierarquizacaoUpdateSchema,
)
from api.services import ahp_engine

_STATUS_VALIDOS = frozenset({"rascunho", "em_julgamento", "calculada", "homologada", "arquivada"})

_UPDATE_FIELDS = frozenset({"nome", "descricao", "status", "objetos", "julgamento_projetos"})


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError):
        return None


def _gerar_codigo() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"HIER-{stamp}-{secrets.token_hex(2).upper()}"


def _row_to_response(row: dict[str, Any]) -> HierarquizacaoResponseSchema:
    tid = row.get("tipo_demanda_id")
    return HierarquizacaoResponseSchema(
        id=str(row["id"]),
        codigo=row["codigo"],
        config_id=str(row["config_id"]),
        config_codigo=row.get("config_codigo"),
        nome=row["nome"],
        descricao=row.get("descricao"),
        tipo_demanda=TIPO_DEMANDA_ID_TO_COD.get(tid) if tid is not None else None,
        grupo_id=row.get("grupo_id"),
        status=row["status"],
        objetos=row.get("objetos") or [],
        julgamento_projetos=row.get("julgamento_projetos"),
        pesos_projetos=row.get("pesos_projetos"),
        ranking=row.get("ranking"),
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        homologadoEm=_iso(row.get("homologado_em")),
    )


def criar_hierarquizacao(
    payload: HierarquizacaoCreateSchema, *, criado_por: str | None = None
) -> HierarquizacaoResponseSchema:
    """Cria uma hierarquização (rascunho) vinculada a uma configuração de portfólio."""
    config = config_repo.get_by_codigo("portfolio", payload.config_codigo)
    if not config:
        raise ConfigMulticriterioNotFoundError(payload.config_codigo)

    data: dict[str, Any] = {
        "codigo": _gerar_codigo(),
        "config_id": config["id"],
        "nome": payload.nome.strip(),
        "descricao": payload.descricao,
        "tipo_demanda_id": config.get("tipo_demanda_id"),
        "grupo_id": payload.grupo_id,
        "status": "rascunho",
    }
    if payload.objetos is not None:
        data["objetos"] = payload.objetos
    criado_uuid = _uuid_or_none(criado_por)
    if criado_uuid:
        data["criado_por"] = criado_uuid
    return _row_to_response(repo.insert(data))


def listar_hierarquizacoes(
    *, status: str | None = None, grupo: str | None = None
) -> list[HierarquizacaoResponseSchema]:
    """Lista hierarquizações, opcionalmente filtrando por status e grupo."""
    return [_row_to_response(r) for r in repo.list_all(status=status, grupo=grupo)]


def obter_hierarquizacao(codigo: str) -> HierarquizacaoResponseSchema:
    """Retorna uma hierarquização pelo código."""
    return _row_to_response(_carregar(codigo))


def atualizar_hierarquizacao(
    codigo: str, payload: HierarquizacaoUpdateSchema
) -> HierarquizacaoResponseSchema:
    """Atualiza campos editáveis de uma hierarquização."""
    _carregar(codigo)
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k in _UPDATE_FIELDS}
    if "status" in data and data["status"] not in _STATUS_VALIDOS:
        raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")
    if not data:
        return obter_hierarquizacao(codigo)
    updated = repo.update(codigo, data)
    if not updated:
        raise HierarquizacaoNotFoundError(codigo)
    return _row_to_response(updated)


def calcular_hierarquizacao(codigo: str) -> HierarquizacaoResponseSchema:
    """Combina pesos de critérios (config) com julgamentos dos projetos → ranking."""
    row = _carregar(codigo)

    config = config_repo.get_by_id("portfolio", row["config_id"])
    if not config:
        raise ConfigMulticriterioNotFoundError(str(row["config_id"]))
    pesos_cfg = config.get("pesos") or {}
    criteria = pesos_cfg.get("criteria") or []
    weights = pesos_cfg.get("weights") or []
    if not criteria or not weights:
        raise DemandaValidationError(
            "A configuração multicritério precisa estar calculada (pesos de critérios) "
            "antes de hierarquizar.",
            field="config_id",
        )
    weight_by_crit = dict(zip(criteria, weights))

    objetos = row.get("objetos") or []
    julg = row.get("julgamento_projetos") or []
    if not objetos or not julg:
        raise DemandaValidationError(
            "Inclua os projetos e o julgamento pareado por critério antes de calcular.",
            field="julgamento_projetos",
        )

    item_names = [o.get("nome", f"Projeto {i + 1}") for i, o in enumerate(objetos)]
    n_itens = len(objetos)
    por_criterio: dict[str, Any] = {}
    consistencia_local: dict[str, Any] = {}
    scores = [0.0] * n_itens

    for entry in julg:
        crit = entry.get("criterio")
        matrix = entry.get("matrix")
        if not matrix:
            continue
        local = ahp_engine.analyze_matrix(matrix)
        por_criterio[crit] = local["weights"]
        consistencia_local[crit] = {"CR": local["CR"], "lambdaMax": local["lambdaMax"]}
        w = weight_by_crit.get(crit, 0.0)
        for a in range(min(n_itens, len(local["weights"]))):
            scores[a] += w * local["weights"][a]

    pesos_projetos = {
        "itens": item_names,
        "por_criterio": por_criterio,
        "consistencia": consistencia_local,
        "scores": scores,
    }
    ordem = sorted(range(n_itens), key=lambda a: scores[a], reverse=True)
    ranking: list[dict[str, Any]] = []
    for posicao, idx in enumerate(ordem, start=1):
        entrada: dict[str, Any] = {
            "posicao": posicao,
            "indice": idx,
            "nome": item_names[idx],
            "score": scores[idx],
        }
        obj = objetos[idx]
        if obj.get("codigo"):
            entrada["codigo"] = obj["codigo"]
        if obj.get("objeto_ahp_id"):
            entrada["objeto_ahp_id"] = obj["objeto_ahp_id"]
        ranking.append(entrada)

    updated = repo.update(
        codigo,
        {"pesos_projetos": pesos_projetos, "ranking": ranking, "status": "calculada"},
    )
    if not updated:
        raise HierarquizacaoNotFoundError(codigo)
    return _row_to_response(updated)


def homologar_hierarquizacao(
    codigo: str, *, homologado_por: str | None = None
) -> HierarquizacaoResponseSchema:
    """Homologa uma hierarquização já calculada (com ranking)."""
    row = _carregar(codigo)
    if not row.get("ranking"):
        raise DemandaValidationError("Calcule a hierarquização antes de homologar.", field="status")
    data: dict[str, Any] = {"status": "homologada", "homologado_em": datetime.now(timezone.utc)}
    homologado_uuid = _uuid_or_none(homologado_por)
    if homologado_uuid:
        data["homologado_por"] = homologado_uuid
    updated = repo.update(codigo, data)
    if not updated:
        raise HierarquizacaoNotFoundError(codigo)
    return _row_to_response(updated)


def _carregar(codigo: str) -> dict[str, Any]:
    row = repo.get_by_codigo(codigo)
    if not row:
        raise HierarquizacaoNotFoundError(codigo)
    return row

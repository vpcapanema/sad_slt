"""Vínculo imutável entre uma superfície da Fase 2 e seu julgamento AHP.

O JSONB ``criterios`` permanece uma lista compatível com formulários e exports.
Cada linha contém ``_superficie_id`` além do snapshot original, dispensando DDL.
"""
from __future__ import annotations

import math
from typing import Any

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.services import ahp_engine


def superficie_id(ambiente: dict[str, Any]) -> str | None:
    criterios = ambiente.get("criterios") or []
    ids = {str(c["_superficie_id"]) for c in criterios if c.get("_superficie_id")}
    if not ids:
        return None
    if len(ids) != 1 or any(not c.get("_superficie_id") for c in criterios):
        raise DemandaValidationError("Vínculo da superfície inválido.", field="superficie_id")
    return ids.pop()


def _identidades(criterios: list[dict[str, Any]]) -> dict[str, str]:
    identidades = {}
    for criterio in criterios:
        ident, nome = criterio.get("id"), criterio.get("criterio")
        if not isinstance(ident, str) or not ident.strip() or ident in identidades:
            raise DemandaValidationError("IDs de critérios ausentes ou duplicados.", field="criterios")
        if not isinstance(nome, str) or not nome.strip():
            raise DemandaValidationError("Nome do critério ausente.", field="criterios")
        identidades[ident] = nome
    if len(identidades) < 2:
        raise DemandaValidationError("A superfície deve possuir ao menos dois critérios.", field="criterios")
    return identidades


def snapshot(ident: str, hierarquizacao_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, hierarquizacao_id, criterios FROM geoprocessamento.superficie_criterios WHERE id=%s",
            (str(ident),),
        ).fetchone()
    if not row:
        raise DemandaValidationError("Superfície não encontrada.", field="superficie_id")
    if str(row["hierarquizacao_id"]) != str(hierarquizacao_id):
        raise DemandaValidationError("A superfície não pertence à hierarquização selecionada.", field="hierarquizacao_id")
    criterios = row.get("criterios") or []
    _identidades(criterios)
    return [dict(c, _superficie_id=str(row["id"])) for c in criterios]


def encerrar_rodadas_hierarquizacao(hierarquizacao_id: Any) -> None:
    """Encerra somente rodadas globais, nunca julgamentos de superfícies."""
    with get_connection() as conn:
        conn.execute(
            """UPDATE ahp.comparacao_colaborativa_ambiente
               SET status='encerrada', atualizado_em=now()
               WHERE hierarquizacao_id=%s AND status='ativa'
               AND NOT EXISTS (
                   SELECT 1 FROM jsonb_array_elements(criterios) c
                   WHERE c ? '_superficie_id'
               )""",
            (hierarquizacao_id,),
        )
        conn.commit()


def pesos_consolidados(superficie: dict, ambiente_id: str) -> list[float]:
    """Retorna pesos na ordem atual da superfície, conferindo o snapshot por ID."""
    from api.services.comparacao_colaborativa_service import _validar_matriz_pareada

    ambiente = repo.get_ambiente_by_id(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    if superficie_id(ambiente) != str(superficie["id"]):
        raise DemandaValidationError("O julgamento não pertence à superfície.", field="superficie_id")
    if str(ambiente.get("hierarquizacao_id")) != str(superficie["hierarquizacao_id"]):
        raise DemandaValidationError("Hierarquização do julgamento divergente.", field="hierarquizacao_id")
    criterios = superficie.get("criterios") or []
    snapshot_criterios = ambiente.get("criterios") or []
    if _identidades(criterios) != _identidades(snapshot_criterios):
        raise DemandaValidationError("Os critérios da superfície divergem do snapshot do julgamento.", field="criterios")
    if ambiente.get("status") != "consolidada" or not ambiente.get("consistente"):
        raise DemandaValidationError("O julgamento deve estar consolidado e consistente.", field="ambiente_id")
    matriz = ambiente.get("matriz_consolidada") or []
    _validar_matriz_pareada(matriz, len(criterios))
    resultado = ahp_engine.analyze_matrix(matriz)
    rc = float(resultado["CR"])
    if not math.isfinite(rc) or rc > 0.10:
        raise DemandaValidationError("A razão de consistência deve ser menor ou igual a 0,10.", field="razao_consistencia")
    pesos = resultado["weights"]
    salvos = ambiente.get("pesos_consolidados") or []
    if len(salvos) != len(pesos) or any(
        not math.isfinite(float(w)) or not math.isclose(float(w), p, rel_tol=1e-5, abs_tol=1e-6)
        for w, p in zip(salvos, pesos)
    ):
        raise DemandaValidationError("Pesos consolidados divergentes da matriz.", field="pesos_consolidados")
    por_id = {c["id"]: peso for c, peso in zip(snapshot_criterios, pesos)}
    return [por_id[c["id"]] for c in criterios]

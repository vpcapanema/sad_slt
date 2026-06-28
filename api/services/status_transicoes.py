"""Matriz de transições de status — lida de demandas.dom_status_demanda_transicao."""
from __future__ import annotations

from api.exceptions import DemandaValidationError
from api.repositories import dominio_repository

_matriz_patch: dict[str, frozenset[str]] | None = None


def _carregar_matriz_patch() -> dict[str, frozenset[str]]:
    global _matriz_patch
    if _matriz_patch is not None:
        return _matriz_patch

    acumulado: dict[str, set[str]] = {}
    for row in dominio_repository.list_transicoes_status_demanda(patch_only=True):
        origem = row["status_origem"]
        acumulado.setdefault(origem, set()).add(row["status_destino"])

    _matriz_patch = {origem: frozenset(destinos) for origem, destinos in acumulado.items()}
    return _matriz_patch


def invalidar_cache() -> None:
    global _matriz_patch
    _matriz_patch = None


def matriz_transicao_status() -> dict[str, list[str]]:
    """Retorna destinos PATCH por status de origem."""
    matriz = _carregar_matriz_patch()
    return {origem: sorted(destinos) for origem, destinos in matriz.items()}


def destinos_permitidos(status_atual: str) -> frozenset[str]:
    """Status selecionáveis no PATCH a partir do status atual."""
    atual = (status_atual or "").strip()
    if not atual:
        return frozenset()
    matriz = _carregar_matriz_patch()
    return matriz.get(atual, frozenset({atual}))


def validar_transicao_status(*, de: str, para: str) -> None:
    """Valida transição de status no PATCH administrativo."""
    origem = (de or "").strip()
    destino = (para or "").strip()
    if not destino:
        raise DemandaValidationError("Status de destino é obrigatório.", field="status")

    if destino == "analise_aprovada":
        raise DemandaValidationError(
            "Use a ação Aprovar para promover a demanda; não altere para «aprovada» via PATCH.",
            field="status",
        )

    permitidos = destinos_permitidos(origem)
    if destino not in permitidos:
        if destino == "hierarq_apta" and origem in {"analise_em_avaliacao", "analise_aprovada"}:
            raise DemandaValidationError(
                "Use POST /aprovar para promover a demanda a «apta à hierarquização».",
                field="status",
            )
        raise DemandaValidationError(
            f"Transição de status inválida: «{origem}» → «{destino}».",
            field="status",
        )

"""Matriz de transições de status — lida de demandas.dom_status_demanda_transicao."""
from __future__ import annotations

from api.exceptions import DemandaValidationError
from api.repositories import dominio_repository

_matriz_patch: dict[str, frozenset[str]] | None = None
_matriz_completa: dict[str, frozenset[str]] | None = None


def _montar_matriz(*, patch_only: bool) -> dict[str, frozenset[str]]:
    acumulado: dict[str, set[str]] = {}
    for row in dominio_repository.list_transicoes_status_demanda(patch_only=patch_only):
        origem = row["status_origem"]
        acumulado.setdefault(origem, set()).add(row["status_destino"])
    return {origem: frozenset(destinos) for origem, destinos in acumulado.items()}


def _carregar_matriz_patch() -> dict[str, frozenset[str]]:
    global _matriz_patch
    if _matriz_patch is None:
        _matriz_patch = _montar_matriz(patch_only=True)
    return _matriz_patch


def _carregar_matriz_completa() -> dict[str, frozenset[str]]:
    global _matriz_completa
    if _matriz_completa is None:
        _matriz_completa = _montar_matriz(patch_only=False)
    return _matriz_completa


def invalidar_cache() -> None:
    global _matriz_patch, _matriz_completa
    _matriz_patch = None
    _matriz_completa = None


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


def destinos_permitidos_com_handoff(status_atual: str) -> frozenset[str]:
    """
    Destinos do PATCH mais os de handoff dedicado (via_aprovar = TRUE), como
    «analise_aprovada» e «analise_reprovada». Usado pelas ações Aprovar e
    Reprovar, que não passam pelo PATCH administrativo.
    """
    atual = (status_atual or "").strip()
    if not atual:
        return frozenset()
    matriz = _carregar_matriz_completa()
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

    if destino == "analise_reprovada":
        raise DemandaValidationError(
            "Use a ação Reprovar e informe a justificativa obrigatória.",
            field="status",
        )

    permitidos = destinos_permitidos(origem)
    if destino not in permitidos:
        raise DemandaValidationError(
            f"Transição de status inválida: «{origem}» → «{destino}».",
            field="status",
        )

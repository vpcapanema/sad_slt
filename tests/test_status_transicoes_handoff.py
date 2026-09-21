"""Matriz de transições: PATCH administrativo x handoff de Aprovar/Reprovar.

As arestas `analise_em_avaliacao → analise_aprovada` e `→ analise_reprovada`
existem com `via_aprovar = TRUE` (migrações 060 e 071), justamente para não
aparecerem como destino no PATCH. A decisão da análise precisa enxergá-las,
senão toda aprovação volta 422 «Transição de status inválida».
"""
from __future__ import annotations

import pytest

from api.services import status_transicoes


ARESTAS = [
    {"status_origem": "analise_em_avaliacao", "status_destino": "analise_em_avaliacao", "via_aprovar": False},
    {"status_origem": "analise_em_avaliacao", "status_destino": "analise_suspensa", "via_aprovar": False},
    {"status_origem": "analise_em_avaliacao", "status_destino": "analise_aprovada", "via_aprovar": True},
    {"status_origem": "analise_em_avaliacao", "status_destino": "analise_reprovada", "via_aprovar": True},
]


@pytest.fixture(autouse=True)
def _matriz_fake(monkeypatch: pytest.MonkeyPatch) -> None:
    def _listar(*, patch_only: bool = False) -> list[dict]:
        if patch_only:
            return [linha for linha in ARESTAS if not linha["via_aprovar"]]
        return list(ARESTAS)

    monkeypatch.setattr(
        status_transicoes.dominio_repository,
        "list_transicoes_status_demanda",
        _listar,
    )
    status_transicoes.invalidar_cache()
    yield
    status_transicoes.invalidar_cache()


def test_patch_nao_oferece_aprovada_nem_reprovada() -> None:
    destinos = status_transicoes.destinos_permitidos("analise_em_avaliacao")
    assert "analise_suspensa" in destinos
    assert "analise_aprovada" not in destinos
    assert "analise_reprovada" not in destinos


def test_handoff_inclui_aprovada_e_reprovada() -> None:
    destinos = status_transicoes.destinos_permitidos_com_handoff("analise_em_avaliacao")
    assert {"analise_aprovada", "analise_reprovada", "analise_suspensa"} <= destinos


def test_status_desconhecido_nao_quebra() -> None:
    assert status_transicoes.destinos_permitidos_com_handoff("") == frozenset()
    assert status_transicoes.destinos_permitidos_com_handoff("inexistente") == frozenset(
        {"inexistente"}
    )

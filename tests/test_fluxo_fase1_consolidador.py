"""O fluxo consolidador da Fase 1 tem de ser executável, não só bem formado.

Dois defeitos o mantinham inerte desde agosto/2026:

1. mapeava `camada_id` na saída do OP-02 (validar camada), que devolve apenas o
   diagnóstico — o fluxo abortava na primeira etapa com "A saída camada_id não
   foi produzida pelo processo";
2. classificava todas as camadas com um `criterio_id_padrao` único, carimbando o
   mesmo critério em camadas de naturezas diferentes.

Por isso os produtos consolidados de agosto foram gerados por script ad-hoc,
fora do pipeline — e chegaram à biblioteca sem procedência.
"""
from __future__ import annotations

import pytest

from api.repositories import modelo_geoprocessamento_repository as repo
from api.services.geoprocessamento_engine import (
    SAIDAS_DECLARADAS,
    geoprocessamento_engine,
)

FLUXOS = ["fluxo_fase1_gerador_restricao_pli", "fluxo_fase1_gerador_risco_pli"]


def test_validacao_recusa_saida_que_o_algoritmo_nao_produz():
    passos = [
        {"algoritmo_id": "OP-02", "parametros": {"camada_id": "x"},
         "mapear_saidas": {"camada_id": "validada"}},
    ]
    erros = geoprocessamento_engine.validate_steps(passos)
    assert any("não é produzida" in erro for erro in erros), erros


def test_validacao_aceita_saida_legitima():
    passos = [
        {"algoritmo_id": "OP-02", "parametros": {"camada_id": "x"},
         "mapear_saidas": {"valido": "esta_valida"}},
    ]
    assert geoprocessamento_engine.validate_steps(passos) == []


def test_op02_nao_declara_camada_como_saida():
    """Validar camada é diagnóstico: não produz camada nova."""
    assert "camada_id" not in SAIDAS_DECLARADAS["OP-02"]


@pytest.mark.parametrize("fluxo_id", FLUXOS)
def test_fluxo_registrado_passa_na_validacao(fluxo_id):
    fluxo = repo.obter(fluxo_id, "fluxo")
    if fluxo is None:
        pytest.skip(f"{fluxo_id} não está registrado neste ambiente")
    assert geoprocessamento_engine.validate_steps(fluxo.get("itens", [])) == []


@pytest.mark.parametrize("fluxo_id", FLUXOS)
def test_fluxo_classifica_cada_camada_com_seu_criterio(fluxo_id):
    fluxo = repo.obter(fluxo_id, "fluxo")
    if fluxo is None:
        pytest.skip(f"{fluxo_id} não está registrado neste ambiente")

    iterador = next((i for i in fluxo["itens"] if i.get("iterador")), None)
    assert iterador is not None, "o consolidador itera sobre as camadas"
    mapas = iterador.get("parametros", {}).get("mapas") or {}
    assert "criterio_id_atual" in mapas, "o critério tem de variar por camada"

    classificacao = next(
        (i for i in fluxo["itens"] if i.get("algoritmo_id") == "OP-CLASS"), None
    )
    assert classificacao is not None
    assert classificacao["parametros"]["criterio_id"] == "$criterio_id_atual", (
        "um criterio_id fixo carimbaria o mesmo critério em todas as camadas"
    )


def test_iterador_exige_valor_no_mapa_para_cada_camada():
    """Camada fora do mapa tem de parar o fluxo, não classificar em silêncio."""
    import asyncio

    passos = [
        {"iterador": "vector_layers",
         "parametros": {"fonte": "$camadas", "variavel": "atual",
                        "mapas": {"criterio_id_atual": "$mapa"}}},
        {"algoritmo_id": "OP-02", "parametros": {"camada_id": "$atual"}},
    ]
    with pytest.raises(ValueError, match="não declara valor"):
        asyncio.run(geoprocessamento_engine.run_steps(
            passos, {"camadas": ["camada_a"], "mapa": {"camada_b": "criterio"}}
        ))

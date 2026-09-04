"""Colunas da Fase 3: matriz da rodada + atributos do Configurador da Fase 3."""
from __future__ import annotations

import asyncio

from api.routers import atributos_objetos as router


def test_matriz_nao_usa_mais_coluna_inexistente() -> None:
    """`config_criterios` não existe em hierarquizacao_portfolio."""
    row = {
        "dados_hierarquizacao": {"cabecalho_grupo": {"matriz_premissas_criterios": {"linhas": []}}},
        "config_criterios": {"linhas": [{"etapa": "Priorização"}]},
    }
    assert router._matriz_da_hierarquizacao(row) == {"linhas": []}

    assert router._matriz_da_hierarquizacao({"dados_hierarquizacao": {}}) is None


def test_mesclar_une_as_duas_fontes_sem_duplicar() -> None:
    da_matriz = [{"id": "custo", "alias": "Custo"}, {"id": "prazo", "alias": "Prazo"}]
    do_config = [
        {"id": "prazo", "alias": "Prazo (configurador)", "origem": "configurador_fase3"},
        {"id": "risco_geo", "alias": "Risco geotécnico", "origem": "configurador_fase3"},
    ]
    colunas = router._mesclar(da_matriz, do_config)

    assert [c["id"] for c in colunas] == ["custo", "prazo", "risco_geo"]
    # A matriz da rodada tem prioridade sobre o cadastro genérico.
    assert colunas[1]["alias"] == "Prazo"
    assert colunas[1]["origem"] == "matriz_premissas_criterios"
    assert colunas[2]["origem"] == "configurador_fase3"


def test_colunas_configuradas_normaliza_o_cadastro(monkeypatch) -> None:
    async def _listar():
        return [
            {"atributo_id": "a1", "nome_coluna": "declividade", "rotulo": "Declividade média"},
            {"atributo_id": "a2"},  # sem nome_coluna: usa o atributo_id
            {"rotulo": "sem identificador"},  # descartado
        ]

    monkeypatch.setattr(router.geoespacial_repository, "listar_atributos_fase3", _listar)
    colunas = asyncio.run(router._colunas_configuradas())

    assert [c["id"] for c in colunas] == ["declividade", "a2"]
    assert colunas[0]["alias"] == "Declividade média"
    assert all(c["origem"] == "configurador_fase3" for c in colunas)


def test_colunas_configuradas_tolera_banco_fora(monkeypatch) -> None:
    from api.exceptions import DatabaseUnavailableError

    async def _falha():
        raise DatabaseUnavailableError("indisponível")

    monkeypatch.setattr(router.geoespacial_repository, "listar_atributos_fase3", _falha)
    assert asyncio.run(router._colunas_configuradas()) == []

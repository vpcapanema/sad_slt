"""Colunas da Fase 3: matriz da rodada + atributos do Configurador da Fase 3."""
from __future__ import annotations

import asyncio

from api.services import atributos_hierarquizacao as router


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
            {"atributo_id": "a1", "nome_coluna": "declividade", "rotulo": "Declividade média",
             "tipo_dado": "ordinal", "direcao": "menor_melhor", "obrigatorio": True},
            {"atributo_id": "a2"},  # sem nome_coluna: usa o atributo_id
            {"rotulo": "sem identificador"},  # descartado
        ]

    monkeypatch.setattr(router.geoespacial_repository, "listar_atributos_fase3", _listar)
    colunas = asyncio.run(router._colunas_configuradas())

    assert [c["id"] for c in colunas] == ["declividade", "a2"]
    assert colunas[0]["alias"] == "Declividade média"
    assert colunas[0]["tipo"] == "ordinal"
    assert colunas[0]["relacao"] == "menor_melhor"
    assert colunas[0]["mandatorio"] is True
    assert all(c["origem"] == "configurador_fase3" for c in colunas)


def test_colunas_configuradas_tolera_banco_fora(monkeypatch) -> None:
    from api.exceptions import DatabaseUnavailableError

    async def _falha():
        raise DatabaseUnavailableError("indisponível")

    monkeypatch.setattr(router.geoespacial_repository, "listar_atributos_fase3", _falha)
    assert asyncio.run(router._colunas_configuradas(estrito=False)) == []


def test_colunas_configuradas_nao_oculta_falha_durante_complementacao(monkeypatch) -> None:
    import pytest
    from api.exceptions import DatabaseUnavailableError

    async def falhar():
        raise DatabaseUnavailableError("indisponível")

    monkeypatch.setattr(router.geoespacial_repository, "listar_atributos_fase3", falhar)
    with pytest.raises(DatabaseUnavailableError):
        router.colunas_da_hierarquizacao({}, estrito=True)


def test_sintese_detecta_escala_alterada_e_atributo_novo_do_configurador(monkeypatch):
    from unittest.mock import AsyncMock
    from api.matriz_colunas import extrair_colunas
    matriz = [{"Etapa": "Priorização", "Métrica": "Complexidade",
               "Dado": "Escala qualitativa de 1 a 5", "Unidade": "escala ordinal"}]
    criterio = {"nome_coluna": "complexidade", "tipo_dado": "ordinal", "direcao": "neutro", "mapeamento": {}}
    row = {"dados_hierarquizacao": {
        "cabecalho_grupo": {"matriz_premissas_criterios": matriz,
                            "configuracoes": {"fase_3": {"criterios": [criterio]}}},
        "objetos": [{"cabecalho_objeto": {"tipo_demanda": "projeto"}}],
    }}
    monkeypatch.setattr(router, "_colunas_configuradas", AsyncMock(return_value=[]))
    monkeypatch.setattr(router.dominio_repository, "list_atributos_objeto", lambda: [])
    assert router.configuracao_fase3_desatualizada(row) is True
    criterio["mapeamento"] = extrair_colunas(matriz)[0]["mapeamento"]
    assert router.configuracao_fase3_desatualizada(row) is False
    monkeypatch.setattr(router, "_colunas_configuradas", AsyncMock(return_value=[
        {"id": "novo", "tipo": "numerico"},
    ]))
    assert router.configuracao_fase3_desatualizada(row) is True

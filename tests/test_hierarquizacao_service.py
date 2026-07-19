from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone

import pytest

from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoFase3ExecutarSchema,
    HierarquizacaoSinteseSchema,
)
from api.services import hierarquizacao_service as service


def _db_row(dados: dict) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": "a5aa4005-bb55-4c25-9b7e-1421f9513471",
        "codigo": dados["cabecalho_grupo"]["codigo"],
        "config_id": None,
        "config_codigo": None,
        "nome": dados["cabecalho_grupo"]["nome"],
        "descricao": None,
        "tipo_demanda_id": 3,
        "grupo_id": None,
        "status": "rascunho",
        "objetos": [],
        "julgamento_projetos": None,
        "pesos_projetos": None,
        "ranking": None,
        "dados_hierarquizacao": dados,
        "relatorio_fase1": {},
        "homologado_em": None,
        "homologado_por": None,
        "criado_por": None,
        "criado_em": now,
        "atualizado_em": now,
    }


def _dados(fases: list[int], atributos: list[dict]) -> dict:
    objetos = []
    for indice, attrs in enumerate(atributos, 1):
        objetos.append(
            {
                "cabecalho_objeto": {
                    "demanda_id": str(indice),
                    "codigo": f"P-{indice}",
                    "nome": f"Projeto {indice}",
                    "atributos": attrs,
                },
                "hierarquizacao": {
                    "fase_1": service._fase1_vazia(),
                    "fase_2": {"score_fase2": None},
                    "fase_3": {"score_fase3": None},
                    "sintese": {},
                },
            }
        )
    return {
        "versao": 1,
        "cabecalho_grupo": {
            "codigo": "HIER-TESTE",
            "nome": "Teste",
            "fases_a_executar": fases,
        },
        "objetos": objetos,
    }


def _mock_persistencia(monkeypatch: pytest.MonkeyPatch, row: dict) -> None:
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda _codigo: deepcopy(row))

    def update(_codigo: str, changes: dict) -> dict:
        row.update(deepcopy(changes))
        row["atualizado_em"] = datetime.now(timezone.utc)
        return deepcopy(row)

    monkeypatch.setattr(service.repo, "update", update)


def test_rodada_pode_executar_somente_fase_1(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    def insert(data: dict) -> dict:
        captured.update(deepcopy(data))
        return _db_row(data["dados_hierarquizacao"])

    monkeypatch.setattr(service.repo, "insert", insert)
    result = service.criar_hierarquizacao(
        HierarquizacaoCreateSchema(
            nome="Triagem territorial",
            tipo_demanda="projeto",
            objetos=[{"id": "1", "codigo": "P-1", "nome": "Projeto"}],
            fases_a_executar=[1],
        )
    )

    assert result.dados_hierarquizacao["cabecalho_grupo"]["fases_a_executar"] == [1]
    assert captured["status"] == "rascunho"


def test_fase_3_renormaliza_pesos_quando_atributo_opcional_ausente(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = _db_row(_dados([3], [{"maturidade": 10}, {"maturidade": 20, "prazo": 5}]))
    _mock_persistencia(monkeypatch, row)
    payload = HierarquizacaoFase3ExecutarSchema(
        criterios=[
            {"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1},
            {"criterio": "Prazo", "nome_coluna": "prazo", "peso": 1},
        ],
        completude_minima=0.5,
        regra_ausentes="renormalizar",
    )

    result = service.executar_fase_3("HIER-TESTE", payload)
    primeiro = result.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]

    assert primeiro["grau_completude_fase3"] == 0.5
    assert primeiro["score_fase3"] == 0.0
    assert primeiro["atributos_ausentes"] == ["Prazo"]
    assert sum(primeiro["contribuicao_por_criterio"].values()) == primeiro["score_fase3"]


def test_fase_3_bloqueia_booleano_invalido_obrigatorio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = _db_row(_dados([3], [{"licenca": "talvez"}]))
    _mock_persistencia(monkeypatch, row)
    payload = HierarquizacaoFase3ExecutarSchema(
        criterios=[
            {
                "criterio": "Licença",
                "nome_coluna": "licenca",
                "tipo_dado": "booleano",
                "obrigatorio": True,
                "peso": 1,
            }
        ],
        completude_minima=0,
        regra_ausentes="imputar_neutro",
    )

    result = service.executar_fase_3("HIER-TESTE", payload)
    fase = result.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]

    assert fase["score_fase3"] is None
    assert fase["atributos_invalidos"] == ["Licença"]
    assert fase["bloqueada_por_atributo_obrigatorio"] is True


def test_sintese_segrega_restrito_e_explica_contribuicoes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dados = _dados([1, 2, 3], [{}, {}])
    primeiro, segundo = dados["objetos"]
    primeiro["hierarquizacao"]["fase_1"]["status_fase1"] = "restrito"
    primeiro["hierarquizacao"]["fase_2"]["score_fase2"] = 0.9
    primeiro["hierarquizacao"]["fase_3"]["score_fase3"] = 0.9
    segundo["hierarquizacao"]["fase_1"]["status_fase1"] = "apto"
    segundo["hierarquizacao"]["fase_2"]["score_fase2"] = 0.8
    segundo["hierarquizacao"]["fase_3"]["score_fase3"] = 0.6
    row = _db_row(dados)
    _mock_persistencia(monkeypatch, row)

    result = service.sintetizar(
        "HIER-TESTE", HierarquizacaoSinteseSchema(peso_fase2=0.7, peso_fase3=0.3)
    )
    objetos = result.dados_hierarquizacao["objetos"]

    assert objetos[0]["hierarquizacao"]["sintese"]["score_final"] is None
    assert objetos[1]["hierarquizacao"]["sintese"]["score_final"] == pytest.approx(0.74)
    assert result.ranking[0]["codigo"] == "P-2"

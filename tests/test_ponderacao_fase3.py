from copy import deepcopy
from uuid import uuid4

import pytest

from api.exceptions import DemandaValidationError
from api.schemas.hierarquizacao import HierarquizacaoFase3PesosSchema
from api.services import ponderacao_fase3 as service


def criterios():
    return [
        {"nome_coluna": "cadastro:capex_estimado", "grupo_atributo": "cadastro", "peso": 2},
        {"nome_coluna": "beneficio", "grupo_atributo": "dinamico", "peso": 1},
        {"nome_coluna": "indice_de_risco_ambiental_e_territorial", "grupo_atributo": "risco_ambiental_territorial", "peso": 1},
    ]


@pytest.mark.parametrize("modo,esperados", [("abrangente", [0.5, 0.25, 0.25]), ("estratificada", [1, 1, 1])])
def test_manual_ignora_homologacao_e_normaliza_no_escopo_escolhido(modo, esperados):
    dados = {"comparacao_colaborativa": {"analise_homologada_id": "anterior"}}
    payload = HierarquizacaoFase3PesosSchema(criterios=criterios(), fonte_pesos="manual", ponderacao=modo)
    result = service.resolver({}, dados, payload.criterios, payload)
    assert [c["peso"] for c in result] == esperados
    assert payload.criterios == criterios()


def julgamento(hier_id, **extra):
    return {"id": str(uuid4()), "nome": "Priorização logística", "hierarquizacao_id": hier_id,
            "criterios": [
                {"Etapa": "Priorização", "Critério": "Investimento", "Variável": "CAPEX (custo de investimento)", "Unidade": "R$"},
                {"Etapa": "Priorização", "Critério": "Benefício", "Variável": "beneficio", "Unidade": "número"},
            ], "pesos_consolidados": [0.2, 0.8], **extra}


def test_ahp_usa_valores_do_banco_e_nao_do_cliente(monkeypatch):
    row = {"id": str(uuid4())}
    j = julgamento(row["id"])
    monkeypatch.setattr(service.julgamentos, "get_ambiente_by_id", lambda _: j)
    payload = HierarquizacaoFase3PesosSchema(criterios=criterios(), fonte_pesos="ahp", julgamento_id=j["id"])
    result = service.resolver(row, {}, payload.criterios, payload)
    assert [c["peso"] for c in result] == [0.2, 0.8, 1]
    assert service.configuracao(payload)["julgamento_id"] == j["id"]


@pytest.mark.parametrize("problema", ["outra_rodada", "sem_pesos", "incompleto"])
def test_ahp_rejeita_julgamento_invalido(monkeypatch, problema):
    row = {"id": str(uuid4())}
    j = julgamento(row["id"])
    if problema == "outra_rodada": j["hierarquizacao_id"] = str(uuid4())
    if problema == "sem_pesos": j["pesos_consolidados"] = []
    if problema == "incompleto": j["criterios"][1]["Variável"] = "outro_atributo"
    monkeypatch.setattr(service.julgamentos, "get_ambiente_by_id", lambda _: j)
    payload = HierarquizacaoFase3PesosSchema(criterios=criterios(), fonte_pesos="ahp", julgamento_id=j["id"])
    with pytest.raises(DemandaValidationError): service.resolver(row, {}, payload.criterios, payload)


def test_lista_preserva_julgamento_pendente_com_aviso(monkeypatch):
    j = julgamento("h", pesos_consolidados=[])
    monkeypatch.setattr(service.julgamentos, "list_ambientes_by_hierarquizacao", lambda _: [j])
    item = service.listar_julgamentos({"id": "h"})[0]
    assert item["nome"] == j["nome"]
    assert "ainda não estão disponíveis" in item["erro"]


def test_salva_fonte_modo_e_nome_julgamento_na_configuracao(monkeypatch):
    from api.services import hierarquizacao_service as hier
    row = {"id": str(uuid4()), "dados_hierarquizacao": {"cabecalho_grupo": {}, "objetos": []}}
    gravado = {}
    monkeypatch.setattr(hier, "_carregar", lambda _: deepcopy(row))
    monkeypatch.setattr(hier.repo, "update", lambda codigo, data: gravado.update(data) or {**row, **data})
    monkeypatch.setattr(hier, "_response", lambda r: r)
    hier.salvar_pesos_fase3("H", HierarquizacaoFase3PesosSchema(criterios=criterios(), fonte_pesos="manual", ponderacao="abrangente"))
    config = gravado["dados_hierarquizacao"]["cabecalho_grupo"]["configuracoes"]["fase_3"]
    assert config["fonte_pesos"] == "manual" and config["ponderacao"] == "abrangente"
    assert [c["peso"] for c in config["criterios"]] == [0.5, 0.25, 0.25]


@pytest.mark.parametrize("modo,esperado", [("abrangente", 0.8), ("estratificada", 0.5)])
def test_execucao_aplica_modo_ao_score_final(monkeypatch, modo, esperado):
    from api.services import hierarquizacao_service as hier
    from api.schemas.hierarquizacao import HierarquizacaoFase3ExecutarSchema
    from tests.test_hierarquizacao_service import _db_row, _dados, _mock_persistencia
    row = _db_row(_dados([3], [{"a": 10, "b": 0}, {"a": 0, "b": 10}]))
    _mock_persistencia(monkeypatch, row)
    payload = HierarquizacaoFase3ExecutarSchema(fonte_pesos="manual", ponderacao=modo, criterios=[
        {"nome_coluna": "a", "grupo_atributo": "cadastro", "peso": 0.8},
        {"nome_coluna": "b", "grupo_atributo": "dinamico", "peso": 0.2},
    ])
    resultado = hier.executar_fase_3("HIER-TESTE", payload)
    assert resultado.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]["score_fase3"] == pytest.approx(esperado)


@pytest.mark.parametrize("status", ["ativa", "consolidada", "encerrada"])
def test_nome_julgamento_persistido_e_retornado(monkeypatch, status):
    from api.services import comparacao_colaborativa_service as colaborativa
    from api.schemas.comparacao_colaborativa import AmbienteColaborativoUpdateSchema
    from tests.test_comparacao_colaborativa import _ambiente_row
    row = _ambiente_row(status=status)
    capturado = {}
    monkeypatch.setattr(colaborativa.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(colaborativa.repo, "update_ambiente", lambda _, dados: capturado.update(dados) or {**row, **dados})
    result = colaborativa.atualizar_ambiente(str(row["id"]), AmbienteColaborativoUpdateSchema(nome="  Julgamento logístico  "))
    assert capturado["nome"] == result.nome == "Julgamento logístico"

from copy import deepcopy
from uuid import uuid4

import pytest

from api.exceptions import DemandaValidationError
from api.schemas.comparacao_colaborativa import AmbienteColaborativoCreateSchema, AmbienteColaborativoUpdateSchema
from api.schemas.hierarquizacao import HierarquizacaoUpdateSchema
from api.services import comparacao_colaborativa_service as colaborativa
from api.services import hierarquizacao_service as hier
from api.services import matrizes_criterios as service
from tests.test_comparacao_colaborativa import _ambiente_row, _client_autenticado
from tests.test_hierarquizacao_service import _dados, _db_row, _mock_persistencia


def matriz():
    return {"linhas": [
        {"criterio": "Custo", "premissa": "Menor custo", "Etapa": "Priorização", "Variável": "custo"},
        {"criterio": "Prazo", "premissa": "Menor prazo", "Etapa": "Priorização", "Variável": "prazo"},
    ]}


def test_equivalencia_preserva_premissas_e_estrutura():
    a = matriz()
    assert service.equivalentes(a, {**a, "arquivo": "outro.xlsx", "aba": "Aba 2"})
    assert service.equivalentes(a, {"rows": a["linhas"]})
    for campo in ("criterio", "premissa", "Etapa", "Variável"):
        b = deepcopy(a)
        b["linhas"][0][campo] = "Alterado"
        assert not service.equivalentes(a, b)
    assert not service.equivalentes(a, {"linhas": list(reversed(a["linhas"]))})


def test_julgamento_avulso_depende_somente_da_matriz(monkeypatch):
    ident = str(uuid4())
    row = _ambiente_row(hierarquizacao_id=None, matriz_id=ident)
    monkeypatch.setattr(service, "obter", lambda _: {"id": ident, "nome": "Matriz", "conteudo": matriz()})
    monkeypatch.setattr(colaborativa.hierarq_repo, "get_by_id",
                        lambda _: pytest.fail("Julgamento avulso não consulta hierarquização"))
    capturado = {}
    def insert(data):
        capturado.update(data)
        return {**row, **data}
    monkeypatch.setattr(colaborativa.repo, "insert_ambiente", insert)
    payload = AmbienteColaborativoCreateSchema(
        matriz_id=ident, convites=[{"email": "teste@example.org"}], valido_ate="2030-01-01T00:00:00Z",
    )
    result = colaborativa.criar_ambiente(payload)
    assert result.matriz_id == ident and result.hierarquizacao_id is None
    assert capturado["criterios"] == matriz()["linhas"]
    assert capturado["matriz_id"] == ident


def test_matriz_do_julgamento_nao_pode_ser_trocada(monkeypatch):
    row = _ambiente_row(matriz_id=str(uuid4()), hierarquizacao_id=None)
    monkeypatch.setattr(colaborativa.repo, "get_ambiente_by_id", lambda _: row)
    with pytest.raises(DemandaValidationError, match="imutável"):
        colaborativa.atualizar_ambiente(row["id"], AmbienteColaborativoUpdateSchema(matriz_id=uuid4()))


@pytest.mark.parametrize("igual,confirmar", [(False, False), (False, True), (True, False), (True, True)])
def test_troca_matriz_invalida_resultados_e_exige_confirmacao_para_reuso(monkeypatch, igual, confirmar):
    from contextlib import nullcontext
    from api.db import connection
    anterior, nova = str(uuid4()), str(uuid4())
    origem = matriz()
    destino = deepcopy(origem)
    if not igual:
        destino["linhas"][0]["premissa"] = "Premissa diferente"
    dados = _dados([3], [{"custo": 10, "prazo": 5}])
    dados["cabecalho_grupo"].update(matriz_id=anterior, matriz_premissas_criterios=origem,
                                   configuracoes={"fase_3": {"fonte_pesos": "ahp", "julgamento_id": "j"}})
    dados["comparacao_colaborativa"] = {"ambiente_id": "j", "criterios": origem["linhas"]}
    row = _db_row(dados)
    row.update(matriz_id=anterior, ranking=[{"score": 1}])
    _mock_persistencia(monkeypatch, row)
    monkeypatch.setattr(connection, "atomic_connection", nullcontext)
    monkeypatch.setattr(hier.repo, "get_by_codigo", lambda _, **kw: deepcopy(row))
    monkeypatch.setattr(service, "obter", lambda ident: {"id": str(ident), "nome": "Matriz",
                                                       "conteudo": destino if str(ident) == nova else origem})
    result = hier.atualizar_hierarquizacao("HIER-TESTE", HierarquizacaoUpdateSchema(
        matriz_id=nova, confirmar_reuso_pesos=confirmar,
    ))
    assert result.matriz_id == nova
    assert result.ranking == []
    d = result.dados_hierarquizacao
    assert bool(d.get("comparacao_colaborativa")) == bool(igual and confirmar)
    assert bool(d["cabecalho_grupo"]["configuracoes"].get("fase_3")) == bool(igual and confirmar)
    assert d["cabecalho_grupo"]["matriz_premissas_criterios"] == destino


def test_julgamento_mesma_matriz_pode_ser_usado_em_outra_hierarquizacao():
    ident = str(uuid4())
    service.exigir_compativel({"id": "h2", "matriz_id": ident},
                             {"id": "j", "matriz_id": ident, "hierarquizacao_id": None})
    with pytest.raises(DemandaValidationError, match="outra matriz"):
        service.exigir_compativel({"id": "h2", "matriz_id": ident},
                                 {"id": "j", "matriz_id": str(uuid4())})


def test_reuso_entre_matrizes_exige_conteudo_equivalente_e_confirmacao(monkeypatch):
    a, b = str(uuid4()), str(uuid4())
    monkeypatch.setattr(service, "obter", lambda _: {"conteudo": matriz()})
    row = {"id": "h", "matriz_id": b, "dados_hierarquizacao": {
        "comparacao_colaborativa": {"ambiente_id": "j", "reuso_confirmado": True}}}
    service.exigir_compativel(row, {"id": "j", "matriz_id": a})
    row["dados_hierarquizacao"]["comparacao_colaborativa"]["reuso_confirmado"] = False
    with pytest.raises(DemandaValidationError):
        service.exigir_compativel(row, {"id": "j", "matriz_id": a})


def test_catalogo_matrizes_exige_autenticacao_e_retorna_conteudo(monkeypatch):
    from fastapi.testclient import TestClient
    from api.server import app
    ident = str(uuid4())
    registro = {"id": ident, "nome": "Matriz", "conteudo": matriz(), "assinatura": "hash"}
    monkeypatch.setattr(service, "listar", lambda: [registro])
    monkeypatch.setattr(service, "obter", lambda _: registro)
    rota = "/api/ahp/comparacao-colaborativa/matrizes"
    assert TestClient(app).get(rota).status_code == 401
    client = _client_autenticado()
    assert client.get(rota).json() == [registro]
    assert client.get(rota + "/" + ident).json() == registro


def test_upload_matriz_invalida_rejeita_sem_gravar():
    response = _client_autenticado().post(
        "/api/ahp/comparacao-colaborativa/matrizes",
        json={"nome": "Incompleta", "conteudo": {"linhas": [{"criterio": "A"}]}},
    )
    assert response.status_code == 422


def test_julgamento_por_id_nao_aceita_conteudo_substituto(monkeypatch):
    ident = str(uuid4())
    monkeypatch.setattr(colaborativa.repo, "insert_ambiente",
                        lambda _: pytest.fail("Não deve registrar conteúdo substituto"))
    payload = AmbienteColaborativoCreateSchema(
        matriz_id=ident, matriz_premissas_criterios=matriz(),
        convites=[{"email": "teste@example.org"}], valido_ate="2030-01-01T00:00:00Z",
    )
    with pytest.raises(DemandaValidationError, match="somente a matriz"):
        colaborativa.criar_ambiente(payload)


def test_julgamento_filtra_fase3_antes_de_validar_dimensoes(monkeypatch):
    ident = str(uuid4())
    conteudo = matriz()
    conteudo["linhas"].insert(0, {"criterio": "Espacial", "Dimensão": "Território",
                                 "Etapa": "Favorabilidade territorial — município e rede rodoviária"})
    for row in conteudo["linhas"][1:]:
        row["Dimensão"] = "Atributos"
    original = deepcopy(conteudo)
    monkeypatch.setattr(service, "obter", lambda _: {"id": ident, "nome": "Mista", "conteudo": conteudo})
    saved = {}
    def insert(data):
        saved.update(data)
        return {**_ambiente_row(), **data}
    monkeypatch.setattr(colaborativa.repo, "insert_ambiente", insert)
    payload = AmbienteColaborativoCreateSchema(
        matriz_id=ident, convites=[{"email": "teste@example.org", "dimensoes": ["Atributos"]}],
        valido_ate="2030-01-01T00:00:00Z",
    )
    result = colaborativa.criar_ambiente(payload)
    assert result.n_criterios == 2
    assert result.criterios == conteudo["linhas"][1:]
    assert conteudo == original
    payload.convites[0].dimensoes = ["Território"]
    with pytest.raises(DemandaValidationError, match="dimensões válidas"):
        colaborativa.criar_ambiente(payload)


@pytest.mark.parametrize("etapa", ["", "Não definido no documento; pendente de validação.", "Fase 4"])
def test_fase_ausente_ou_invalida_nao_vira_fase3(etapa):
    with pytest.raises(DemandaValidationError, match="Etapa válida"):
        service.criterios_fase3([{"Critério": "A", "Etapa": etapa}])


def test_fase_divergente_e_julgamento_legado_misto_sao_bloqueados():
    with pytest.raises(DemandaValidationError, match="divergem"):
        service.criterios_fase3([{"Critério": "A", "Etapa": "Fase 3", "Fase": "Fase 2"}])
    with pytest.raises(DemandaValidationError, match="somente critérios da Fase 3"):
        service.exigir_julgamento_fase3({"criterios": [
            *matriz()["linhas"], {"criterio": "Espacial", "Etapa": "Fase 2"},
        ]})


@pytest.mark.parametrize("fases", [[1, 2], [2, 2], [2, 3]])
def test_julgamento_exige_ao_menos_dois_criterios_fase3(monkeypatch, fases):
    ident = str(uuid4())
    monkeypatch.setattr(service, "obter", lambda _: {
        "id": ident, "nome": "Insuficiente",
        "conteudo": {"linhas": [{"criterio": f"C{i}", "Etapa": f"Fase {fase}"} for i, fase in enumerate(fases)]},
    })
    monkeypatch.setattr(colaborativa.repo, "insert_ambiente", lambda _: pytest.fail("Não deve gravar"))
    with pytest.raises(DemandaValidationError, match="dois critérios da Fase 3"):
        colaborativa.criar_ambiente(AmbienteColaborativoCreateSchema(
            matriz_id=ident, convites=[{"email": "teste@example.org"}], valido_ate="2030-01-01T00:00:00Z"))

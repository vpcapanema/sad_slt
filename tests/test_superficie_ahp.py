"""Integração de julgamentos com snapshots de superfícies; sem banco externo."""
from datetime import datetime, timezone
import subprocess
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
import pytest

from api.server import app
from api.exceptions import DemandaValidationError
from api.schemas.comparacao_colaborativa import AmbienteColaborativoCreateSchema, AmbienteColaborativoUpdateSchema
from api.services import comparacao_colaborativa_service as service
from api.services import superficie_ahp as ahp

HID = "44444444-4444-4444-4444-444444444444"
SID = "55555555-5555-5555-5555-555555555555"
AID = "66666666-6666-6666-6666-666666666666"


@pytest.fixture
def superficie():
    return {"id": SID, "hierarquizacao_id": HID, "nome": "Superfície",
            "criterios": [{"id": "c001", "criterio": "Acesso", "premissa": "Quanto maior acesso, maior favorabilidade.",
                          "variavel": "Acesso", "dimensao": "Infraestrutura", "relacao": "positiva",
                          "campo_original": "acesso", "campo_reescalonado": "acesso_01"},
                         {"id": "c002", "criterio": "Distância", "relacao": "negativa",
                          "premissa": "Quanto maior distância, menor favorabilidade.",
                          "variavel": "Distância", "dimensao": "Territorial",
                          "campo_original": "distancia", "campo_reescalonado": "distancia_01"}]}


@pytest.fixture
def conexao(monkeypatch, superficie):
    context = MagicMock()
    conn = context.__enter__.return_value
    conn.execute.return_value.fetchone.return_value = superficie
    monkeypatch.setattr(ahp, "get_connection", lambda: context)
    return conn


def ambiente(superficie):
    return {"id": AID, "hierarquizacao_id": HID, "hierarquizacao_codigo": "H-1",
            "criterios": [dict(c, _superficie_id=SID) for c in superficie["criterios"]],
            "n_criterios": 2, "status": "consolidada", "consistente": True,
            "matriz_consolidada": [[1, 3], [1 / 3, 1]], "pesos_consolidados": [.75, .25],
            "token": "token", "convites": [{"email": "p@example.com"}],
            "valido_ate": datetime(2035, 1, 1, tzinfo=timezone.utc)}


def test_criacao_de_julgamento_fase2_rejeitada_sem_gravar(monkeypatch, superficie, conexao):
    monkeypatch.setattr(service.matrizes_criterios, "criar",
                        lambda nome, conteudo, *args: {"id": AID, "nome": nome, "conteudo": conteudo})
    monkeypatch.setattr(service, "_carregar_hierarquizacao", lambda _: {
        "id": HID, "codigo": "H-1", "dados_hierarquizacao": {"criterios": [{"criterio": "Global"}]}})
    close = MagicMock(side_effect=AssertionError("Não deve encerrar outra coleta"))
    monkeypatch.setattr(service.repo, "encerrar_ambientes_anteriores", close)
    monkeypatch.setattr(service.repo, "encerrar_ambientes_anteriores_config", close)
    monkeypatch.setattr(ahp, "encerrar_rodadas_hierarquizacao", close)
    captured = {}

    def insert(data):
        captured.update(data)
        return dict(data, id=AID)

    monkeypatch.setattr(service.repo, "insert_ambiente", insert)
    payload = AmbienteColaborativoCreateSchema(
        superficie_id=SID, hierarquizacao_id=HID,
        matriz_premissas_criterios=[{"criterio": "Injetado"}],
        convites=[{"email": "p@example.com"}], valido_ate=datetime(2035, 1, 1, tzinfo=timezone.utc))
    with pytest.raises(DemandaValidationError, match="exclusivos.*Fase 3"):
        service.criar_ambiente(payload)
    assert captured == {}
    close.assert_not_called()
    conexao.execute.assert_not_called()


@pytest.mark.parametrize("change", ["missing", "hierarchy", "duplicate", "name"])
def test_snapshot_rejeita_superficie_invalida(superficie, conexao, change):
    if change == "missing":
        conexao.execute.return_value.fetchone.return_value = None
    elif change == "hierarchy":
        superficie["hierarquizacao_id"] = AID
    elif change == "duplicate":
        superficie["criterios"][1]["id"] = "c001"
    else:
        superficie["criterios"][0]["criterio"] = ""
    with pytest.raises(DemandaValidationError):
        ahp.snapshot(SID, HID)


def test_pesos_por_id_preservam_precisao_e_ordem(monkeypatch, superficie):
    row = ambiente(superficie)
    monkeypatch.setattr(ahp.repo, "get_ambiente_by_id", lambda _: row)
    assert ahp.pesos_consolidados(superficie, AID) == pytest.approx([.75, .25])
    superficie["criterios"].reverse()
    assert ahp.pesos_consolidados(superficie, AID) == pytest.approx([.25, .75])


@pytest.mark.parametrize("change", [
    "hierarchy", "surface", "partial_binding", "status", "consistent", "name", "id",
    "duplicate", "weights", "dimension", "nonfinite", "reciprocity", "inconsistent",
])
def test_pesos_rejeitam_julgamento_incompativel(monkeypatch, superficie, change):
    row = ambiente(superficie)
    if change == "hierarchy":
        row["hierarquizacao_id"] = AID
    elif change == "surface":
        for c in row["criterios"]:
            c["_superficie_id"] = AID
    elif change == "partial_binding":
        del row["criterios"][1]["_superficie_id"]
    elif change == "status":
        row["status"] = "ativa"
    elif change == "consistent":
        row["consistente"] = False
    elif change == "name":
        row["criterios"][0]["criterio"] = "Outro"
    elif change == "id":
        row["criterios"][0]["id"] = "c003"
    elif change == "duplicate":
        row["criterios"][0]["id"] = "c002"
    elif change == "weights":
        row["pesos_consolidados"] = [.5, .5]
    elif change == "dimension":
        row["matriz_consolidada"] = [[1]]
    elif change == "nonfinite":
        row["matriz_consolidada"][0][1] = float("nan")
    elif change == "reciprocity":
        row["matriz_consolidada"][1][0] = 3
    elif change == "inconsistent":
        extra = {"id": "c003", "criterio": "Terceiro"}
        superficie["criterios"].append(extra)
        row["criterios"].append(dict(extra, _superficie_id=SID))
        row["matriz_consolidada"] = [[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]
        row["pesos_consolidados"] = [1 / 3] * 3
    monkeypatch.setattr(ahp.repo, "get_ambiente_by_id", lambda _: row)
    with pytest.raises(DemandaValidationError):
        ahp.pesos_consolidados(superficie, AID)


def test_edicao_de_convites_de_superficie_legada_bloqueada(monkeypatch, superficie):
    row = ambiente(superficie)
    row["status"] = "ativa"
    row["total_respostas"] = 3
    monkeypatch.setattr(service.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(service.repo, "list_respostas", lambda _: [])
    monkeypatch.setattr(service.repo, "update_ambiente", lambda _, data: dict(row, **data))
    monkeypatch.setattr(service, "_carregar_hierarquizacao", MagicMock(side_effect=AssertionError("Não reler matriz global")))
    with pytest.raises(DemandaValidationError, match="exclusivos da Fase 3"):
        service.atualizar_ambiente(AID, AmbienteColaborativoUpdateSchema(
            hierarquizacao_id=HID, convites=[{"email": "novo@example.com"}]))
    assert row["convites"] == [{"email": "p@example.com"}]
    for patch in [{"hierarquizacao_id": AID}, {"config_tipo": "portfolio", "config_id": HID},
                  {"matriz_premissas_criterios": []}, {"arquivo_matriz_base64": "YQ=="}]:
        with pytest.raises(DemandaValidationError):
            service.atualizar_ambiente(AID, AmbienteColaborativoUpdateSchema(**patch))


def test_consolidacao_de_julgamento_fase2_bloqueada(monkeypatch, superficie):
    row = ambiente(superficie)
    row["status"] = "ativa"
    monkeypatch.setattr(service.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(service.repo, "list_respostas", lambda _: [
        {"status": "enviada", "consistente": True, "matriz_comparacao": row["matriz_consolidada"]}])
    save = MagicMock(side_effect=lambda _, data, hierarchy: dict(row, **data))
    monkeypatch.setattr(service.repo, "atualizar_consolidacao", save)
    with pytest.raises(DemandaValidationError, match="exclusivos da Fase 3"):
        service.consolidar_ambiente(AID)
    save.assert_not_called()


def test_encerramento_global_exclui_superficies(conexao):
    ahp.encerrar_rodadas_hierarquizacao(HID)
    query, params = conexao.execute.call_args.args
    assert "NOT EXISTS" in query and "c ? '_superficie_id'" in query
    assert params == (HID,)
    conexao.commit.assert_called_once()


def test_publico_autorizado_rejeita_julgamento_fase2(monkeypatch, superficie):
    row = ambiente(superficie)
    row.update(status="ativa", token_acesso="012345")
    monkeypatch.setattr(service.repo, "get_ambiente_by_token", lambda _: row)
    monkeypatch.setattr(service, "_carregar_hierarquizacao", lambda _: {"nome": "Hierarquização"})
    with pytest.raises(DemandaValidationError, match="exclusivos da Fase 3"):
        service.obter_ambiente_publico("token", email="p@example.com", token_acesso="012345")
    assert service.obter_ambiente_publico("token").criterios == []


def test_homologacao_de_julgamento_fase2_bloqueada(monkeypatch, superficie):
    row = ambiente(superficie)
    analysis = {"id": "an1", "ambiente_id": AID, "consistente": True,
                "matriz_consolidada": row["matriz_consolidada"], "pesos_consolidados": [.5, .5]}
    monkeypatch.setattr(service.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(service.analise_repo, "get_by_id", lambda _: dict(analysis))
    monkeypatch.setattr(service.analise_repo, "list_resposta_ids", lambda _: ["r1"])
    monkeypatch.setattr(service, "_carregar_hierarquizacao", lambda _: {"id": HID})
    monkeypatch.setattr(service, "_analise_response", lambda value: value)
    save = MagicMock()
    monkeypatch.setattr(service.repo, "atualizar_consolidacao", save)
    with pytest.raises(DemandaValidationError, match="exclusivos da Fase 3"):
        service.homologar_analise("an1")
    save.assert_not_called()


def test_rc_limite_e_aceito_sem_confiar_em_arredondamento(monkeypatch, superficie):
    row = ambiente(superficie)
    monkeypatch.setattr(ahp.repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(ahp.ahp_engine, "analyze_matrix", lambda _: {"CR": .10, "weights": [.75, .25]})
    assert ahp.pesos_consolidados(superficie, AID) == [.75, .25]
    row["razao_consistencia"] = .10
    monkeypatch.setattr(ahp.ahp_engine, "analyze_matrix", lambda _: {"CR": .10000001, "weights": [.75, .25]})
    with pytest.raises(DemandaValidationError):
        ahp.pesos_consolidados(superficie, AID)


def test_javascript_rejeita_novo_julgamento_para_superficie():
    response = TestClient(app).get(
        "/assets/js/paginas/analise-multicriterio-julgamentos.js",
        headers={"X-Forwarded-Prefix": "/sicard"},
    )
    assert response.status_code == 200
    source = response.text
    functions = source[source.index("  function matrixRows("):source.index("  function matrixSummary(")]
    functions += source[source.index("  function syncMatrixContext("):source.index("  function selectedMatrixId(")]
    harness = r"""
const assert = require('node:assert/strict');
var nodes = {}, calls = [], opened = 0, summary = '';
var $ = id => nodes[id] || (nodes[id] = {after() {}, querySelectorAll() {return [];}, replaceChildren() {}});
var document = {
  getElementById: id => nodes[id],
  createElement: () => ({set id(value) { nodes[value] = this; }})
};
var location = {pathname:'/sicard/restrict/analise-multicriterio/central-julgamentos',
  search:'?superficie_id=s1&hierarquizacao_id=h1&novo=1'};
var surfaceContext = null, surfaceLoading = true, activeSurfaceId = null;
var environmentMode = 'create', matrixPicker = {setDisabled(value) {this.disabled = value;}};
var criteriaMatrix = null, criteriaMatrixFileBase64 = 'old', criteriaMatrixFileName = 'global.xlsx';
var hierarquizacoes = [{id:'h1'}];
var surface = {id:'s1',hierarquizacao_id:'h1',nome:'Fase 2',criterios:[
  {id:'c001',criterio:'Acesso'},{id:'c002',criterio:'Distância'}]};
function api(url, options) { calls.push([url, options]); return Promise.resolve(surface); }
function matrixSummary(text) { summary = text; }
function showCreateSection() { opened++; applySurfaceContext(); }
"""
    checks = r"""
(async function () {
  await assert.rejects(loadRequestedSurface(),/exclusivos da Fase 3/);
  assert.equal(opened,0);
  assert.equal(activeSurfaceId,null);
  assert.deepEqual(calls,[]);
})().catch(e => {console.error(e);process.exitCode=1});
"""
    result = subprocess.run(["node", "-"], input=harness + functions + checks,
                            text=True, capture_output=True, check=False)
    assert result.returncode == 0, result.stdout + result.stderr

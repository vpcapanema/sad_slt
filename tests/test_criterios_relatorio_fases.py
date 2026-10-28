"""Testes herméticos: artefatos JSON em memória, sem banco, storage ou GDAL."""
from copy import deepcopy
import json
from unittest.mock import Mock

import pytest

from api.services import criterios_relatorio_fases as service

LER_JSON_LOCAL = service._ler_json


@pytest.fixture(autouse=True)
def artefatos(monkeypatch):
    dados = {
        service.BIBLIOTECA: {"criterios": [{
            "id": "inundacao", "nome": "Suscetibilidade à inundação",
            "fundamento": "Cenário hidrológico publicado.", "fonte": "IPT",
            "tipo": "Risco", "elevacao": "Exige estudo específico.",
        }]},
        service.ALIASES: {"camadas": {"desconhecida": {"nome": "Base sem composição", "fonte": "IBGE"}}},
        service.NORMALIZACAO: {
            "agregacao_final": "Média simples dos critérios calculáveis.",
            "rede": {"arquivo": "data\\geoespacial\\outputs\\favorabilidade_rede_normalizada.gpkg"},
            "criterios_matriz_v3": {"rede": [
                {"codigo": "R01", "criterio": "VDM", "campo": "crit_r01_vdm",
                 "componentes": ["f_c1_vdm"], "disponivel": True},
                {"codigo": "R04", "criterio": "Pavimento", "disponivel": False},
            ]},
        },
        service.MATRIZ: [{"Critério": "VDM", "Premissa": "Demanda instalada.",
                          "Fonte": "Modelo", "Dimensão": "Técnica"}],
    }
    monkeypatch.setattr(service, "_ler_json", lambda caminho: deepcopy(dados.get(caminho)))
    return dados


def raster(metodo=None, *, nome="Superfície"):
    return {"id": "storage:/superficies/indice.tif", "nome": nome, "papel": "rede",
            "tipo": "raster", "raster": {} if metodo is None else {"SICARD_METODOLOGIA": metodo}}


def test_somente_bases_usadas_ordem_deduplicacao_papel_e_imutabilidade():
    base = {"id": "storage:/bases/inundacao.gpkg", "nome": "Mancha usada", "papel": "restricao"}
    campos = [base, {"id": "entrada", "papel": "entrada"}, deepcopy(base),
              {**base, "papel": "risco"}, {"id": "outra", "papel": "rede"}]
    original = deepcopy(campos)
    saida = service.descrever(campos, analise="elegibilidade")
    assert campos == original
    assert [(s["id"], s["papel"]) for s in saida] == [(base["id"], "restricao"), (base["id"], "risco")]
    assert saida[0]["nome"] == "Mancha usada"
    assert saida[0]["criterios"][0]["enquadramento_catalogo"] == "Risco"
    assert "jurídica" in " ".join(saida[0]["avisos"])


def test_componente_exato_tem_precedencia_sobre_arquivo():
    campos = [{"id": "storage:/bases/desconhecida.gpkg::inundacao", "papel": "risco"},
              {"id": "storage:/bases/inundacao.gpkg::desconhecida", "papel": "risco"}]
    a, b = service.descrever(campos, analise="elegibilidade")
    assert a["criterios"][0]["codigo"] == "inundacao"
    assert not b["criterios"]
    assert b["nome"] == "Base sem composição"


@pytest.mark.parametrize("ident", ["uuid-da-base", "storage:/bases/qualquer.gpkg", "storage:/bases/inundacao_copia.gpkg"])
def test_nome_amigavel_nao_comprova_vinculo(ident):
    entrada = {"id": ident, "nome": "inundacao", "papel": "risco"}
    saida = service.descrever([entrada], analise="elegibilidade")[0]
    assert not saida["criterios"]
    assert "não verificável" in " ".join(saida["avisos"])


@pytest.mark.parametrize("metodo", [None, "não json", "[]", [], 42])
def test_raster_sem_metodologia_util_nao_recebe_catalogo(metodo):
    entrada = raster(metodo)
    entrada["id"] = "storage:/superficies/superficie_favorabilidade_rede_indice_final_200m.tif"
    saida = service.descrever([entrada], analise="favorabilidade")[0]
    assert saida["criterios"] == []
    assert "SICARD_METODOLOGIA" in " ".join(saida["avisos"])


@pytest.mark.parametrize("serializado", [False, True])
def test_metadados_reais_ligam_pipeline_historico_sem_confundir_catalogo_v3(serializado):
    metodo = {"fonte": service.FONTE_RODADA, "campo": "fav_rede_dim",
              "formula": "fav_rede_dim * Ramp(distancia)", "resolucao_m": 200}
    entrada = raster(json.dumps(metodo) if serializado else metodo)
    original = deepcopy(entrada)
    saida = service.descrever([entrada], analise="favorabilidade")[0]
    assert entrada == original
    assert [c["codigo"] for c in saida["criterios"]] == [f"R{i}" for i in range(1, 12)]
    assert "geometria" in saida["criterios"][3]["nome"]
    assert "cargas" in saida["criterios"][6]["nome"]
    assert "atribuído" in saida["criterios"][0]["fonte"]
    assert "TomTom" in saida["criterios"][2]["fonte"]
    assert "por município" in saida["criterios"][4]["fonte"]
    assert "cinco dimensões" in saida["agregacao"]
    assert "fav_rede_dim * Ramp" in saida["transformacao_raster"]
    assert "c7b477bc" in " ".join(saida["evidencias"])
    assert "hash" in " ".join(saida["avisos"])


def test_aceita_metadados_aninhados_e_media_nao_dimensional():
    entrada = raster()
    entrada["raster"] = {"metadados": {"SICARD_METODOLOGIA": {
        "fonte": service.FONTE_HISTORICA, "campo": "fav_rede"}}}
    saida = service.descrever([entrada], analise="favorabilidade")[0]
    assert len(saida["criterios"]) == 11
    assert "Média simples dos 11 critérios" in saida["agregacao"]


def test_aceita_contrato_preparar_metodologia_origem():
    entrada = raster()
    entrada["raster"] = {"metodologia_origem": {
        "fonte": service.FONTE_RODADA, "campo": "fav_rede_dim"}}
    saida = service.descrever([entrada], analise="favorabilidade")[0]
    assert len(saida["criterios"]) == 11
    assert saida["avisos"]


@pytest.mark.parametrize("fonte,campo", [
    ("/outra/favorabilidade_rede_trechos_20261027.gpkg", "fav_rede_dim"),
    (service.FONTE_RODADA, "outro_indice"),
])
def test_fonte_ou_indice_desconhecido_nao_herda_r1_r11(fonte, campo):
    saida = service.descrever([raster({"fonte": fonte, "campo": campo})], analise="favorabilidade")[0]
    assert not saida["criterios"]
    assert saida["metodologia_raster"]["fonte"] == fonte


def test_normalizacao_v3_exige_caminho_exato_e_exclui_indisponiveis():
    base = {"id": "storage:/aplicacao/data/geoespacial/outputs/favorabilidade_rede_normalizada.gpkg",
            "papel": "rede"}
    a, b, c = service.descrever([
        base, {**base, "id": "storage:/copia/favorabilidade_rede_normalizada.gpkg"},
        {**base, "id": base["id"] + "::layer_styles"},
    ], analise="favorabilidade")
    assert [x["codigo"] for x in a["criterios"]] == ["R01"]
    assert a["criterios"][0]["descricao"] == "Demanda instalada."
    assert a["criterios"][0]["fonte"] == "Modelo"
    assert not b["criterios"] and not c["criterios"]


def test_gpkg_historico_conhecido_e_subcamada_desconhecida():
    base = {"id": "storage:" + service.FONTE_HISTORICA + "::subtrechos", "papel": "rede"}
    a, b = service.descrever([
        base, {**base, "id": "storage:" + service.FONTE_HISTORICA + "::layer_styles"},
    ], analise="favorabilidade")
    assert len(a["criterios"]) == 11
    assert "campo de índice" in " ".join(a["avisos"])
    assert not b["criterios"]


def test_artefatos_ausentes_nao_atribuem_catalogos(monkeypatch):
    monkeypatch.setattr(service, "_ler_json", lambda caminho: None)
    saida = service.descrever([{"id": "inundacao", "papel": "risco"}], analise="elegibilidade")[0]
    assert not saida["criterios"] and saida["avisos"]


def test_conflito_mesma_base_impede_afirmacao_de_composicao():
    a = raster({"fonte": service.FONTE_RODADA, "campo": "fav_rede_dim"})
    b = raster({"fonte": "/outra.gpkg", "campo": "fav_rede_dim"})
    saida = service.descrever([a, b], analise="favorabilidade")
    assert len(saida) == 1
    assert not saida[0]["criterios"]
    assert "conflitantes" in " ".join(saida[0]["avisos"])


def test_nao_le_caminhos_fornecidos_nem_manifesta_remota(monkeypatch):
    chamadas = []
    monkeypatch.setattr(service, "_ler_json", lambda caminho: chamadas.append(caminho))
    entrada = raster({"fonte": "https://externo/manifesto.json", "manifesto": "../../segredo.json"})
    service.descrever([entrada], analise="favorabilidade")
    assert chamadas == [service.BIBLIOTECA, service.ALIASES]


def test_contrato_vazio_e_analise_invalida():
    assert service.descrever([], analise="elegibilidade") == []
    with pytest.raises(ValueError, match="Análise"):
        service.descrever([], analise="fase-desconhecida")


@pytest.mark.parametrize("conteudo", ['{"ok": true}', "{inválido"])
def test_leitor_local_sem_storage(monkeypatch, conteudo):
    root = Mock()
    arquivo = root.joinpath.return_value
    arquivo.stat.return_value.st_size = len(conteudo)
    arquivo.read_text.return_value = conteudo
    monkeypatch.setattr(service, "ROOT", root)
    assert LER_JSON_LOCAL("config/exemplo.json") == ({"ok": True} if conteudo.startswith('{"ok"') else None)
    root.joinpath.assert_called_once_with("config", "exemplo.json")


def test_leitor_ignora_artefatos_grandes_e_ausentes(monkeypatch):
    root = Mock()
    arquivo = root.joinpath.return_value
    arquivo.stat.return_value.st_size = 2_000_001
    monkeypatch.setattr(service, "ROOT", root)
    assert LER_JSON_LOCAL("data/manifesto.json") is None
    arquivo.read_text.assert_not_called()
    arquivo.stat.side_effect = FileNotFoundError
    assert LER_JSON_LOCAL("data/manifesto.json") is None

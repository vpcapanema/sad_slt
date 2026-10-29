from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

import pytest

from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoFase3RiscosSchema,
    HierarquizacaoFase3ExecutarSchema,
    HierarquizacaoSinteseSchema,
    HierarquizacaoUpdateSchema,
)
from api.services import hierarquizacao_service as service


@pytest.fixture(autouse=True)
def matrizes_em_memoria(monkeypatch):
    monkeypatch.setattr(service.matrizes_criterios, "criar",
                        lambda nome, conteudo: {"id": "88888888-8888-8888-8888-888888888888",
                                               "nome": nome, "conteudo": deepcopy(conteudo)})


@pytest.mark.parametrize("etapa2, etapa3", [
    ("Favorabilidade territorial em grade e da rede", "Ajuste por atributos do objeto de demanda"),
    ("Favorabilidade territorial — município e rede rodoviária", "Priorização de demandas por atributos"),
])
def test_nomes_oficiais_e_anteriores_preservam_classificacao_da_matriz(etapa2, etapa3):
    matriz = {"linhas": [
        {"Etapa": etapa2, "Critério": "Acessibilidade"},
        {"Etapa": etapa3, "Critério": "Maturidade"},
    ]}
    fase2, fase3 = service._criterios(matriz)
    assert set(fase2) == {"Acessibilidade"}
    assert set(fase3) == {"Maturidade"}


def test_matriz_v3_preserva_criterios_com_nomes_oficiais():
    import json

    path = Path(__file__).resolve().parents[1] / "config" / "matriz-criterios-premissas-v3.json"
    linhas = json.loads(path.read_text(encoding="utf-8"))
    assert len(linhas) == 50
    assert {linha["Etapa"] for linha in linhas} == {
        "Elegibilidade territorial",
        "Favorabilidade territorial — município e rede rodoviária",
        "Priorização de demandas por atributos",
    }
    fase2, fase3 = service._criterios(linhas)
    assert fase2 and fase3


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
        "grupo_demanda_id": "9ccbb5b5-3d60-4f25-8f3f-bdef08a48e73",
        "grupo_demanda_codigo": "GRU-TESTE",
        "status": "em_julgamento",
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


def test_registrar_saida_e_pdf_sem_perder_analises_ou_alterar_situacao(monkeypatch):
    from contextlib import nullcontext
    from api.db import connection
    row = _db_row(_dados([1, 2, 3], []))
    row['status'] = 'homologada'
    row['relatorio_fase1'] = {'resumo': {'anterior': 1}}
    dados_antes = deepcopy(row['dados_hierarquizacao'])
    _mock_persistencia(monkeypatch, row)
    locks = []
    def carregar(codigo, *, for_update=False):
        locks.append(for_update)
        return deepcopy(row)
    monkeypatch.setattr(service.repo, 'get_by_codigo', carregar)
    monkeypatch.setattr(connection, 'atomic_connection', nullcontext)
    resultado = {'arquivo': 'saidas-geoespaciais/saida.gpkg', 'sha256': 'original',
                 'elegibilidade': {'entrada': {'id': 'entrada'}, 'campos': []}}
    pdf = {'arquivo': 'saidas-geoespaciais/relatorio.pdf', 'sha256': 'pdf'}
    service.registrar_saida_geoespacial_fase1('HIER-TESTE', resultado, 'autor')
    service.registrar_saida_geoespacial_fase1('HIER-TESTE', resultado, 'autor', pdf)
    service.registrar_saida_geoespacial_fase1('HIER-TESTE', {**resultado, 'arquivo': 'saidas-geoespaciais/outra.gpkg'}, 'autor')
    analises = row['relatorio_fase1']['analises_geoespaciais']
    assert len(analises) == 2 and analises[0]['relatorio'] == pdf
    assert row['relatorio_fase1']['resumo'] == {'anterior': 1}
    assert row['status'] == 'homologada' and row['dados_hierarquizacao'] == dados_antes
    assert locks == [True, True, True]


def test_rodada_pode_executar_somente_fase_1(monkeypatch: pytest.MonkeyPatch) -> None:
    from uuid import UUID

    captured = {}
    grupo_id = UUID("9ccbb5b5-3d60-4f25-8f3f-bdef08a48e73")
    objeto = {"id": "1", "codigo": "P-1", "nome": "Projeto"}
    monkeypatch.setattr(
        service.agrupamento_demanda_repository,
        "get_by_id",
        lambda _id: {"id": grupo_id, "codigo": "GRU-TESTE", "tipo_demanda_id": 3, "objetos": [objeto]},
    )

    def insert(data: dict) -> dict:
        captured.update(deepcopy(data))
        row = _db_row(data["dados_hierarquizacao"])
        row.update({"grupo_demanda_id": str(grupo_id), "objetos": [objeto]})
        return row

    monkeypatch.setattr(service.repo, "insert", insert)
    result = service.criar_hierarquizacao(
        HierarquizacaoCreateSchema(
            nome="Triagem territorial",
            grupo_demanda_id=grupo_id,
            fases_a_executar=[1],
            matriz_premissas_criterios=[{"criterio":"C1","etapa":"Elegibilidade territorial"},{"criterio":"C2","etapa":"Elegibilidade territorial"}],
        )
    )

    assert result.dados_hierarquizacao["cabecalho_grupo"]["fases_a_executar"] == [1]
    assert captured["status"] == "em_julgamento"
    assert captured["grupo_demanda_id"] == grupo_id
    assert "objetos" not in captured


def test_criacao_usa_o_universo_do_agrupamento_salvo(monkeypatch: pytest.MonkeyPatch) -> None:
    from uuid import uuid4

    grupo_demanda_id = uuid4()
    objeto = {
        "id": str(uuid4()),
        "codigo": "PROG-001",
        "nome": "Programa agrupado",
        "descricao": "Snapshot do agrupamento",
        "status": "analise_aprovada",
    }
    agrupamento = {
        "id": grupo_demanda_id,
        "codigo": "GRU-001",
        "tipo_demanda_id": 2,
        "objetos": [objeto],
    }
    captured = {}

    monkeypatch.setattr(
        service.agrupamento_demanda_repository,
        "get_by_id",
        lambda _id: agrupamento,
    )

    def insert(data: dict, **_kwargs) -> dict:
        captured.update(deepcopy(data))
        row = _db_row(data["dados_hierarquizacao"])
        row.update({"id": str(uuid4()), "tipo_demanda_id": 2, "grupo_demanda_id": str(grupo_demanda_id), "grupo_demanda_codigo": "GRU-001", "objetos": [objeto]})
        return row

    monkeypatch.setattr(service.repo, "insert", insert)
    result = service.criar_hierarquizacao(
        HierarquizacaoCreateSchema(
            nome="Rodada do grupo salvo",
            grupo_demanda_id=grupo_demanda_id,
            fases_a_executar=[1],
            matriz_premissas_criterios=[{"criterio":"C1","etapa":"Elegibilidade territorial"},{"criterio":"C2","etapa":"Elegibilidade territorial"}],
        )
    )

    assert captured["tipo_demanda_id"] == 2
    assert captured["grupo_demanda_id"] == grupo_demanda_id
    assert "objetos" not in captured
    assert captured["dados_hierarquizacao"]["cabecalho_grupo"]["grupo_demanda_id"] == str(grupo_demanda_id)
    assert result.grupo_demanda_id == str(grupo_demanda_id)
    assert result.grupo_demanda_codigo == "GRU-001"
    assert result.dados_hierarquizacao["objetos"][0]["cabecalho_objeto"]["codigo"] == "PROG-001"


def test_fase_3_consume_indice_do_resumo_por_demanda_sem_reescalonar(monkeypatch):
    chave = "indice_de_risco_ambiental_e_territorial"
    row = _db_row(_dados([3], [{}, {}, {}, {}]))
    for obj, indice in zip(row["dados_hierarquizacao"]["objetos"], [0.75, 0.9, 0.0, 1.0]):
        obj["cabecalho_objeto"]["nome"] = "Mesmo nome"
        obj["cabecalho_objeto"]["atributos_fase3"] = {chave: {"valor_bruto": 0.123, "origem": "complementacao"}}
        obj["hierarquizacao"]["fase_1"] = {
            "executada": True, "resumo_elegibilidade": {chave: indice}}
        obj["hierarquizacao"]["fase_3"]["desatualizado"] = {"por": "complementacao_atributos"}
    _mock_persistencia(monkeypatch, row)
    criterio = {"nome_coluna": chave, "criterio": "Índice de risco ambiental e territorial",
                "grupo_atributo": "risco_ambiental_territorial", "peso": 1}
    for _ in range(2):
        result = service.executar_fase_3("HIER-TESTE", HierarquizacaoFase3ExecutarSchema(
            criterios=[criterio], completude_minima=0, regra_ausentes="renormalizar"))
        objetos = result.dados_hierarquizacao["objetos"]
        assert [o["hierarquizacao"]["fase_3"]["score_fase3"] for o in objetos] == [0.75, 0.9, 0.0, 1.0]
        for obj, indice in zip(objetos, [0.75, 0.9, 0.0, 1.0]):
            assert "desatualizado" not in obj["hierarquizacao"]["fase_3"]
            slot = obj["cabecalho_objeto"]["atributos_fase3"][chave]
            assert slot["valor_bruto"] == slot["valor_rescalonado"] == indice
            assert slot["origem"] == "fase1"


@pytest.mark.parametrize("fase1", [
    {"executada": False, "resumo_elegibilidade": {"indice_de_risco_ambiental_e_territorial": 1}},
    {"executada": True},
    {"executada": True, "status_fase1": "restrito", "resumo_elegibilidade": None},
])
def test_indice_do_resumo_ausente_nao_usa_slot_manual(monkeypatch, fase1):
    chave = "indice_de_risco_ambiental_e_territorial"
    row = _db_row(_dados([3], [{}]))
    obj = row["dados_hierarquizacao"]["objetos"][0]
    obj["hierarquizacao"]["fase_1"] = fase1
    obj["cabecalho_objeto"]["atributos_fase3"] = {chave: {"valor_bruto": 1}}
    _mock_persistencia(monkeypatch, row)
    result = service.executar_fase_3("HIER-TESTE", HierarquizacaoFase3ExecutarSchema(
        criterios=[{"nome_coluna": chave, "criterio": "Índice", "peso": 1}],
        completude_minima=0, regra_ausentes="renormalizar"))
    fase3 = result.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]
    assert fase3["score_fase3"] is None
    assert fase3["atributos_ausentes"] == ["Índice"]


@pytest.mark.parametrize("valor", [-0.1, 1.1, float("nan"), float("inf"), "invalido"])
def test_indice_do_resumo_fora_da_escala_e_invalido(valor):
    normalizados, ausentes, invalidos = service._normalizar(
        [valor], {"nome_coluna": service.INDICE_RISCO})
    assert normalizados == {"0": None}
    assert ausentes == set() and invalidos == {0}


def test_indice_substitui_camadas_antigas_e_atualiza_slot_ao_salvar_pesos(monkeypatch):
    row = _db_row(_dados([3], [{"maturidade": 10}, {"maturidade": 20}]))
    maturidade = {"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1}
    row["dados_hierarquizacao"]["cabecalho_grupo"]["configuracoes"] = {"fase_3": {"criterios": [
        maturidade, {**service._atributo_risco("antiga", "Camada antiga"), "peso": 1}]}}
    for obj, indice in zip(row["dados_hierarquizacao"]["objetos"], [0.75, 0.9]):
        obj["hierarquizacao"]["fase_1"] = {
            "executada": True, "resumo_elegibilidade": {service.INDICE_RISCO: indice}}
    _mock_persistencia(monkeypatch, row)
    payload = HierarquizacaoFase3ExecutarSchema(
        criterios=[maturidade, {**service._atributo_indice_risco(), "peso": 1}],
        completude_minima=0)
    result = service.executar_fase_3("HIER-TESTE", payload)
    objetos = result.dados_hierarquizacao["objetos"]
    assert [o["hierarquizacao"]["fase_3"]["score_fase3"] for o in objetos] == [0.375, 0.95]
    criterios = result.dados_hierarquizacao["cabecalho_grupo"]["configuracoes"]["fase_3"]["criterios"]
    assert [c["nome_coluna"] for c in criterios] == ["maturidade", service.INDICE_RISCO]
    row["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["fase_1"]["resumo_elegibilidade"][service.INDICE_RISCO] = 0.4
    result = service.salvar_pesos_fase3("HIER-TESTE", payload)
    slot = result.dados_hierarquizacao["objetos"][0]["cabecalho_objeto"]["atributos_fase3"][service.INDICE_RISCO]
    assert slot["valor_bruto"] == 0.4 and slot["origem"] == "fase1"


def test_fase_3_pondera_criterio_de_risco_herdado_da_fase_1(monkeypatch: pytest.MonkeyPatch) -> None:
    row = _db_row(_dados([3], [{}, {}, {}]))
    areas = [0.0, 4.0, 2.0]
    for obj, area in zip(row["dados_hierarquizacao"]["objetos"], areas):
        obj["hierarquizacao"]["fase_1"] = {"executada": True, "sobreposicoes_risco": {"b": {"area_ha": area}}}
    row["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["fase_1"]["riscos_intersectados"] = []
    _mock_persistencia(monkeypatch, row)
    risco = service._atributo_risco("b", "Áreas de Risco")
    result = service.executar_fase_3("HIER-TESTE", HierarquizacaoFase3ExecutarSchema(
        criterios=[{**risco, "peso": 1}], completude_minima=0, regra_ausentes="renormalizar"))
    scores = [o["hierarquizacao"]["fase_3"]["score_fase3"] for o in result.dados_hierarquizacao["objetos"]]
    assert scores == [1.0, 0.0, 0.5]
    slot = result.dados_hierarquizacao["objetos"][1]["cabecalho_objeto"]["atributos_fase3"]["risco_area:b"]
    assert slot["origem"] == "fase1"


def test_fase_3_usa_riscos_do_payload_e_mantem_pesos_salvos_dos_demais(monkeypatch: pytest.MonkeyPatch) -> None:
    row = _db_row(_dados([3], [{"maturidade": 10}, {"maturidade": 20}]))
    row["dados_hierarquizacao"]["cabecalho_grupo"]["configuracoes"] = {"fase_3": {"criterios": [
        {"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1},
        {**service._atributo_risco("antiga", "Camada antiga"), "peso": 1}]}}
    for obj in row["dados_hierarquizacao"]["objetos"]:
        obj["hierarquizacao"]["fase_1"] = {"executada": True, "sobreposicoes_risco": {"nova": {"area_ha": 0.0}}}
    _mock_persistencia(monkeypatch, row)
    result = service.executar_fase_3("HIER-TESTE", HierarquizacaoFase3ExecutarSchema(
        criterios=[{"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1},
                   {**service._atributo_risco("nova", "Camada nova"), "peso": 1}], completude_minima=0))
    pesos = result.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]["pesos_fase3"]
    assert set(pesos) == {"Maturidade", "Sobreposição com Camada nova"}


def test_fase3_calcula_pela_escala_da_tabela_atual_e_nao_pela_configuracao_antiga(monkeypatch):
    from api.matriz_colunas import extrair_colunas
    coluna = extrair_colunas([{
        "Etapa": "Priorização", "Métrica": "Nível de complexidade",
        "Dado": "Nível de complexidade · Indicador: escala qualitativa de 1 a 5",
        "Unidade": "escala ordinal", "Relação": "↓ Negativa",
    }])[0]
    criterio = {"nome_coluna": coluna["id"], "tipo_dado": "ordinal",
                "direcao": coluna["relacao"], "peso": 1, "mapeamento": coluna["mapeamento"]}
    row = _db_row(_dados([3], [{coluna["id"]: i} for i in [1, 2, 3, 4]]))
    row["dados_hierarquizacao"]["cabecalho_grupo"]["configuracoes"] = {
        "fase_3": {"criterios": [{**criterio, "mapeamento": {}}]},
    }
    for objeto in row["dados_hierarquizacao"]["objetos"]:
        objeto["hierarquizacao"]["sintese"] = {"executada": True, "score_final": 0.9}
        objeto["hierarquizacao"]["fase_3"]["ranking_fase3"] = 99
    _mock_persistencia(monkeypatch, row)
    resultado = service.executar_fase_3("HIER-TESTE", HierarquizacaoFase3ExecutarSchema(criterios=[criterio]))
    objetos = resultado.dados_hierarquizacao["objetos"]
    assert [o["hierarquizacao"]["fase_3"]["score_fase3"] for o in objetos] == pytest.approx([1, 2 / 3, 1 / 3, 0])
    assert [o["hierarquizacao"]["fase_3"]["ranking_fase3"] for o in objetos] == [1, 2, 3, 4]
    assert all(o["hierarquizacao"]["sintese"]["executada"] is False for o in objetos)
    assert all(o["hierarquizacao"]["sintese"]["score_final"] is None for o in objetos)


def test_sintese_nao_utiliza_resultados_de_criterios_diferentes_da_tabela(monkeypatch):
    from api.exceptions import DemandaValidationError
    row = _db_row(_dados([3], [{}]))
    row["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["fase_3"] = {"executada": True, "score_fase3": 0.8}
    _mock_persistencia(monkeypatch, row)
    monkeypatch.setattr(service, "configuracao_fase3_desatualizada", lambda row: True)
    with pytest.raises(DemandaValidationError, match="tabela 2 mudaram"):
        service.sintetizar("HIER-TESTE", HierarquizacaoSinteseSchema())


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


def test_previa_fase3_nao_persiste_resultado(monkeypatch):
    row = _db_row(_dados([3], [{"maturidade": 10}, {"maturidade": 20}]))
    _mock_persistencia(monkeypatch, row)
    monkeypatch.setattr(service.repo, "update", lambda *_args, **_kwargs: pytest.fail("prévia não pode gravar"))
    payload = HierarquizacaoFase3ExecutarSchema(
        criterios=[{"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1}],
    )

    resultado = service.executar_fase_3("HIER-TESTE", payload, persistir=False)

    assert resultado.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_3"]["executada"] is True
    assert row["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["fase_3"]["executada"] is False


def test_salvar_previa_fase3_rejeita_hierarquizacao_alterada(monkeypatch):
    row = _db_row(_dados([3], [{"maturidade": 10}]))
    _mock_persistencia(monkeypatch, row)
    monkeypatch.setattr(service.repo, "update", lambda *_args, **_kwargs: pytest.fail("versão obsoleta não pode gravar"))
    payload = HierarquizacaoFase3ExecutarSchema(
        criterios=[{"criterio": "Maturidade", "nome_coluna": "maturidade", "peso": 1}],
    )

    with pytest.raises(service.DemandaValidationError, match="mudou desde a prévia"):
        service.executar_fase_3(
            "HIER-TESTE",
            payload,
            versao_esperada=datetime(2000, 1, 1, tzinfo=timezone.utc),
        )


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


def test_gestor_define_tratamento_para_risco_sobreposto(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dados = _dados([1, 3], [{}])
    objeto = dados["objetos"][0]
    objeto["cabecalho_objeto"]["codigo"] = "P-1"
    objeto["hierarquizacao"]["fase_1"]["riscos_intersectados"] = [
        {"criterio_id": "risco-inundacao", "nome": "Área inundável"}
    ]
    row = _db_row(dados)
    _mock_persistencia(monkeypatch, row)

    result = service.salvar_tratamentos_riscos_fase3(
        "HIER-TESTE",
        HierarquizacaoFase3RiscosSchema(
            tratamentos={"P-1": {"risco": "aplicar_penalizacao"}}
        ),
    )

    fase1 = result.dados_hierarquizacao["objetos"][0]["hierarquizacao"]["fase_1"]
    assert fase1["tratamentos_riscos_fase3"] == {
        "risco": "aplicar_penalizacao"
    }


def test_risco_reduz_score_ou_barra_conforme_decisao_do_gestor() -> None:
    obj = {
        "hierarquizacao": {
            "fase_1": {
                "risco": {"indice_calculado": 0.25},
                "riscos_intersectados": [{"criterio_id": "risco-1"}],
                "tratamentos_riscos_fase3": {
                    "risco": "aplicar_penalizacao"
                },
            }
        }
    }
    assert service._decisao_risco_fase3(obj) == ("aplicar_penalizacao", 0.75)

    obj["hierarquizacao"]["fase_1"]["tratamentos_riscos_fase3"]["risco"] = "ignorar"
    assert service._decisao_risco_fase3(obj) == ("ignorar", 1.0)

    obj["hierarquizacao"]["fase_1"]["tratamentos_riscos_fase3"]["risco"] = "barrar"
    assert service._decisao_risco_fase3(obj) == ("barrar", 0.0)

def test_sintese_segrega_restrito_e_explica_contribuicoes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dados = _dados([1, 2, 3], [{}, {}])
    primeiro = dados["objetos"][0]
    segundo = dados["objetos"][1]
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
    ranking = list(result.ranking or [])
    assert ranking
    assert ranking[0]["codigo"] == "P-2"


def test_previa_sintese_nao_persiste_ranking(monkeypatch):
    dados = _dados([1, 2, 3], [{}, {}])
    for indice, objeto in enumerate(dados["objetos"], start=1):
        objeto["hierarquizacao"]["fase_2"]["score_fase2"] = 0.6 + indice / 10
        objeto["hierarquizacao"]["fase_3"]["score_fase3"] = 0.4 + indice / 10
    row = _db_row(dados)
    _mock_persistencia(monkeypatch, row)
    monkeypatch.setattr(service.repo, "update", lambda *_args, **_kwargs: pytest.fail("prévia não pode gravar"))

    resultado = service.sintetizar("HIER-TESTE", HierarquizacaoSinteseSchema(), persistir=False)

    assert resultado.ranking
    assert row["ranking"] is None
    assert row["status"] == "em_julgamento"


def test_excluir_hierarquizacao_libera_demandas_do_universo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = _db_row(_dados([1], [{}]))
    row["objetos"] = [
        {"id": "aaa-1", "codigo": "P-1", "nome": "Projeto 1"},
        {"demanda_id": "bbb-2", "codigo": "P-2", "nome": "Projeto 2"},
    ]
    row["config_id"] = "cfg-uuid"
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda _c: deepcopy(row))
    monkeypatch.setattr(
        service.config_repo,
        "get_by_id",
        lambda tipo, _id: {
            "tipo_demanda_id": 3,
            "universo_objetos": [{"id": "aaa-1"}, {"id": "ccc-3"}],
        },
    )
    capturado: dict = {}

    def delete(codigo: str, *, liberar_demandas=None) -> bool:
        capturado["codigo"] = codigo
        capturado["transicao"] = liberar_demandas
        return True

    monkeypatch.setattr(service.repo, "delete_by_codigo", delete)

    service.excluir_hierarquizacao("HIER-TESTE")

    transicao = capturado["transicao"]
    assert capturado["codigo"] == "HIER-TESTE"
    assert transicao["tabela"] == ("demandas", "projeto")
    assert transicao["ids"] == ["aaa-1", "bbb-2", "ccc-3"]
    assert transicao["de"] == "hierarq_em_andamento"
    assert transicao["para"] == "analise_aprovada"


def test_excluir_hierarquizacao_sem_universo_nao_gera_transicao(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = _db_row(_dados([1], [{}]))
    row["objetos"] = []
    row["config_id"] = None
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda _c: deepcopy(row))
    capturado: dict = {"transicao": "nao-chamado"}

    def delete(codigo: str, *, liberar_demandas=None) -> bool:
        capturado["transicao"] = liberar_demandas
        return True

    monkeypatch.setattr(service.repo, "delete_by_codigo", delete)

    service.excluir_hierarquizacao("HIER-TESTE")

    assert capturado["transicao"] is None


def test_repositorio_desvincula_configuracao_antes_de_excluir_hierarquizacao(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    operacoes: list[object] = []

    class Cursor:
        def fetchone(self):
            return {"id": "hier-uuid"}

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, query, params):
            operacoes.append(query)
            operacoes.append(params)
            return Cursor()

        def commit(self):
            operacoes.append("commit")

    monkeypatch.setattr(service.repo, "get_connection", lambda: Connection())

    assert service.repo.delete_by_codigo("HIER-TESTE") is True
    assert len([item for item in operacoes if item == ("HIER-TESTE",)]) == 2
    assert operacoes[-1] == "commit"


def test_migration_cria_dominio_matriz_e_fk_sem_status_rascunho() -> None:
    migration = Path("database/087_dominio_status_hierarquizacao.sql").read_text(encoding="utf-8")

    assert "CREATE TABLE IF NOT EXISTS hierarquizacao_demandas.dom_status_hierarquizacao (" in migration
    assert "CREATE TABLE IF NOT EXISTS hierarquizacao_demandas.dom_status_hierarquizacao_transicao (" in migration
    assert migration.count("REFERENCES hierarquizacao_demandas.dom_status_hierarquizacao (codigo)") == 3
    assert "ALTER COLUMN status SET DEFAULT 'em_julgamento'" in migration
    assert "('rascunho'," not in migration


def test_atualizacao_valida_matriz_de_transicao_da_hierarquizacao(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = _db_row(_dados([1], [{}]))
    row["status"] = "em_julgamento"
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda _codigo: deepcopy(row))
    monkeypatch.setattr(service.repo, "status_hierarquizacao_ativo", lambda codigo: codigo == "calculada")
    monkeypatch.setattr(
        service.repo,
        "get_transicao_status_hierarquizacao",
        lambda origem, destino: {
            "status_origem": origem,
            "status_destino": destino,
            "via_homologar": False,
        },
    )
    monkeypatch.setattr(
        service.repo,
        "update",
        lambda _codigo, data: {**row, **data},
    )

    result = service.atualizar_hierarquizacao(
        "HIER-TESTE", HierarquizacaoUpdateSchema(status="calculada")
    )

    assert result.status == "calculada"


def test_liberacao_consulta_objetos_na_hierarquizacao_e_atualiza_demanda() -> None:
    consultas: list[object] = []

    class Cursor:
        def fetchone(self):
            return None

    class Connection:
        def execute(self, query, params):
            consultas.append(query)
            consultas.append(params)
            return Cursor()

    service.repo._liberar_demandas_universo(
        Connection(),
        {
            "tabela": ("demandas", "projeto"),
            "ids": ["11111111-1111-1111-1111-111111111111"],
            "de": "hierarq_em_andamento",
            "para": "analise_aprovada",
        },
    )

    assert "hierarquizacao_portfolio" in repr(consultas[0])
    assert "objetos" in repr(consultas[0])
    assert "projeto" in repr(consultas[2])
    assert consultas[3][0] == "analise_aprovada"


@pytest.mark.parametrize(
    ("cabecalho", "esperado"),
    [
        ({}, {1, 2, 3}),  # rodada anterior ao recorte por fase
        ({"fases_a_executar": None}, {1, 2, 3}),
        ({"fases_a_executar": []}, set()),  # "nenhuma fase" é declaração válida
        ({"fases_a_executar": [2, 3]}, {2, 3}),
        ({"fases_a_executar": [1, 2, 3]}, {1, 2, 3}),
        ({"fases_a_executar": ["1", "x", 3]}, {1, 3}),
    ],
)
def test_fases_configuradas_preserva_lista_vazia(cabecalho: dict, esperado: set) -> None:
    """Lista vazia não pode ser convertida em "todas as fases" pelo default."""
    assert service._fases_configuradas({"cabecalho_grupo": cabecalho}) == esperado


def test_exigir_fase_recusa_rodada_sem_a_fase() -> None:
    dados = {"cabecalho_grupo": {"fases_a_executar": [2, 3]}}
    with pytest.raises(service.DemandaValidationError) as excinfo:
        service._exigir_fase(dados, 1)
    assert "Fase 1" in str(excinfo.value)

    service._exigir_fase(dados, 2)  # não levanta


def test_exigir_conjunto_usa_finalidade_quando_preenchida() -> None:
    service._exigir_conjunto(
        {"id": "x", "finalidade": "restricao"}, "restri", "restrição", "campo"
    )
    with pytest.raises(service.DemandaValidationError):
        service._exigir_conjunto(
            {"id": "x", "finalidade": "risco"}, "restri", "restrição", "campo"
        )


def test_exigir_conjunto_cai_no_campo_conjunto_das_feicoes(monkeypatch) -> None:
    """25 das 29 camadas homologadas têm `finalidade` vazia."""
    monkeypatch.setattr(service.repo, "conjuntos_camada", lambda _id: ["RESTRIÇÃO"])
    service._exigir_conjunto({"id": "x", "finalidade": ""}, "restri", "restrição", "campo")

    with pytest.raises(service.DemandaValidationError) as excinfo:
        service._exigir_conjunto({"id": "x", "finalidade": ""}, "risco", "risco", "campo")
    assert "RESTRIÇÃO" in str(excinfo.value)


def test_exigir_conjunto_nao_aceita_camada_pelo_nome_em_metadados(monkeypatch) -> None:
    """A checagem antiga varria `metadados`: bastava "risco" no título da camada."""
    monkeypatch.setattr(service.repo, "conjuntos_camada", lambda _id: [])
    camada = {"id": "x", "finalidade": "", "metadados": {"nome": "Camada de risco 2026"}}
    with pytest.raises(service.DemandaValidationError) as excinfo:
        service._exigir_conjunto(camada, "risco", "risco", "campo")
    assert "não declara" in str(excinfo.value)


def test_classificacao_fase1_registra_regra_nao_avaliavel() -> None:
    """Feição consolidada perde os atributos de origem.

    A regra específica não pode ser avaliada e precisa ser contabilizada, em vez
    de a feição cair calada nela: a doutrina do arcabouço veda inferir restrição
    pela ausência de informação na camada.
    """
    import geopandas as gpd
    from shapely.geometry import Point

    from api.services import fase1_classificacao

    regras = [
        (10, "grau in ['muito_alto','alto']", "risco", 3, "IPT"),
        (999, "True", "risco", 2, "IPT"),
    ]
    sem_atributo = gpd.GeoDataFrame({"c_movimento_massa": [1], "geometry": [Point(0, 0)]})
    original = fase1_classificacao.carregar_regras
    fase1_classificacao.carregar_regras = lambda _c: (regras, "teste")
    try:
        resultado, origem = fase1_classificacao.classificar(sem_atributo, "movimento_massa")
    finally:
        fase1_classificacao.carregar_regras = original

    assert origem == "teste"
    assert resultado.attrs["regras_nao_avaliadas"] == ["grau in ['muito_alto','alto']"]
    assert list(resultado["tipo_tratamento"]) == ["risco"]


def test_classificacao_fase1_usa_a_tabela_como_fonte() -> None:
    """Fonte única: a tabela; o JSON é contingência.

    As duas precisam concordar com a página — `tests/test_arcabouco_fase1.py`
    cobre essa consonância. Aqui só se garante a ordem de precedência.
    """
    from api.services import fase1_classificacao

    chamado: list[str] = []

    def _do_banco(criterio_id: str):
        chamado.append(criterio_id)
        return [(999, "True", "restricao", 4, "CF/88 art. 231")]

    original = fase1_classificacao._regras_do_banco
    fase1_classificacao._regras_do_banco = _do_banco
    try:
        regras, origem = fase1_classificacao.carregar_regras("terra_indigena")
    finally:
        fase1_classificacao._regras_do_banco = original

    assert chamado == ["terra_indigena"]
    assert origem == "geoprocessamento.regra_classificacao_fase1"
    assert regras[0][2] == "restricao"


def test_classificacao_fase1_cai_no_json_sem_banco() -> None:
    from api.services import fase1_classificacao

    original = fase1_classificacao._regras_do_banco
    fase1_classificacao._regras_do_banco = lambda _c: []
    try:
        _regras, origem = fase1_classificacao.carregar_regras("terra_indigena")
    finally:
        fase1_classificacao._regras_do_banco = original

    assert origem.startswith("classificacao_fase1.json@")


@pytest.mark.parametrize("matrix", [None, [], {}, {"linhas":[{"criterio":"Único"}]}])
def test_cadastro_exige_matriz_com_dois_criterios(matrix):
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        HierarquizacaoCreateSchema(nome="Nova",grupo_demanda_id="9ccbb5b5-3d60-4f25-8f3f-bdef08a48e73",matriz_premissas_criterios=matrix)

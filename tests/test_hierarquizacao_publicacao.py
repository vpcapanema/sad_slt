from contextlib import nullcontext
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from api.db import connection
from api.exceptions import DemandaValidationError
from api.server import app
from api.services import hierarquizacao_service as service, painel_service
from api.services.publicacao_hierarquizacao import assinatura_resultados, publicacao_vigente
from api.services.session_service import SessionUser, cookie_name, create_token


def rodada(codigo="H1"):
    return {
        "id": codigo, "codigo": codigo, "nome": f"Rodada {codigo}", "status": "homologada",
        "grupo_demanda_id": "g1", "grupo_nome": "Grupo comparável", "grupo_codigo": "G1",
        "criadoEm": "", "atualizadoEm": "",
        "ranking": [{"demanda_id": "D1", "posicao": 7, "score": 0.123456789}],
        "dados_hierarquizacao": {
            "cabecalho_grupo": {"sintese": {"operador": "media_simples"}},
            "objetos": [{
                "cabecalho_objeto": {"demanda_id": "D1", "codigo": "D1"},
                "hierarquizacao": {
                    "fase_1": {"status_fase1": "apto", "resumo_elegibilidade": {
                        "indice_de_risco_ambiental_e_territorial": 0,
                    }},
                    "fase_2": {"indice_favorabilidade_rede": 0.987654321, "indice_favorabilidade_grade": 0},
                    "fase_3": {"score_fase3": 0.876543219},
                    "sintese": {"executada": True, "posicao_final": 7, "score_final": 0.123456789},
                },
            }],
        },
    }


@pytest.fixture
def armazenamento(monkeypatch):
    row = rodada()
    monkeypatch.setattr(connection, "atomic_connection", nullcontext)
    monkeypatch.setattr(service.repo, "get_by_codigo", lambda *a, **k: deepcopy(row))
    monkeypatch.setattr(service, "_response", lambda r: r)
    monkeypatch.setattr(service, "configuracao_fase3_desatualizada", lambda r: False)

    def update(codigo, data, **kwargs):
        assert kwargs == {"permitir_homologada": True}
        row.update(deepcopy(data))
        return deepcopy(row)

    monkeypatch.setattr(service.repo, "update", update)
    return row


@pytest.mark.parametrize("status", ["calculada", "em_julgamento", "arquivada"])
def test_publicacao_exige_homologacao(armazenamento, status):
    armazenamento["status"] = status
    with pytest.raises(DemandaValidationError, match="homologada"):
        service.publicar_hierarquizacao("H1", publicado_por="gestor")
    assert "publicacao" not in armazenamento["dados_hierarquizacao"]["cabecalho_grupo"]


def test_api_rejeita_publicacao_antes_de_homologar(armazenamento):
    armazenamento["status"] = "calculada"
    cliente = TestClient(app)
    cliente.cookies.set(cookie_name(), create_token(SessionUser("autor", "", "fixture_gestor", "Fixture", "GESTOR")))
    response = cliente.post("/api/ahp/hierarquizacoes/H1/publicar")
    assert response.status_code == 422
    assert "homologada" in response.json()["detail"]


def test_publicacao_persistente_auditavel_idempotente_preserva_resultados(armazenamento):
    original = deepcopy(armazenamento)
    primeira = service.publicar_hierarquizacao("H1", publicado_por="gestor")
    assert publicacao_vigente(armazenamento)
    cab = primeira["dados_hierarquizacao"]["cabecalho_grupo"]
    assert cab["publicacao"]["publicado_por"] == "gestor"
    assert cab["publicacao"]["publicado_em"]
    assert cab["historico_homologacao"][0]["acao"] == "publicada"
    assert cab["historico_homologacao"][0]["usuario_id"] == "gestor"
    assert primeira["ranking"] == original["ranking"]
    assert primeira["dados_hierarquizacao"]["objetos"] == original["dados_hierarquizacao"]["objetos"]
    segunda = service.publicar_hierarquizacao("H1", publicado_por="outro")
    assert segunda == primeira


@pytest.mark.parametrize("motivo", ["fase", "sintese", "composicao", "criterios", "sem_ranking", "consolidado"])
def test_publicacao_rejeita_resultados_vencidos(armazenamento, monkeypatch, motivo):
    dados = armazenamento["dados_hierarquizacao"]
    if motivo == "fase":
        dados["objetos"][0]["hierarquizacao"]["fase_2"]["desatualizado"] = True
    elif motivo == "sintese":
        dados["cabecalho_grupo"]["relatorios"] = {"sintese": {"desatualizado": True}}
    elif motivo == "composicao":
        dados["cabecalho_grupo"]["composicao_divergente"] = {"adicionadas": ["D2"]}
    elif motivo == "criterios":
        monkeypatch.setattr(service, "configuracao_fase3_desatualizada", lambda r: True)
    elif motivo == "consolidado":
        armazenamento["relatorio_consolidado"] = {"desatualizado": True}
    else:
        armazenamento["ranking"] = []
    with pytest.raises(DemandaValidationError):
        service.publicar_hierarquizacao("H1", publicado_por="gestor")


def painel_rodada(row):
    dados = row["dados_hierarquizacao"]
    return {**deepcopy(row), "objeto": deepcopy(dados["objetos"][0]),
            "sintese": dados["cabecalho_grupo"]["sintese"]}


def test_publico_expoe_somente_rodadas_publicadas_mantem_interno_e_cadastro(armazenamento, monkeypatch):
    privada = rodada("H2")
    demanda = {"codigo": "D1", "tipo": "projeto", "status": "hierarq_finalizada",
               "nome": "Demanda", "criado_em": "", "representante_nome": "Privado",
               "representante_email": "pessoal@example.test"}

    def linhas():
        return [{**demanda, "hierarquizacoes": [painel_rodada(armazenamento), painel_rodada(privada)]}]

    monkeypatch.setattr(painel_service.painel_repository, "list_all", linhas)
    [antes] = painel_service.listar_demandas_painel(public_only=True)
    assert antes.id == "D1" and antes.hierarquizacoes == [] and antes.representante is None
    assert TestClient(app).get("/api/painel/demandas").json()[0]["hierarquizacoes"] == []
    service.publicar_hierarquizacao("H1", publicado_por="gestor")
    [publico] = painel_service.listar_demandas_painel(public_only=True)
    [h] = publico.hierarquizacoes
    assert h.codigo == "H1" and h.grupo_nome == "Grupo comparável" and h.posicao == 7
    assert h.indice_risco == 0 and h.indice_territorial == 0
    assert h.indice_rede == 0.987654321 and h.indice_prioridade == 0.876543219 and h.indice_final == 0.123456789
    assert "publicado_por" not in publico.model_dump_json() and "pessoal@example" not in publico.model_dump_json()
    [interno] = painel_service.listar_demandas_painel()
    assert len(interno.hierarquizacoes) == 2 and interno.representante.nome == "Privado"
    assert not publicacao_vigente(privada)
    assert len(TestClient(app).get("/api/painel/demandas").json()[0]["hierarquizacoes"]) == 1
    privada["dados_hierarquizacao"]["cabecalho_grupo"]["publicacao"] = {
        "ativa": True, "assinatura_resultados": assinatura_resultados(privada),
    }
    privada["grupo_nome"] = "Outro grupo"
    [publico] = painel_service.listar_demandas_painel(public_only=True)
    assert [(h.codigo, h.grupo_nome, h.posicao) for h in publico.hierarquizacoes] == [
        ("H1", "Grupo comparável", 7), ("H2", "Outro grupo", 7),
    ]


@pytest.mark.parametrize("alteracao", ["resultado", "status", "configuracao", "desatualizado", "grupo", "consolidado"])
def test_publico_omite_resultados_alterados_ou_desatualizados(armazenamento, monkeypatch, alteracao):
    service.publicar_hierarquizacao("H1", publicado_por="gestor")
    if alteracao == "resultado":
        armazenamento["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["sintese"]["score_final"] = 0.9
    elif alteracao == "status":
        armazenamento["status"] = "calculada"
    elif alteracao == "desatualizado":
        armazenamento["dados_hierarquizacao"]["objetos"][0]["hierarquizacao"]["fase_3"]["desatualizado"] = True
    elif alteracao == "grupo":
        armazenamento["grupo_objetos"] = [{"id": "D1"}, {"id": "D2"}]
    elif alteracao == "consolidado":
        armazenamento["relatorio_consolidado"] = {"desatualizado": True}
    else:
        monkeypatch.setattr(service, "configuracao_fase3_desatualizada", lambda r: True)
    monkeypatch.setattr(painel_service.painel_repository, "list_all", lambda: [{
        "codigo": "D1", "tipo": "projeto", "status": "hierarq_finalizada", "nome": "D", "criado_em": "",
        "hierarquizacoes": [painel_rodada(armazenamento)],
    }])
    [item] = painel_service.listar_demandas_painel(public_only=True)
    assert item.hierarquizacoes == []


def test_assinatura_nao_depende_de_nome_cadastral_e_nao_inventa_posicao():
    row = rodada()
    assinatura = assinatura_resultados(row)
    row["ranking"][0]["nome"] = "Nome cadastral atualizado"
    assert assinatura_resultados(row) == assinatura
    h = painel_rodada(row)
    h["objeto"]["hierarquizacao"]["sintese"]["posicao_final"] = None
    assert painel_service._resultado_individual(h).posicao is None


@pytest.mark.parametrize("perfil,esperado", [(None, 401), ("OPERADOR", 403), ("ANALISTA", 403), ("VISUALIZADOR", 403), ("GESTOR", 200), ("ADMIN", 200)])
def test_api_publicacao_perfis(monkeypatch, perfil, esperado):
    chamadas = []

    def publicar(codigo, *, publicado_por):
        chamadas.append((codigo, publicado_por))
        return rodada(codigo)

    monkeypatch.setattr(service, "publicar_hierarquizacao", publicar)
    cliente = TestClient(app)
    if perfil:
        cliente.cookies.set(cookie_name(), create_token(SessionUser("autor", "", f"fixture_{perfil}", "Fixture", perfil)))
    response = cliente.post("/api/ahp/hierarquizacoes/H1/publicar")
    assert response.status_code == esperado, response.text
    assert bool(chamadas) == (esperado == 200)

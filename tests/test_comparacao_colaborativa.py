"""Testes — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.schemas.comparacao_colaborativa import AmbienteColaborativoUpdateSchema
from api.server import app
from api.services import comparacao_colaborativa_service as service
from api.services.session_service import SessionUser, cookie_name, create_token

AMBIENTE_ID = "22222222-2222-2222-2222-222222222222"
HIERARQUIZACAO_ID = "44444444-4444-4444-4444-444444444444"
CONFIG_ID = "55555555-5555-5555-5555-555555555555"
KEY = "A" * 43


@pytest.fixture(autouse=True)
def convites_sinteticos(monkeypatch):
    monkeypatch.setattr(service.convites_repo, "validar", lambda _, email, key: key == KEY)
    monkeypatch.setattr(service.convites_repo, "revogar", lambda *a: None)


def test_token_individual_tem_256_bits():
    tokens = {service.gerar_token_acesso() for _ in range(10)}
    assert len(tokens) == 10 and all(len(token) == 43 for token in tokens)


def test_token_legado_e_atomico_e_preserva_versao(monkeypatch):
    contexto = MagicMock()
    conn = contexto.__enter__.return_value
    conn.execute.return_value.fetchone.return_value = {"token_acesso": "012345"}
    monkeypatch.setattr(repo, "get_connection", lambda: contexto)
    versao = datetime.now(timezone.utc)
    with pytest.raises(DemandaValidationError, match="desativados"):
        repo.garantir_token_acesso(AMBIENTE_ID, versao, "999999")
    conn.execute.assert_not_called()


def test_token_legado_nao_grava_em_versao_obsoleta(monkeypatch):
    contexto = MagicMock()
    contexto.__enter__.return_value.execute.return_value.fetchone.return_value = None
    monkeypatch.setattr(repo, "get_connection", lambda: contexto)
    with pytest.raises(DemandaValidationError, match="desativados"):
        repo.garantir_token_acesso(AMBIENTE_ID, datetime.now(timezone.utc), "012345")


@pytest.mark.parametrize("operacao", ["acesso", "respostas/iniciar", "respostas/progresso", "respostas"])
@pytest.mark.parametrize("caso", [
    "ausente", "incorreto", "curto", "longo", "letras", "unicode",
    "email", "removido", "sem_codigo", "encerrado", "expirado",
])
def test_rotas_publicas_exigem_email_e_token_antes_de_ler_ou_gravar(monkeypatch, operacao, caso):
    row = _ambiente_row()
    payload = {
        "token_acesso": KEY, "email": "a@x.gov.br",
        "identificacao": {"nome_completo": "Outro nome permitido", "email": "a@x.gov.br", "instituicao": "Instituição"},
        "matriz_comparacao": [[1, 2], [0.5, 1]],
    }
    if caso == "ausente":
        del payload["token_acesso"]
    elif caso in {"incorreto", "curto", "longo", "letras", "unicode"}:
        payload["token_acesso"] = {
            "incorreto": "999999", "curto": "12345", "longo": "1234567",
            "letras": "abcdef", "unicode": "０１２３４５",
        }[caso]
    elif caso == "email":
        payload["email"] = payload["identificacao"]["email"] = "fora@x.gov.br"
    elif caso == "removido":
        row["convites"] = []
    elif caso == "sem_codigo":
        monkeypatch.setattr(service.convites_repo, "validar", lambda *a: False)
    elif caso == "encerrado":
        row["status"] = "encerrada"
    elif caso == "expirado":
        row["valido_ate"] = datetime(2000, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: row)
    acesso_respostas = MagicMock(side_effect=AssertionError("Não pode acessar respostas sem autorização"))
    monkeypatch.setattr(repo, "get_resposta_by_ambiente_email", acesso_respostas)
    client = TestClient(app)
    response = client.request(
        "PATCH" if operacao == "respostas/progresso" else "POST",
        f"/api/ahp/comparacao-colaborativa/publico/tok-abc/{operacao}", json=payload,
    )
    assert response.status_code == 422, response.text
    acesso_respostas.assert_not_called()


def test_validacao_normaliza_email_e_nao_retorna_codigo(monkeypatch):
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: _ambiente_row())
    monkeypatch.setattr(service.hierarq_repo, "get_by_id", lambda _: {"nome": "Teste"})
    response = TestClient(app).post("/api/ahp/comparacao-colaborativa/publico/tok-abc/acesso",
                                   json={"email": " A@X.GOV.BR ", "token_acesso": KEY})
    assert response.status_code == 200, response.text
    assert response.json()["email_autorizado"] is True
    assert response.json()["criterios"] == ["Custo", "Prazo"]
    assert "token_acesso" not in response.json()
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("operacao", ["acesso", "respostas/iniciar", "respostas/progresso", "respostas"])
def test_publico_bloqueia_julgamento_legado_misto_sem_reinterpretar_respostas(monkeypatch, operacao):
    row = _ambiente_row()
    row["criterios"].append({"criterio": "Espacial", "Etapa": "Fase 2"})
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: row)
    access = MagicMock(side_effect=AssertionError("Não ler respostas do julgamento incompatível"))
    monkeypatch.setattr(repo, "get_resposta_by_ambiente_email", access)
    payload = {
        "email": "a@x.gov.br", "token_acesso": KEY,
        "identificacao": {"nome_completo": "Ana", "email": "a@x.gov.br", "instituicao": "Instituição"},
        "matriz_comparacao": [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    }
    response = TestClient(app).request(
        "PATCH" if operacao == "respostas/progresso" else "POST",
        f"/api/ahp/comparacao-colaborativa/publico/tok-abc/{operacao}", json=payload,
    )
    assert response.status_code == 422, response.text
    assert "somente critérios da Fase 3" in response.json()["detail"]
    access.assert_not_called()
    assert len(row["criterios"]) == 3


@pytest.mark.parametrize("tipo_id,demandas", [
    (1, "os planos"), (2, "os programas"), (3, "os projetos"),
    (None, "as demandas"),
])
@pytest.mark.parametrize("objetivo", [None, "", "   ", "Objetivo específico cadastrado"])
def test_contexto_publico_descreve_objetivo_por_tipo(monkeypatch, tipo_id, demandas, objetivo):
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: _ambiente_row())
    monkeypatch.setattr(service.hierarq_repo, "get_by_id", lambda _: {
        "nome": "HIERARQUIZAÇÃO TESTE 01", "tipo_demanda_id": tipo_id, "objetivo": objetivo,
    })
    response = TestClient(app).get("/api/ahp/comparacao-colaborativa/publico/tok-abc")
    assert response.status_code == 200
    contexto = response.json()
    assert contexto["escopo"] == "HIERARQUIZAÇÃO TESTE 01"
    assert contexto["objetivo"] == (objetivo if objetivo and objetivo.strip() else (
        f"Hierarquizar {demandas} quanto à favorabilidade à sua implantação "
        "ou execução, com base nos critérios definidos para esta análise, "
        "para subsidiar a definição de prioridades."
    ))
    assert contexto["criterios"] == []
    assert contexto["email_autorizado"] is False
    assert "token_acesso" not in contexto


def test_contextualizacao_exibe_premissas_e_pares_apenas_do_convite_validado(monkeypatch):
    row = _ambiente_row(
        matriz_id=HIERARQUIZACAO_ID,
        matriz_nome="Matriz PLI-SP 2050",
        convites=[{"email": "a@x.gov.br", "dimensoes": ["Capacidade de entrega"]}],
        criterios=[
            {"Critério": "D1 · Eficiência logística", "Dimensão": "Mérito e resultados", "Etapa": "Fase 3", "Premissa": "Alívio de gargalos."},
            {"Critério": "D6 · Viabilidade", "Dimensão": "Capacidade de entrega", "Etapa": "Fase 3", "Premissa": "Menor esforço fiscal aumenta a prioridade."},
            {"Critério": "D7 · Riscos", "Dimensão": "Capacidade de entrega", "Etapa": "Fase 3", "Premissa": "Riscos de entrega maiores reduzem a prioridade."},
        ],
    )
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: row)
    client = TestClient(app)
    caminho = "/api/ahp/comparacao-colaborativa/publico/tok-abc"
    publico = client.get(caminho).json()
    contexto = publico["contextualizacao"]
    assert contexto["introducao"].startswith("O PLI-SP 2050 reúne demandas")
    assert contexto["exemplos"] == [] and contexto["orientacao"] == ""
    assert publico["criterios"] == []
    acesso = client.post(caminho + "/acesso", json={"email": "a@x.gov.br", "token_acesso": KEY})
    assert acesso.status_code == 200, acesso.text
    personalizado = acesso.json()["contextualizacao"]
    assert personalizado["introducao"] == contexto["introducao"]
    assert "2 critérios em 1 par." in personalizado["orientacao"]
    assert personalizado["exemplos"] == [
        "D6 · Viabilidade — Menor esforço fiscal aumenta a prioridade.",
        "D7 · Riscos — Riscos de entrega maiores reduzem a prioridade.",
    ]


def _client_autenticado(perfil: str = "GESTOR") -> TestClient:
    client = TestClient(app)
    user = SessionUser(
        id="11111111-1111-1111-1111-111111111111",
        email="colab@local",
        username=f"colab_{perfil}",
        nome="Colaborativo",
        tipo_usuario=perfil,
    )
    client.cookies.set(cookie_name(), create_token(user))
    return client


def test_excluir_inscricao_publica_exige_permissao_e_delimita_o_julgamento(monkeypatch):
    chamadas = []

    def excluir(ambiente_id, inscricao_id):
        chamadas.append((ambiente_id, inscricao_id))
        return ambiente_id == AMBIENTE_ID

    monkeypatch.setattr(repo, "delete_inscricao_publica", excluir)
    rota = "/api/ahp/comparacao-colaborativa/ambientes/{}/inscricoes/" + HIERARQUIZACAO_ID
    assert TestClient(app).delete(rota.format(AMBIENTE_ID)).status_code == 401
    assert _client_autenticado("VISUALIZADOR").delete(rota.format(AMBIENTE_ID)).status_code == 403
    assert chamadas == []
    gestor = _client_autenticado()
    assert gestor.delete(rota.format(AMBIENTE_ID)).status_code == 204
    assert gestor.delete(rota.format(HIERARQUIZACAO_ID)).status_code == 404
    assert chamadas == [(AMBIENTE_ID, HIERARQUIZACAO_ID), (HIERARQUIZACAO_ID, HIERARQUIZACAO_ID)]


def _ambiente_row(**extra) -> dict:
    row = {
        "id": AMBIENTE_ID,
        "hierarquizacao_id": HIERARQUIZACAO_ID,
        "hierarquizacao_codigo": "HIER-001",
        "token": "tok-abc",
        "token_acesso": "012345",
        "convites": [{"email": "a@x.gov.br"}],
        "valido_ate": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "status": "ativa",
        "criado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "atualizado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "total_respostas": 0,
        "matriz_consolidada": None,
        "criterios": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}],
        "n_criterios": 2,
    }
    row.update(extra)
    return row


def test_resposta_administrativa_nao_expoe_chave_individual():
    resposta = service._ambiente_to_response(_ambiente_row(), gestao=True)
    assert resposta.token_acesso is None
    assert resposta.token == "tok-abc"
    assert "/tok-abc/" in resposta.url_publica
    assert "012345" not in resposta.url_publica


@pytest.mark.parametrize(("legado", "status", "exibe_analise"), [
    (False, "calculada", True),
    (True, "calculada", False),
    (True, "homologada", True),
])
def test_listagem_exibe_analise_salva_sem_converter_resultado_em_homologacao(legado, status, exibe_analise):
    criterios = [{"Critério": "Custo"}, {"Critério": "Prazo"}]
    analise = {
        "id": AMBIENTE_ID,
        "codigo": "ANL-TESTE",
        "nome": "Análise salva",
        "status": status,
        "metodo_agregacao": "aij_media_aritmetica",
        "criterios": criterios,
        "recorte_parcial": True,
        "matriz_consolidada": [[1.0, 2.0], [0.5, 1.0]],
        "pesos_consolidados": [2 / 3, 1 / 3],
        "lambda_max": 2.0,
        "indice_consistencia": 0.0,
        "indice_aleatorio": 0.0,
        "razao_consistencia": 0.0,
    }
    dados_legados = {"matriz_consolidada": [[1.0, 1.0], [1.0, 1.0]], "pesos_consolidados": [0.5, 0.5]} if legado else {}
    row = _ambiente_row(analise_exibida=analise, **dados_legados)
    resposta = service._ambiente_to_response(row, gestao=True)
    assert (resposta.consolidacao is not None) == legado
    assert (resposta.analise_exibida is not None) == exibe_analise
    if exibe_analise:
        assert resposta.analise_exibida.criterios == criterios
        assert resposta.analise_exibida.razao_consistencia == 0.0
        assert resposta.analise_exibida.metodo_agregacao == "aij_media_aritmetica"


def test_resposta_de_consulta_nao_expoe_configuracao_do_convite():
    row = _ambiente_row(
        email_remetente_alias="Alias privado",
        email_assunto="Assunto privado",
        email_mensagem="Mensagem privada com /public/analise-multicriterio/tok-abc/",
    )
    resposta = service._ambiente_to_response(row, gestao=False)
    assert resposta.email_mensagem == ""
    assert resposta.email_config_persistida is False
    assert resposta.token == "" and resposta.convites == [] and resposta.url_publica == ""
    assert resposta.lista_colaboradores == []


def test_alias_assunto_e_mensagem_do_convite_persistem_no_julgamento(monkeypatch):
    atual = _ambiente_row(status="ativa")
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: dict(atual))
    monkeypatch.setattr(repo, "list_respostas", lambda _: [])
    capturado = {}
    monkeypatch.setattr(repo, "update_ambiente", lambda _, data: capturado.update(data) or {**atual, **data})
    resposta = service.atualizar_ambiente(
        AMBIENTE_ID,
        AmbienteColaborativoUpdateSchema(
            email_remetente_alias="SICARD-PLI Editado",
            email_assunto="Assunto editado",
            email_mensagem="Mensagem editada\n/public/analise-multicriterio/formulario-comparacao-pareada/tok-abc/",
        ),
    )
    assert capturado == {
        "email_remetente_alias": "SICARD-PLI Editado",
        "email_assunto": "Assunto editado",
        "email_mensagem": "Mensagem editada\n/public/analise-multicriterio/formulario-comparacao-pareada/tok-abc/",
    }
    assert resposta.email_remetente_alias == "SICARD-PLI Editado"
    assert resposta.email_assunto == "Assunto editado"
    assert resposta.email_mensagem.startswith("Mensagem editada")
    assert resposta.email_config_persistida is True


def test_link_do_formulario_e_normalizado_pelo_backend_e_nao_pode_ser_alterado(monkeypatch):
    atual = _ambiente_row(status="ativa")
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: dict(atual))
    monkeypatch.setattr(repo, "list_respostas", lambda _: [])
    capturado = {}
    monkeypatch.setattr(repo, "update_ambiente", lambda _, data: capturado.update(data) or {**atual, **data})

    service.atualizar_ambiente(
        AMBIENTE_ID,
        AmbienteColaborativoUpdateSchema(
            email_mensagem=(
                "Texto editável\n"
                "https://endereco-incorreto.example/public/analise-multicriterio/"
                "formulario-comparacao-pareada/tok-abc/\nAssinatura editável"
            )
        ),
        base_url="https://sicard.example/sicard",
    )

    assert capturado["email_mensagem"] == (
        "Texto editável\n"
        "https://sicard.example/sicard/public/analise-multicriterio/"
        "formulario-comparacao-pareada/tok-abc/\nAssinatura editável"
    )


@pytest.mark.parametrize("status", ["encerrada", "consolidada"])
def test_reabre_julgamento_com_prazo_futuro_preservando_respostas(monkeypatch, status):
    atual = _ambiente_row(status=status, total_respostas=1)
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: dict(atual))
    monkeypatch.setattr(repo, "list_ambientes", lambda: [atual])
    monkeypatch.setattr(repo, "list_respostas", lambda _: [{"status": "enviada"}])
    captured = {}
    def update(_, data):
        captured.update(data)
        return {**atual, **data}
    monkeypatch.setattr(repo, "update_ambiente", update)
    result = service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(
        reabrir=True, valido_ate="2035-12-31T23:59:59+00:00"))
    assert result.status == "ativa"
    assert result.total_respostas == 1
    assert set(captured) == {"status", "valido_ate"}
    with pytest.raises(DemandaValidationError):
        service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(reabrir=True))
    with pytest.raises(DemandaValidationError):
        service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(
            reabrir=True, valido_ate="2020-01-01T00:00:00+00:00"))


def test_prazo_vencido_inalterado_nao_bloqueia_edicao_mas_novo_prazo_passado_explica(monkeypatch):
    vencido = datetime(2020, 5, 10, 2, 59, 59, tzinfo=timezone.utc)
    atual = _ambiente_row(status="ativa", valido_ate=vencido)
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: dict(atual))
    monkeypatch.setattr(repo, "list_respostas", lambda _: [])
    captured = {}
    monkeypatch.setattr(repo, "update_ambiente", lambda _, data: captured.update(data) or {**atual, **data})
    service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(
        nome="Renomeado", valido_ate=vencido.isoformat()))
    assert captured == {"nome": "Renomeado"}
    with pytest.raises(DemandaValidationError) as erro:
        service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(
            valido_ate="2021-03-01T02:59:59+00:00"))
    assert "28/02/2021" in str(erro.value)
    assert erro.value.field == "valido_ate" and "Data limite" in erro.value.sugestao


def test_atualiza_todos_os_campos_da_configuracao_do_preenchimento(monkeypatch) -> None:
    atual = _ambiente_row(config_tipo="portfolio", config_id=HIERARQUIZACAO_ID, total_respostas=0)
    captured: dict = {}
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _id: dict(atual))
    monkeypatch.setattr(repo, "get_active_ambiente_by_config", lambda *_args: None)
    monkeypatch.setattr(repo, "list_respostas", lambda _id: [])
    monkeypatch.setattr(
        service.config_repo,
        "get_by_id",
        lambda *_args: {
            "id": CONFIG_ID,
            "codigo": "CFG-EDITADA",
            "nome": "Configuração editada",
            "hierarquizacao_id": HIERARQUIZACAO_ID,
            "criterios": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}],
        },
    )

    def fake_update(_id: str, data: dict) -> dict:
        captured.update(data)
        return {**atual, **data}

    monkeypatch.setattr(repo, "update_ambiente", fake_update)
    service.atualizar_ambiente(
        AMBIENTE_ID,
        AmbienteColaborativoUpdateSchema.model_validate({
            "config_tipo": "avulsa",
            "config_id": CONFIG_ID,
            "convites": [{"email": "novo@x.gov.br"}],
            "valido_ate": "2031-01-31T23:59:59+00:00",
        }),
    )

    assert captured["config_tipo"] == "avulsa"
    assert captured["config_id"] == CONFIG_ID
    assert captured["config_avulsa_id"] == CONFIG_ID
    assert captured["config_portfolio_id"] is None
    assert captured["config_codigo"] == "CFG-EDITADA"
    assert captured["n_criterios"] == 2
    assert captured["convites"] == [{"email": "novo@x.gov.br", "nome": None}]
    assert captured["valido_ate"].year == 2031


def test_atualiza_ambiente_a_partir_da_hierarquizacao_selecionada(monkeypatch) -> None:
    atual = _ambiente_row(total_respostas=0)
    nova_hierarquizacao_id = "66666666-6666-6666-6666-666666666666"
    captured: dict = {}
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _id: dict(atual))
    monkeypatch.setattr(repo, "get_ambiente_by_hierarquizacao", lambda _id: None)
    monkeypatch.setattr(repo, "list_respostas", lambda _id: [])
    monkeypatch.setattr(
        service.hierarq_repo,
        "get_by_id",
        lambda _id: {
            "id": nova_hierarquizacao_id,
            "codigo": "HIER-NOVA",
            "nome": "Nova hierarquização",
            "dados_hierarquizacao": {
                "cabecalho_grupo": {
                    "matriz_premissas_criterios": {
                        "linhas": [
                            {"criterio": "Custo", "premissa": "Menor é melhor", "Etapa": "Fase 3"},
                            {"criterio": "Prazo", "premissa": "Menor é melhor", "Etapa": "Fase 3"},
                        ]
                    }
                }
            },
        },
    )

    def fake_update(_id: str, data: dict) -> dict:
        captured.update(data)
        return {**atual, **data}

    monkeypatch.setattr(repo, "update_ambiente", fake_update)
    resposta = service.atualizar_ambiente(
        AMBIENTE_ID,
        AmbienteColaborativoUpdateSchema.model_validate({"hierarquizacao_id": nova_hierarquizacao_id}),
    )

    assert captured["hierarquizacao_id"] == nova_hierarquizacao_id
    assert captured["hierarquizacao_codigo"] == "HIER-NOVA"
    assert captured["config_id"] is None
    assert captured["criterios"][0]["premissa"] == "Menor é melhor"
    assert resposta.hierarquizacao_nome == "Nova hierarquização"


def _resposta_row(matriz, *, consistente=True, email="a@x.gov.br") -> dict:
    return {
        "id": "33333333-3333-3333-3333-333333333333",
        "ambiente_id": AMBIENTE_ID,
        "nome_completo": "Ana",
        "email": email,
        "instituicao": "SP Águas",
        "matriz_comparacao": matriz,
        "lambda_max": 2.0,
        "indice_consistencia": 0.0,
        "indice_aleatorio": 0.0,
        "razao_consistencia": 0.0,
        "consistente": consistente,
        "estatisticas": {},
        "enviado_em": datetime(2026, 1, 2, tzinfo=timezone.utc),
    }


def _ambiente_dimensoes():
    return _ambiente_row(
        criterios=[{"Critério": "Custo", "Dimensão": "Financeira", "Etapa": "Fase 3"}, {"Critério": "Retorno", "Dimensão": "Financeira", "Etapa": "Fase 3"},
                   {"Critério": "Acesso", "Dimensão": "Social", "Etapa": "Fase 3"}, {"Critério": "Equidade", "Dimensão": "Social", "Etapa": "Fase 3"}],
        n_criterios=4, convites=[{"email": "a@x.gov.br", "dimensoes": ["Social"]},
                                {"email": "b@x.gov.br", "dimensoes": ["Financeira", "Social"]}],
    )


def test_formulario_publico_limita_criterios_por_email(monkeypatch):
    row = _ambiente_dimensoes()
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: row)
    monkeypatch.setattr(service.hierarq_repo, "get_by_id", lambda _: {"nome": "Teste"})
    assert service.obter_ambiente_publico("tok-abc").criterios == []
    assert service.obter_ambiente_publico("tok-abc", "a@x.gov.br", KEY).criterios == ["Acesso", "Equidade"]
    assert len(service.obter_ambiente_publico("tok-abc", "b@x.gov.br", KEY).criterios) == 4


@pytest.mark.parametrize("dimensoes", [[], ["Inexistente"], ["Social", "Social"]])
def test_recusa_dimensoes_invalidas(dimensoes):
    with pytest.raises(DemandaValidationError):
        service._validar_dimensoes([{"dimensoes": dimensoes}], _ambiente_dimensoes()["criterios"])


def test_snapshot_recorte_nao_aceita_estatisticas_forjadas():
    row = _ambiente_dimensoes()
    stats = service._estatisticas_recorte(row, "a@x.gov.br", {"criterios_atribuidos": row["criterios"], "duracao_ms": 10})
    assert service._criterio_nomes(stats["criterios_atribuidos"]) == ["Acesso", "Equidade"]
    assert stats["dimensoes_atribuidas"] == ["Social"]
    assert stats["duracao_ms"] == 10


def test_resposta_dimensoes_valida_tamanho_e_grava_snapshot(monkeypatch):
    from api.schemas.comparacao_colaborativa import RespostaColaborativaCreateSchema
    row = _ambiente_dimensoes()
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _: row)
    monkeypatch.setattr(repo, "get_resposta_by_ambiente_email", lambda *_: None)
    inserted = MagicMock(side_effect=lambda data: {**_resposta_row(data["matriz_comparacao"]), **data})
    monkeypatch.setattr(repo, "insert_resposta", inserted)
    payload = RespostaColaborativaCreateSchema(
        token_acesso=KEY, identificacao={"nome_completo": "Ana", "email": "a@x.gov.br", "instituicao": "Teste"},
        matriz_comparacao=[[1, 2], [.5, 1]],
    )
    result = service.registrar_resposta("tok-abc", payload)
    assert service._criterio_nomes(result.estatisticas["criterios_atribuidos"]) == ["Acesso", "Equidade"]
    payload.matriz_comparacao = [[1] * 4 for _ in range(4)]
    with pytest.raises(DemandaValidationError):
        service.registrar_resposta("tok-abc", payload)
    assert inserted.call_count == 1


def test_recortes_diferentes_mesmo_tamanho_nao_sao_agregados():
    row = _ambiente_dimensoes()
    social = {**_resposta_row([[1, 1], [1, 1]]), "estatisticas": {"criterios_atribuidos": row["criterios"][2:]}}
    financeira = {**_resposta_row([[1, 1], [1, 1]], email="b@x.gov.br"), "estatisticas": {"criterios_atribuidos": row["criterios"][:2]}}
    with pytest.raises(DemandaValidationError, match="mesmo recorte"):
        service._recorte_analise(row, [social, financeira])
    assert service._recorte_analise(row, [social]) == row["criterios"][2:]


def test_nao_altera_recorte_apos_inicio(monkeypatch):
    row = _ambiente_dimensoes()
    resposta = {**_resposta_row([[1, 1], [1, 1]]), "status": "em_preenchimento",
                "estatisticas": service._estatisticas_recorte(row, "a@x.gov.br", None)}
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(repo, "list_respostas", lambda _: [resposta])
    update = MagicMock()
    monkeypatch.setattr(repo, "update_ambiente", update)
    with pytest.raises(DemandaValidationError, match="recorte"):
        service.atualizar_ambiente(AMBIENTE_ID, AmbienteColaborativoUpdateSchema(
            convites=[{"email": "a@x.gov.br", "dimensoes": ["Financeira"]}],
        ))
    update.assert_not_called()


def test_confirmacao_salva_lista_com_grupos_e_exige_versao_atual(monkeypatch):
    atual = _ambiente_dimensoes()
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: atual)
    monkeypatch.setattr(repo, "list_respostas", lambda _: [])
    atualizar = MagicMock(side_effect=lambda _, dados, **kwargs: {
        **atual, **dados, "lista_colaboradores": dados["convites"],
    })
    monkeypatch.setattr(repo, "update_ambiente", atualizar)
    payload = AmbienteColaborativoUpdateSchema(
        versao_lista_colaboradores=atual["atualizado_em"],
        convites=[{"nome": "Ana", "email": "a@x.gov.br", "dimensoes": None, "instituicao": " Instituto Alfa "},
                  {"nome": "Bia", "email": "b@x.gov.br", "dimensoes": ["Financeira"]}],
    )
    resultado = service.atualizar_ambiente(AMBIENTE_ID, payload)
    lista = [{"email": "a@x.gov.br", "nome": "Ana", "instituicao": "Instituto Alfa"},
             {"email": "b@x.gov.br", "nome": "Bia", "dimensoes": ["Financeira"]}]
    atualizar.assert_called_once_with(AMBIENTE_ID, {"convites": lista}, atualizado_em_esperado=atual["atualizado_em"])
    assert resultado.lista_colaboradores == lista

    atualizar.side_effect = None
    atualizar.return_value = None
    with pytest.raises(DemandaValidationError, match="alterado depois"):
        service.atualizar_ambiente(AMBIENTE_ID, payload)


def test_nao_homologa_pesos_locais_como_globais(monkeypatch):
    row = _ambiente_dimensoes()
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(service.analise_repo, "get_by_id", lambda _: {
        "ambiente_id": AMBIENTE_ID, "consistente": True,
        "estatisticas_analise": {"criterios_atribuidos": row["criterios"][2:]},
    })
    gravar = MagicMock()
    monkeypatch.setattr(repo, "atualizar_consolidacao", gravar)
    with pytest.raises(DemandaValidationError, match="recorte"):
        service.homologar_analise("analise-local")
    gravar.assert_not_called()


def test_espaco_analitico_separa_recortes_mesmo_tamanho(monkeypatch):
    row = _ambiente_dimensoes()
    respostas = [
        {**_resposta_row([[1, 1], [1, 1]]), "estatisticas": {"criterios_atribuidos": row["criterios"][2:]}},
        {**_resposta_row([[1, 2], [.5, 1]], email="b@x.gov.br"), "id": "outra",
         "estatisticas": {"criterios_atribuidos": row["criterios"][:2]}},
    ]
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _: row)
    monkeypatch.setattr(repo, "list_respostas", lambda _: respostas)
    monkeypatch.setattr(service, "listar_analises", lambda _: [])
    result = service.obter_espaco_analitico(AMBIENTE_ID)
    assert len(result["recortes"]) == 2
    assert result["estatisticas"]["por_par"] == []
    assert result["recortes"][0]["estatisticas"]["por_par"][0]["criterio_a"] == "Acesso"
    assert result["recortes"][1]["estatisticas"]["por_par"][0]["criterio_a"] == "Custo"


# ------------------------------------------------------------------
# média geométrica (AIJ)
# ------------------------------------------------------------------

def test_media_geometrica_de_uma_matriz_e_identidade() -> None:
    m = [[1.0, 3.0], [1 / 3, 1.0]]

    resultado = service.media_geometrica_matrizes([m])

    for i in range(2):
        for j in range(2):
            assert resultado[i][j] == pytest.approx(m[i][j])


def test_media_geometrica_preserva_reciprocidade() -> None:
    m1 = [[1.0, 3.0], [1 / 3, 1.0]]
    m2 = [[1.0, 1 / 5], [5.0, 1.0]]

    resultado = service.media_geometrica_matrizes([m1, m2])

    assert resultado[0][1] == pytest.approx((3.0 * (1 / 5)) ** 0.5)
    assert resultado[0][1] * resultado[1][0] == pytest.approx(1.0)
    assert resultado[0][0] == pytest.approx(1.0)


def test_media_geometrica_rejeita_dimensoes_diferentes() -> None:
    m1 = [[1.0, 2.0], [0.5, 1.0]]
    m2 = [[1.0]]

    with pytest.raises(DemandaValidationError):
        service.media_geometrica_matrizes([m1, m2])


def test_media_geometrica_rejeita_valores_nao_positivos() -> None:
    m = [[1.0, 0.0], [0.5, 1.0]]

    with pytest.raises(DemandaValidationError):
        service.media_geometrica_matrizes([m])


def test_media_geometrica_sem_matrizes_e_erro() -> None:
    with pytest.raises(DemandaValidationError):
        service.media_geometrica_matrizes([])


def test_resposta_usa_snapshot_de_criterios_e_ambiente_correto(monkeypatch) -> None:
    gravado: dict = {}
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _token: _ambiente_row())
    monkeypatch.setattr(repo, "get_resposta_by_ambiente_email", lambda _ambiente, _email: None)
    monkeypatch.setattr(
        service.hierarq_repo,
        "get_by_id",
        lambda *_args: {"dados_hierarquizacao": {"criterios": [{"criterio": "A"}, {"criterio": "B"}, {"criterio": "C"}]}},
    )

    def fake_insert(data: dict) -> dict:
        gravado.update(data)
        return _resposta_row(data["matriz_comparacao"])

    monkeypatch.setattr(repo, "insert_resposta", fake_insert)
    payload = service.RespostaColaborativaCreateSchema.model_validate({
        "token_acesso": KEY,
        "identificacao": {
            "nome_completo": "Ana",
            "email": "A@X.GOV.BR",
            "instituicao": "SP Águas",
        },
        "matriz_comparacao": [[1.0, 3.0], [1 / 3, 1.0]],
    })

    service.registrar_resposta("tok-abc", payload)

    assert gravado["ambiente_id"] == AMBIENTE_ID
    assert gravado["email"] == "a@x.gov.br"


@pytest.mark.parametrize("matriz", (
    [[2.0, 3.0], [1 / 3, 1.0]],
    [[1.0, 3.0], [0.5, 1.0]],
    [[1.0, 0.0], [1.0, 1.0]],
))
def test_resposta_rejeita_matriz_ahp_invalida(monkeypatch, matriz) -> None:
    monkeypatch.setattr(repo, "get_ambiente_by_token", lambda _token: _ambiente_row())
    monkeypatch.setattr(repo, "get_resposta_by_ambiente_email", lambda _ambiente, _email: None)
    payload = service.RespostaColaborativaCreateSchema.model_validate({
        "token_acesso": KEY,
        "identificacao": {
            "nome_completo": "Ana",
            "email": "a@x.gov.br",
            "instituicao": "SP Águas",
        },
        "matriz_comparacao": matriz,
    })

    with pytest.raises(DemandaValidationError):
        service.registrar_resposta("tok-abc", payload)


# ------------------------------------------------------------------
# consolidação do ambiente
# ------------------------------------------------------------------

def test_consolidar_ambiente_sem_respostas_consistentes_e_erro(monkeypatch) -> None:
    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _id: _ambiente_row())
    monkeypatch.setattr(
        repo,
        "list_respostas",
        lambda _id: [_resposta_row([[1.0, 2.0], [0.5, 1.0]], consistente=False)],
    )

    with pytest.raises(DemandaValidationError):
        service.consolidar_ambiente(AMBIENTE_ID)


def test_consolidar_ambiente_grava_media_geometrica_e_status(monkeypatch) -> None:
    respostas = [
        _resposta_row([[1.0, 3.0], [1 / 3, 1.0]], email="a@x.gov.br"),
        _resposta_row([[1.0, 1 / 3], [3.0, 1.0]], email="b@x.gov.br"),
    ]
    gravado: dict = {}

    def fake_atualizar(ambiente_id: str, data: dict, hierarquizacao_data: dict | None = None) -> dict:
        gravado.update(data)
        gravado["hierarquizacao_data"] = hierarquizacao_data
        return _ambiente_row(
            status=data["status"],
            matriz_consolidada=data["matriz_consolidada"],
            pesos_consolidados=data["pesos_consolidados"],
            lambda_max=data["lambda_max"],
            indice_consistencia=data["indice_consistencia"],
            indice_aleatorio=data["indice_aleatorio"],
            razao_consistencia=data["razao_consistencia"],
            consistente=data["consistente"],
            respostas_consolidadas=data["respostas_consolidadas"],
            consolidado_em=data["consolidado_em"],
        )

    monkeypatch.setattr(repo, "get_ambiente_by_id", lambda _id: _ambiente_row())
    monkeypatch.setattr(repo, "list_respostas", lambda _id: respostas)
    monkeypatch.setattr(repo, "atualizar_consolidacao", fake_atualizar)
    monkeypatch.setattr(
        service.hierarq_repo,
        "get_by_id",
        lambda _id: {
            "codigo": "HIER-001",
            "dados_hierarquizacao": {
                "criterios": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}]
            },
        },
    )

    resultado = service.consolidar_ambiente(AMBIENTE_ID)

    assert gravado["status"] == "consolidada"
    assert gravado["respostas_consolidadas"] == 2
    # médias geométricas de 3 e 1/3 → 1 (matriz neutra)
    assert gravado["matriz_consolidada"][0][1] == pytest.approx(1.0)
    assert gravado["consistente"] is True
    assert gravado["hierarquizacao_data"]["comparacao_colaborativa"]["modo_preenchimento"] == "colaborativo"
    assert gravado["hierarquizacao_data"]["comparacao_colaborativa"]["matriz_comparacao"][0][1] == pytest.approx(1.0)
    assert resultado.status == "consolidada"
    assert resultado.consolidacao is not None
    assert resultado.consolidacao.respostas_consolidadas == 2
    assert resultado.total_respostas == 2


# ------------------------------------------------------------------
# resolução de rotas (sufixo fixo antes da rota genérica tipo/codigo)
# ------------------------------------------------------------------

def test_rota_respostas_resolve_para_listar_respostas(monkeypatch) -> None:
    chamado: dict = {}

    def fake_listar(ambiente_id: str):
        chamado["ambiente_id"] = ambiente_id
        return []

    monkeypatch.setattr(service, "listar_respostas", fake_listar)
    client = _client_autenticado("GESTOR")

    resp = client.get(
        f"/api/ahp/comparacao-colaborativa/ambientes/{AMBIENTE_ID}/respostas"
    )

    assert resp.status_code == 200
    assert chamado["ambiente_id"] == AMBIENTE_ID
    assert resp.json() == []


def test_rota_central_lista_respostas_globais(monkeypatch) -> None:
    chamado = {"executou": False}

    def fake_listar():
        chamado["executou"] = True
        return []

    monkeypatch.setattr(service, "listar_respostas_central", fake_listar)
    resp = _client_autenticado("GESTOR").get(
        "/api/ahp/comparacao-colaborativa/respostas"
    )

    assert resp.status_code == 200
    assert chamado["executou"] is True
    assert resp.json() == []


def test_rota_lista_configuracoes_das_duas_tabelas(monkeypatch) -> None:
    itens = [
        {"id": "1", "tipo": "avulsa", "codigo": "AV-1", "nome": "Avulsa", "alias": "Avulsa — AV-1"},
        {"id": "2", "tipo": "portfolio", "codigo": "PF-1", "nome": "Portfólio", "alias": "Portfólio — PF-1"},
    ]
    monkeypatch.setattr(service, "listar_configuracoes_origem", lambda: itens)
    resp = _client_autenticado("GESTOR").get(
        "/api/ahp/comparacao-colaborativa/configuracoes"
    )
    assert resp.status_code == 200
    assert resp.json() == itens


def test_rota_atualiza_resposta_inline(monkeypatch) -> None:
    captured = {}
    row = _resposta_row([[1.0, 2.0], [0.5, 1.0]])

    def fake_update(resposta_id, payload):
        captured.update({"id": resposta_id, **payload.model_dump(exclude_none=True)})
        row.update(payload.model_dump(exclude_none=True))
        return service._resposta_to_response(row)

    monkeypatch.setattr(service, "atualizar_resposta", fake_update)
    resp = _client_autenticado().patch(
        f"/api/ahp/comparacao-colaborativa/respostas/{row['id']}",
        json={"nome_completo": "Ana Silva", "email": "ana@x.gov.br", "instituicao": "SLT"},
    )
    assert resp.status_code == 200
    assert captured["id"] == row["id"]
    assert resp.json()["nome_completo"] == "Ana Silva"


@pytest.mark.parametrize(
    "recurso,identificador",
    [("ambientes", AMBIENTE_ID), ("respostas", "33333333-3333-3333-3333-333333333333")],
)
def test_rotas_excluem_registro_colaborativo(monkeypatch, recurso, identificador) -> None:
    chamado = []
    nome = "excluir_ambiente" if recurso == "ambientes" else "excluir_resposta"
    monkeypatch.setattr(service, nome, chamado.append)
    resp = _client_autenticado().delete(
        f"/api/ahp/comparacao-colaborativa/{recurso}/{identificador}"
    )
    assert resp.status_code == 204
    assert chamado == [identificador]


def test_rota_lista_todas_as_rodadas_da_configuracao(monkeypatch) -> None:
    chamado: dict = {}

    def fake_listar(hierarquizacao_id, *, base_url: str = "", gestao=False):
        chamado["hierarquizacao_id"] = str(hierarquizacao_id)
        return []

    monkeypatch.setattr(service, "listar_ambientes_hierarquizacao", fake_listar)
    client = _client_autenticado("GESTOR")
    resp = client.get(
        "/api/ahp/comparacao-colaborativa/hierarquizacoes/44444444-4444-4444-4444-444444444444/ambientes"
    )

    assert resp.status_code == 200
    assert chamado == {"hierarquizacao_id": HIERARQUIZACAO_ID}
    assert resp.json() == []


def test_rota_consolidar_resolve_para_consolidar_ambiente(monkeypatch) -> None:
    chamado: dict = {}

    def fake_consolidar(ambiente_id: str, *, base_url: str = ""):
        chamado["ambiente_id"] = ambiente_id
        row = _ambiente_row(
            status="consolidada",
            matriz_consolidada=[[1.0, 1.0], [1.0, 1.0]],
            pesos_consolidados=[0.5, 0.5],
            lambda_max=2.0,
            indice_consistencia=0.0,
            indice_aleatorio=0.0,
            razao_consistencia=0.0,
            consistente=True,
            respostas_consolidadas=2,
            consolidado_em=datetime(2026, 1, 3, tzinfo=timezone.utc),
            total_respostas=2,
        )
        return service._ambiente_to_response(row, base_url=base_url)

    monkeypatch.setattr(service, "consolidar_ambiente", fake_consolidar)
    client = _client_autenticado("GESTOR")

    resp = client.post(
        f"/api/ahp/comparacao-colaborativa/ambientes/{AMBIENTE_ID}/consolidar"
    )

    assert resp.status_code == 200
    assert chamado["ambiente_id"] == AMBIENTE_ID
    corpo = resp.json()
    assert corpo["status"] == "consolidada"
    assert corpo["consolidacao"]["respostas_consolidadas"] == 2


# ------------------------------------------------------------------
# fluxo completo via HTTP com repositório fake em memória
# ------------------------------------------------------------------

class _FakeRepo:
    """Repositório em memória replicando o contrato do repositório real."""

    def __init__(self) -> None:
        self.ambientes: dict[str, dict] = {}
        self.respostas: list[dict] = []
        self._seq = 0

    def _next_id(self) -> str:
        self._seq += 1
        return f"00000000-0000-0000-0000-{self._seq:012d}"

    def insert_ambiente(self, data: dict) -> dict:
        agora = datetime.now(timezone.utc)
        row = dict(data)
        row.update({"id": self._next_id(), "criado_em": agora, "atualizado_em": agora})
        self.ambientes[row["id"]] = row
        return dict(row)

    def get_ambiente_by_token(self, token: str):
        for row in self.ambientes.values():
            if row["token"] == token:
                return dict(row)
        return None

    def get_ambiente_by_hierarquizacao(self, hierarquizacao_id):
        candidatos = [
            r for r in self.ambientes.values()
            if r["hierarquizacao_id"] == str(hierarquizacao_id)
        ]
        if not candidatos:
            return None
        row = dict(sorted(candidatos, key=lambda r: r["criado_em"])[-1])
        row["total_respostas"] = len(self.list_respostas(row["id"]))
        return row

    def get_ambiente_by_id(self, ambiente_id: str):
        row = self.ambientes.get(ambiente_id)
        if not row:
            return None
        row = dict(row)
        row["total_respostas"] = len(self.list_respostas(ambiente_id))
        return row

    def list_ambientes_by_hierarquizacao(self, hierarquizacao_id):
        return [
            self.get_ambiente_by_id(r["id"])
            for r in sorted(self.ambientes.values(), key=lambda item: item["criado_em"], reverse=True)
            if r["hierarquizacao_id"] == str(hierarquizacao_id)
        ]

    def list_ambientes(self):
        return [self.get_ambiente_by_id(row["id"]) for row in self.ambientes.values()]

    def update_ambiente(self, ambiente_id: str, data: dict):
        row = self.ambientes.get(ambiente_id)
        if not row:
            return None
        row.update(data)
        row["atualizado_em"] = datetime.now(timezone.utc)
        return self.get_ambiente_by_id(ambiente_id)

    def encerrar_ambientes_anteriores(self, hierarquizacao_id) -> None:
        for row in self.ambientes.values():
            if row["hierarquizacao_id"] == str(hierarquizacao_id):
                row["status"] = "encerrada"

    def insert_resposta(self, data: dict) -> dict:
        if self.get_resposta_by_ambiente_email(data["ambiente_id"], data["email"]):
            return {}
        row = dict(data)
        agora = datetime.now(timezone.utc)
        row.update({"id": self._next_id(), "enviado_em": agora, "atualizado_em": agora})
        self.respostas.append(row)
        return dict(row)

    def get_resposta_by_ambiente_email(self, ambiente_id: str, email: str):
        return next((dict(r) for r in self.respostas if r["ambiente_id"] == ambiente_id and r["email"].lower() == email.lower()), None)

    def update_resposta_progresso(self, resposta_id: str, data: dict, *, versao=None, liberar_vaga=False):
        row = next((r for r in self.respostas if r["id"] == resposta_id), None)
        if not row or (versao is not None and (row["status"] != "em_preenchimento" or row["atualizado_em"] != versao)):
            return None
        row.update(data)
        row["atualizado_em"] = datetime.now(timezone.utc)
        return dict(row)

    def list_respostas(self, ambiente_id: str) -> list[dict]:
        return [dict(r) for r in self.respostas if r["ambiente_id"] == ambiente_id]

    def resposta_existe(self, ambiente_id: str, email: str) -> bool:
        return any(
            r["ambiente_id"] == ambiente_id and r["email"] == email
            for r in self.respostas
        )

    def atualizar_consolidacao(self, ambiente_id: str, data: dict, hierarquizacao_data: dict | None = None):
        row = self.ambientes.get(ambiente_id)
        if not row:
            return None
        row.update(data)
        row["hierarquizacao_data_persistida"] = hierarquizacao_data
        row["atualizado_em"] = datetime.now(timezone.utc)
        return dict(row)


def _instalar_fake_repo(monkeypatch) -> _FakeRepo:
    fake = _FakeRepo()
    monkeypatch.setattr(repo, "list_fontes_pesos_dimensoes", lambda _: [])
    matrizes = {}
    def criar_matriz(nome, conteudo, arquivo_base64=None, arquivo_nome=None):
        registro = {"id": CONFIG_ID, "nome": nome, "conteudo": conteudo, "arquivo_nome": arquivo_nome}
        matrizes[CONFIG_ID] = registro
        return registro
    monkeypatch.setattr(service.matrizes_criterios, "criar", criar_matriz)
    monkeypatch.setattr(service.matrizes_criterios, "obter", lambda ident: matrizes[str(ident)])
    monkeypatch.setattr(service.superficie_ahp, "encerrar_rodadas_hierarquizacao", fake.encerrar_ambientes_anteriores)
    for nome in (
        "insert_ambiente",
        "get_ambiente_by_token",
        "get_ambiente_by_hierarquizacao",
        "get_ambiente_by_id",
        "list_ambientes_by_hierarquizacao",
        "list_ambientes",
        "update_ambiente",
        "encerrar_ambientes_anteriores",
        "insert_resposta",
        "get_resposta_by_ambiente_email",
        "update_resposta_progresso",
        "list_respostas",
        "resposta_existe",
        "atualizar_consolidacao",
    ):
        monkeypatch.setattr(repo, nome, getattr(fake, nome))
    monkeypatch.setattr(
        service.hierarq_repo,
        "get_by_id",
        lambda _id: {
            "nome": "Configuração de teste",
            "objetivo": "Hierarquizar demandas",
            "codigo": "HIER-001",
            "dados_hierarquizacao": {"cabecalho_grupo": {
                "matriz_premissas_criterios": {"linhas": [{"criterio": "Custo", "Etapa": "Fase 3"}, {"criterio": "Prazo", "Etapa": "Fase 3"}]}
            }},
        },
    )
    return fake


def test_julgamento_anterior_mantem_comparacoes_entre_dimensoes_desde_a_criacao(monkeypatch):
    fake = _instalar_fake_repo(monkeypatch)
    ambiente = fake.insert_ambiente(_ambiente_dimensoes())
    gestor, publico = _client_autenticado("GESTOR"), TestClient(app)
    base = "/api/ahp/comparacao-colaborativa"
    rota_ambiente = f"{base}/ambientes/{ambiente['id']}"
    rota_publica = f"{base}/publico/{ambiente['token']}"
    acesso = {"email": "b@x.gov.br", "token_acesso": KEY}
    identidade = {"token_acesso": KEY, "identificacao": {
        "email": acesso["email"], "nome_completo": "Bia", "instituicao": "Teste",
    }}

    assert not fake.list_respostas(ambiente["id"])
    alteracao_sem_respostas = gestor.patch(rota_ambiente, json={"modo_comparacao": "por_grupo"})
    assert alteracao_sem_respostas.status_code == 422
    assert "definido na criação" in alteracao_sem_respostas.json()["detail"]

    meta = publico.post(f"{rota_publica}/acesso", json=acesso)
    assert meta.status_code == 200, meta.text
    assert meta.json()["modo_comparacao"] == "todos"
    assert meta.json()["grupos_comparacao"] == {}

    inicio = publico.post(f"{rota_publica}/respostas/iniciar", json=identidade)
    assert inicio.status_code == 200, inicio.text
    matriz = inicio.json()["matriz_comparacao"]
    matriz[0][2], matriz[2][0] = 3, 1 / 3  # Custo (Financeira) e Acesso (Social).
    progresso = publico.patch(f"{rota_publica}/respostas/progresso", json={**acesso, "matriz_comparacao": matriz})
    assert progresso.status_code == 200, progresso.text

    alteracao = gestor.patch(rota_ambiente, json={"modo_comparacao": "por_grupo"})
    assert alteracao.status_code == 422
    assert "definido na criação" in alteracao.json()["detail"]
    edicao = gestor.patch(rota_ambiente, json={"nome": "Julgamento em andamento"})
    assert edicao.status_code == 200, edicao.text
    assert edicao.json()["modo_comparacao"] == "todos"
    assert edicao.json()["criterios"] == ambiente["criterios"]

    retomada = publico.post(f"{rota_publica}/respostas/iniciar", json=identidade)
    assert retomada.status_code == 200, retomada.text
    assert retomada.json()["matriz_comparacao"] == matriz


def test_fluxo_por_grupo_preserva_os_pares_e_consolida_separadamente(monkeypatch):
    _instalar_fake_repo(monkeypatch)
    criterios = _ambiente_dimensoes()["criterios"] + [{"Critério": "Ambiental", "Dimensão": "Ambiental", "Etapa": "Fase 3"}]
    criterios[0]["Etapa"] = "Fase 1"
    criterios[1].pop("Etapa")
    criterios[2]["Etapa"] = "Fase 2"
    criterios[2]["Fase"] = 2
    gestor, publico = _client_autenticado("GESTOR"), TestClient(app)
    base = "/api/ahp/comparacao-colaborativa"
    body = {"nome": "Julgamento por grupo", "modo_comparacao": "por_grupo", "valido_ate": "2030-12-31T23:59:59Z",
            "matriz_premissas_criterios": {"linhas": criterios}, "convites": [{"email": "a@x.gov.br"}]}
    erro = gestor.post(f"{base}/ambientes", json={**body, "convites": [{"email": "a@x.gov.br", "dimensoes": ["Ambiental"]}]})
    assert erro.status_code == 422 and "pelo menos um grupo" in erro.json()["detail"]
    criado = gestor.post(f"{base}/ambientes", json=body)
    assert criado.status_code == 201, criado.text
    ambiente = criado.json()
    assert ambiente["modo_comparacao"] == "por_grupo"
    assert ambiente["criterios"] == criterios
    rota_ambiente = f"{base}/ambientes/{ambiente['id']}"
    rota_publica = f"{base}/publico/{ambiente['token']}"
    acesso = {"email": "a@x.gov.br", "token_acesso": KEY}
    dados = {"token_acesso": KEY, "identificacao": {"email": acesso["email"], "nome_completo": "Ana", "instituicao": "Teste"}}
    assert publico.get(rota_publica).json()["grupos_comparacao"] == {}
    meta = publico.post(f"{rota_publica}/acesso", json=acesso).json()
    assert meta["grupos_comparacao"] == {"Financeira": [0, 1], "Social": [2, 3], "Ambiental": [4]}
    assert "2 pares de comparação" in meta["contextualizacao"]["orientacao"]
    iniciado = publico.post(f"{rota_publica}/respostas/iniciar", json=dados)
    assert iniciado.status_code == 200, iniciado.text
    matriz = iniciado.json()["matriz_comparacao"]
    assert matriz == [[1 if i == j else None for j in range(5)] for i in range(5)]
    matriz[0][1], matriz[1][0] = 3, 1 / 3
    progresso = publico.patch(f"{rota_publica}/respostas/progresso", json={**acesso, "matriz_comparacao": matriz})
    assert progresso.status_code == 200, progresso.text
    assert publico.post(f"{rota_publica}/respostas/iniciar", json=dados).json()["matriz_comparacao"] == matriz
    falta_par = publico.post(f"{rota_publica}/respostas", json={**dados, "matriz_comparacao": matriz})
    assert falta_par.status_code == 422 and "grupo Social" in falta_par.json()["detail"]
    matriz[2][3], matriz[3][2] = 2, .5
    cruzada = [linha[:] for linha in matriz]
    cruzada[1][2] = cruzada[2][1] = 1
    erro = publico.post(f"{rota_publica}/respostas", json={**dados, "matriz_comparacao": cruzada})
    assert erro.status_code == 422 and "grupos diferentes" in erro.json()["detail"]
    enviada = publico.post(f"{rota_publica}/respostas", json={**dados, "matriz_comparacao": matriz})
    assert enviada.status_code == 201, enviada.text
    resposta = enviada.json()
    assert resposta["lambda_max"] is None
    assert resposta["estatisticas"]["resultados_por_grupo"]["Financeira"]["weights"] == pytest.approx([.75, .25])
    assert resposta["estatisticas"]["resultados_por_grupo"]["Ambiental"]["weights"] == [1]

    analise_id = "33333333-3333-3333-3333-333333333333"
    gravar = MagicMock(side_effect=lambda data, _: {**data, "id": analise_id})
    monkeypatch.setattr(service.analise_repo, "insert_with_respostas", gravar)
    monkeypatch.setattr(service.analise_repo, "list_resposta_ids", lambda _: [resposta["id"]])
    monkeypatch.setattr(service.analise_repo, "list_by_ambiente", lambda _: [])
    espaco = gestor.get(f"{rota_ambiente}/espaco-analitico")
    assert espaco.status_code == 200, espaco.text
    assert [r["dimensao"] for r in espaco.json()["recortes"]] == ["Financeira", "Social", "Ambiental"]
    assert espaco.json()["recortes"][1]["respostas"][0]["matriz_comparacao"] == [[1, 2], [.5, 1]]
    assert gestor.post(f"{rota_ambiente}/analises", json={"nome": "Sem grupo"}).status_code == 422
    analise = gestor.post(f"{rota_ambiente}/analises", json={"nome": "Análise Social", "dimensao": "Social"})
    assert analise.status_code == 201, analise.text
    assert analise.json()["pesos_consolidados"] == pytest.approx([2 / 3, 1 / 3])
    assert analise.json()["estatisticas_analise"]["dimensao"] == "Social"
    assert analise.json()["estatisticas_analise"]["criterios_com_pesos"] == [
        {**criterios[2], "peso_ahp": pytest.approx(2 / 3)},
        {**criterios[3], "peso_ahp": pytest.approx(1 / 3)},
    ]
    monkeypatch.setattr(service.analise_repo, "get_by_id", lambda _: gravar.call_args.args[0])
    assert gestor.post(f"{base}/analises/{analise_id}/homologar").status_code == 422
    unica = gestor.post(f"{rota_ambiente}/analises", json={"nome": "Análise Ambiental", "dimensao": "Ambiental"})
    assert unica.status_code == 201, unica.text
    assert unica.json()["estatisticas_analise"]["criterios_com_pesos"] == [{**criterios[4], "peso_ahp": 1}]
    assert gestor.patch(rota_ambiente, json={"modo_comparacao": "todos"}).status_code == 422


def test_rodada_das_dimensoes_usa_a_mesma_matriz_e_compara_somente_dimensoes(monkeypatch):
    _instalar_fake_repo(monkeypatch)
    criterios = _ambiente_dimensoes()["criterios"]
    gestor, publico = _client_autenticado("GESTOR"), TestClient(app)
    base = "/api/ahp/comparacao-colaborativa"
    body = {"nome": "Rodada das dimensões", "modo_comparacao": "dimensoes",
            "valido_ate": "2030-12-31T23:59:59Z", "matriz_premissas_criterios": {"linhas": criterios},
            "convites": [{"email": "a@x.gov.br"}]}
    assert gestor.post(f"{base}/ambientes", json={**body, "convites": [{"email": "a@x.gov.br", "dimensoes": ["Social"]}]}).status_code == 422
    criado = gestor.post(f"{base}/ambientes", json=body)
    assert criado.status_code == 201, criado.text
    ambiente = criado.json()
    assert ambiente["modo_comparacao"] == "dimensoes"
    assert ambiente["matriz_id"] == CONFIG_ID
    assert service.matrizes_criterios.obter(CONFIG_ID)["conteudo"]["linhas"] == criterios
    caminho = f"{base}/publico/{ambiente['token']}"
    acesso = {"email": "a@x.gov.br", "token_acesso": KEY}
    meta = publico.post(caminho + "/acesso", json=acesso)
    assert meta.status_code == 200, meta.text
    assert meta.json()["criterios"] == ["Financeira", "Social"]
    assert meta.json()["grupos_comparacao"] == {}
    resposta = publico.post(caminho + "/respostas", json={
        "token_acesso": KEY, "identificacao": {"email": acesso["email"], "nome_completo": "Ana", "instituicao": "Teste"},
        "matriz_comparacao": [[1, 3], [1 / 3, 1]],
    })
    assert resposta.status_code == 201, resposta.text
    assert resposta.json()["razao_consistencia"] == 0


def test_pesos_globais_com_fontes_manuais_ou_ahp_e_homologacao(monkeypatch):
    fonte_id = "33333333-3333-3333-3333-333333333333"
    financeira_id = "66666666-6666-6666-6666-666666666666"
    social_id = "77777777-7777-7777-7777-777777777777"
    rodada_dimensoes = "88888888-8888-8888-8888-888888888888"
    global_id = "99999999-9999-9999-9999-999999999999"
    ambiente = _ambiente_dimensoes()
    ambiente.update(modo_comparacao="por_grupo", matriz_integral=True, matriz_id=CONFIG_ID, hierarquizacao_id=None)
    ambiente["criterios"].append({"Critério": "Sinistros graves", "Dimensão": "Segurança", "Etapa": "Fase 2"})
    dimensoes = [{"Critério": nome, "Dimensão": nome} for nome in ("Segurança", "Financeira", "Social")]
    origem = {"id": rodada_dimensoes, "modo_comparacao": "dimensoes", "matriz_id": CONFIG_ID, "criterios": dimensoes, "analise_homologada_id": fonte_id}
    analises = {
        financeira_id: {"ambiente_id": AMBIENTE_ID, "status": "calculada", "consistente": True, "pesos_consolidados": [.75, .25],
                        "estatisticas_analise": {"dimensao": "Financeira", "criterios_atribuidos": ambiente["criterios"][:2]}},
        social_id: {"ambiente_id": AMBIENTE_ID, "status": "calculada", "consistente": True, "pesos_consolidados": [.4, .6],
                    "estatisticas_analise": {"dimensao": "Social", "criterios_atribuidos": ambiente["criterios"][2:4]}},
        fonte_id: {"ambiente_id": rodada_dimensoes, "status": "homologada", "consistente": True, "pesos_consolidados": [.1, .5, .4],
                   "estatisticas_analise": {"criterios_atribuidos": dimensoes}},
    }
    monkeypatch.setattr(repo, "get_ambiente_by_id", {AMBIENTE_ID: ambiente, rodada_dimensoes: origem}.get)
    monkeypatch.setattr(service.analise_repo, "get_by_id", analises.get)
    monkeypatch.setattr(service.analise_repo, "list_resposta_ids", lambda _: ["resp1"])
    def gravar(row, respostas):
        assert [r["resposta_id"] for r in respostas] == ["resp1"]
        analises[global_id] = {**row, "id": global_id}
        return analises[global_id]
    monkeypatch.setattr(service.analise_repo, "insert_with_respostas", gravar)
    gestor = _client_autenticado("GESTOR")
    base = "/api/ahp/comparacao-colaborativa"
    caminho = f"{base}/ambientes/{AMBIENTE_ID}/pesos-globais"
    body = {"nome": "Pesos globais", "analises_locais": {"Financeira": financeira_id, "Social": social_id}}
    manual = {"Financeira": 50, "Social": 40, "Segurança": 10}
    assert gestor.post(caminho, json={**body, "percentuais_dimensoes": {**manual, "Social": 5}}).status_code == 422
    assert gestor.post(caminho, json={**body, "analises_locais": {}, "percentuais_dimensoes": manual}).status_code == 422
    assert gestor.post(caminho, json={**body, "percentuais_dimensoes": manual, "analise_dimensoes_id": fonte_id}).status_code == 422
    for fonte in ({"percentuais_dimensoes": manual}, {"analise_dimensoes_id": fonte_id}):
        response = gestor.post(caminho, json={**body, **fonte})
        assert response.status_code == 201, response.text
        resultado = response.json()
        assert resultado["matriz_consolidada"] == [] and resultado["razao_consistencia"] is None
        assert resultado["pesos_consolidados"] == pytest.approx([.375, .125, .16, .24, .1])
        assert resultado["estatisticas_analise"]["pesos_locais"] == [.75, .25, .4, .6, 1.]
        assert resultado["estatisticas_analise"]["analise_dimensoes_id"] == fonte.get("analise_dimensoes_id")
    origem["matriz_id"] = HIERARQUIZACAO_ID
    assert gestor.post(caminho, json={**body, "analise_dimensoes_id": fonte_id}).status_code == 422
    def homologar(ambiente_id, pesos, _, *, homologacao):
        assert ambiente_id == AMBIENTE_ID and homologacao[0] == global_id
        ambiente.update(pesos)
        analises[global_id]["status"] = "homologada"
    monkeypatch.setattr(repo, "atualizar_consolidacao", homologar)
    assert gestor.post(f"{base}/analises/{global_id}/homologar").json()["status"] == "homologada"
    from api.services.ponderacao_fase3 import pesos_do_julgamento
    pesos_fase3 = pesos_do_julgamento(ambiente)
    assert pesos_fase3["custo"] == pytest.approx(.375)
    assert "sinistros_graves" not in pesos_fase3


def test_duas_etapas_validam_uma_vez_e_agregam_pesos_individuais(monkeypatch):
    from api.services import email_resposta_colaborador
    monkeypatch.setattr(email_resposta_colaborador, "notificar", lambda *_: None)
    _instalar_fake_repo(monkeypatch)
    criterios = [{"Critério": nome, "Dimensão": dimensao, "Etapa": "Fase 3"} for nome, dimensao in (
        ("Custo", "Financeira"), ("Prazo", "Financeira"), ("Retorno", "Financeira"),
        ("Acesso", "Social"), ("Equidade", "Social"), ("Sinistros", "Segurança"),
    )]
    gestor, publico = _client_autenticado("GESTOR"), TestClient(app)
    base = "/api/ahp/comparacao-colaborativa"
    body = {"nome": "Duas etapas", "modo_comparacao": "duas_etapas",
            "valido_ate": "2030-12-31T23:59:59Z", "matriz_premissas_criterios": {"linhas": criterios},
            "convites": [{"email": email} for email in ("ana@x.gov.br", "bia@x.gov.br", "caio@x.gov.br")]}
    limitado = {**body, "convites": [{"email": "ana@x.gov.br", "dimensoes": ["Financeira"]}]}
    assert gestor.post(f"{base}/ambientes", json=limitado).status_code == 422
    criado = gestor.post(f"{base}/ambientes", json=body)
    assert criado.status_code == 201, criado.text
    ambiente = criado.json()
    caminho = f"{base}/publico/{ambiente['token']}/respostas"
    calcula = MagicMock(wraps=service.ahp_engine.analyze_matrix)
    monkeypatch.setattr(service.ahp_engine, "analyze_matrix", calcula)

    def iniciar(email):
        acesso = {"email": email, "token_acesso": KEY}
        ident = {"email": email, "nome_completo": "Colaborador", "instituicao": "Teste"}
        resp = publico.post(caminho + "/iniciar", json={"identificacao": ident, "token_acesso": KEY})
        assert resp.status_code == 200, resp.text
        return acesso, ident, resp.json()

    def progresso(acesso, atual, matriz, etapa="dimensoes", concluir=False):
        return publico.patch(caminho + "/progresso", json={
            **acesso, "versao": atual["atualizadoEm"], "matriz_comparacao": matriz,
            "etapa": etapa, "concluir_etapa": concluir,
        })

    def enviar(ident, atual, matriz):
        return publico.post(caminho, json={
            "identificacao": ident, "token_acesso": KEY, "versao": atual["atualizadoEm"],
            "matriz_comparacao": matriz,
            "estatisticas": {"pesos_globais_individuais": [1, 0, 0, 0, 0, 0]},
        })

    def blocos(financeira, social):
        matriz = [[1 if i == j else None for j in range(6)] for i in range(6)]
        for indices, bloco in [([0, 1, 2], financeira), ([3, 4], social)]:
            for i, linha in zip(indices, bloco):
                for j, valor in zip(indices, linha):
                    matriz[i][j] = valor
        return matriz

    ana, id_ana, draft = iniciar("ana@x.gov.br")
    metadados = publico.post(f"{base}/publico/{ambiente['token']}/acesso", json=ana).json()
    assert metadados["dimensoes_comparacao"] == ["Financeira", "Social", "Segurança"]
    assert metadados["grupos_comparacao"] == {"Financeira": [0, 1, 2], "Social": [3, 4], "Segurança": [5]}
    assert enviar(id_ana, draft, draft["matriz_comparacao"]).status_code == 422
    parcial = [[1, None, None], [None, 1, None], [None, None, 1]]
    primeiros_pesos = [[1, 3, 3], [1 / 3, 1, 1], [1 / 3, 1, 1]]
    incoerente = [[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]
    assert progresso(ana, draft, parcial, concluir=True).status_code == 422
    assert progresso(ana, draft, incoerente, concluir=True).status_code == 422
    validada = progresso(ana, draft, primeiros_pesos, concluir=True)
    assert validada.status_code == 200, validada.text
    validada = validada.json()
    calcula.reset_mock()
    repetida = progresso(ana, validada, primeiros_pesos, concluir=True)
    assert repetida.status_code == 200, repetida.text
    calcula.assert_not_called()
    editada = progresso(ana, repetida.json(), parcial)
    assert editada.status_code == 200, editada.text
    assert editada.json()["estatisticas"]["julgamento_dimensoes"]["resultado"] is None
    assert progresso(ana, validada, primeiros_pesos, concluir=True).status_code == 422
    assert enviar(id_ana, editada.json(), editada.json()["matriz_comparacao"]).status_code == 422
    validada = progresso(ana, editada.json(), primeiros_pesos, concluir=True).json()
    assert enviar(id_ana, validada, blocos(incoerente, [[1, 3], [1 / 3, 1]])).status_code == 422
    calcula.reset_mock()
    final_ana = enviar(id_ana, validada, blocos(primeiros_pesos, [[1, 3], [1 / 3, 1]]))
    assert final_ana.status_code == 201, final_ana.text
    assert [len(call.args[0]) for call in calcula.call_args_list] == [3, 2, 1]
    assert final_ana.json()["estatisticas"]["pesos_globais_individuais"] == pytest.approx([.36, .12, .12, .15, .05, .20])

    bia, id_bia, draft_bia = iniciar("bia@x.gov.br")
    validada_bia = progresso(bia, draft_bia, [[1, 1 / 3, 1], [3, 1, 3], [1, 1 / 3, 1]], concluir=True).json()
    final_bia = enviar(id_bia, validada_bia, blocos([[1] * 3 for _ in range(3)], [[1, 1 / 3], [3, 1]]))
    assert final_bia.status_code == 201, final_bia.text
    iniciar("caio@x.gov.br")

    gravar = MagicMock(side_effect=lambda dados, respostas: {**dados, "id": CONFIG_ID})
    monkeypatch.setattr(service.analise_repo, "insert_with_respostas", gravar)
    monkeypatch.setattr(service.analise_repo, "list_resposta_ids", lambda _: [final_ana.json()["id"], final_bia.json()["id"]])
    analise = gestor.post(f"{base}/ambientes/{ambiente['id']}/analises", json={"nome": "Ranking coletivo"})
    assert analise.status_code == 201, analise.text
    resultado = analise.json()
    assert resultado["metodo_agregacao"] == "media_pesos_individuais"
    assert resultado["respostas_incluidas"] == 2 and resultado["razao_consistencia"] is None
    globais = [(a + b) / 2 for a, b in zip(
        final_ana.json()["estatisticas"]["pesos_globais_individuais"], final_bia.json()["estatisticas"]["pesos_globais_individuais"]
    )]
    assert resultado["pesos_consolidados"] == pytest.approx(globais)
    assert resultado["estatisticas_analise"]["ordem_ranking"] == sorted(range(6), key=lambda i: -globais[i])


def test_invitation_uses_active_form_with_production_prefix(monkeypatch) -> None:
    _instalar_fake_repo(monkeypatch)
    response = _client_autenticado("GESTOR").post(
        "/api/ahp/comparacao-colaborativa/ambientes",
        headers={"x-forwarded-prefix": "/sicard"},
        json={
            "hierarquizacao_id": HIERARQUIZACAO_ID,
            "convites": [{"email": "a@x.gov.br"}],
            "valido_ate": "2030-12-31T23:59:59+00:00",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["url_publica"] == f"http://testserver/sicard/public/analise-multicriterio/formulario-comparacao-pareada/{body['token']}/"


def test_inscricao_publica_transita_da_lista_ate_envio_com_confirmacao(monkeypatch):
    from api.services import email_resposta_colaborador

    fake = _instalar_fake_repo(monkeypatch)
    atualizar = MagicMock(wraps=fake.update_resposta_progresso)
    monkeypatch.setattr(repo, "update_resposta_progresso", atualizar)
    fila = {"situacao": "aguardando", "posicao": 1}
    monkeypatch.setattr(repo, "solicitar_vaga_publica", lambda _: fila)
    monkeypatch.setattr(repo, "renovar_vaga_publica", lambda _: fila["situacao"] == "admitida")
    inscricoes = {}
    indisponivel = False
    notificar = MagicMock()
    monkeypatch.setattr(email_resposta_colaborador, "notificar", notificar)
    monkeypatch.setattr(service.analise_repo, "list_by_ambiente", lambda _: [])

    def inserir(ambiente_id, nome, email, instituicao, segredo_hash):
        if indisponivel:
            from api.exceptions import DatabaseUnavailableError
            raise DatabaseUnavailableError("Banco indisponível.")
        if any(i["email"] == email for i in inscricoes.values()):
            return None
        dados = {"id": HIERARQUIZACAO_ID, "nome_completo": nome, "nome": nome,
                 "email": email, "instituicao": instituicao, "ambiente_id": ambiente_id}
        inscricoes[segredo_hash] = dados
        return dados

    monkeypatch.setattr(repo, "insert_inscricao", inserir)
    monkeypatch.setattr(repo, "get_inscricao", lambda ambiente, chave: next(
        (i for hash_, i in inscricoes.items() if hash_ == chave and i["ambiente_id"] == ambiente), None,
    ))
    monkeypatch.setattr(repo, "list_inscricoes", lambda ambiente: [
        i for i in inscricoes.values() if i["ambiente_id"] == ambiente
    ])
    gestor = _client_autenticado()
    publico = TestClient(app, base_url="https://testserver")
    outro = TestClient(app, base_url="https://testserver")
    api = "/api/ahp/comparacao-colaborativa"
    criacao = {"nome": "Consulta pública", "valido_ate": "2030-10-10T22:00:00Z",
               "modo_participacao": "publico", "modo_comparacao": "duas_etapas",
               "matriz_premissas_criterios": {"linhas": [
                   {"Critério": "Acesso", "Dimensão": "Social", "Etapa": "Fase 1"},
                   {"Critério": "Equidade", "Dimensão": "Social", "Etapa": "Fase 2"},
                   {"Critério": "Custo", "Dimensão": "Financeira", "Etapa": "Fase 3"},
               ]}}
    assert gestor.post(api + "/ambientes", json={**criacao, "modo_comparacao": "todos"}).status_code == 422
    assert gestor.post(api + "/ambientes", json={**criacao, "convites": [{"email": "teste@x.gov.br"}]}).status_code == 422
    criada = gestor.post(api + "/ambientes", json=criacao)
    assert criada.status_code == 201, criada.text
    ambiente = criada.json()
    caminho = f"{api}/publico/{ambiente['token']}"
    pagina = f"/public/analise-multicriterio/participar/{ambiente['token']}/"
    gestao = f"{api}/ambientes/{ambiente['id']}/espaco-analitico"
    ident = {"email": "pessoa@x.gov.br", "nome_completo": "Pessoa Teste", "instituicao": "Instituição Teste"}
    assert ambiente["url_publica"].endswith(pagina)
    assert publico.get(pagina + "formulario/", follow_redirects=False).status_code == 303
    aberta = publico.get(pagina)
    assert aberta.status_code == 200, aberta.text
    assert 'id="ami-monitor-table"' not in aberta.text
    assert 'id="ami-monitor-delete"' not in aberta.text
    assert f'data-formulario-url="{pagina}formulario/"' in aberta.text
    prefixo = {"X-Forwarded-Prefix": "/sicard"}
    assert f'data-formulario-url="/sicard{pagina}formulario/"' in publico.get(pagina, headers=prefixo).text
    chave_pendente = publico.cookies[service.nome_cookie_inscricao(ambiente["token"])]
    assert publico.post(caminho + "/acesso", json={"email": ident["email"], "token_acesso": KEY}).status_code == 422
    indisponivel = True
    falha = publico.post(caminho + "/inscricao", json=ident)
    assert falha.status_code == 503 and "set-cookie" not in falha.headers
    indisponivel = False
    inscrita = publico.post(caminho + "/inscricao", json=ident)
    assert inscrita.status_code == 200, inscrita.text
    assert "HttpOnly" in inscrita.headers["set-cookie"] and "Secure" in inscrita.headers["set-cookie"]
    assert inscrita.json()["codigo_retomada"] == chave_pendente
    assert publico.post(caminho + "/inscricao", json=ident).json() == inscrita.json()
    assert publico.post(caminho + "/inscricao", json={"email": ident["email"]}).json() == inscrita.json()
    retorno = publico.get(pagina, headers=prefixo, follow_redirects=False)
    assert retorno.status_code == 303
    assert retorno.headers["location"] == f"/sicard{pagina}formulario/"
    assert outro.post(caminho + "/inscricao", json={**ident, "email": ident["email"].upper()}).status_code == 422
    codigo = inscrita.json()["codigo_retomada"]
    assert outro.post(caminho + "/inscricao", json={"email": "outra@x.gov.br", "codigo_retomada": codigo}).status_code == 422
    assert outro.post(caminho + "/inscricao", json={"email": ident["email"], "codigo_retomada": codigo}).status_code == 200
    espera = outro.get(pagina + "formulario/", follow_redirects=False)
    assert espera.status_code == 200
    assert "Sua posição na fila é 1" in espera.text
    assert 'id="ami-monitor-table"' not in espera.text
    assert "Código de retomada" in espera.text and codigo not in espera.text
    assert 'id="btn-liberar-form"' not in espera.text
    assert outro.post(caminho + "/fila").json() == fila
    assert publico.post(caminho + "/acesso", json={"email": ident["email"]}).status_code == 409
    assert publico.post(caminho + "/respostas/iniciar", json={"identificacao": ident}).status_code == 409
    assert publico.patch(caminho + "/respostas/progresso", json={
        "email": ident["email"], "matriz_comparacao": [[1, 1], [1, 1]],
    }).status_code == 409
    assert publico.post(caminho + "/respostas", json={
        "identificacao": ident, "matriz_comparacao": [[1, 1], [1, 1]],
    }).status_code == 409
    assert publico.get(gestao).status_code == 401
    antes = gestor.get(gestao)
    assert antes.status_code == 200, antes.text
    assert antes.json()["participacao"]["nao_iniciados"] == 1
    assert antes.json()["inscritos"][0]["instituicao"] == ident["instituicao"]
    assert antes.json()["respostas"] == []
    fila = {"situacao": "admitida"}
    admitida = outro.get(pagina + "formulario/")
    assert admitida.status_code == 200
    assert 'id="collab-public-enrollment"' in admitida.text
    assert 'id="ami-monitor-table"' not in admitida.text
    assert 'id="ami-monitor-delete"' not in admitida.text
    assert 'id="btn-liberar-form"' not in admitida.text
    assert "A avaliação é feita em duas etapas" in admitida.text
    assert ident["instituicao"] in admitida.text
    assert codigo not in admitida.text
    assert publico.post(caminho + "/acesso", json={"email": ident["email"]}).json()["criterios"] == ["Acesso", "Equidade", "Custo"]
    respostas = caminho + "/respostas"
    inicio = publico.post(respostas + "/iniciar", json={"identificacao": {**ident, "nome_completo": "Nome adulterado"}})
    assert inicio.status_code == 200, inicio.text
    assert inicio.json()["nome_completo"] == ident["nome_completo"]
    assert inicio.json()["inscricao_id"] == HIERARQUIZACAO_ID
    matriz = [[1, 1, None], [1, 1, None], [None, None, 1]]
    final = {"identificacao": ident, "matriz_comparacao": matriz, "versao": inicio.json()["atualizadoEm"]}
    assert publico.post(respostas, json=final).status_code == 422
    etapa = publico.patch(respostas + "/progresso", json={
        "email": ident["email"], "matriz_comparacao": [[1, 3], [1 / 3, 1]],
        "versao": inicio.json()["atualizadoEm"], "etapa": "dimensoes", "concluir_etapa": True,
    })
    assert etapa.status_code == 200, etapa.text
    notificar.assert_not_called()
    reset = respostas + "/reiniciar"
    chave_reset = {"email": ident["email"], "versao": etapa.json()["atualizadoEm"]}
    assert TestClient(app).post(reset, json=chave_reset).status_code == 422
    assert publico.post(reset, json={**chave_reset, "versao": inicio.json()["atualizadoEm"]}).status_code == 422
    reinicio = publico.post(reset, json=chave_reset)
    assert reinicio.status_code == 200, reinicio.text
    limpo = reinicio.json()
    assert limpo["id"] == inicio.json()["id"] and limpo["inscricao_id"] == inicio.json()["inscricao_id"]
    assert limpo["status"] == "em_preenchimento" and limpo["matriz_comparacao"] == [[1, None, None], [None, 1, None], [None, None, 1]]
    assert "julgamento_dimensoes" not in limpo["estatisticas"]
    assert atualizar.call_args.kwargs["liberar_vaga"] is False
    assert publico.patch(respostas + "/progresso", json={
        "email": ident["email"], "matriz_comparacao": matriz, "versao": limpo["atualizadoEm"],
    }).status_code == 422
    etapa = publico.patch(respostas + "/progresso", json={
        "email": ident["email"], "matriz_comparacao": [[1, 3], [1 / 3, 1]],
        "versao": limpo["atualizadoEm"], "etapa": "dimensoes", "concluir_etapa": True,
    })
    assert etapa.status_code == 200, etapa.text
    envio = publico.post(respostas, json={**final, "versao": etapa.json()["atualizadoEm"]})
    assert envio.status_code == 201, envio.text
    assert atualizar.call_args.kwargs["liberar_vaga"] is True
    assert envio.json()["estatisticas"]["pesos_globais_individuais"] == pytest.approx([.375, .375, .25])
    assert gestor.get(gestao).json()["participacao"]["enviadas"] == 1
    notificar.assert_called_once_with(ambiente["id"], envio.json()["id"])
    assert publico.post(reset, json={**chave_reset, "versao": envio.json()["atualizadoEm"]}).status_code == 422


def test_fluxo_colaborativo_completo(monkeypatch) -> None:
    fake = _instalar_fake_repo(monkeypatch)
    gestor = _client_autenticado("GESTOR")

    # 1. Gestor cria o ambiente colaborativo com dois convidados.
    resp = gestor.post(
        "/api/ahp/comparacao-colaborativa/ambientes",
        json={
            "hierarquizacao_id": HIERARQUIZACAO_ID,
            "convites": [{"email": "a@x.gov.br"}, {"email": "b@x.gov.br"}],
            "valido_ate": "2030-12-31T23:59:59+00:00",
        },
    )
    assert resp.status_code == 201, resp.text
    ambiente = resp.json()
    token = ambiente["token"]
    assert ambiente["status"] == "ativa"
    assert ambiente["url_publica"].endswith(f"/public/analise-multicriterio/formulario-comparacao-pareada/{token}/")
    assert TestClient(app).get(f"/public/analise-multicriterio/formulario-comparacao-pareada/{token}/", follow_redirects=False).status_code == 200

    # O módulo lista e permite ajustar participantes e prazo do julgamento aberto.
    resp = gestor.get("/api/ahp/comparacao-colaborativa/ambientes")
    assert resp.status_code == 200
    assert [item["id"] for item in resp.json()] == [ambiente["id"]]
    resp = gestor.patch(
        f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente['id']}",
        json={
            "convites": [{"email": "a@x.gov.br"}, {"email": "b@x.gov.br"}],
            "valido_ate": "2031-01-31T23:59:59+00:00",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["valido_ate"].startswith("2031-01-31")

    # 2. O link sozinho não libera critérios; e-mail e código são necessários.
    publico = TestClient(app)
    resp = publico.get(f"/api/ahp/comparacao-colaborativa/publico/{token}?email=a@x.gov.br")
    assert resp.status_code == 200
    assert resp.json()["email_autorizado"] is False
    assert resp.json()["criterios"] == []
    assert "token_acesso" not in resp.json()
    codigo = KEY
    assert ambiente["token_acesso"] is None
    assert fake.ambientes[ambiente["id"]]["token_acesso"] is None
    resp = publico.post(f"/api/ahp/comparacao-colaborativa/publico/{token}/acesso",
                        json={"email": "a@x.gov.br", "token_acesso": codigo})
    assert resp.status_code == 200, resp.text
    dados = resp.json()
    assert dados["email_autorizado"] is True
    assert dados["criterios"] == ["Custo", "Prazo"]

    # E-mail não convidado não é autorizado.
    resp = publico.post(f"/api/ahp/comparacao-colaborativa/publico/{token}/acesso",
                        json={"email": "z@x.gov.br", "token_acesso": codigo})
    assert resp.status_code == 422

    # 3. Dois participantes enviam respostas consistentes.
    for email, valor in (("a@x.gov.br", 3.0), ("b@x.gov.br", 1 / 3)):
        inicio = publico.post(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas/iniciar",
            json={"token_acesso": codigo, "identificacao": {"nome_completo": "Participante", "email": email, "instituicao": "SP Águas"}},
        )
        assert inicio.status_code == 200, inicio.text
        assert inicio.json()["status"] == "em_preenchimento"
        progresso = publico.patch(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas/progresso",
            json={"email": email, "token_acesso": codigo, "matriz_comparacao": [[1.0, valor], [1.0 / valor, 1.0]]},
        )
        assert progresso.status_code == 200, progresso.text
        assert progresso.json()["status"] == "em_preenchimento"
        resp = publico.post(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas",
            json={
                "token_acesso": codigo,
                "identificacao": {
                    "nome_completo": "Participante",
                    "email": email,
                    "instituicao": "SP Águas",
                },
                "matriz_comparacao": [[1.0, valor], [1.0 / valor, 1.0]],
            },
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["consistente"] is True
        assert resp.json()["status"] == "enviada"

    # Resposta duplicada do mesmo e-mail é rejeitada.
    resp = publico.post(
        f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas",
        json={
            "token_acesso": codigo,
            "identificacao": {
                "nome_completo": "Participante",
                "email": "a@x.gov.br",
                "instituicao": "SP Águas",
            },
            "matriz_comparacao": [[1.0, 2.0], [0.5, 1.0]],
        },
    )
    assert resp.status_code == 422

    # 4. Gestor lista as respostas recebidas.
    ambiente_id = ambiente["id"]
    resp = gestor.get(
        f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente_id}/respostas"
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    # 5. Gestor consolida por média geométrica (AIJ).
    resp = gestor.post(
        f"/api/ahp/comparacao-colaborativa/ambientes/{ambiente_id}/consolidar"
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["status"] == "consolidada"
    cons = corpo["consolidacao"]
    assert cons["respostas_consolidadas"] == 2
    # gm(3, 1/3) = 1 → matriz neutra, pesos iguais e RC = 0.
    assert cons["matriz_consolidada"][0][1] == pytest.approx(1.0)
    assert cons["pesos_consolidados"] == pytest.approx([0.5, 0.5])
    assert cons["consistente"] is True
    assert fake.ambientes[ambiente_id]["status"] == "consolidada"
    assert fake.ambientes[ambiente_id]["hierarquizacao_data_persistida"] is None
    assert fake.ambientes[ambiente_id]["matriz_id"] == CONFIG_ID
    assert fake.ambientes[ambiente_id]["hierarquizacao_id"] is None


def test_julgamento_usa_matriz_cadastrada_ignora_matriz_enviada(monkeypatch):
    fake = _instalar_fake_repo(monkeypatch)
    criteria = [{"criterio":"Oficial A","premissa":"Premissa preservada","Etapa":"Fase 3"},{"criterio":"Oficial B","Etapa":"Fase 3"}]
    monkeypatch.setattr(service.hierarq_repo,"get_by_id",lambda _: {"codigo":"H-1","nome":"Hierarquização","dados_hierarquizacao":{"cabecalho_grupo":{"matriz_premissas_criterios":{"arquivo":"original.xlsx","linhas":criteria}}}})
    response = _client_autenticado().post("/api/ahp/comparacao-colaborativa/ambientes",json={"hierarquizacao_id":HIERARQUIZACAO_ID,"matriz_premissas_criterios":[{"criterio":"Injetado A"},{"criterio":"Injetado B"}],"convites":[{"email":"a@x.gov.br"}],"valido_ate":"2030-12-31T23:59:59+00:00"})
    assert response.status_code == 201, response.text
    saved = fake.ambientes[response.json()["id"]]
    assert saved["criterios"] == criteria
    assert saved["arquivo_matriz_nome"] == "original.xlsx"


def test_julgamento_sem_matriz_na_hierarquizacao_nao_aceita_upload_alternativo(monkeypatch):
    _instalar_fake_repo(monkeypatch)
    monkeypatch.setattr(service.hierarq_repo,"get_by_id",lambda _: {"codigo":"H-1","nome":"Sem matriz","dados_hierarquizacao":{}})
    response = _client_autenticado().post("/api/ahp/comparacao-colaborativa/ambientes",json={"hierarquizacao_id":HIERARQUIZACAO_ID,"matriz_premissas_criterios":[{"criterio":"Outro A"},{"criterio":"Outro B"}],"convites":[{"email":"a@x.gov.br"}],"valido_ate":"2030-12-31T23:59:59+00:00"})
    assert response.status_code == 422, response.text

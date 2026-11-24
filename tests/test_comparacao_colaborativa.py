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
        convites=[{"nome": "Ana", "email": "a@x.gov.br", "dimensoes": None},
                  {"nome": "Bia", "email": "b@x.gov.br", "dimensoes": ["Financeira"]}],
    )
    resultado = service.atualizar_ambiente(AMBIENTE_ID, payload)
    lista = [{"email": "a@x.gov.br", "nome": "Ana"},
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
        row.update({"id": self._next_id(), "enviado_em": datetime.now(timezone.utc)})
        self.respostas.append(row)
        return dict(row)

    def get_resposta_by_ambiente_email(self, ambiente_id: str, email: str):
        return next((dict(r) for r in self.respostas if r["ambiente_id"] == ambiente_id and r["email"].lower() == email.lower()), None)

    def update_resposta_progresso(self, resposta_id: str, data: dict):
        row = next((r for r in self.respostas if r["id"] == resposta_id), None)
        if not row:
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

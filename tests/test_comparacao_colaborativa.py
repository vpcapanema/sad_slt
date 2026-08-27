"""Testes — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

from datetime import datetime, timezone

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


def _client_autenticado(perfil: str = "ANALISTA") -> TestClient:
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
        "convites": [{"email": "a@x.gov.br"}],
        "valido_ate": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "status": "ativa",
        "criado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "atualizado_em": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "total_respostas": 0,
        "matriz_consolidada": None,
        "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}],
        "n_criterios": 2,
    }
    row.update(extra)
    return row


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
            "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}],
        },
    )

    def fake_update(_id: str, data: dict) -> dict:
        captured.update(data)
        return {**atual, **data}

    monkeypatch.setattr(repo, "update_ambiente", fake_update)
    service.atualizar_ambiente(
        AMBIENTE_ID,
        AmbienteColaborativoUpdateSchema(
            config_tipo="avulsa",
            config_id=CONFIG_ID,
            convites=[{"email": "novo@x.gov.br"}],
            valido_ate="2031-01-31T23:59:59+00:00",
        ),
    )

    assert captured["config_tipo"] == "avulsa"
    assert captured["config_id"] == CONFIG_ID
    assert captured["config_avulsa_id"] == CONFIG_ID
    assert captured["config_portfolio_id"] is None
    assert captured["config_codigo"] == "CFG-EDITADA"
    assert captured["n_criterios"] == 2
    assert captured["convites"] == [{"email": "novo@x.gov.br"}]
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
                            {"criterio": "Custo", "premissa": "Menor é melhor"},
                            {"criterio": "Prazo", "premissa": "Menor é melhor"},
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
        AmbienteColaborativoUpdateSchema(hierarquizacao_id=nova_hierarquizacao_id),
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
    monkeypatch.setattr(repo, "resposta_existe", lambda _ambiente, _email: False)
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
    monkeypatch.setattr(repo, "resposta_existe", lambda _ambiente, _email: False)
    payload = service.RespostaColaborativaCreateSchema.model_validate({
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
                "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}]
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
    monkeypatch.setattr(service, nome, lambda registro_id: chamado.append(registro_id))
    resp = _client_autenticado().delete(
        f"/api/ahp/comparacao-colaborativa/{recurso}/{identificador}"
    )
    assert resp.status_code == 204
    assert chamado == [identificador]


def test_rota_lista_todas_as_rodadas_da_configuracao(monkeypatch) -> None:
    chamado: dict = {}

    def fake_listar(hierarquizacao_id, *, base_url: str = ""):
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
    client = _client_autenticado("ANALISTA")

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
            "dados_hierarquizacao": {
                "criterios": [{"criterio": "Custo"}, {"criterio": "Prazo"}]
            },
        },
    )
    return fake


def test_fluxo_colaborativo_completo(monkeypatch) -> None:
    fake = _instalar_fake_repo(monkeypatch)
    gestor = _client_autenticado("ANALISTA")

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
    assert f"?token={token}" in ambiente["url_publica"]

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

    # 2. Participante acessa o link público e valida o e-mail.
    publico = TestClient(app)
    resp = publico.get(f"/api/ahp/comparacao-colaborativa/publico/{token}?email=a@x.gov.br")
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["email_autorizado"] is True
    assert dados["criterios"] == ["Custo", "Prazo"]

    # E-mail não convidado não é autorizado.
    resp = publico.get(f"/api/ahp/comparacao-colaborativa/publico/{token}?email=z@x.gov.br")
    assert resp.json()["email_autorizado"] is False

    # 3. Dois participantes enviam respostas consistentes.
    for email, valor in (("a@x.gov.br", 3.0), ("b@x.gov.br", 1 / 3)):
        inicio = publico.post(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas/iniciar",
            json={"identificacao": {"nome_completo": "Participante", "email": email, "instituicao": "SP Águas"}},
        )
        assert inicio.status_code == 200, inicio.text
        assert inicio.json()["status"] == "em_preenchimento"
        progresso = publico.patch(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas/progresso",
            json={"email": email, "matriz_comparacao": [[1.0, valor], [1.0 / valor, 1.0]]},
        )
        assert progresso.status_code == 200, progresso.text
        assert progresso.json()["status"] == "em_preenchimento"
        resp = publico.post(
            f"/api/ahp/comparacao-colaborativa/publico/{token}/respostas",
            json={
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
    assert fake.ambientes[ambiente_id]["hierarquizacao_data_persistida"]["comparacao_colaborativa"]["modo_preenchimento"] == "colaborativo"

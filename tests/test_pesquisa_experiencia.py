from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import UUID

from fastapi.testclient import TestClient
import pytest

from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository, convite_individual_repository, pesquisa_experiencia_repository
from api.routers.pesquisa_experiencia import calcular_indice
from api.schemas.pesquisa_experiencia import PesquisaExperienciaEntrada
from api.server import app
from api.services.comparacao_colaborativa_service import nome_cookie_inscricao


ACESSO = {"email": "convidado@example.com", "token_acesso": "A" * 43}
HIERARQUIZACAO_ID = "3aa0bbac-9af6-48ec-a7a4-d79b53ac3ea5"


@pytest.fixture
def convite_ahp(monkeypatch):
    julgamento = {
        "id": "id-do-julgamento",
        "status": "ativa",
        "valido_ate": datetime.now(timezone.utc) + timedelta(days=1),
        "convites": [{"email": ACESSO["email"]}],
        "criterios": [{"Critério": "A", "Etapa": "Fase 3"}, {"Critério": "B", "Etapa": "Fase 3"}],
    }
    monkeypatch.setattr(
        convite_individual_repository, "localizar_julgamento",
        lambda email, chave: julgamento if (email, chave) == (ACESSO["email"], ACESSO["token_acesso"]) else None,
    )
    monkeypatch.setattr(
        convite_individual_repository, "validar",
        lambda id, email, chave: (id, email, chave) == (julgamento["id"], ACESSO["email"], ACESSO["token_acesso"]),
    )
    return julgamento


def _dados(ahp=False, **alteracoes):
    dados = {
        "frequencia_uso": "semanalmente",
        "funcionalidade_mais_utilizada": "Cadastro de demandas",
        "facilidade": 4, "autonomia": 4, "clareza_interface": 4,
        "compreensao_resultados": 4, "desempenho": 4, "satisfacao_geral": 4,
        "principal_dificuldade": "Localizar uma função",
        "melhoria_prioritaria": "Simplificar a navegação",
        "criticas_sugestoes_elogios": "A documentação é útil.", "website": "",
    }
    if ahp:
        dados["perfil"] = "tecnico"
    else:
        dados["hierarquizacao_id"] = HIERARQUIZACAO_ID
    dados.update(alteracoes)
    return dados


def test_indice_normalizado():
    assert calcular_indice(PesquisaExperienciaEntrada(**_dados())) == 75.0
    assert calcular_indice(PesquisaExperienciaEntrada(**_dados(
        facilidade=1, autonomia=1, clareza_interface=1, compreensao_resultados=1,
        desempenho=1, satisfacao_geral=1,
    ))) == 0.0


def test_pagina_publica_oferece_hierarquizacoes_cadastradas(monkeypatch):
    monkeypatch.setattr(pesquisa_experiencia_repository, "listar_hierarquizacoes", lambda: [
        {"id": UUID(HIERARQUIZACAO_ID), "nome": "Priorização de demandas", "codigo": "HIER-TESTE"},
    ])
    resposta = TestClient(app).get("/public/pesquisa-experiencia/")
    assert resposta.status_code == 200
    assert "críticas, sugestões ou elogios" in resposta.text
    assert 'id="pesquisa-acesso"' not in resposta.text
    assert 'name="perfil"' not in resposta.text
    assert 'name="hierarquizacao_id" required' in resposta.text
    assert f'value="{HIERARQUIZACAO_ID}">Priorização de demandas — HIER-TESTE</option>' in resposta.text


def test_pagina_publica_informa_quando_lista_esta_indisponivel(monkeypatch):
    def indisponivel():
        raise DatabaseUnavailableError("Conexão indisponível")

    monkeypatch.setattr(pesquisa_experiencia_repository, "listar_hierarquizacoes", indisponivel)
    resposta = TestClient(app).get("/public/pesquisa-experiencia/")
    assert resposta.status_code == 200
    assert 'name="hierarquizacao_id" required disabled' in resposta.text
    assert "A lista de hierarquizações está indisponível" in resposta.text


def test_pagina_ahp_aparece_no_mapa_publico():
    cliente = TestClient(app)
    caminho = "/public/pesquisa-experiencia-ahp/"
    titulo = "Pesquisa de satisfação - AHP Interativa"
    pagina = cliente.get(caminho)
    assert pagina.status_code == 200 and titulo in pagina.text
    assert 'action="/api/pesquisa-experiencia/ahp/respostas"' in pagina.text
    assert 'action="/api/pesquisa-experiencia/ahp/acesso"' in pagina.text
    assert 'data-pesquisa="ahp" hidden' in pagina.text
    assert 'id="pesquisa-token"' in pagina.text
    assert 'name="perfil" required' in pagina.text
    assert 'name="hierarquizacao_id"' not in pagina.text
    assert cliente.get(caminho.rstrip("/"), follow_redirects=False).status_code == 200
    mapa = cliente.get("/public/mapa-do-site/")
    assert f'href="{caminho}"' in mapa.text and titulo in mapa.text


def test_resposta_publica_e_anonima(monkeypatch):
    salvo = {}
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda dados, indice: salvo.update(dados=dados, indice=indice))
    resposta = TestClient(app).post("/api/pesquisa-experiencia/respostas", json=_dados())
    assert resposta.status_code == 201
    assert resposta.json()["indice_experiencia"] == 75.0
    assert salvo["dados"]["escopo"] == "sicard"
    assert salvo["dados"]["hierarquizacao_id"] == UUID(HIERARQUIZACAO_ID)
    assert "perfil" not in salvo["dados"]
    assert salvo["dados"]["criticas_sugestoes_elogios"] == "A documentação é útil."
    assert "website" not in salvo["dados"]


def test_resposta_geral_rejeita_hierarquizacao_invalida(monkeypatch):
    def recusar(dados, _indice):
        raise DemandaValidationError("A hierarquização selecionada não está disponível.", field="hierarquizacao_id")

    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", recusar)
    cliente = TestClient(app)
    rota = "/api/pesquisa-experiencia/respostas"
    dados = _dados()
    dados.pop("hierarquizacao_id")
    assert cliente.post(rota, json=dados).status_code == 422
    resposta = cliente.post(rota, json=_dados())
    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "hierarquizacao_id"


def test_resposta_ahp_usa_escala_propria_e_registra_escopo_sem_credenciais(monkeypatch, convite_ahp):
    salvo = {}
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda dados, indice: salvo.update(dados=dados, indice=indice))
    caminho = "/api/pesquisa-experiencia/ahp/respostas"
    cliente = TestClient(app)
    resposta = cliente.post(caminho, json=_dados(ahp=True, acesso=ACESSO, facilidade=7, funcionalidade_mais_utilizada=None))
    assert resposta.status_code == 201
    assert resposta.json()["indice_experiencia"] == 58.33
    assert salvo["dados"]["escopo"] == "ahp_interativa"
    assert salvo["dados"]["escala_maxima"] == 7
    assert salvo["dados"]["perfil"] == "tecnico"
    assert not {"website", "acesso", "email", "token_acesso"} & salvo["dados"].keys()
    assert cliente.post(caminho, json=_dados(ahp=True, acesso=ACESSO, escala_maxima=5)).status_code == 422
    assert cliente.post(caminho, json=_dados(ahp=True, acesso=ACESSO, escopo="sicard")).status_code == 422


def test_pesquisa_usa_a_chave_do_convite_e_revalida_antes_da_gravacao(monkeypatch, convite_ahp):
    cliente = TestClient(app)
    acesso = "/api/pesquisa-experiencia/ahp/acesso"
    respostas = "/api/pesquisa-experiencia/ahp/respostas"
    gravacoes = []
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda *args: gravacoes.append(args))
    autorizada = cliente.post(acesso, json={**ACESSO, "email": ACESSO["email"].upper()})
    assert autorizada.status_code == 204 and autorizada.content == b""
    assert autorizada.headers["Cache-Control"] == "no-store"
    assert cliente.post(respostas, json=_dados(ahp=True)).status_code == 422
    for invalido in ({**ACESSO, "email": "outro@example.com"}, {**ACESSO, "token_acesso": "B" * 43}):
        rejeitada = cliente.post(acesso, json=invalido)
        assert rejeitada.status_code == 422 and invalido["token_acesso"] not in rejeitada.text
        assert rejeitada.json()["detail"]["codigo"] == "convite_invalido"
        assert cliente.post(respostas, json=_dados(ahp=True, acesso=invalido)).status_code == 422
    convite_ahp["valido_ate"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    expirada = cliente.post(respostas, json=_dados(ahp=True, acesso=ACESSO))
    assert expirada.status_code == 422 and "prazo" in expirada.json()["detail"]["mensagem"]
    convite_ahp["valido_ate"] = datetime.now(timezone.utc) + timedelta(days=1)
    monkeypatch.setattr(convite_individual_repository, "validar", lambda *_: False)
    assert cliente.post(respostas, json=_dados(ahp=True, acesso=ACESSO)).status_code == 422
    assert gravacoes == []


def test_pesquisa_aceita_inscricao_publica_com_resposta_enviada(monkeypatch):
    token = "J" * 43
    codigo = "R" * 43
    ambiente = {"id": "judg-1", "modo_participacao": "publico", "status": "encerrada"}
    inscricao = {"id": "insc-1", "email": "pessoa@example.com"}
    resposta = {"inscricao_id": inscricao["id"], "status": "em_preenchimento"}
    monkeypatch.setattr(comparacao_colaborativa_repository, "get_ambiente_by_token",
                        lambda chave: ambiente if chave == token else None)
    monkeypatch.setattr(comparacao_colaborativa_repository, "get_inscricao", lambda id, segredo:
                        inscricao if (id, segredo) == (ambiente["id"], sha256(codigo.encode()).hexdigest()) else None)
    monkeypatch.setattr(comparacao_colaborativa_repository, "get_resposta_by_ambiente_email",
                        lambda id, email: resposta if (id, email) == (ambiente["id"], inscricao["email"]) else None)
    gravacoes = []
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda dados, _: gravacoes.append(dados))

    cliente = TestClient(app)
    pagina = cliente.get("/public/pesquisa-experiencia-ahp/", params={"julgamento": token})
    assert pagina.status_code == 200 and "Código de retomada" in pagina.text
    assert f'name="julgamento" value="{token}"' in pagina.text
    acesso = "/api/pesquisa-experiencia/ahp/acesso"
    respostas = "/api/pesquisa-experiencia/ahp/respostas"
    dados = _dados(ahp=True, acesso={"julgamento": token})
    assert cliente.post(respostas, json=dados).status_code == 422
    cliente.cookies.set(nome_cookie_inscricao(token), codigo)
    assert cliente.post(acesso, json=dados["acesso"]).status_code == 422
    assert cliente.post(respostas, json=dados).status_code == 422
    assert gravacoes == []

    resposta["status"] = "enviada"
    assert cliente.post(acesso, json=dados["acesso"]).status_code == 204
    assert cliente.post(respostas, json=dados).status_code == 201
    cliente.cookies.clear()
    retomada = {"julgamento": token, "email": inscricao["email"], "token_acesso": codigo}
    assert cliente.post(acesso, json=retomada).status_code == 204
    assert cliente.post(acesso, json={**retomada, "email": "outro@example.com"}).status_code == 422
    assert cliente.post(respostas, json={**dados, "acesso": retomada}).status_code == 201
    assert len(gravacoes) == 2
    assert all(not {"acesso", "email", "token_acesso", "julgamento", "inscricao_id"} & linha.keys() for linha in gravacoes)


def test_rejeita_nota_fora_da_escala(monkeypatch):
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda *_: None)
    resposta = TestClient(app).post("/api/pesquisa-experiencia/respostas", json=_dados(facilidade=6))
    assert resposta.status_code == 422

from fastapi.testclient import TestClient

from api.repositories import pesquisa_experiencia_repository
from api.routers.pesquisa_experiencia import calcular_indice
from api.schemas.pesquisa_experiencia import PesquisaExperienciaEntrada
from api.server import app


def _dados(**alteracoes):
    dados = {
        "perfil": "tecnico", "frequencia_uso": "semanalmente",
        "funcionalidade_mais_utilizada": "Cadastro de demandas",
        "facilidade": 4, "autonomia": 4, "clareza_interface": 4,
        "compreensao_resultados": 4, "desempenho": 4, "satisfacao_geral": 4,
        "principal_dificuldade": "Localizar uma função",
        "melhoria_prioritaria": "Simplificar a navegação",
        "criticas_sugestoes_elogios": "A documentação é útil.", "website": "",
    }
    dados.update(alteracoes)
    return dados


def test_indice_normalizado():
    assert calcular_indice(PesquisaExperienciaEntrada(**_dados())) == 75.0
    assert calcular_indice(PesquisaExperienciaEntrada(**_dados(
        facilidade=1, autonomia=1, clareza_interface=1, compreensao_resultados=1,
        desempenho=1, satisfacao_geral=1,
    ))) == 0.0


def test_pagina_publica_disponivel():
    resposta = TestClient(app).get("/public/pesquisa-experiencia/")
    assert resposta.status_code == 200
    assert "críticas, sugestões ou elogios" in resposta.text


def test_pagina_ahp_aparece_no_mapa_publico():
    cliente = TestClient(app)
    caminho = "/public/pesquisa-experiencia-ahp/"
    titulo = "Pesquisa de satisfação - AHP Interativa"
    pagina = cliente.get(caminho)
    assert pagina.status_code == 200 and titulo in pagina.text
    assert 'action="/api/pesquisa-experiencia/ahp/respostas"' in pagina.text
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
    assert salvo["dados"]["criticas_sugestoes_elogios"] == "A documentação é útil."
    assert "website" not in salvo["dados"]


def test_resposta_ahp_usa_escala_propria_e_registra_escopo(monkeypatch):
    salvo = {}
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda dados, indice: salvo.update(dados=dados, indice=indice))
    caminho = "/api/pesquisa-experiencia/ahp/respostas"
    cliente = TestClient(app)
    resposta = cliente.post(caminho, json=_dados(facilidade=7, funcionalidade_mais_utilizada=None))
    assert resposta.status_code == 201
    assert resposta.json()["indice_experiencia"] == 58.33
    assert salvo["dados"]["escopo"] == "ahp_interativa"
    assert salvo["dados"]["escala_maxima"] == 7
    assert "website" not in salvo["dados"]
    assert cliente.post(caminho, json=_dados(escala_maxima=5)).status_code == 422
    assert cliente.post(caminho, json=_dados(escopo="sicard")).status_code == 422


def test_rejeita_nota_fora_da_escala(monkeypatch):
    monkeypatch.setattr(pesquisa_experiencia_repository, "criar", lambda *_: None)
    resposta = TestClient(app).post("/api/pesquisa-experiencia/respostas", json=_dados(facilidade=6))
    assert resposta.status_code == 422

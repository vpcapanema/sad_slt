"""Confirmação automática de recebimento enviada ao colaborador especialista."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.schemas.comparacao_colaborativa import RespostaColaborativaResponseSchema
from api.server import app
from api.services import comparacao_colaborativa_service as service
from api.services import email_resposta_colaborador as confirmacao
from api.services import email_service

CRITERIOS = [
    {"Critério": "Custo", "Dimensão": "Financeira", "Etapa": "Fase 3"},
    {"Critério": "Retorno", "Dimensão": "Financeira", "Etapa": "Fase 3"},
    {"Critério": "Acesso", "Dimensão": "Social", "Etapa": "Fase 3"},
]
MATRIZ = [[1.0, 3.0, 1 / 5], [1 / 3, 1.0, 1 / 7], [5.0, 7.0, 1.0]]
AVISO = "podem não ser os pesos finais da análise"


def _ambiente(convites):
    return {"id": "amb-1", "nome": "Julgamento <Teste>", "criterios": CRITERIOS, "convites": convites}


def _resposta(email="a@x.gov.br", matriz=MATRIZ, criterios=None):
    return {
        "id": "resp-1", "email": email, "nome_completo": "Ana <b>Souza</b>", "status": "enviada",
        "matriz_comparacao": matriz,
        "estatisticas": {"criterios_atribuidos": criterios if criterios is not None else CRITERIOS},
    }


def test_mensagem_traz_agradecimento_matriz_metricas_e_pesos():
    mensagem = confirmacao.montar(_ambiente([{"email": "a@x.gov.br"}]), _resposta())
    assert mensagem.destinatario == "a@x.gov.br"
    assert "recebemos a sua resposta" in mensagem.assunto
    for parte in (mensagem.texto, mensagem.html):
        assert "Agradecemos a sua colaboração" in parte
        assert "1/5" in parte and "1/7" in parte and "CT3" in parte
        assert "Custo" in parte and "Retorno" in parte and "Acesso" in parte
        assert "λmax" in parte and "RC" in parte
    # Pesos calculados do próprio preenchimento: o critério mais valorizado (Acesso) lidera.
    pesos = confirmacao.calcular(_resposta())["weights"]
    assert pesos[2] == max(pesos) and abs(sum(pesos) - 1) < 1e-9
    assert f"{pesos[2] * 100:.1f}".replace(".", ",") + "%" in mensagem.texto
    assert "Consistente" in mensagem.html or "consistente" in mensagem.texto


def test_html_escapa_nomes_do_colaborador_e_do_julgamento():
    mensagem = confirmacao.montar(_ambiente([{"email": "a@x.gov.br"}]), _resposta())
    assert "<b>Souza</b>" not in mensagem.html and "&lt;b&gt;Souza" in mensagem.html
    assert "<Teste>" not in mensagem.html and "&lt;Teste&gt;" in mensagem.html


def test_avisa_quando_outro_julgador_recebeu_o_mesmo_conjunto_de_criterios():
    convites = [{"email": "a@x.gov.br"}, {"email": "b@x.gov.br"}, {"email": "c@x.gov.br", "dimensoes": ["Financeira", "Social"]}]
    mensagem = confirmacao.montar(_ambiente(convites), _resposta())
    assert confirmacao.outros_julgadores_mesmo_conjunto(_ambiente(convites), _resposta()) == 2
    for parte in (mensagem.texto, mensagem.html):
        assert AVISO in parte
        assert "mais 2 julgadores" in parte
        assert "A resposta final é do gestor" in parte


def test_sem_aviso_quando_o_conjunto_de_criterios_e_exclusivo():
    convites = [{"email": "a@x.gov.br", "dimensoes": ["Financeira"]}, {"email": "b@x.gov.br", "dimensoes": ["Social"]}]
    resposta = _resposta(matriz=[[1.0, 2.0], [0.5, 1.0]], criterios=CRITERIOS[:2])
    assert confirmacao.outros_julgadores_mesmo_conjunto(_ambiente(convites), resposta) == 0
    mensagem = confirmacao.montar(_ambiente(convites), resposta)
    assert AVISO not in mensagem.texto and AVISO not in mensagem.html


def test_notificar_envia_a_confirmacao(monkeypatch):
    enviados = []
    monkeypatch.setattr(email_service, "_config", lambda **_: object())
    monkeypatch.setattr(confirmacao.repo, "get_ambiente_by_id", lambda _: _ambiente([{"email": "a@x.gov.br"}]))
    monkeypatch.setattr(confirmacao.repo, "list_respostas", lambda _: [_resposta()])
    monkeypatch.setattr(email_service, "enviar", lambda dados, **kw: enviados.append(dados))
    confirmacao.notificar("amb-1", "resp-1")
    assert len(enviados) == 1 and enviados[0].destinatario == "a@x.gov.br"


def test_notificar_nao_propaga_falha_de_envio(monkeypatch):
    monkeypatch.setattr(email_service, "_config", lambda **_: object())
    monkeypatch.setattr(confirmacao.repo, "get_ambiente_by_id", lambda _: _ambiente([{"email": "a@x.gov.br"}]))
    monkeypatch.setattr(confirmacao.repo, "list_respostas", lambda _: [_resposta()])

    def falha(*_a, **_k):
        raise email_service.FalhaEmail("conexao", "sem conexão")

    monkeypatch.setattr(email_service, "enviar", falha)
    confirmacao.notificar("amb-1", "resp-1")


def test_notificar_com_email_desabilitado_nao_consulta_o_banco(monkeypatch):
    def banco(*_a, **_k):
        raise AssertionError("não deve consultar o banco")

    monkeypatch.setattr(confirmacao.repo, "get_ambiente_by_id", banco)
    confirmacao.notificar("amb-1", "resp-1")


@pytest.mark.parametrize("sucesso", [True, False])
def test_envio_da_resposta_agenda_a_confirmacao_somente_quando_registrada(monkeypatch, sucesso):
    chamadas = []
    resposta = RespostaColaborativaResponseSchema(
        id="resp-1", ambiente_id="amb-1", nome_completo="Ana", email="a@x.gov.br", instituicao="Inst",
        matriz_comparacao=[[1, 2], [0.5, 1]], consistente=True,
    )

    def registrar(_token, _body):
        if not sucesso:
            from api.exceptions import DemandaValidationError
            raise DemandaValidationError("RC acima do limite", field="razao_consistencia")
        return resposta

    monkeypatch.setattr(service, "registrar_resposta", registrar)
    monkeypatch.setattr(confirmacao, "notificar", lambda *args: chamadas.append(args))
    retorno = TestClient(app).post(
        "/api/ahp/comparacao-colaborativa/publico/tok/respostas",
        json={"token_acesso": "012345", "identificacao": {"nome_completo": "Ana", "email": "a@x.gov.br", "instituicao": "Inst"},
              "matriz_comparacao": [[1, 2], [0.5, 1]]},
    )
    assert retorno.status_code == (201 if sucesso else 422)
    assert chamadas == ([("amb-1", "resp-1")] if sucesso else [])

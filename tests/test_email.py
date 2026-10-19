"""Integração HTTP/SMTP isolada: não acessa banco nem envia emails reais."""
import smtplib
import ssl
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers import api_router
from api.routers.email import router
from api.services import email_service
from api.services.session_service import SessionUser, create_token


@pytest.fixture(autouse=True)
def smtp(monkeypatch):
    valores = {
        "SICARD_EMAIL_ENABLED": "true",
        "SICARD_SMTP_HOST": "smtp.example.com",
        "SICARD_SMTP_PORT": "587",
        "SICARD_SMTP_SECURITY": "starttls",
        "SICARD_SMTP_USER": "usuario-smtp",
        "SICARD_SMTP_PASSWORD": "segredo-sintetico",
        "SICARD_EMAIL_FROM": "sicard@example.com",
        "SICARD_EMAIL_REPLY_TO": "suporte@example.com",
        "SICARD_SMTP_TIMEOUT": "12",
    }
    for nome, valor in valores.items():
        monkeypatch.setenv(nome, valor)
    servidor = MagicMock(spec=smtplib.SMTP)
    servidor.ehlo.return_value = (250, b"OK")
    servidor.noop.return_value = (250, b"OK")
    servidor.send_message.return_value = {}
    fabrica = MagicMock(return_value=servidor)
    fabrica_ssl = MagicMock(return_value=servidor)
    monkeypatch.setattr(email_service.smtplib, "SMTP", fabrica)
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", fabrica_ssl)
    return servidor, fabrica, fabrica_ssl


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as cliente:
        yield cliente


def autenticacao(perfil="GESTOR"):
    user = SessionUser("usuario-teste", "gestor@example.com", f"teste_{perfil}", "Teste", perfil)
    return {"Authorization": f"Bearer {create_token(user)}"}


def dados(**extras):
    return {
        "destinatario": "destino@example.com",
        "assunto": "Atualização da demanda",
        "texto": "Texto da mensagem.",
        **extras,
    }


def test_router_registrado_na_api_real():
    app = FastAPI()
    app.include_router(api_router)
    with TestClient(app) as cliente:
        response = cliente.get("/api/email/diagnostico", headers=autenticacao())
        assert response.status_code == 200
        for path in ("teste-conexao", "enviar", "teste"):
            assert cliente.post(f"/api/email/{path}", json={}).status_code == 401


@pytest.mark.parametrize("metodo,path,payload", [
    ("get", "/diagnostico", None),
    ("post", "/teste-conexao", None),
    ("post", "/teste", {"destinatario": "destino@example.com"}),
    ("post", "/enviar", dados()),
])
@pytest.mark.parametrize("perfil,status", [
    (None, 401), ("VISUALIZADOR", 403), ("OPERADOR", 403), ("ANALISTA", 403),
])
def test_todos_endpoints_exigem_gestor_ou_admin(client, smtp, metodo, path, payload, perfil, status):
    response = client.request(
        metodo, "/api/email" + path, json=payload,
        headers=autenticacao(perfil) if perfil else {},
    )
    assert response.status_code == status
    smtp[1].assert_not_called()
    smtp[2].assert_not_called()


@pytest.mark.parametrize("perfil", ["GESTOR", "ADMIN"])
def test_envia_texto_html_com_remetente_fixo_e_tls(client, smtp, perfil, caplog):
    caplog.set_level("INFO", logger="api.services.email_service")
    response = client.post("/api/email/enviar", headers=autenticacao(perfil),
                           json=dados(html="<p>Texto da mensagem.</p>"))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "aceito_smtp"
    assert "não foi confirmada" in body["mensagem"]
    assert body["destinatario"] == "destino@example.com"
    assert response.headers["cache-control"] == "no-store"
    servidor, fabrica, fabrica_ssl = smtp
    fabrica.assert_called_once_with(host="smtp.example.com", port=587, timeout=12)
    fabrica_ssl.assert_not_called()
    contexto = servidor.starttls.call_args.kwargs["context"]
    assert contexto.check_hostname
    assert contexto.verify_mode == ssl.CERT_REQUIRED
    servidor.login.assert_called_once_with("usuario-smtp", "segredo-sintetico")
    assert [call[0] for call in servidor.mock_calls] == [
        "ehlo", "starttls", "ehlo", "login", "send_message", "quit", "close",
    ]
    call = servidor.send_message.call_args
    mensagem = call.args[0]
    assert str(mensagem["From"]) == "SICARD <sicard@example.com>"
    assert str(mensagem["Reply-To"]) == "suporte@example.com"
    assert mensagem["Message-ID"] == body["id_mensagem"]
    assert mensagem["Subject"] == "Atualização da demanda"
    assert mensagem["Date"]
    assert mensagem.get_body(preferencelist=("plain",)).get_content().strip() == "Texto da mensagem."
    assert mensagem.get_body(preferencelist=("html",)).get_content().strip() == "<p>Texto da mensagem.</p>"
    assert call.kwargs == {"from_addr": "sicard@example.com", "to_addrs": ["destino@example.com"]}
    assert "usuario-teste" in caplog.text
    assert body["id_mensagem"] in caplog.text
    for privado in ("segredo-sintetico", "Texto da mensagem.", "destino@example.com"):
        assert privado not in caplog.text


def test_ssl_direto_e_email_sem_html_ou_reply_to(client, smtp, monkeypatch):
    monkeypatch.setenv("SICARD_SMTP_SECURITY", "ssl")
    monkeypatch.setenv("SICARD_SMTP_PORT", "465")
    monkeypatch.delenv("SICARD_EMAIL_REPLY_TO")
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 200
    servidor, fabrica, fabrica_ssl = smtp
    fabrica.assert_not_called()
    kwargs = fabrica_ssl.call_args.kwargs
    assert (kwargs["host"], kwargs["port"], kwargs["timeout"]) == ("smtp.example.com", 465, 12)
    assert kwargs["context"].check_hostname
    assert kwargs["context"].verify_mode == ssl.CERT_REQUIRED
    servidor.starttls.assert_not_called()
    mensagem = servidor.send_message.call_args.args[0]
    assert mensagem.get_content_type() == "text/plain"
    assert mensagem["Reply-To"] is None


def test_diagnostico_nao_conecta_nem_expoe_credenciais(client, smtp):
    response = client.get("/api/email/diagnostico", headers=autenticacao())
    assert response.status_code == 200
    assert response.json() == {
        "habilitado": True, "configurado": True, "campos_ausentes": [],
        "seguranca": "starttls", "remetente": "sicard@example.com", "conexao_testada": False,
    }
    assert "usuario-smtp" not in response.text
    assert "segredo-sintetico" not in response.text
    smtp[1].assert_not_called()
    smtp[2].assert_not_called()


def test_teste_conexao_autentica_sem_enviar(client, smtp):
    response = client.post("/api/email/teste-conexao", headers=autenticacao())
    assert response.status_code == 200
    assert response.json()["status"] == "conectado"
    smtp[0].noop.assert_called_once()
    smtp[0].send_message.assert_not_called()
    smtp[0].close.assert_called_once()


def test_teste_email_exige_destinatario_e_envia_uma_mensagem(client, smtp):
    response = client.post("/api/email/teste", headers=autenticacao(), json={})
    assert response.status_code == 422
    smtp[0].send_message.assert_not_called()
    response = client.post("/api/email/teste", headers=autenticacao(),
                           json={"destinatario": "destino@example.com"})
    assert response.status_code == 200
    smtp[0].send_message.assert_called_once()
    mensagem = smtp[0].send_message.call_args.args[0]
    assert str(mensagem["Subject"]) == "Teste de email - SICARD"
    assert "SICARD" in mensagem.get_content()
    assert "segredo-sintetico" not in mensagem.get_content()


@pytest.mark.parametrize("path", ["/enviar", "/teste", "/teste-conexao"])
def test_desativado_por_padrao_impede_todas_operacoes_smtp(client, smtp, monkeypatch, path):
    monkeypatch.delenv("SICARD_EMAIL_ENABLED")
    payload = dados() if path == "/enviar" else {"destinatario": "destino@example.com"}
    response = client.post("/api/email" + path, headers=autenticacao(), json=payload)
    assert response.status_code == 503
    assert response.headers["x-sicard-email-error"] == "configuracao"
    smtp[1].assert_not_called()
    smtp[2].assert_not_called()


def test_configuracao_incompleta_indicada_sem_conectar(client, smtp, monkeypatch):
    monkeypatch.delenv("SICARD_SMTP_PASSWORD")
    response = client.get("/api/email/diagnostico", headers=autenticacao())
    assert response.status_code == 200
    assert not response.json()["configurado"]
    assert response.json()["campos_ausentes"] == ["SICARD_SMTP_PASSWORD"]
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 503
    smtp[1].assert_not_called()


@pytest.mark.parametrize("campo,valor", [
    ("SICARD_SMTP_PORT", "errado"),
    ("SICARD_SMTP_PORT", "70000"),
    ("SICARD_SMTP_SECURITY", "none"),
    ("SICARD_SMTP_TIMEOUT", "0"),
    ("SICARD_SMTP_TIMEOUT", "61"),
    ("SICARD_EMAIL_ENABLED", "talvez"),
    ("SICARD_EMAIL_FROM", "invalido"),
    ("SICARD_EMAIL_REPLY_TO", "invalido"),
])
def test_configuracao_invalida_falha_sem_vazar_valores(client, smtp, monkeypatch, caplog, campo, valor):
    monkeypatch.setenv(campo, valor)
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 503
    assert "segredo-sintetico" not in response.text + caplog.text
    smtp[1].assert_not_called()


@pytest.mark.parametrize("extras", [
    {"destinatario": "invalido"},
    {"destinatario": ["um@example.com", "dois@example.com"]},
    {"destinatario": "um@example.com,dois@example.com"},
    {"destinatario": "um@example.com\r\nBcc: dois@example.com"},
    {"assunto": "Oi\r\nBcc: dois@example.com"},
    {"assunto": "Oi\x00"},
    {"assunto": "   "},
    {"assunto": "x" * 201},
    {"texto": "   "},
    {"texto": "x" * 50001},
    {"html": "x" * 100001},
    {"html": " "},
    {"remetente": "outro@example.com"},
    {"bcc": "outro@example.com"},
    {"anexos": []},
    {"smtp_password": "nao-aceitar"},
])
def test_payload_invalido_nao_envia(client, smtp, extras):
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados(**extras))
    assert response.status_code == 422
    smtp[1].assert_not_called()
    smtp[2].assert_not_called()


def test_limites_exatos_sao_aceitos(client, smtp):
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados(
        assunto="x" * 200, texto="x" * 50000, html="x" * 100000,
    ))
    assert response.status_code == 200
    smtp[0].send_message.assert_called_once()


@pytest.mark.parametrize("etapa,excecao,codigo,status", [
    ("login", smtplib.SMTPAuthenticationError(535, b"resposta-privada"), "autenticacao", 502),
    ("starttls", smtplib.SMTPNotSupportedError("resposta-privada"), "smtp_incompativel", 502),
    ("starttls", ssl.SSLCertVerificationError("resposta-privada"), "conexao", 503),
    ("ehlo", TimeoutError("resposta-privada"), "conexao", 503),
    ("send_message", smtplib.SMTPRecipientsRefused({"destino@example.com": (550, b"resposta-privada")}),
     "destinatario_recusado", 502),
    ("send_message", smtplib.SMTPSenderRefused(550, b"resposta-privada", "sicard@example.com"),
     "remetente_recusado", 502),
    ("send_message", smtplib.SMTPDataError(554, b"resposta-privada"), "mensagem_recusada", 502),
    ("send_message", smtplib.SMTPServerDisconnected("resposta-privada"), "resultado_indeterminado", 504),
    ("send_message", TimeoutError("resposta-privada"), "resultado_indeterminado", 504),
])
def test_falhas_explicitas_sem_repeticao_ou_vazamento(client, smtp, caplog, etapa, excecao, codigo, status):
    getattr(smtp[0], etapa).side_effect = excecao
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == status
    assert response.headers["x-sicard-email-error"] == codigo
    assert response.headers["cache-control"] == "no-store"
    assert "resposta-privada" not in response.text + caplog.text
    assert "segredo-sintetico" not in response.text + caplog.text
    assert codigo in caplog.text
    assert "usuario-teste" in caplog.text
    assert smtp[0].send_message.call_count == (1 if etapa == "send_message" else 0)
    smtp[1].assert_called_once()
    smtp[0].close.assert_called_once()
    if status == 504:
        assert "pode ter sido aceito" in response.json()["detail"]


def test_falha_ao_abrir_conexao_nao_vira_sucesso(client, smtp):
    smtp[1].side_effect = OSError("detalhe-interno")
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 503
    assert response.headers["x-sicard-email-error"] == "conexao"
    smtp[0].send_message.assert_not_called()


def test_teste_conexao_verifica_resposta_noop(client, smtp):
    smtp[0].noop.return_value = (421, b"indisponivel")
    response = client.post("/api/email/teste-conexao", headers=autenticacao())
    assert response.status_code == 503
    smtp[0].send_message.assert_not_called()


def test_ehlo_recusado_impede_autenticacao(client, smtp):
    smtp[0].ehlo.return_value = (550, b"recusado")
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 503
    smtp[0].login.assert_not_called()
    smtp[0].send_message.assert_not_called()


def test_retorno_de_destinatario_recusado_nao_vira_sucesso(client, smtp):
    smtp[0].send_message.return_value = {"destino@example.com": (550, b"recusado")}
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 502
    assert response.headers["x-sicard-email-error"] == "destinatario_recusado"


def test_falha_no_quit_nao_anula_envio_ja_aceito(client, smtp, caplog):
    smtp[0].quit.side_effect = smtplib.SMTPServerDisconnected("detalhe-interno")
    response = client.post("/api/email/enviar", headers=autenticacao(), json=dados())
    assert response.status_code == 200
    assert response.json()["status"] == "aceito_smtp"
    assert "Encerramento SMTP sem confirmação" in caplog.text
    assert "detalhe-interno" not in caplog.text
    smtp[0].close.assert_called_once()
    smtp[0].send_message.assert_called_once()


@pytest.mark.parametrize("dsn", [False, True])
def test_solicita_leitura_e_dsn_somente_quando_suportada(smtp, dsn):
    from api.schemas.email import EmailEnvioSchema
    smtp[0].has_extn.return_value = dsn
    resultado = email_service.enviar(
        EmailEnvioSchema.model_validate(dados()), usuario_id="teste",
        id_mensagem="<sicard.teste@example.com>", solicitar_confirmacoes=True,
    )
    chamada = smtp[0].send_message.call_args
    assert chamada.args[0]["Disposition-Notification-To"] == "sicard@example.com"
    assert chamada.args[0]["Message-ID"] == "<sicard.teste@example.com>"
    assert resultado.confirmacao_entrega_solicitada is dsn
    assert resultado.confirmacao_leitura_solicitada
    if dsn:
        assert chamada.kwargs["mail_options"][0] == "RET=HDRS"
        assert chamada.kwargs["mail_options"][1].startswith("ENVID=")
        assert chamada.kwargs["rcpt_options"] == ["NOTIFY=SUCCESS,FAILURE,DELAY"]
    else:
        assert "rcpt_options" not in chamada.kwargs

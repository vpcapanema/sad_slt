import pytest

from api.repositories.email_convites_repository import _explicar_eventos
from api.services.email_status_catalogo import texto_explicacao


DIAGNOSTICO_SPAM = (
    "smtp; 550 5.7.1 This message is likely unsolicited email. "
    "Learn more at https://support.google.com/mail/answer/69585"
)


def test_codigo_catalogado_traz_titulo_e_acao():
    texto = texto_explicacao("5.7.1")
    assert texto.startswith("5.7.1 · Mensagem recusada por política ou filtro.")
    assert "Ação:" in texto


def test_codigo_desconhecido_nao_gera_explicacao():
    assert texto_explicacao("9.9.9") == ""


def test_motivo_especifico_do_gmail_aparece_quando_catalogado():
    texto = texto_explicacao("5.7.1", DIAGNOSTICO_SPAM)
    assert "Motivo informado pelo Gmail: This message is likely unsolicited email." in texto


def test_motivo_ausente_nao_inventa_causa():
    texto = texto_explicacao("5.7.1", "smtp; 550 5.7.1 texto sem correspondencia")
    assert "Motivo informado pelo Gmail" not in texto


@pytest.mark.parametrize(
    "detalhe_antigo",
    [
        "Action: failed; Status: 5.7.1; smtp; " + DIAGNOSTICO_SPAM,
    ],
    ids=["dsn-5.7.1-spam"],
)
def test_eventos_antigos_recebem_explicacao_uma_unica_vez(detalhe_antigo):
    eventos = [{"detalhe": detalhe_antigo}]
    _explicar_eventos(eventos)
    depois = eventos[0]["detalhe"]
    assert depois.index("Mensagem recusada") < depois.index("Relatório original:")
    assert depois.count("Relatório original:") == 1
    _explicar_eventos(eventos)
    assert eventos[0]["detalhe"] == depois


def test_evento_sem_codigo_catalogado_permanece_igual():
    eventos = [{"detalhe": "Action: failed; Status: 9.9.9; smtp; erro"}]
    _explicar_eventos(eventos)
    assert eventos[0]["detalhe"] == "Action: failed; Status: 9.9.9; smtp; erro"

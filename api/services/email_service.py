"""Envio SMTP autenticado; credenciais e remetente pertencem ao servidor."""
from __future__ import annotations

from contextlib import contextmanager
from email.headerregistry import Address
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
import logging
import smtplib
import ssl
from hashlib import sha256
from collections.abc import Generator

from pydantic import ValidationError

from api.config import EmailSettings, get_email_settings
from api.schemas.email import (
    EmailConexaoResultado, EmailDiagnostico, EmailEnvioResultado, EmailEnvioSchema,
)

logger = logging.getLogger(__name__)


class FalhaEmail(RuntimeError):
    def __init__(self, codigo: str, mensagem: str):
        super().__init__(mensagem)
        self.codigo = codigo


def _config(*, exigir_ativo: bool = True) -> EmailSettings:
    try:
        config = get_email_settings()
    except ValidationError as exc:
        campos = [str(erro["loc"][0]) for erro in exc.errors()]
        logger.error("Configuração de email inválida; campos=%s", campos)
        raise FalhaEmail(
            "configuracao", "A configuração de email do SICARD é inválida. Contate a administração."
        ) from exc
    if exigir_ativo and (not config.habilitado or config.campos_ausentes()):
        logger.warning("Envio de email indisponível; habilitado=%s campos_ausentes=%s",
                       config.habilitado, config.campos_ausentes())
        raise FalhaEmail(
            "configuracao", "O envio de email do SICARD está desativado ou incompleto. Contate a administração."
        )
    return config


def diagnostico() -> EmailDiagnostico:
    config = _config(exigir_ativo=False)
    ausentes = config.campos_ausentes()
    return EmailDiagnostico(
        habilitado=config.habilitado, configurado=not ausentes,
        campos_ausentes=ausentes, seguranca=config.seguranca, remetente=config.remetente,
    )


@contextmanager
def _conexao(config: EmailSettings) -> Generator[smtplib.SMTP, None, None]:
    contexto = ssl.create_default_context()
    servidor = (
        smtplib.SMTP_SSL(host=config.host, port=config.porta, timeout=config.timeout, context=contexto)
        if config.seguranca == "ssl"
        else smtplib.SMTP(host=config.host, port=config.porta, timeout=config.timeout)
    )
    try:
        codigo, resposta = servidor.ehlo()
        if codigo != 250:
            raise smtplib.SMTPHeloError(codigo, resposta)
        if config.seguranca == "starttls":
            servidor.starttls(context=contexto)
            codigo, resposta = servidor.ehlo()
            if codigo != 250:
                raise smtplib.SMTPHeloError(codigo, resposta)
        servidor.login(config.usuario, config.senha.get_secret_value())
        yield servidor
    finally:
        # Uma falha no QUIT não desfaz a aceitação anterior do DATA.
        try:
            servidor.quit()
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning("Encerramento SMTP sem confirmação; tipo=%s", type(exc).__name__)
        finally:
            servidor.close()


def _falha_smtp(exc: Exception, *, iniciou_envio: bool, usuario_id: str,
                id_mensagem: str | None = None) -> FalhaEmail:
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        codigo = "autenticacao"
        mensagem = "O servidor de email recusou a autenticação do SICARD. Contate a administração."
    elif isinstance(exc, smtplib.SMTPRecipientsRefused):
        codigo = "destinatario_recusado"
        mensagem = "O servidor de email recusou o destinatário. Confira o endereço informado."
    elif isinstance(exc, smtplib.SMTPSenderRefused):
        codigo = "remetente_recusado"
        mensagem = "O servidor de email recusou o remetente configurado. Contate a administração."
    elif isinstance(exc, smtplib.SMTPDataError):
        codigo = "mensagem_recusada"
        mensagem = "O servidor de email recusou a mensagem. Verifique as políticas e cotas da conta."
    elif isinstance(exc, (smtplib.SMTPNotSupportedError, UnicodeError)):
        codigo = "smtp_incompativel"
        mensagem = "O servidor SMTP não suporta a segurança ou o endereço exigido para este envio."
    elif iniciou_envio:
        codigo = "resultado_indeterminado"
        mensagem = (
            "A conexão foi interrompida durante o envio. O email pode ter sido aceito. "
            "Confira o recebimento antes de reenviar para evitar duplicidade."
        )
    else:
        codigo = "conexao"
        mensagem = "Não foi possível estabelecer uma conexão segura com o servidor de email."
    logger.error("Falha SMTP codigo=%s usuario=%s mensagem_id=%s tipo=%s",
                 codigo, usuario_id, id_mensagem, type(exc).__name__)
    return FalhaEmail(codigo, mensagem)


def testar_conexao(*, usuario_id: str) -> EmailConexaoResultado:
    config = _config()
    try:
        with _conexao(config) as servidor:
            codigo, resposta = servidor.noop()
            if codigo != 250:
                raise smtplib.SMTPResponseException(codigo, resposta)
    except (smtplib.SMTPException, OSError, UnicodeError) as exc:
        raise _falha_smtp(exc, iniciou_envio=False, usuario_id=usuario_id) from exc
    logger.info("Conexão SMTP verificada usuario=%s", usuario_id)
    return EmailConexaoResultado()


def enviar(dados: EmailEnvioSchema, *, usuario_id: str, id_mensagem: str | None = None,
           solicitar_confirmacoes: bool = False) -> EmailEnvioResultado:
    config = _config()
    remetente = str(config.remetente)
    id_mensagem = id_mensagem or make_msgid(domain=remetente.rsplit("@", 1)[1])
    mensagem = EmailMessage()
    mensagem["From"] = Address(display_name="SICARD", addr_spec=remetente)
    mensagem["To"] = str(dados.destinatario)
    mensagem["Subject"] = dados.assunto
    mensagem["Message-ID"] = id_mensagem
    mensagem["Date"] = formatdate()
    if config.responder_para:
        mensagem["Reply-To"] = str(config.responder_para)
    if solicitar_confirmacoes:
        mensagem["Disposition-Notification-To"] = remetente
    mensagem.set_content(dados.texto)
    if dados.html is not None:
        mensagem.add_alternative(dados.html, subtype="html")

    iniciou_envio = False
    dsn_solicitada = False
    try:
        with _conexao(config) as servidor:
            dsn_solicitada = solicitar_confirmacoes and servidor.has_extn("dsn")
            iniciou_envio = True
            if dsn_solicitada:
                recusados = servidor.send_message(
                    mensagem, from_addr=remetente, to_addrs=[str(dados.destinatario)],
                    mail_options=["RET=HDRS", "ENVID=" + sha256(id_mensagem.encode()).hexdigest()],
                    rcpt_options=["NOTIFY=SUCCESS,FAILURE,DELAY"],
                )
            else:
                recusados = servidor.send_message(
                    mensagem, from_addr=remetente, to_addrs=[str(dados.destinatario)],
                )
            if recusados:
                raise smtplib.SMTPRecipientsRefused(recusados)
    except (smtplib.SMTPException, OSError, UnicodeError) as exc:
        raise _falha_smtp(
            exc, iniciou_envio=iniciou_envio, usuario_id=usuario_id, id_mensagem=id_mensagem,
        ) from exc
    logger.info("Email aceito pelo SMTP usuario=%s mensagem_id=%s", usuario_id, id_mensagem)
    return EmailEnvioResultado(
        id_mensagem=id_mensagem, destinatario=str(dados.destinatario),
        confirmacao_entrega_solicitada=dsn_solicitada,
        confirmacao_leitura_solicitada=solicitar_confirmacoes,
    )
